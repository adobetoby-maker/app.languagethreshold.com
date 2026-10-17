import { adoptExternalDraft, type ExamDeviceDraft } from "./drafts";
import type { ExamAttemptView } from "@/hooks/use-exam-draft";

/** An explicit online continuation, never a client-side branch decision.
 * Keep the retry identity until an authenticated selected snapshot is adopted.
 */
export async function continueExamRouting(options: {
  attempt: ExamAttemptView;
  current: () => ExamDeviceDraft;
  update: (draft: ExamDeviceDraft) => void;
  flush: () => Promise<boolean>;
  isCurrent: () => boolean;
  online: () => boolean;
  requestId: () => string;
  select: (flight: { revision: number; requestId: string }) => Promise<unknown>;
  read: () => Promise<ExamAttemptView>;
  conflict: (latest: ExamAttemptView) => void;
}) {
  const { attempt } = options;
  const active = () => {
    if (!options.isCurrent()) throw new Error("Your session changed. Reopen your own Exams view.");
  };
  active();
  if (!attempt.isLearner || attempt.submittedAt || attempt.routing?.state !== "core")
    throw new Error("Open your active core questions before continuing.");
  if (!options.online())
    throw new Error("Connect to continue. Your core answers stay on this device.");
  if (!(await options.flush()))
    throw new Error("Sync your core answers and resolve any conflict before continuing.");
  active();
  const draft = options.current();
  if (Object.keys(draft.pending).length || draft.flight)
    throw new Error("Core answers changed. Sync them before continuing.");
  const flight = {
    ...(draft.routeFlight ?? { revision: draft.revision, requestId: options.requestId() }),
  };
  options.update({ ...draft, routeFlight: { ...flight } });
  let selectionError: unknown;
  try {
    await options.select(flight);
  } catch (error) {
    selectionError = error;
  }
  active();
  const latest = await options.read();
  active();
  const current = options.current();
  if (
    current.routeFlight?.requestId !== flight.requestId ||
    current.routeFlight.revision !== flight.revision
  )
    throw new Error("This continuation changed. Reopen the current server copy.");
  if (
    selectionError &&
    latest.id === attempt.id &&
    latest.form.id === attempt.form.id &&
    latest.form.version === attempt.form.version &&
    latest.form.rubricVersion === attempt.form.rubricVersion &&
    latest.enrollment.id === attempt.enrollment.id &&
    latest.isLearner &&
    !latest.submittedAt &&
    latest.routing?.state === "core" &&
    selectionError instanceof Error &&
    "status" in selectionError &&
    (selectionError.status === 400 || selectionError.status === 409)
  ) {
    options.update({ ...options.current(), routeFlight: undefined });
    if (selectionError.status === 409) options.conflict(latest);
    throw selectionError;
  }
  const coreCount = attempt.routing.coreItemCount;
  if (
    latest.id !== attempt.id ||
    latest.form.id !== attempt.form.id ||
    latest.form.version !== attempt.form.version ||
    latest.form.rubricVersion !== attempt.form.rubricVersion ||
    latest.enrollment.id !== attempt.enrollment.id ||
    !latest.isLearner ||
    latest.submittedAt ||
    latest.routing?.state !== "selected" ||
    latest.routing.coreItemCount !== coreCount ||
    latest.form.items.length <= coreCount ||
    attempt.form.items.length !== coreCount ||
    attempt.form.items.some((item, index) => item.id !== latest.form.items[index]?.id)
  )
    throw new Error(
      "The saved follow-up questions could not be checked. Reopen this attempt online.",
    );
  const adopted = adoptExternalDraft(current, latest.revision, latest.savedAt);
  options.update({ ...adopted, routeFlight: undefined, index: coreCount });
  return latest;
}
