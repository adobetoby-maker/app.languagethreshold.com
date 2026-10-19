import { z } from "zod";
import { readPrivateServiceJson } from "./private-service-json";

export const EVIDENCE_REVIEWER_WAIT_MS = 8_000;
export const EVIDENCE_REVIEWER_RESPONSE_BYTES = 4096;
/** Only the exact permission read is selected; other reads and all writes pass through. */
export function evidenceReviewerFetch(
  projectUrl: string,
  incoming: AbortSignal,
  fetcher: typeof fetch,
): typeof fetch {
  const base = new URL(projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`);
  const endpoint = new URL("rest/v1/assessment_reviewers", base);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const keys = [...url.searchParams.keys()];
    const exact =
      keys.length === 6 &&
      ["module_id", "target_language", "instruction_language"].every((key) =>
        url.searchParams.get(key)?.startsWith("eq."),
      );
    const eligibility = keys.length === 4 && url.searchParams.get("limit") === "1";
    const actor = url.searchParams.get("user_id")?.slice(3);
    if (
      method.toUpperCase() !== "GET" ||
      url.origin !== endpoint.origin ||
      url.pathname !== endpoint.pathname ||
      new Set(keys).size !== keys.length ||
      url.searchParams.get("select") !== "user_id" ||
      url.searchParams.get("active") !== "eq.true" ||
      !url.searchParams.get("user_id")?.startsWith("eq.") ||
      !actor ||
      (!exact && !eligibility)
    )
      return fetcher(input, init);
    const reviewer = z.object({ user_id: z.literal(actor) }).strict();
    const rows = z.array(reviewer).max(1);
    const result = eligibility ? rows : z.union([rows, reviewer, z.null()]);
    const controller = new AbortController();
    const outer = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const abort = () => controller.abort();
    const timer = setTimeout(abort, EVIDENCE_REVIEWER_WAIT_MS);
    timer.unref?.();
    incoming.addEventListener("abort", abort, { once: true });
    outer?.addEventListener("abort", abort, { once: true });
    const active = () => {
      if (incoming.aborted || outer?.aborted || controller.signal.aborted)
        throw new Error("Reviewer status lookup stopped");
    };
    let rejectAbort: (() => void) | undefined;
    try {
      active();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Reviewer status lookup stopped"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
      });
      const pending = Promise.resolve().then(() => {
        active();
        return fetcher(input, {
          ...init,
          signal: controller.signal,
          cache: "no-store",
          redirect: "error",
        });
      });
      void pending.then(
        (response) => {
          if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
        },
        () => {},
      );
      const response = await Promise.race([pending, stopped]);
      active();
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error("Reviewer status service unavailable");
      }
      const data = result.parse(
        await readPrivateServiceJson(response, EVIDENCE_REVIEWER_RESPONSE_BYTES, controller.signal),
      );
      active();
      return Response.json(data);
    } catch {
      return Response.json(
        { code: "LT_REVIEWER_UNAVAILABLE", message: "Reviewer status service unavailable" },
        { status: 503 },
      );
    } finally {
      clearTimeout(timer);
      incoming.removeEventListener("abort", abort);
      outer?.removeEventListener("abort", abort);
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
}
