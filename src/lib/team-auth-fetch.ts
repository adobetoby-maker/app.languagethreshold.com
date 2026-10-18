import { readPrivateServiceJson } from "./private-service-json";

export const TEAM_AUTH_TRANSPORT_MS = 15_000;
export const TEAM_AUTH_RESPONSE_BYTES = 256 * 1024;

/** Select only this client's explicit-JWT user lookup; business transports pass through. */
export function teamAuthFetch(
  projectUrl: string,
  incoming: AbortSignal,
  fetcher: typeof fetch,
): typeof fetch {
  const base = projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`;
  const endpoint = new URL("auth/v1/user", base).href;
  const unavailable = () =>
    Response.json({ message: "Authentication service unavailable" }, { status: 503 });
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (url !== endpoint || method.toUpperCase() !== "GET") return fetcher(input, init);
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, TEAM_AUTH_TRANSPORT_MS);
    timer.unref?.();
    incoming.addEventListener("abort", abort, { once: true });
    const active = () => {
      if (incoming.aborted || controller.signal.aborted) throw new Error("Auth lookup stopped");
    };
    let rejectAbort: (() => void) | undefined;
    try {
      active();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Auth lookup stopped"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
      });
      // Observe ignored transport rejection and dispose headers arriving after cancellation.
      const pending = Promise.resolve().then(() => {
        active();
        return fetcher(input, { ...init, signal: controller.signal, cache: "no-store" });
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
        // Never forward provider diagnostics to the SDK's error parser/logger.
        if (response.status === 401 || response.status === 403)
          return Response.json({ message: "Invalid credentials" }, { status: 401 });
        return unavailable();
      }
      const data = await readPrivateServiceJson(
        response,
        TEAM_AUTH_RESPONSE_BYTES,
        controller.signal,
      );
      active();
      return Response.json(data);
    } catch {
      // Returning a fixed HTTP failure avoids auth-js's raw fetch-rejection logger.
      return unavailable();
    } finally {
      clearTimeout(timer);
      incoming.removeEventListener("abort", abort);
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
}
