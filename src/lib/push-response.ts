/** Browser request phase: credential lookup, transport and bounded acknowledgement reading. */
export const PUSH_REQUEST_WAIT_MS = 30_000;
export const PUSH_RESPONSE_MAX_BYTES = 16 * 1024;
export async function withPushRequest<T>(
  incoming: AbortSignal,
  current: () => boolean,
  action: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const check = () => {
    if (incoming.aborted || !current() || controller.signal.aborted)
      throw new DOMException("Reminder request cancelled.", "AbortError");
  };
  const abort = () => controller.abort();
  const timer = setTimeout(abort, PUSH_REQUEST_WAIT_MS);
  incoming.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  try {
    if (incoming.aborted) controller.abort();
    check();
    const value = await Promise.race([
      action(controller.signal),
      new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Reminder request ended"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      }),
    ]);
    check();
    return value;
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timer);
    incoming.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}

export async function readPushResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  const fail = () => new Error("Reminder response unavailable");
  if (signal.aborted || Number(response.headers.get("content-length")) > PUSH_RESPONSE_MAX_BYTES) {
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
      if (bytes > PUSH_RESPONSE_MAX_BYTES) throw fail();
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
