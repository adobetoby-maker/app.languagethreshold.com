import { useEffect, useMemo } from "react";
import { buildLearningReminderContext } from "@/lib/learning-reminders";
import { syncPushContext, wasPushEnabled } from "@/lib/push-api";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";

export function PushReminderSync() {
  const { state } = useApp();
  const { user } = useAuth();
  const context = useMemo(() => buildLearningReminderContext(state), [state]);
  const serialized = JSON.stringify(context);
  const { capture } = usePracticeLifecycle(serialized);

  useEffect(() => {
    if (!user || !state.hydrated || !wasPushEnabled(user.id)) return;
    const lease = capture();
    if (!lease.isCurrent()) return;
    const controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const timer = window.setTimeout(() => {
      if (!lease.isCurrent() || controller.signal.aborted) return;
      void syncPushContext(
        { userId: user.id, isCurrent: lease.isCurrent, signal: controller.signal },
        context,
      ).catch(() => {});
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      release();
    };
  }, [capture, context, serialized, state.hydrated, user]);

  useEffect(() => {
    const clearBadge = () => {
      const badgeNavigator = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
      if (document.visibilityState === "visible")
        void badgeNavigator.clearAppBadge?.().catch(() => {});
    };
    clearBadge();
    document.addEventListener("visibilitychange", clearBadge);
    return () => document.removeEventListener("visibilitychange", clearBadge);
  }, []);

  return null;
}
