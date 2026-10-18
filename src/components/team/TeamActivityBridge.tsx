import { useEffect } from "react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { ownedTeamRequest } from "@/lib/team-client";

/** Conservative active time: a visible tab with recent input contributes at most 30 seconds per tick. */
export function TeamActivityBridge() {
  const { state } = useApp();
  const { user } = useAuth();
  const userId = user?.id;
  const moduleId = state.activeModuleId ?? "core";
  const activity = state.currentTab;
  const { capture } = usePracticeLifecycle(JSON.stringify([moduleId, activity, state.hydrated]));
  useEffect(() => {
    if (!userId || !state.hydrated) return;
    const lease = capture();
    if (!lease.isCurrent()) return;
    let pending: AbortController | null = null;
    let lastInput = Date.now();
    const mark = () => {
      if (lease.isCurrent()) lastInput = Date.now();
    };
    for (const event of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(event, mark, { passive: true });
    const interval = window.setInterval(() => {
      if (
        !lease.isCurrent() ||
        pending ||
        document.visibilityState !== "visible" ||
        Date.now() - lastInput > 60000
      )
        return;
      const controller = new AbortController();
      pending = controller;
      const release = lease.own(() => controller.abort());
      void ownedTeamRequest(
        { userId, isCurrent: lease.isCurrent, signal: controller.signal },
        "/api/team-activity",
        {
          action: "interval",
          moduleId,
          activity,
          activeSeconds: 30,
          startedAt: new Date(Date.now() - 30000).toISOString(),
          idempotencyKey: crypto.randomUUID(),
        },
      )
        .catch(() => {})
        .finally(() => {
          if (pending === controller) pending = null;
          release();
          controller.abort();
        });
    }, 30000);
    return () => {
      window.clearInterval(interval);
      pending?.abort();
      for (const event of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(event, mark);
    };
  }, [userId, moduleId, activity, state.hydrated, capture]);
  return null;
}
