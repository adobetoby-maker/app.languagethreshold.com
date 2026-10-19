import Anthropic from "@anthropic-ai/sdk";
import { readPrivateServiceJson } from "@/lib/private-service-json";

export const WRITING_PROVIDER_WAIT_MS = 25_000;
export const WRITING_PROVIDER_MAX_BYTES = 128 * 1024;

/** A claimed operation owns one provider attempt, independently of browser departure. */
export async function requestWritingProposal(
  apiKey: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const controller = new AbortController();
  const unavailable = () => new Error("Writing proposal provider unavailable");
  const current = () => {
    if (controller.signal.aborted) throw unavailable();
  };
  const timer = setTimeout(() => controller.abort(), WRITING_PROVIDER_WAIT_MS);
  timer.unref?.();
  const wait = async <T>(pending: PromiseLike<T>): Promise<T> => {
    let rejectAbort: (() => void) | undefined;
    try {
      current();
      const stopped = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(unavailable());
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      });
      const result = await Promise.race([pending, stopped]);
      current();
      return result;
    } finally {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
  try {
    const client = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: WRITING_PROVIDER_WAIT_MS,
      fetch: async (url, options) => {
        current();
        const pending = fetch(url, {
          ...options,
          cache: "no-store",
          redirect: "error",
          signal: options?.signal
            ? AbortSignal.any([controller.signal, options.signal])
            : controller.signal,
        });
        void pending.then(
          (response) => {
            if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
          },
          () => {},
        );
        const response = await wait(pending);
        const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim();
        if (!(mediaType?.includes("application/json") || mediaType?.endsWith("+json"))) {
          void response.body?.cancel().catch(() => {});
          throw unavailable();
        }
        // Bound error bodies too, before the SDK can parse or attach a provider diagnostic.
        const payload = await wait(
          readPrivateServiceJson(response, WRITING_PROVIDER_MAX_BYTES, controller.signal),
        );
        current();
        const headers = new Headers(response.headers);
        headers.set("content-type", "application/json");
        headers.delete("content-length");
        headers.delete("content-encoding");
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      },
    });
    return await wait(client.messages.create(params, { signal: controller.signal }));
  } catch {
    throw unavailable();
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
