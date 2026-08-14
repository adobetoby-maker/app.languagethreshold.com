import { useEffect, useMemo } from "react";
import { buildLearningReminderContext } from "@/lib/learning-reminders";
import { syncPushContext, wasPushEnabled } from "@/lib/push-api";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";

export function PushReminderSync() {
  const { state } = useApp();
  const { user } = useAuth();
  const context = useMemo(() => buildLearningReminderContext(state), [state]);
  const serialized = JSON.stringify(context);

  useEffect(() => {
    if (!user || !state.hydrated || !wasPushEnabled(user.id)) return;
    const timer = window.setTimeout(() => {
      void syncPushContext(context).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [context, serialized, state.hydrated, user]);

  useEffect(() => {
    const clearBadge = () => {
      const badgeNavigator = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
      if (document.visibilityState === "visible") void badgeNavigator.clearAppBadge?.().catch(() => {});
    };
    clearBadge();
    document.addEventListener("visibilitychange", clearBadge);
    return () => document.removeEventListener("visibilitychange", clearBadge);
  }, []);

  return null;
}
