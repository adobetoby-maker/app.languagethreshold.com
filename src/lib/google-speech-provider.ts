// One owned provider phase spans catalog lookup and synthesis, including response bodies.
export const GOOGLE_SPEECH_TIMEOUT_MS = 45_000;
export const MAX_GOOGLE_SPEECH_JSON_BYTES = 6 * 1024 * 1024;
export const MAX_GOOGLE_SPEECH_AUDIO_BYTES = 4 * 1024 * 1024;
export interface GoogleSpeechProvider {
  json(url: string | URL, body?: unknown, maxBytes?: number): Promise<unknown>;
}
export class GoogleSpeechProviderError extends Error {
  readonly status: 499 | 502 | 504;
  constructor(status: 499 | 502 | 504) {
    super("Google voice unavailable");
    this.status = status;
  }
}
export async function withGoogleSpeechProvider<T>(
  apiKey: string,
  incoming: AbortSignal,
  action: (provider: GoogleSpeechProvider) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  let cancelActive: (() => void) | undefined;
  const abort = () => controller.abort();
  const interrupted = () => cancelActive?.();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, GOOGLE_SPEECH_TIMEOUT_MS);
  timer.unref?.();
  incoming.addEventListener("abort", abort, { once: true });
  controller.signal.addEventListener("abort", interrupted);
  if (incoming.aborted) controller.abort();
  const requireCurrent = () => {
    if (controller.signal.aborted) throw new Error("Cancelled");
  };
  const wait = async <V>(pending: Promise<V>): Promise<V> => {
    let rejectAbort: (() => void) | undefined;
    try {
      const value = await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          rejectAbort = () => reject(new Error("Cancelled"));
          controller.signal.addEventListener("abort", rejectAbort, { once: true });
          if (controller.signal.aborted) rejectAbort();
        }),
      ]);
      requireCurrent();
      return value;
    } finally {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
  try {
    requireCurrent();
    return await wait(
      action({
        async json(url, body, maxBytes = MAX_GOOGLE_SPEECH_JSON_BYTES) {
          requireCurrent();
          const pending = fetch(url, {
            method: body === undefined ? "GET" : "POST",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              "x-goog-api-key": apiKey,
              ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          });
          void pending.then(
            (response) => {
              if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
            },
            () => {},
          );
          const response = await wait(pending);
          if (!response.ok || !response.body) {
            void response.body?.cancel().catch(() => {});
            throw new Error("Upstream unavailable");
          }
          const reader = response.body.getReader();
          const release = () => {
            try {
              reader.releaseLock();
            } catch {
              /* Retry after cancellation. */
            }
          };
          const cancel = () => {
            void reader
              .cancel()
              .catch(() => {})
              .finally(release);
            release();
          };
          cancelActive = cancel;
          const chunks: Uint8Array[] = [];
          let bytes = 0;
          let complete = false;
          try {
            for (;;) {
              const item = await wait(reader.read());
              if (item.done) {
                complete = true;
                break;
              }
              bytes += item.value.byteLength;
              if (bytes > maxBytes) throw new Error("Response too large");
              chunks.push(item.value);
            }
            const data = new Uint8Array(bytes);
            let offset = 0;
            for (const chunk of chunks) {
              data.set(chunk, offset);
              offset += chunk.byteLength;
            }
            const parsed: unknown = JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(data),
            );
            requireCurrent();
            return parsed;
          } finally {
            if (cancelActive === cancel) cancelActive = undefined;
            if (!complete) cancel();
            else release();
          }
        },
      }),
    );
  } catch {
    controller.abort();
    throw new GoogleSpeechProviderError(incoming.aborted ? 499 : timedOut ? 504 : 502);
  } finally {
    clearTimeout(timer);
    incoming.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", interrupted);
    cancelActive?.();
  }
}
