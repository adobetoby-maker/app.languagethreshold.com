import { useEffect } from "react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { teamRequest } from "@/lib/team-client";

/** Conservative active time: a visible tab with recent input contributes at most 30 seconds per tick. */
export function TeamActivityBridge() {
  const { state } = useApp();
  const { user } = useAuth();
  const userId = user?.id;
  const moduleId = state.activeModuleId ?? "core";
  const activity = state.currentTab;
  useEffect(() => {
    if (!userId) return;
    let lastInput = Date.now();
    const mark = () => {
      lastInput = Date.now();
    };
    for (const event of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(event, mark, { passive: true });
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > 60000) return;
      void teamRequest("/api/team-activity", {
        action: "interval",
        moduleId,
        activity,
        activeSeconds: 30,
        startedAt: new Date(Date.now() - 30000).toISOString(),
        idempotencyKey: crypto.randomUUID(),
      }).catch(() => {});
    }, 30000);
    return () => {
      window.clearInterval(interval);
      for (const event of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(event, mark);
    };
  }, [userId, moduleId, activity]);
  return null;
}
