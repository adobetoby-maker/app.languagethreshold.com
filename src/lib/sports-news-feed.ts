export const SPORTS_FEED_TIMEOUT_MS = 8_000;
export const MAX_SPORTS_FEED_BYTES = 1024 * 1024;
/** Fixed feed URLs only; the caller owns the request and each bounded feed read. */
export async function readSportsFeed(url: string, incoming: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, SPORTS_FEED_TIMEOUT_MS);
  timer.unref?.();
  incoming.addEventListener("abort", abort, { once: true });
  if (incoming.aborted) controller.abort();
  const current = () => {
    if (controller.signal.aborted) throw new Error("News feed unavailable");
  };
  const wait = async <T>(pending: Promise<T>): Promise<T> => {
    let rejectAbort: (() => void) | undefined;
    try {
      const result = await Promise.race([
        pending,
        new Promise<never>((_, reject) => {
          rejectAbort = () => reject(new Error("News feed unavailable"));
          controller.signal.addEventListener("abort", rejectAbort, { once: true });
          if (controller.signal.aborted) rejectAbort();
        }),
      ]);
      current();
      return result;
    } finally {
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    }
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  const release = () => {
    try {
      reader?.releaseLock();
    } catch {
      /* Pending read cancellation. */
    }
  };
  const cancel = () => {
    void reader
      ?.cancel()
      .catch(() => {})
      .finally(release);
    release();
  };
  controller.signal.addEventListener("abort", cancel, { once: true });
  try {
    current();
    const pending = fetch(url, {
      headers: { "User-Agent": "LanguageThreshold/1.0 (+https://app.languagethreshold.com)" },
      cache: "no-store",
      signal: controller.signal,
    });
    void pending.then(
      (response) => {
        if (controller.signal.aborted) void response.body?.cancel().catch(() => {});
      },
      () => {},
    );
    const response = await wait(pending);
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get("content-length")) > MAX_SPORTS_FEED_BYTES
    ) {
      void response.body?.cancel().catch(() => {});
      throw new Error("News feed unavailable");
    }
    reader = response.body.getReader();
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const item = await wait(reader.read());
      if (item.done) {
        complete = true;
        break;
      }
      bytes += item.value.byteLength;
      if (bytes > MAX_SPORTS_FEED_BYTES) throw new Error("News feed unavailable");
      chunks.push(item.value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    current();
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    controller.abort();
    throw new Error("News feed unavailable");
  } finally {
    clearTimeout(timer);
    incoming.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", cancel);
    if (complete) release();
    else cancel();
  }
}
