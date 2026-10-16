import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/state/auth-state";
import { createLearnerDeviceStore } from "@/lib/learner-device-store";

/** These providers live inside the account-keyed AppProvider subtree. */
export function useLearnerDeviceStore(kind: string) {
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useMemo(() => {
    let storage: Storage | null = null;
    try {
      if (typeof window !== "undefined") storage = window.localStorage;
    } catch {
      /* blocked */
    }
    return createLearnerDeviceStore({
      kind,
      actor,
      storage,
      isCurrent: () => mounted.current && (actor === null || isCurrentUser(actor)),
    });
  }, [kind, actor, isCurrentUser]);
}
