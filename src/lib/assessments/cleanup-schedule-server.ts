import "@tanstack/react-start/server-only";
import { timingSafeEqual, randomUUID } from "node:crypto";
import {
  teamAdminClient,
  json as baseJson,
  authenticatedUser,
  requirePlatformOwner,
  type TeamDb,
} from "@/lib/team-server";
import {
  runSpeechCleanup,
  cleanupRunHealth,
  boundedCleanupFetch,
  type CleanupRun,
} from "./cleanup-run";
function json(value: unknown, status = 200) {
  const response = baseJson(value, status);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export function cleanupCronAuthorized(request: Request, secret: string | undefined) {
  const supplied = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!secret || Buffer.byteLength(secret) < 32 || !supplied) return false;
  const a = Buffer.from(secret),
    b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function cleanupStatus(db: TeamDb, enabled: boolean) {
  const [result, lastScheduled] = await Promise.all([
    db
      .from("assessment_cleanup_runs")
      .select(
        "source,status,started_at,finished_at,selected_count,deleted_count,failed_count,may_have_more,failure_code",
      )
      .order("started_at", { ascending: false })
      .limit(20),
    db
      .from("assessment_cleanup_runs")
      .select(
        "source,status,started_at,finished_at,selected_count,deleted_count,failed_count,may_have_more,failure_code",
      )
      .eq("source", "scheduled_endpoint")
      .order("started_at", { ascending: false })
      .limit(1),
  ]);
  if (result.error || lastScheduled.error) throw new Error("Cleanup history is unavailable.");
  const runs = (result.data ?? []) as CleanupRun[];
  return {
    executionEnabled: enabled,
    health: cleanupRunHealth((lastScheduled.data ?? []) as CleanupRun[]),
    runs,
    note: "An endpoint invocation is evidence of execution; verify the installed platform schedule separately.",
  };
}
export async function handleCleanup(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  makeDb = teamAdminClient,
) {
  const url = new URL(request.url),
    enabled = env.LT_ASSESSMENT_CLEANUP_EXECUTION === "enabled";
  try {
    if (url.searchParams.get("view") === "status") {
      const db = makeDb(boundedCleanupFetch(8000));
      try {
        const user = await authenticatedUser(request, db);
        await requirePlatformOwner(db, user);
      } catch {
        return json({ error: "Platform owner access required." }, 403);
      }
      return json(await cleanupStatus(db, enabled));
    }
    if (!cleanupCronAuthorized(request, env.CRON_SECRET))
      return json({ error: "Cleanup operator authorization required." }, 401);
    if (!enabled) return json({ error: "Scheduled assessment cleanup is disabled." }, 503);
    const db = makeDb(boundedCleanupFetch(8000));
    const workDb = makeDb(boundedCleanupFetch(8000, AbortSignal.timeout(30000)));
    const result = await runSpeechCleanup(db, "scheduled_endpoint", randomUUID(), workDb);
    const response = json(
      result,
      result.busy ? 202 : result.failed || result.mayHaveMore ? 503 : 200,
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return json(
      {
        error:
          "Cleanup could not finish or access is unavailable. Inspect the private run history; no policy was enabled.",
      },
      503,
    );
  }
}
