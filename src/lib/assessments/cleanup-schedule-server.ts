import { cleanupStatusReadFetch } from "./cleanup-status-fetch";
import "@tanstack/react-start/server-only";
import { timingSafeEqual, randomUUID } from "node:crypto";
import {
  teamAdminClient,
  json as baseJson,
  authenticatedAssessmentUser,
  TeamOperationError,
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
export async function cleanupStatus(db: TeamDb, enabled: boolean, readSignal?: AbortSignal) {
  const columns =
    "source,status,started_at,finished_at,selected_count,deleted_count,failed_count,may_have_more,failure_code";
  const recent = db.from("assessment_cleanup_runs").select(columns);
  const scheduled = db
    .from("assessment_cleanup_runs")
    .select(columns)
    .eq("source", "scheduled_endpoint");
  if (readSignal) {
    recent.abortSignal(readSignal).retry(false);
    scheduled.abortSignal(readSignal).retry(false);
  }
  const [result, lastScheduled] = await Promise.all([
    recent.order("started_at", { ascending: false }).limit(20),
    scheduled.order("started_at", { ascending: false }).limit(1),
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
export const CLEANUP_STATUS_READ_MS = 8000;
const statusUnavailable = "Cleanup status is temporarily unavailable. Try again.";
const statusCancelled = "Cleanup status request cancelled.";
async function ownerCleanupStatus(
  request: Request,
  db: TeamDb,
  user: Parameters<typeof requirePlatformOwner>[1],
  enabled: boolean,
  controller: AbortController,
) {
  let expired = false;
  const error = () =>
    new TeamOperationError(
      request.signal.aborted ? statusCancelled : statusUnavailable,
      request.signal.aborted ? 499 : 503,
    );
  const abort = () => controller.abort();
  const timer = setTimeout(() => {
    expired = true;
    abort();
  }, CLEANUP_STATUS_READ_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  const current = () => {
    if (expired || request.signal.aborted || controller.signal.aborted) throw error();
  };
  try {
    current();
    const stopped = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(error());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    const work = (async () => {
      current();
      await requirePlatformOwner(db, user, controller.signal);
      current();
      const result = await cleanupStatus(db, enabled, controller.signal);
      current();
      return result;
    })();
    const result = await Promise.race([work, stopped]);
    current();
    return result;
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
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
      const controller = new AbortController();
      try {
        if (request.signal.aborted) throw new TeamOperationError(statusCancelled, 499);
        const db = makeDb(
          cleanupStatusReadFetch(
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
            AbortSignal.any([request.signal, controller.signal]),
            boundedCleanupFetch(8000, AbortSignal.any([request.signal, controller.signal])),
          ),
          request,
        );
        const user = await authenticatedAssessmentUser(request, db);
        return json(await ownerCleanupStatus(request, db, user, enabled, controller));
      } catch (error) {
        if (request.signal.aborted || (error instanceof TeamOperationError && error.status === 499))
          return json({ error: statusCancelled }, 499);
        if (error instanceof TeamOperationError && error.status === 403)
          return json({ error: "Platform owner access required." }, 403);
        return json({ error: statusUnavailable }, 503);
      } finally {
        controller.abort();
      }
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
