import { readBrowserJson } from "./browser-json-response.ts";
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

export function readPushResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  return readBrowserJson(
    response,
    signal,
    PUSH_RESPONSE_MAX_BYTES,
    "Reminder response unavailable",
  );
}
