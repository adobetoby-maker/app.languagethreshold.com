/** Bounded browser JSON reader; caller owns deadline and request identity. */
export async function readBrowserJson(
  response: Response,
  signal: AbortSignal,
  maxBytes: number,
  errorMessage = "Response unavailable",
): Promise<unknown> {
  const fail = () => new Error(errorMessage);
  if (signal.aborted || Number(response.headers.get("content-length")) > maxBytes) {
    void response.body?.cancel().catch(() => {});
    throw fail();
  }
  if (!response.body) throw fail();
  const reader = response.body.getReader();
  let complete = false;
  const release = () => {
    try {
      reader.releaseLock();
    } catch {
      /* A pending read settles after cancellation. */
    }
  };
  const cancel = () => {
    void reader
      .cancel()
      .catch(() => {})
      .finally(release);
    release();
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      let rejectAbort: (() => void) | undefined;
      let item: ReadableStreamReadResult<Uint8Array>;
      try {
        item = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            rejectAbort = () => reject(fail());
            signal.addEventListener("abort", rejectAbort, { once: true });
            if (signal.aborted) rejectAbort();
          }),
        ]);
        signal.throwIfAborted();
      } finally {
        if (rejectAbort) signal.removeEventListener("abort", rejectAbort);
      }
      if (item.done) {
        complete = true;
        break;
      }
      bytes += item.value.byteLength;
      if (bytes > maxBytes) throw fail();
      chunks.push(item.value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    signal.throwIfAborted();
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } finally {
    signal.removeEventListener("abort", cancel);
    if (complete) release();
    else cancel();
  }
}
