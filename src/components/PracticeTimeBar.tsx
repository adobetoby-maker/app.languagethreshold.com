// Built by TAC — 2026-10-22
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";
import {
  setPracticeEnabled,
  setPracticeGoalMinutes,
  usePracticeBlocked,
  usePracticeSettings,
  usePracticeTimeTicker,
  useTodayPracticeSeconds,
} from "@/hooks/use-practice-time";
import { GOAL_OPTIONS, crossedGoal, practiceProgress } from "@/lib/practice-time";

// The same query as the `desktop` variant in styles.css: it decides which app bar is on screen
// (the phone bottom nav is `desktop:hidden`, the TopNav header is `hidden desktop:block`).
const DESKTOP_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

function subscribeDesktop(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useDesktopLayout(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(DESKTOP_QUERY).matches
      : false,
    () => false,
  );
}

/**
 * The one 1s ticker. Mount it once (AppSidebar). Renders nothing. Not counting, and so no bar,
 * while the bar is switched off or a paywall is up (see PracticeBlocker).
 */
export function PracticeTimeTicker(): null {
  const { enabled } = usePracticeSettings();
  const blocked = usePracticeBlocked();
  usePracticeTimeTicker(enabled && !blocked);
  return null;
}

/**
 * The 3px line, drawn on the edge of the persistent app bar: the top edge of the primary nav on
 * phones (`edge="nav"`), the bottom edge of the TopNav header on desktop (`edge="header"`).
 * Mount one of each; only the one matching the layout renders, so the page holds exactly one
 * bar. Absolute inside a fixed or sticky bar, so it adds no height.
 */
export function PracticeTimeBar({ edge }: { edge: "nav" | "header" }) {
  const { enabled, goalMinutes } = usePracticeSettings();
  const blocked = usePracticeBlocked();
  const desktop = useDesktopLayout();
  const seconds = useTodayPracticeSeconds();
  const progress = practiceProgress(seconds, goalMinutes);
  const mine = (edge === "header") === desktop;
  const visible = enabled && !blocked && mine;

  // One short pulse only when a tick carries the learner across the goal during this visit.
  const fill = useRef<HTMLDivElement>(null);
  const previous = useRef<{ seconds: number; goalSeconds: number } | null>(null);
  useEffect(() => {
    const next = { seconds, goalSeconds: progress.goalSeconds };
    const pulse = crossedGoal(previous.current, next);
    previous.current = next;
    if (!pulse) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    fill.current?.animate?.([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
      duration: 700,
      easing: "ease-out",
    });
  }, [seconds, progress.goalSeconds]);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label={progress.label}
      aria-valuemin={0}
      aria-valuemax={progress.goalSeconds}
      aria-valuenow={progress.valueNow}
      data-testid="practice-time-bar"
      className={`pointer-events-none absolute inset-x-0 h-[3px] overflow-hidden bg-foreground/25 ${
        edge === "nav" ? "-top-px" : "-bottom-px"
      }`}
    >
      <div
        ref={fill}
        data-testid="practice-time-fill"
        className="h-full bg-gold transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
        style={{ width: `${progress.fraction * 100}%` }}
      />
    </div>
  );
}

/** The on/off switch, daily goal and today's total. Device-local; sits with the other device preferences. */
export function PracticeBarSetting() {
  const { enabled, goalMinutes } = usePracticeSettings();
  const seconds = useTodayPracticeSeconds();
  const progress = practiceProgress(seconds, goalMinutes);
  return (
    <div
      role="group"
      aria-labelledby="practice-bar-heading"
      className="rounded-xl border border-border/40 bg-card/30 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="practice-bar-heading" className="text-sm text-foreground">
            Practice bar
          </p>
          <p className="text-xs text-muted-foreground">Gold line for today&apos;s practice. This device only.</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setPracticeEnabled}
          data-testid="practice-bar-switch"
          aria-labelledby="practice-bar-heading"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-foreground">
          <span className="text-muted-foreground">Daily goal</span>
          <select
            value={goalMinutes}
            onChange={(event) => setPracticeGoalMinutes(Number(event.target.value))}
            data-testid="practice-bar-goal"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {GOAL_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      {enabled && (
        <p
          data-testid="practice-bar-today"
          className="mt-2 font-mono text-xs tabular-nums text-foreground/80"
        >
          Today: {Math.floor(progress.valueNow / 60)} of {goalMinutes} min
        </p>
      )}
    </div>
  );
}
