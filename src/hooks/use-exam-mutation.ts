import { useCallback, useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examRequest } from "@/lib/assessments/client";
/** One mutation for the mounted form context; accepted server writes cannot be undone. */
export function useExamMutation(context: string, onStart: () => void) {
  const { actor, key, capture } = usePracticeLifecycle(context);
  const pending = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<{ key: string; busy: boolean; error: string } | null>(null);
  const clearError = useCallback(() => {
    if (capture().isCurrent())
      setStatus((current) => (current?.key === key ? { ...current, error: "" } : current));
  }, [capture, key]);
  async function act<T>(
    body: Record<string, unknown> | (() => Record<string, unknown>),
    onSuccess: (
      result: T,
      context: { signal: AbortSignal; isCurrent: () => boolean },
    ) => void | Promise<void>,
  ) {
    const lease = capture();
    if (!actor || !lease.isCurrent() || pending.current) return;
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
      onStart();
      const result = await examRequest<T>(
        typeof body === "function" ? body() : body,
        controller.signal,
      );
      if (current()) await onSuccess(result, { signal: controller.signal, isCurrent: current });
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
  const cancel = useCallback(() => {
    if (!capture().isCurrent()) return;
    pending.current?.abort();
    pending.current = null;
    setStatus(null);
  }, [capture]);
  return {
    act,
    cancel,
    clearError,
    isPending: () => pending.current !== null,
    busy: status?.key === key && status.busy,
    error: status?.key === key ? status.error : "",
  };
}
