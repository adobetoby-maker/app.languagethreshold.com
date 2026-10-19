import { readPrivateServiceJson } from "./private-service-json";
/** Bound each owner SDK response, including Auth admin results. Secrets stay server-side. */
export function ownerServiceFetch(
  incoming: AbortSignal,
  fetcher: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(15000);
    const signal = AbortSignal.any([incoming, timeout, ...(init?.signal ? [init.signal] : [])]);
    signal.throwIfAborted();
    let onAbort: (() => void) | undefined;
    const stopped = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error("Owner service request stopped"));
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
    });
    const pending = Promise.resolve().then(() => {
      signal.throwIfAborted();
      return fetcher(input, { ...init, signal, cache: "no-store", redirect: "error" });
    });
    void pending.then(
      (response) => {
        if (signal.aborted) void response?.body?.cancel().catch(() => {});
      },
      () => {},
    );
    let response: Response | undefined;
    try {
      response = await Promise.race([pending, stopped]);
      const data = await readPrivateServiceJson(response, 512 * 1024, signal, true);
      signal.throwIfAborted();
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      return new Response(data === null ? null : JSON.stringify(data), {
        status: response.status,
        headers,
      });
    } catch (error) {
      void response?.body?.cancel().catch(() => {});
      throw error;
    } finally {
      if (onAbort) signal.removeEventListener("abort", onAbort);
    }
  };
}
