import { z } from "zod";
import { teamAdminClient, type TeamDb } from "@/lib/team-server";
import { readPrivateServiceJson } from "@/lib/private-service-json";
import { AssessmentAccessError } from "./errors";

export const WRITING_EVIDENCE_WAIT_MS = 8_000;
export const WRITING_RESPONSE_MAX_BYTES = 64 * 1024;
export const WRITING_HUMAN_REVIEW_MAX_BYTES = 4096;

/** Only saved writing and human-score presence reads belong to this preclaim phase. */
export async function withWritingEvidence<T>(
  db: TeamDb,
  request: Request | undefined,
  attemptId: string,
  responseId: string,
  action: (reads: TeamDb) => Promise<T>,
): Promise<T> {
  if (!request) return action(db);
  const controller = new AbortController();
  const unavailable = () =>
    new AssessmentAccessError("AI writing evidence could not be loaded.", 503);
  const current = () => {
    if (request.signal.aborted)
      throw new AssessmentAccessError("Assessment request cancelled.", 499);
    if (controller.signal.aborted) throw unavailable();
  };
  current();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, WRITING_EVIDENCE_WAIT_MS);
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
        id: z.literal(responseId),
        item_id: z.string(),
        // SQL permits legacy object keys; eligibility still uses the selected frozen item.
        answer: z.record(z.string(), z.unknown()),
      })
      .strict();
    const saved = z.union([z.array(row).max(1), row, z.null()]);
    const human = z.array(z.object({ id: z.string().uuid() }).strict()).max(1);
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const keys = [...url.searchParams.keys()];
      const responseRead =
        url.pathname === new URL("rest/v1/assessment_responses", base).pathname &&
        keys.length === 3 &&
        url.searchParams.get("select") === "id,item_id,answer" &&
        url.searchParams.get("id") === `eq.${responseId}` &&
        url.searchParams.get("attempt_id") === `eq.${attemptId}`;
      const humanRead =
        url.pathname === new URL("rest/v1/assessment_score_events", base).pathname &&
        keys.length === 4 &&
        url.searchParams.get("select") === "id" &&
        url.searchParams.get("response_id") === `eq.${responseId}` &&
        url.searchParams.get("source") === "eq.human" &&
        url.searchParams.get("limit") === "1";
      if (
        method !== "GET" ||
        url.origin !== base.origin ||
        new Set(keys).size !== keys.length ||
        (!responseRead && !humanRead)
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
      // The enclosing race owns both SDK queries even if this fetch ignores its signal.
      const response = await pending;
      current();
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw unavailable();
      }
      const data = await readPrivateServiceJson(
        response,
        responseRead ? WRITING_RESPONSE_MAX_BYTES : WRITING_HUMAN_REVIEW_MAX_BYTES,
        controller.signal,
      );
      current();
      return Response.json(responseRead ? saved.parse(data) : human.parse(data));
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
