import Anthropic from "@anthropic-ai/sdk";

export const SPEAKING_PROVIDER_TIMEOUT_MS = 45_000;
export const MAX_SPEAKING_PROVIDER_BYTES = 1024 * 1024;
export class SpeakingProviderError extends Error {
  readonly status: 499 | 502 | 504;
  constructor(status: 499 | 502 | 504) {
    super("Speaking provider unavailable");
    this.status = status;
  }
}
/** One request owns one SDK attempt, including JSON or streamed response consumption. */
export async function withSpeakingProvider(
  request: Request,
  apiKey: string,
  action: (client: Anthropic, options: { signal: AbortSignal }) => Promise<Response>,
): Promise<Response> {
  const controller = new AbortController();
  const cancellations = new Set<() => void>();
  let timedOut = false;
  const abort = () => controller.abort();
  const cancelReaders = () => {
    for (const cancel of [...cancellations]) cancel();
  };
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SPEAKING_PROVIDER_TIMEOUT_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  controller.signal.addEventListener("abort", cancelReaders);
  if (request.signal.aborted) controller.abort();
  const status = () => (request.signal.aborted ? 499 : timedOut ? 504 : 502);
  const current = () => {
    if (controller.signal.aborted) throw new SpeakingProviderError(status());
  };
  const dispose = () => {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", cancelReaders);
    cancelReaders();
  };
  const wait = async <T>(pending: Promise<T>): Promise<T> => {
    let rejectAbort: (() => void) | undefined;
    try {
      const value = await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          rejectAbort = () => reject(new SpeakingProviderError(status()));
          controller.signal.addEventListener("abort", rejectAbort, { once: true });
          if (controller.signal.aborted) rejectAbort();
        }),
      ]);
      current();
      return value;
    } finally {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
  const ownReader = (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const release = () => {
      try {
        reader.releaseLock();
      } catch {
        /* Pending reads settle after cancellation. */
      }
    };
    const cancel = () => {
      cancellations.delete(cancel);
      void reader
        .cancel()
        .catch(() => {})
        .finally(release);
      release();
    };
    cancellations.add(cancel);
    return {
      reader,
      cancel,
      release: () => {
        cancellations.delete(cancel);
        release();
      },
    };
  };
  try {
    current();
    const client = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: SPEAKING_PROVIDER_TIMEOUT_MS,
      fetch: async (url, options) => {
        current();
        const pending = fetch(url, {
          ...options,
          cache: "no-store",
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
        if (
          !response.body ||
          Number(response.headers.get("content-length")) > MAX_SPEAKING_PROVIDER_BYTES
        ) {
          void response.body?.cancel().catch(() => {});
          throw new SpeakingProviderError(502);
        }
        const owned = ownReader(response.body);
        let bytes = 0;
        const body = new ReadableStream<Uint8Array>({
          async pull(output) {
            try {
              const item = await wait(owned.reader.read());
              if (item.done) {
                owned.release();
                output.close();
                return;
              }
              bytes += item.value.byteLength;
              if (bytes > MAX_SPEAKING_PROVIDER_BYTES) throw new SpeakingProviderError(502);
              output.enqueue(item.value);
            } catch {
              controller.abort();
              owned.cancel();
              output.error(new SpeakingProviderError(status()));
            }
          },
          cancel() {
            owned.cancel();
            controller.abort();
          },
        });
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
    });
    const pendingAction = action(client, { signal: controller.signal });
    void pendingAction.then(
      (response) => {
        if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
      },
      () => {},
    );
    const response = await wait(pendingAction);
    if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body) {
      dispose();
      return response;
    }
    const owned = ownReader(response.body);
    // Stream headers have already been selected; interruption errors the body, never emits success.
    const body = new ReadableStream<Uint8Array>({
      async pull(output) {
        try {
          const item = await wait(owned.reader.read());
          if (item.done) {
            owned.release();
            dispose();
            output.close();
            return;
          }
          output.enqueue(item.value);
        } catch {
          controller.abort();
          owned.cancel();
          dispose();
          output.error(new Error("AI response interrupted. Please try again."));
        }
      },
      cancel() {
        controller.abort();
        owned.cancel();
        dispose();
      },
    });
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    controller.abort();
    dispose();
    throw new SpeakingProviderError(status());
  }
}
