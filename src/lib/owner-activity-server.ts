// Server-only: reads platform_audit_events for the owner Activity tab with actor emails and
// company names joined in. The caller has already run requirePlatformOwner.
import {
  actionPrefixPattern,
  ACTIVITY_PAGE_SIZE,
  summarizeAuditDetail,
  type ActivityEvent,
  type ActivityQuery,
} from "./owner-activity";
import { requireCurrentTeamRequest, type TeamDb } from "./team-server";

type Row = {
  id: number;
  actor_user_id: string | null;
  action: string;
  organization_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

const nextDay = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString();

export async function readActivity(
  db: TeamDb,
  filters: ActivityQuery,
  { offset, limit }: { offset: number; limit: number } = {
    offset: filters.page * ACTIVITY_PAGE_SIZE,
    limit: ACTIVITY_PAGE_SIZE,
  },
): Promise<{ events: ActivityEvent[]; total: number }> {
  let query = db
    .from("platform_audit_events")
    .select("id,actor_user_id,action,organization_id,detail,created_at", { count: "exact" });
  if (filters.action) query = query.like("action", actionPrefixPattern(filters.action));
  if (filters.hideViews) query = query.not("action", "like", "%view");
  if (filters.org) query = query.eq("organization_id", filters.org);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lt("created_at", nextDay(filters.to));
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  requireCurrentTeamRequest(db);
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter((v): v is string => !!v))];
  const orgIds = [...new Set(rows.map((r) => r.organization_id).filter((v): v is string => !!v))];
  const emails = new Map<string, string | null>();
  for (let i = 0; i < Math.min(actorIds.length, 200); i += 5) {
    await Promise.all(
      actorIds.slice(i, i + 5).map(async (id) => {
        const { data: found } = await db.auth.admin.getUserById(id);
        emails.set(id, found?.user?.id === id ? (found.user.email ?? null) : null);
      }),
    );
    requireCurrentTeamRequest(db);
  }
  const names = new Map<string, string>();
  for (let i = 0; i < orgIds.length; i += 200) {
    const { data: orgs, error: orgError } = await db
      .from("team_organizations")
      .select("id,name")
      .in("id", orgIds.slice(i, i + 200));
    if (orgError) throw orgError;
    for (const org of (orgs ?? []) as { id: string; name: string }[]) names.set(org.id, org.name);
  }
  requireCurrentTeamRequest(db);
  return {
    total: count ?? rows.length,
    events: rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      action: r.action,
      actor_user_id: r.actor_user_id,
      actor_email: r.actor_user_id ? (emails.get(r.actor_user_id) ?? null) : null,
      organization_id: r.organization_id,
      organization_name: r.organization_id ? (names.get(r.organization_id) ?? null) : null,
      detail: r.detail ?? {},
      summary: summarizeAuditDetail(r.detail),
    })),
  };
}
