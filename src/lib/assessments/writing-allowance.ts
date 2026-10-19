import { z } from "zod";
import { teamAdminClient, type TeamDb } from "@/lib/team-server";
import { readPrivateServiceJson } from "@/lib/private-service-json";
import { AssessmentAccessError } from "./errors";

export const WRITING_ALLOWANCE_WAIT_MS = 8_000;
export const WRITING_ENROLLMENT_MAX_BYTES = 64 * 1024;
const unavailable = () => new AssessmentAccessError("AI review allowance is unavailable.", 503);
const enrollments = z
  .array(z.object({ id: z.string().uuid() }).strict())
  .max(1000)
  .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length);

/** No writes: the caller still makes the durable grading claim separately. */
export async function readWritingAllowance(db: TeamDb, actor: string, request?: Request) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort: (() => void) | undefined;
  let ids: string[] = [];
  const current = () => {
    if (request?.signal.aborted)
      throw new AssessmentAccessError("Assessment request cancelled.", 499);
    if (controller.signal.aborted) throw unavailable();
  };
  const abort = () => controller.abort();
  const wait = async <T>(pending: PromiseLike<T>) => {
    if (!request) return await pending;
    current();
    const stopped = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(unavailable());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
      if (controller.signal.aborted) rejectAbort();
    });
    try {
      const result = await Promise.race([pending, stopped]);
      current();
      return result;
    } finally {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
      rejectAbort = undefined;
    }
  };
  try {
    current();
    if (request) {
      timer = setTimeout(abort, WRITING_ALLOWANCE_WAIT_MS);
      timer.unref?.();
      request.signal.addEventListener("abort", abort, { once: true });
      const projectUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
      const base = new URL(projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`);
      const fetcher: typeof fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        const method = init?.method ?? (input instanceof Request ? input.method : "GET");
        const keys = [...url.searchParams.keys()];
        const enrollmentRead =
          method === "GET" &&
          url.pathname === new URL("rest/v1/assessment_enrollments", base).pathname &&
          keys.length === 3 &&
          url.searchParams.get("select") === "id" &&
          url.searchParams.get("user_id") === `eq.${actor}` &&
          url.searchParams.get("limit") === "1000";
        const countRead =
          method === "HEAD" &&
          url.pathname === new URL("rest/v1/assessment_events", base).pathname &&
          keys.length === 4 &&
          url.searchParams.get("select") === "id" &&
          url.searchParams.get("enrollment_id") === `in.(${ids.join(",")})` &&
          url.searchParams.get("action") === "eq.ai.requested" &&
          url.searchParams.get("created_at")?.startsWith("gte.");
        if (
          url.origin !== base.origin ||
          new Set(keys).size !== keys.length ||
          (!enrollmentRead && !countRead)
        )
          return fetch(input, init);
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
        // The enclosing phase races the entire SDK operation, including ignored fetch aborts.
        const response = await pending;
        current();
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw unavailable();
        }
        if (enrollmentRead)
          return Response.json(
            enrollments.parse(
              await readPrivateServiceJson(
                response,
                WRITING_ENROLLMENT_MAX_BYTES,
                controller.signal,
              ),
            ),
          );
        void response.body?.cancel().catch(() => {});
        const range = response.headers.get("content-range")?.match(/^(?:\*|\d+-\d+)\/(\d+)$/);
        const count = range ? Number(range[1]) : NaN;
        if (!Number.isSafeInteger(count) || count < 0) throw unavailable();
        return new Response(null, { headers: { "Content-Range": `*/${count}` } });
      };
      db = teamAdminClient(fetcher, request);
    }
    current();
    let enrollmentQuery = db
      .from("assessment_enrollments")
      .select("id")
      .eq("user_id", actor)
      .limit(1000);
    if (request) enrollmentQuery = enrollmentQuery.abortSignal(controller.signal).retry(false);
    const own = await wait(enrollmentQuery);
    current();
    if (own.error || (own.data?.length ?? 0) >= 1000) throw unavailable();
    ids = (own.data ?? []).map((row) => row.id);
    let countQuery = db
      .from("assessment_events")
      .select("id", { count: "exact", head: true })
      .in("enrollment_id", ids)
      .eq("action", "ai.requested")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (request) countQuery = countQuery.abortSignal(controller.signal).retry(false);
    const result = await wait(countQuery);
    current();
    if (result.error || result.count === null) throw unavailable();
    return result.count;
  } catch {
    current();
    throw unavailable();
  } finally {
    if (timer) clearTimeout(timer);
    request?.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    controller.abort();
  }
}
