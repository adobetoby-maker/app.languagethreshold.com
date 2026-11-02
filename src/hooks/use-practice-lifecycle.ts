import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/state/auth-state";

/** Per-mounted practice work. A lease owns resources and rejects late callbacks. */
export function usePracticeLifecycle(
  context: string,
  override?: { user: { id: string } | null; isCurrentUser(id: string): boolean },
) {
  const auth = useAuth();
  const { user, isCurrentUser } = override ?? auth;
  const actor = user?.id ?? null;
  const key = JSON.stringify([actor, context]);
  const active = useRef<string | null>(null);
  const epoch = useRef(0);
  const resources = useRef(new Set<() => void>());
  const invalidate = useCallback(() => {
    epoch.current += 1;
    const owned = [...resources.current];
    resources.current.clear();
    for (const dispose of owned) {
      try {
        dispose();
      } catch {
        /* Continue cleaning up other owned resources. */
      }
    }
  }, []);
  useEffect(() => {
    active.current = key;
    return () => {
      active.current = null;
      invalidate();
    };
  }, [key, invalidate]);
  const capture = useCallback(() => {
    const captured = epoch.current;
    const isCurrent = () =>
      active.current === key &&
      epoch.current === captured &&
      (actor === null || isCurrentUser(actor));
    return {
      isCurrent,
      own(dispose: () => void) {
        if (!isCurrent()) {
          dispose();
          return () => {};
        }
        resources.current.add(dispose);
        return () => {
          resources.current.delete(dispose);
        };
      },
    };
  }, [key, actor, isCurrentUser]);
  const cancel = useCallback(() => {
    if (active.current === key && (actor === null || isCurrentUser(actor))) invalidate();
  }, [key, actor, isCurrentUser, invalidate]);
  return { key, actor, capture, cancel };
}
