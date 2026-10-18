import { createClient, type User } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

export function teamAdminClient(fetcher?: typeof fetch) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new TeamOperationError("Team database is not configured.", 503);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(fetcher ? { global: { fetch: fetcher } } : {}),
  });
}

export type TeamDb = ReturnType<typeof teamAdminClient>;

export async function authenticatedUser(request: Request, db: TeamDb): Promise<User> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new TeamOperationError("Sign in to continue.", 403);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email)
    throw new TeamOperationError("Your session has expired. Sign in again.", 403);
  return data.user;
}

export async function memberRole(db: TeamDb, orgId: string, userId: string) {
  const { data, error } = await db
    .from("team_members")
    .select("role,status,display_name")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.status === "active" ? data : null;
}

export async function requireTeamAdmin(db: TeamDb, orgId: string, userId: string) {
  const role = await memberRole(db, orgId, userId);
  if (!role || !["owner", "admin"].includes(role.role))
    throw new Error("Company admin access required.");
  return role;
}

export async function requirePlatformOwner(db: TeamDb, user: User) {
  const { data, error } = await db
    .from("platform_admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (
    data?.role !== "owner" &&
    (!ownerEmail || user.email?.toLowerCase() !== ownerEmail || !user.email_confirmed_at)
  ) {
    throw new Error("Platform owner access required.");
  }
}

export function inviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Only intentional fixed learner guidance may cross this scoped error boundary. */
export class TeamOperationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 503 = 400,
  ) {
    super(message);
  }
}
/** Used by activity and legacy assessment; unrelated legacy handlers remain separate. */
export function scopedTeamError(error: unknown) {
  if (error instanceof TeamOperationError) return json({ error: error.message }, error.status);
  return json(
    { error: "We could not confirm this team request. Check your workspace before retrying." },
    503,
  );
}

export function teamError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request failed.";
  const status = /Sign in|session|access required/.test(message)
    ? 403
    : /configured/.test(message)
      ? 503
      : 400;
  return json({ error: message }, status);
}

export function teamBillingReady() {
  return (
    process.env.TEAM_ENROLLMENT_ENABLED !== "false" &&
    Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
  );
}

export async function sendTeamEmail(to: string, subject: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.TEAM_FROM_EMAIL;
  if (!key || !from) throw new Error("Team email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  if (!response.ok) throw new Error(`Email service returned ${response.status}.`);
}

export async function audit(
  db: TeamDb,
  actorId: string | null,
  action: string,
  orgId?: string,
  detail: Record<string, unknown> = {},
) {
  await db
    .from("platform_audit_events")
    .insert({ actor_user_id: actorId, action, organization_id: orgId ?? null, detail });
}
