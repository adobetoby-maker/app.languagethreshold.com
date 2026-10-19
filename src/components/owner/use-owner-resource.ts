import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { ownedTeamRequest } from "@/lib/team-client";

export function useOwnerResource<T>(path: string | null, load = true) {
  const { user, loading, canUseReader } = useAuth();
  const userId = user?.id;
  const { key, capture } = usePracticeLifecycle(JSON.stringify([user?.id, path, loading]));
  const [revision, revise] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error?: string; loading: boolean }>();
  const [busy, setBusy] = useState(false);
  const flight = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const allowed = !!user && !loading && canUseReader(userId!);
  useEffect(() => {
    if (!load || !path || !userId || !allowed) return;
    const lease = capture(),
      controller = new AbortController();
    flight.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () => lease.isCurrent() && canUseReader(userId!) && !controller.signal.aborted;
    setState({ key, loading: true });
    void ownedTeamRequest<T>({ userId, isCurrent: current, signal: controller.signal }, path).then(
      (data) => {
        if (current()) setState({ key, data, loading: false });
      },
      (error) => {
        if (current())
          setState({
            key,
            error: error instanceof Error ? error.message : "Could not load owner data.",
            loading: false,
          });
      },
    );
    return () => {
      controller.abort();
      release();
    };
  }, [path, userId, allowed, capture, key, revision, canUseReader, load]);
  const run = useCallback(
    async <R>(body: unknown): Promise<R | undefined> => {
      if (!userId || !allowed || !path || mutation.current) return;
      const lease = capture(),
        controller = new AbortController();
      mutation.current = controller;
      const release = lease.own(() => {
        controller.abort();
        if (mutation.current === controller) mutation.current = null;
      });
      const current = () =>
        lease.isCurrent() && canUseReader(userId!) && !controller.signal.aborted;
      flight.current?.abort();
      setBusy(true);
      try {
        return await ownedTeamRequest<R>(
          { userId, isCurrent: current, signal: controller.signal },
          path,
          body,
        );
      } finally {
        if (lease.isCurrent()) {
          setBusy(false);
          if (load) revise((n) => n + 1);
        }
        if (mutation.current === controller) mutation.current = null;
        controller.abort();
        release();
      }
    },
    [userId, allowed, path, capture, canUseReader, load],
  );
  return {
    data: allowed && state?.key === key ? state.data : undefined,
    error: allowed && state?.key === key ? state.error : undefined,
    loading: load && allowed && !!path && (state?.key !== key || state.loading),
    busy: busy && allowed,
    allowed,
    run,
    refresh: () => revise((n) => n + 1),
  };
}
