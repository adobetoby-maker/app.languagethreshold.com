// Callers enforce their own origin/auth policy. No body bytes enter errors or diagnostics.
export const PRIVATE_JSON_READ_TIMEOUT_MS = 10_000;
export class PrivateJsonRequestError extends Error {
  readonly status: 400 | 408 | 413 | 499;
  constructor(status: 400 | 408 | 413 | 499) {
    super("Invalid private request");
    this.status = status;
  }
}
export async function readPrivateJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.signal.aborted) {
    void request.body?.cancel().catch(() => {});
    throw new PrivateJsonRequestError(499);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new PrivateJsonRequestError(413);
  }
  if (!request.body) throw new PrivateJsonRequestError(400);
  const reader = request.body.getReader();
  const controller = new AbortController();
  let timedOut = false;
  let complete = false;
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
  const incomingAbort = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PRIVATE_JSON_READ_TIMEOUT_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", incomingAbort, { once: true });
  controller.signal.addEventListener("abort", cancel, { once: true });
  if (request.signal.aborted) controller.abort();
  const current = () => {
    if (controller.signal.aborted)
      throw new PrivateJsonRequestError(request.signal.aborted ? 499 : 408);
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
            rejectAbort = () =>
              reject(new PrivateJsonRequestError(request.signal.aborted ? 499 : 408));
            controller.signal.addEventListener("abort", rejectAbort, { once: true });
            if (controller.signal.aborted) rejectAbort();
          }),
        ]);
        current();
      } finally {
        if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
      }
      if (item.done) {
        complete = true;
        break;
      }
      bytes += item.value.byteLength;
      if (bytes > maxBytes) throw new PrivateJsonRequestError(413);
      chunks.push(item.value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch (error) {
    if (request.signal.aborted) throw new PrivateJsonRequestError(499);
    if (timedOut) throw new PrivateJsonRequestError(408);
    throw error instanceof PrivateJsonRequestError ? error : new PrivateJsonRequestError(400);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", incomingAbort);
    controller.signal.removeEventListener("abort", cancel);
    if (complete) release();
    else cancel();
  }
}
