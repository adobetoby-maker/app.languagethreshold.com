// One provider attempt; the deadline remains active through downstream consumption.
export const REMOTE_SPEECH_TIMEOUT_MS = 45_000;
export const MAX_REMOTE_SPEECH_BYTES = 4 * 1024 * 1024;
export class RemoteSpeechProviderError extends Error {
  constructor(readonly status: 502 | 504) {
    super("Remote speech unavailable");
  }
}

export async function remoteSpeechAudio(
  text: string,
  apiKey: string,
  incoming: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  let timedOut = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let output: ReadableStreamDefaultController<Uint8Array> | undefined;
  let finished = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REMOTE_SPEECH_TIMEOUT_MS);
  timer.unref?.();
  const incomingAbort = () => controller.abort();
  const cleanup = () => {
    clearTimeout(timer);
    incoming.removeEventListener("abort", incomingAbort);
    controller.signal.removeEventListener("abort", interrupted);
  };
  const cancelReader = () => {
    const ownedReader = reader;
    if (!ownedReader) return;
    void ownedReader
      .cancel()
      .catch(() => {})
      .finally(() => {
        try {
          ownedReader.releaseLock();
        } catch {
          /* A pending transport read may still own the lock. */
        }
      });
  };
  const interrupted = () => {
    if (finished) return;
    finished = true;
    output?.error(new Error("Remote speech interrupted"));
    cancelReader();
    cleanup();
  };
  incoming.addEventListener("abort", incomingAbort, { once: true });
  controller.signal.addEventListener("abort", interrupted, { once: true });
  if (incoming.aborted) controller.abort();
  try {
    if (controller.signal.aborted) throw new Error("Cancelled");
    const pending = fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/XrExE9yKIg1WjnnlVkGX?output_format=mp3_44100_64",
      {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_v3", language_code: "ps" }),
      },
    );
    // A late response must be disposed even if a transport ignores cancellation.
    void pending.then(
      (response) => {
        if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
      },
      () => {},
    );
    let rejectAbort: (() => void) | undefined;
    const response = await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Cancelled"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      }),
    ]).finally(() => {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    });
    if (!response.ok || !response.body) {
      void response.body?.cancel().catch(() => {});
      throw new RemoteSpeechProviderError(502);
    }
    if (controller.signal.aborted) throw new Error("Cancelled");
    reader = response.body.getReader();
    let bytes = 0;
    return new ReadableStream<Uint8Array>({
      start(destination) {
        output = destination;
      },
      async pull(destination) {
        if (finished) return;
        try {
          const item = await reader!.read();
          if (finished) return;
          if (item.done) {
            finished = true;
            cleanup();
            reader!.releaseLock();
            destination.close();
            return;
          }
          bytes += item.value.byteLength;
          if (bytes > MAX_REMOTE_SPEECH_BYTES) throw new Error("Audio too large");
          destination.enqueue(item.value);
        } catch {
          if (finished) return;
          finished = true;
          destination.error(new Error("Remote speech interrupted"));
          controller.abort();
          cancelReader();
          cleanup();
        }
      },
      cancel() {
        if (finished) return;
        finished = true;
        controller.abort();
        cancelReader();
        cleanup();
      },
    });
  } catch {
    finished = true;
    controller.abort();
    cancelReader();
    cleanup();
    throw new RemoteSpeechProviderError(timedOut ? 504 : 502);
  }
}
