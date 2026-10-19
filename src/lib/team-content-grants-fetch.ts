import { z } from "zod";
import { readPrivateServiceJson } from "./private-service-json";

export const TEAM_CONTENT_GRANTS_WAIT_MS = 8_000;
export const TEAM_CONTENT_GRANTS_RESPONSE_BYTES = 128 * 1024;
const grant = z
  .object({
    module_id: z.string(),
    target_language: z.string(),
    instruction_language: z.string(),
    kind: z.enum(["curriculum", "fluent_language", "domain"]),
  })
  .strict();
const result = z.array(grant);

/** Only the exact permission read is selected; other reads and all writes pass through. */
export function teamContentGrantsFetch(
  projectUrl: string,
  incoming: AbortSignal,
  fetcher: typeof fetch,
): typeof fetch {
  const base = new URL(projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`);
  const endpoint = new URL("rest/v1/assessment_content_reviewers", base);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const keys = [...url.searchParams.keys()];
    if (
      method.toUpperCase() !== "GET" ||
      url.origin !== endpoint.origin ||
      url.pathname !== endpoint.pathname ||
      keys.length !== 3 ||
      new Set(keys).size !== 3 ||
      url.searchParams.get("select") !== "module_id,target_language,instruction_language,kind" ||
      url.searchParams.get("active") !== "eq.true" ||
      !url.searchParams.get("user_id")?.startsWith("eq.")
    )
      return fetcher(input, init);
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, TEAM_CONTENT_GRANTS_WAIT_MS);
    timer.unref?.();
    incoming.addEventListener("abort", abort, { once: true });
    const active = () => {
      if (incoming.aborted || controller.signal.aborted)
        throw new Error("Content grant lookup stopped");
    };
    let rejectAbort: (() => void) | undefined;
    try {
      active();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Content grant lookup stopped"));
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
        throw new Error("Content grant service unavailable");
      }
      const data = result.parse(
        await readPrivateServiceJson(
          response,
          TEAM_CONTENT_GRANTS_RESPONSE_BYTES,
          controller.signal,
        ),
      );
      active();
      return Response.json(data);
    } catch {
      return Response.json(
        { code: "LT_CONTENT_GRANTS_UNAVAILABLE", message: "Content grant service unavailable" },
        { status: 503 },
      );
    } finally {
      clearTimeout(timer);
      incoming.removeEventListener("abort", abort);
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
}
