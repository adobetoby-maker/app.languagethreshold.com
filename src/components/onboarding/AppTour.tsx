import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { getTourScript } from "@/data/tour-scripts";
import { dismissLearningHint } from "@/lib/learning-guidance";

export const OPEN_APP_DEMO = "lt:open-app-demo";
const DEMO_DELAY = 9000;

export function ActionHint({
  storageKey,
  children,
  className = "",
}: {
  storageKey: string;
  children: ReactNode;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onDismiss = (event: Event) => {
      if ((event as CustomEvent<string>).detail === storageKey) setDismissed(true);
    };
    window.addEventListener("lt:dismiss-learning-hint", onDismiss);
    return () => window.removeEventListener("lt:dismiss-learning-hint", onDismiss);
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 ${className}`}
    >
      <span className="text-sky-600 dark:text-sky-300" aria-hidden>
        ✦
      </span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/85">{children}</div>
      <button
        type="button"
        onClick={() => dismissLearningHint(storageKey)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground"
        aria-label="Dismiss guidance"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Lives beside the tab shell, so moving to a real screen never ends the demo. */
export function AppDemo() {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const [session, setSession] = useState<{
    identity: string;
    returnTab: TabKey;
    run: number;
  } | null>(null);
  const nextRun = useRef(0);
  const identity = JSON.stringify([
    user?.id ?? "guest",
    state.activeModuleId,
    state.selectedLanguage,
    state.nativeLanguage,
  ]);
  useEffect(() => {
    const open = () =>
      setSession({ identity, returnTab: state.currentTab, run: ++nextRun.current });
    window.addEventListener(OPEN_APP_DEMO, open);
    return () => window.removeEventListener(OPEN_APP_DEMO, open);
  }, [identity, state.currentTab]);
  useEffect(() => {
    setSession(null);
  }, [identity]);
  if (!session || session.identity !== identity) return null;
  return (
    <AppTour
      key={`${identity}:${session.run}`}
      onClose={() => {
        setSession(null);
        dispatch({ type: "SET_TAB", payload: session.returnTab });
      }}
    />
  );
}

export function AppTour({ onClose }: { onClose: () => void }) {
  useOverlayHistory(true, onClose);
  const { state, dispatch } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [steps] = useState(() => getTourScript(state.activeModuleId));
  const arrivedRef = useRef(false);
  const step = steps[stepIndex];
  const tab = step.tabKey;

  // Dispatch the same action as the app navigation, without submitting practice or starting AI.
  useEffect(() => {
    arrivedRef.current = false;
    setReady(false);
    dispatch({ type: "SET_TAB", payload: tab });
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
  }, [stepIndex, tab, dispatch]);

  useEffect(() => {
    const read = () =>
      setReady(
        state.currentTab === tab &&
          (!!document.querySelector(`[data-demo-screen="${tab}"]`) ||
            (tab === "core30" &&
              !!document.querySelector('[data-testid="foundation-signin-prompt"]'))),
      );
    const observer = new MutationObserver(read);
    observer.observe(document.querySelector("main") ?? document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    read();
    return () => observer.disconnect();
  }, [tab, state.currentTab]);

  useEffect(() => {
    if (state.currentTab === tab) arrivedRef.current = true;
    else if (arrivedRef.current) setPlaying(false);
  }, [state.currentTab, tab]);
  useEffect(() => {
    const change = () => {
      const shown = document.visibilityState === "visible";
      setVisible(shown);
      if (!shown) setPlaying(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    const explore = (event: Event) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target))
        setPlaying(false);
    };
    document.addEventListener("pointerdown", explore, true);
    document.addEventListener("keydown", explore, true);
    document.addEventListener("visibilitychange", change);
    window.addEventListener("keydown", escape);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", explore, true);
      document.removeEventListener("keydown", explore, true);
      document.removeEventListener("visibilitychange", change);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (!playing || !ready || !visible) return;
    const timer = window.setTimeout(() => {
      if (stepIndex === steps.length - 1) setPlaying(false);
      else setStepIndex((i) => i + 1);
    }, DEMO_DELAY);
    return () => window.clearTimeout(timer);
  }, [playing, ready, visible, stepIndex, steps.length]);

  const go = (index: number) => {
    setPlaying(false);
    setStepIndex(index);
  };
  const button =
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border/70 px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40";
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="App walkthrough"
      data-testid="app-demo"
      className="sticky top-0 z-40 mx-auto mb-4 max-w-4xl rounded-2xl border border-gold/40 bg-card p-4 shadow-lg focus:outline-none sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div aria-live="polite" aria-atomic="true">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-ink">
            Live app demo · {stepIndex + 1} / {steps.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">{step.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">{step.body}</p>
        </div>
        <button
          type="button"
          aria-label="Exit demo"
          onClick={onClose}
          className={button + " shrink-0"}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={stepIndex === 0}
          onClick={() => go(stepIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          className={button + " border-gold/50 text-gold-ink"}
          aria-pressed={playing}
          onClick={() => {
            if (state.currentTab !== tab) dispatch({ type: "SET_TAB", payload: tab });
            if (stepIndex === steps.length - 1 && !playing) setStepIndex(0);
            setPlaying(!playing);
          }}
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {playing ? "Pause" : stepIndex === steps.length - 1 ? "Replay demo" : "Play demo"}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button type="button" className={button} onClick={() => go(stepIndex + 1)}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={button} onClick={onClose}>
            Finish
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {playing ? "Auto-advance · 9 seconds per screen" : "Paused · explore the screen below"}
        </span>
      </div>
    </section>
  );
}
