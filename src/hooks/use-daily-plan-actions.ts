import { useEffect, useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examPlanRequest, examRequest } from "@/lib/assessments/client";

/** One support action belongs to the displayed plan snapshot and lesson context. */
export function useDailyPlanActions(
  context: string,
  snapshot: object | null,
  enabled: boolean,
  onStart: () => void,
) {
  const { actor, key, capture } = usePracticeLifecycle(JSON.stringify([context, enabled]));
  const activeSnapshot = useRef<object | null>(null);
  const pending = useRef<{ controller: AbortController; dispose: () => void } | null>(null);
  const retry = useRef<{ key: string; action: string; id: string; requestId: string } | null>(null);
  const [status, setStatus] = useState<{
    key: string;
    snapshot: object | null;
    busy: boolean;
    error: string;
  } | null>(null);
  useEffect(() => {
    activeSnapshot.current = snapshot;
    return () => {
      activeSnapshot.current = null;
      pending.current?.dispose();
    };
  }, [snapshot]);
  const isCurrentView = () =>
    !!actor && capture().isCurrent() && activeSnapshot.current === snapshot;
  async function act<T>(
    action: "acknowledge" | "start",
    id: string,
    onSuccess: (result: T) => void,
  ) {
    const lease = capture();
    if (
      !actor ||
      !enabled ||
      !snapshot ||
      !id ||
      !lease.isCurrent() ||
      activeSnapshot.current !== snapshot ||
      pending.current
    )
      return;
    const controller = new AbortController();
    let release = () => {};
    const flight = {
      controller,
      dispose: () => {
        release();
        controller.abort();
        if (pending.current === flight) pending.current = null;
      },
    };
    pending.current = flight;
    release = lease.own(flight.dispose);
    const current = () =>
      lease.isCurrent() &&
      !controller.signal.aborted &&
      pending.current === flight &&
      activeSnapshot.current === snapshot;
    setStatus({ key, snapshot, busy: true, error: "" });
    try {
      onStart();
      if (retry.current?.key !== key || retry.current.action !== action || retry.current.id !== id)
        retry.current = { key, action, id, requestId: crypto.randomUUID() };
      const body = {
        action,
        ...(action === "acknowledge" ? { assignmentId: id } : { checkpointId: id }),
        requestId: retry.current.requestId,
      };
      const result = await (action === "acknowledge"
        ? examPlanRequest<T>(body, controller.signal)
        : examRequest<T>(body, controller.signal));
      if (current()) onSuccess(result);
    } catch (error) {
      if (current())
        setStatus({
          key,
          snapshot,
          busy: false,
          error: error instanceof Error ? error.message : "Supporting work could not open.",
        });
    } finally {
      if (current())
        setStatus((previous) => (previous?.key === key ? { ...previous, busy: false } : previous));
      flight.dispose();
    }
  }
  return {
    act,
    isCurrentView,
    isPending: () => pending.current !== null,
    busy: status?.key === key && status.snapshot === snapshot && status.busy,
    error: status?.key === key && status.snapshot === snapshot ? status.error : "",
  };
}
