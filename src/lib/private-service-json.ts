// Server-only service responses share the caller's deadline; errors never include payloads.
export class PrivateServiceJsonError extends Error {
  constructor() {
    super("Private service response unavailable");
  }
}

export async function readPrivateServiceJson(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
  allowEmpty = false,
): Promise<unknown> {
  const fail = () => new PrivateServiceJsonError();
  if (signal.aborted || Number(response.headers.get("content-length")) > maxBytes) {
    void response.body?.cancel().catch(() => {});
    throw fail();
  }
  if (!response.body) {
    if (allowEmpty) return null;
    throw fail();
  }
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = response.body.getReader();
  } catch {
    throw fail();
  }
  let complete = false;
  const release = () => {
    try {
      reader.releaseLock();
    } catch {
      /* Pending reads settle after cancellation. */
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
  const current = () => {
    if (signal.aborted) throw fail();
  };
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      current();
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
        current();
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
    if (bytes === 0 && allowEmpty) return null;
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    current();
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {
    throw fail();
  } finally {
    signal.removeEventListener("abort", cancel);
    if (complete) release();
    else cancel();
  }
}
