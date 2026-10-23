import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { readGaConfig } from "@/lib/ga-data";
import { GaRequestError, loadGaAnalytics } from "@/lib/ga-data-server";
import {
  analyticsRange,
  dayKeys,
  GA_SETUP_STEPS,
  type AppAnalytics,
  type GaResponse,
} from "@/lib/owner-analytics";
import { signupsByDay } from "@/lib/owner-directory";
import { loadDirectoryUsers } from "@/lib/owner-directory-server";
import { teamSeatMetrics } from "@/lib/team-seat-metrics";
import {
  audit,
  authenticatedTeamUser,
  json,
  requireCurrentTeamRequest,
  requirePlatformOwner,
  scopedTeamError,
  teamAdminClient,
  type TeamDb,
} from "@/lib/team-server";

async function appAnalytics(db: TeamDb, range: AppAnalytics["range"]): Promise<AppAnalytics> {
  const sinceDay = dayKeys(range)[0];
  const [counts, modules, ledger, entitlements, directory] = await Promise.all([
    db.rpc("platform_account_counts"),
    db.rpc("platform_site_usage_summary", { p_since: `${sinceDay}T00:00:00Z` }),
    db
      .from("platform_ledger_entries")
      .select("occurred_on,amount_cents,source")
      .gte("occurred_on", sinceDay)
      .limit(10000),
    db
      .from("team_entitlements")
      .select("seat_limit,status,period_end,stripe_subscription_id")
      .limit(10000),
    loadDirectoryUsers(db, ""),
  ]);
  for (const result of [counts, modules, ledger, entitlements]) if (result.error) throw result.error;
  requireCurrentTeamRequest(db);
  const c = (counts.data ?? {}) as Record<string, number>;
  const byDay = new Map(
    dayKeys(range).map((date) => [date, { date, receiptsCents: 0, outflowCents: 0, purchases: 0 }]),
  );
  for (const entry of (ledger.data ?? []) as {
    occurred_on: string;
    amount_cents: number;
    source: string;
  }[]) {
    const day = byDay.get(String(entry.occurred_on).slice(0, 10));
    if (!day) continue;
    const cents = Number(entry.amount_cents) || 0;
    if (cents > 0) day.receiptsCents += cents;
    else day.outflowCents += -cents;
    if (cents > 0 && entry.source === "stripe") day.purchases += 1;
  }
  const revenue = [...byDay.values()];
  const signups = signupsByDay(directory.users, range);
  const seats = teamSeatMetrics(
    (entitlements.data ?? []) as Parameters<typeof teamSeatMetrics>[0],
  );
  return {
    range,
    signups,
    signupTotal: signups.reduce((sum, s) => sum + s.count, 0),
    unconfirmedSignups: signupsByDay(
      directory.users.filter((u) => !u.confirmed),
      range,
    ).reduce((sum, s) => sum + s.count, 0),
    directoryTruncated: directory.truncated,
    active7d: Number(c.active_7d ?? 0),
    active30d: Number(c.active_30d ?? 0),
    totalAccounts: Number(c.total_accounts ?? 0),
    modules: ((modules.data ?? []) as AppAnalytics["modules"])
      .map((m) => ({ ...m, active_seconds: Number(m.active_seconds), active_users: Number(m.active_users) }))
      .sort((a, b) => b.active_seconds - a.active_seconds),
    revenue,
    receiptsCents: revenue.reduce((sum, d) => sum + d.receiptsCents, 0),
    outflowCents: revenue.reduce((sum, d) => sum + d.outflowCents, 0),
    purchases: revenue.reduce((sum, d) => sum + d.purchases, 0),
    seats: { ...seats, assigned: Number(c.assigned_seats ?? 0) },
  };
}

// Platform owner only. part=ga reads Google Analytics through a service account (no personal
// data is sent to Google); part=app reads the app's own database.
export const Route = createFileRoute("/api/owner-analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request),
            actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          const params = new URL(request.url).searchParams;
          const range = analyticsRange(params.get("range"));
          const part = params.get("part") === "ga" ? "ga" : "app";
          await audit(db, actor.id, "analytics.view", undefined, { part, range });
          if (part === "app") return json(await appAnalytics(db, range));
          const config = readGaConfig();
          if (!config.configured) {
            const body: GaResponse = {
              configured: false,
              missing: config.missing,
              invalid: config.invalid,
              setup: GA_SETUP_STEPS,
            };
            return json(body);
          }
          try {
            const body: GaResponse = { configured: true, ...(await loadGaAnalytics(config, range)) };
            return json(body);
          } catch (error) {
            const body: GaResponse = {
              configured: true,
              hostname: config.hostname,
              error:
                error instanceof GaRequestError
                  ? error.message
                  : "Google Analytics could not be reached. Try again later.",
            };
            return json(body);
          }
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
