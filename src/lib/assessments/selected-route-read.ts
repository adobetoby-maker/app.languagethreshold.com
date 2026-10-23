import { z } from "zod";
import { teamAdminClient, type TeamDb } from "@/lib/team-server";
import { readPrivateServiceJson } from "@/lib/private-service-json";
import { AssessmentAccessError } from "./errors";

export const SELECTED_ROUTE_WAIT_MS = 8_000;
export const SELECTED_ROUTE_MAX_BYTES = 64 * 1024;

/** Exact immutable route lookup after the caller authorizes this attempt. */
export async function withSelectedRouteRead<T>(
  db: TeamDb,
  request: Request | undefined,
  attemptId: string,
  action: (reads: TeamDb) => Promise<T>,
): Promise<T> {
  if (!request) return action(db);
  const controller = new AbortController();
  const unavailable = () =>
    new AssessmentAccessError("Selected assessment path is unavailable.", 503);
  const current = () => {
    if (request.signal.aborted)
      throw new AssessmentAccessError("Assessment request cancelled.", 499);
    if (controller.signal.aborted) throw unavailable();
  };
  current();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, SELECTED_ROUTE_WAIT_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  try {
    current();
    const stopped = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(unavailable());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
      if (controller.signal.aborted) rejectAbort();
    });
    void stopped.catch(() => {});
    const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const base = new URL(projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`);
    const row = z
      .object({
        attempt_id: z.literal(attemptId),
        source_revision: z.number().int().min(0).max(2147483646),
        decision_revision: z.number().int().min(1).max(2147483647),
        // Frozen decision semantics are checked by resolveSelectedAttemptPath.
        decision: z.record(z.string(), z.unknown()),
      })
      .strict();
    const saved = z.union([z.array(row).max(1), row, z.null()]);
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const keys = [...url.searchParams.keys()];
      const selectedRead =
        url.pathname === new URL("rest/v1/assessment_attempt_routes", base).pathname &&
        keys.length === 2 &&
        url.searchParams.get("select") ===
          "attempt_id,source_revision,decision_revision,decision" &&
        url.searchParams.get("attempt_id") === `eq.${attemptId}`;
      if (
        method !== "GET" ||
        url.origin !== base.origin ||
        new Set(keys).size !== keys.length ||
        !selectedRead
      )
        throw unavailable();
      current();
      const pending = fetch(input, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        redirect: "error",
      });
      void pending.then(
        (response) => {
          if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
        },
        () => {},
      );
      // The enclosing race owns the SDK operation even if this fetch ignores its signal.
      const response = await pending;
      current();
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw unavailable();
      }
      const data = await readPrivateServiceJson(
        response,
        SELECTED_ROUTE_MAX_BYTES,
        controller.signal,
      );
      current();
      return Response.json(saved.parse(data));
    };
    const reads = teamAdminClient(fetcher, request);
    const pending = Promise.resolve().then(() => {
      current();
      return action(reads);
    });
    const result = await Promise.race([pending, stopped]);
    current();
    return result;
  } catch (error) {
    current();
    if (error instanceof AssessmentAccessError) throw error;
    throw unavailable();
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    controller.abort();
  }
}
