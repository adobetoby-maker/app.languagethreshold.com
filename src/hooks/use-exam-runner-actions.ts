import { useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examRequest } from "@/lib/assessments/client";
import type { ExamAttemptView, useExamDraft } from "@/hooks/use-exam-draft";

type Draft = Pick<
  ReturnType<typeof useExamDraft>,
  "flush" | "revision" | "clearSubmitted" | "continueRouting" | "resolve" | "conflict"
>;
type Options = {
  attempt: ExamAttemptView;
  fromDevice: boolean;
  blocked: boolean;
  confirmed: boolean;
  draft: Draft;
  checkInputs: () => void;
  onSubmitted: () => void;
  onContinued: (attempt: ExamAttemptView) => void;
};
/** Own the work around draft operations as well as the final submission request. */
export function useExamRunnerActions(options: Options) {
  const { attempt, draft } = options;
  const context = JSON.stringify([
    attempt.id,
    attempt.form.id,
    attempt.isLearner,
    attempt.submittedAt,
    attempt.routing?.state,
    options.fromDevice,
    options.blocked,
    options.confirmed,
  ]);
  const { actor, key, capture } = usePracticeLifecycle(context);
  const pending = useRef<AbortController | null>(null);
  const retry = useRef<{ key: string; revision: number; requestId: string } | null>(null);
  const [status, setStatus] = useState<{ key: string; busy: boolean; error: string } | null>(null);
  const currentView = () => !!actor && capture().isCurrent();
  async function run(work: (signal: AbortSignal, current: () => boolean) => Promise<void>) {
    const lease = capture();
    if (
      !actor ||
      !attempt.isLearner ||
      attempt.submittedAt ||
      options.blocked ||
      !lease.isCurrent() ||
      pending.current
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
    setStatus({ key, busy: true, error: "" });
    try {
      await work(controller.signal, current);
    } catch (error) {
      if (current())
        setStatus({
          key,
          busy: false,
          error: error instanceof Error ? error.message : "Exam action could not finish.",
        });
    } finally {
      if (current())
        setStatus((previous) => (previous?.key === key ? { ...previous, busy: false } : previous));
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }
  const submit = () => {
    if (!options.confirmed || attempt.routing?.state === "core") return;
    return run(async (signal, current) => {
      options.checkInputs();
      const saved = await draft.flush();
      if (!current()) return;
      if (!saved)
        throw new Error("Sync your device answers and resolve any conflict before submitting.");
      options.checkInputs();
      const revision = draft.revision();
      if (retry.current?.key !== key || retry.current.revision !== revision)
        retry.current = { key, revision, requestId: crypto.randomUUID() };
      await examRequest(
        { action: "submit", attemptId: attempt.id, revision, requestId: retry.current.requestId },
        signal,
        { userId: actor!, isCurrent: current },
      );
      if (!current()) return;
      draft.clearSubmitted();
      options.onSubmitted();
    });
  };
  const continueRouting = () => {
    if (attempt.routing?.state !== "core") return;
    return run(async (signal, current) => {
      options.checkInputs();
      const latest = await draft.continueRouting(signal);
      if (current()) options.onContinued(latest);
    });
  };
  const resolveConflict = (keepDevice: boolean) => {
    if (!draft.conflict) return;
    return run(async (signal, current) => {
      const latest = await draft.resolve(keepDevice, signal);
      if (current() && latest && latest.routing?.state !== attempt.routing?.state)
        options.onContinued(latest);
    });
  };
  const cancel = () => {
    if (!currentView()) return;
    pending.current?.abort();
    pending.current = null;
    setStatus(null);
  };
  return {
    submit,
    continueRouting,
    resolveConflict,
    cancel,
    currentView,
    isPending: () => pending.current !== null,
    busy: status?.key === key && status.busy,
    error: status?.key === key ? status.error : "",
  };
}
