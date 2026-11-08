import { useAuth } from "@/state/auth-state";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/state/app-state";
import { useVerbHabit } from "@/hooks/use-verb-habit";
import { readVerbHabit, verbReminderDue } from "@/lib/verb-habit";
import { FINISH_STUDY_EVENT } from "./VerbHabitSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function VerbExitReminder() {
  const { state, dispatch, profileReadyUserId } = useApp(),
    { habit, enabled, update, key } = useVerbHabit(),
    [open, setOpen] = useState(false),
    started = useRef(Date.now()),
    hasActivity = useRef(false),
    entryScope = useRef<string | null>(null),
    pendingOnEntry = useRef(false);
  const { user, loading } = useAuth();
  const ready =
    !loading &&
    state.hydrated &&
    state.onboardingComplete &&
    (!user || profileReadyUserId === user.id);
  const due = verbReminderDue(enabled, habit);
  useEffect(() => {
    if (!ready) return;
    const finish = () => {
      if (due) {
        pendingOnEntry.current = false;
        setOpen(true);
        update((h) => ({ ...h, pending: false }));
      } else toast.success("Study session finished. See you next time!");
    };
    window.addEventListener(FINISH_STUDY_EVENT, finish);
    return () => window.removeEventListener(FINISH_STUDY_EVENT, finish);
  }, [ready, due, update]);
  useEffect(() => {
    started.current = Date.now();
    hasActivity.current = false;
    entryScope.current = null;
    pendingOnEntry.current = false;
    setOpen(false);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    if (entryScope.current !== key) {
      entryScope.current = key;
      try {
        pendingOnEntry.current = readVerbHabit(localStorage.getItem(key)).pending;
      } catch {
        pendingOnEntry.current = habit.pending;
      }
    }
    if (
      !due ||
      !pendingOnEntry.current ||
      state.currentTab === "speak" ||
      document.visibilityState !== "visible"
    )
      return;
    const timer = setTimeout(() => {
      pendingOnEntry.current = false;
      setOpen(true);
      update((h) => ({ ...h, pending: false }));
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, due, key, state.currentTab, habit.pending, update]);
  useEffect(() => {
    if (!ready || !due) return;
    const activity = () => {
      hasActivity.current = true;
    };
    const canOffer = () => hasActivity.current && Date.now() - started.current >= 30000;
    const offer = () => {
      pendingOnEntry.current = false;
      setOpen(true);
      update((h) => ({ ...h, pending: false }));
    };
    const leave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget && canOffer() && state.currentTab !== "speak") offer();
    };
    const hide = () => {
      if (document.visibilityState === "hidden" && canOffer()) {
        pendingOnEntry.current = true;
        update((h) => ({ ...h, pending: true }));
      } else if (
        document.visibilityState === "visible" &&
        habit.pending &&
        state.currentTab !== "speak"
      )
        offer();
    };
    const pagehide = () => {
      if (canOffer()) update((h) => ({ ...h, pending: true }));
    };
    // Save the unfinished session before an OS kill can omit pagehide/visibility events.
    // This only arms a later reminder; it does not interrupt the current activity.
    const arm = setInterval(() => {
      if (!open && canOffer() && !habit.pending) update((h) => ({ ...h, pending: true }));
    }, 5000);
    document.addEventListener("mouseout", leave);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    return () => {
      clearInterval(arm);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [ready, due, habit.pending, key, state.currentTab, update, open]);
  const close = () => {
    pendingOnEntry.current = false;
    setOpen(false);
    update((h) => ({ ...h, pending: false, dismissed: true }));
  };
  return (
    <Dialog
      open={open && due && ready}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before you go, study your verbs</DialogTitle>
          <DialogDescription>
            A few useful forms can unlock a whole conversation. Spend ten minutes—or try one short
            review.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3">
          <button
            className="min-h-11 rounded-xl bg-gold px-4 py-3 font-semibold text-background"
            onClick={() => {
              setOpen(false);
              update((h) => ({ ...h, pending: false }));
              dispatch({ type: "SET_TAB", payload: "verbs" });
            }}
          >
            Practice my verbs
          </button>
          <button className="min-h-11 rounded-xl border px-4 py-3" onClick={close}>
            Not now
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          You can turn this reminder off in App settings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
