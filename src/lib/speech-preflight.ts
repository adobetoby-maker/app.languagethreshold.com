export const SPEECH_PREFLIGHT_TIMEOUT_MS = 15_000;
export class SpeechPreflightError extends Error {
  readonly status: 499 | 503;
  constructor(status: 499 | 503) {
    super("Speaking controls unavailable");
    this.status = status;
  }
}
/** Admission only. Body reading and provider work have their own owned deadlines. */
export async function withSpeechPreflight<T>(
  request: Request,
  action: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, SPEECH_PREFLIGHT_TIMEOUT_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  let rejectAbort: (() => void) | undefined;
  try {
    controller.signal.throwIfAborted();
    const pending = action(controller.signal);
    const value = await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new Error("Admission cancelled"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      }),
    ]);
    controller.signal.throwIfAborted();
    return value;
  } catch {
    controller.abort();
    throw new SpeechPreflightError(request.signal.aborted ? 499 : 503);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
