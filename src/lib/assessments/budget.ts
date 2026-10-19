import { enforceSpeakingRateLimit, type SpeakingLimitResult } from "@/lib/speaking-security";
import { AssessmentAccessError } from "./errors";

export const ASSESSMENT_BUDGET_WAIT_MS = 8_000;
/** The quota POST may consume a counter after departure; never replay it or infer rollback. */
async function ownedBudget(
  request: Request,
  consume: (signal: AbortSignal) => Promise<SpeakingLimitResult>,
) {
  const unavailable = () =>
    new AssessmentAccessError("Assessment request controls are unavailable.", 503);
  const current = () => {
    if (request.signal.aborted)
      throw new AssessmentAccessError("Assessment request cancelled.", 499);
  };
  current();
  const controller = new AbortController(),
    abort = () => controller.abort();
  const timer = setTimeout(abort, ASSESSMENT_BUDGET_WAIT_MS);
  timer.unref?.();
  request.signal.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  try {
    current();
    const stopped = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(unavailable());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    void stopped.catch(() => {});
    const pending = Promise.resolve().then(() => {
      current();
      if (controller.signal.aborted) throw unavailable();
      return consume(controller.signal);
    });
    const result = await Promise.race([pending, stopped]);
    current();
    if (controller.signal.aborted) throw unavailable();
    return result;
  } catch {
    current();
    throw unavailable();
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
    controller.abort();
  }
}

export async function assessmentBudget(actor: string, action: string, request?: Request) {
  const limit =
    action === "history_export"
      ? 2
      : action === "ai_proposal" || action === "speech_upload"
        ? 3
        : action === "save"
          ? 90
          : action === "enroll" || action === "start"
            ? 6
            : 30;
  const consume = (signal?: AbortSignal) =>
    enforceSpeakingRateLimit(actor, `exams:${action}`, limit, signal).catch(() => ({
      allowed: false,
      misconfigured: true,
    }));
  const result = request ? await ownedBudget(request, consume) : await consume();
  if (request?.signal.aborted)
    throw new AssessmentAccessError("Assessment request cancelled.", 499);
  if (!result.allowed)
    throw new AssessmentAccessError(
      result.misconfigured
        ? "Assessment request controls are unavailable."
        : "Please wait a minute before trying again.",
      result.misconfigured ? 503 : 429,
    );
}
