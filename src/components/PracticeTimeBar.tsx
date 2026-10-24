// Built by TAC — 2026-10-22
import { useEffect, useRef, useSyncExternalStore } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Switch } from "@/components/ui/switch";
import {
  setPracticeEnabled,
  setPracticeGoalLessons,
  setPracticeGoalMinutes,
  setPracticeGoalType,
  usePracticeBlocked,
  usePracticeGoal,
  usePracticeSettings,
  usePracticeTimeTicker,
} from "@/hooks/use-practice-time";
import {
  GOAL_OPTIONS,
  LESSON_GOAL_OPTIONS,
  clampGoalType,
  crossedGoal,
  type GoalType,
} from "@/lib/practice-time";

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
  const blocked = usePracticeBlocked();
  const desktop = useDesktopLayout();
  const { settings, progress, count, ready } = usePracticeGoal();
  const { enabled, goalType } = settings;
  const mine = (edge === "header") === desktop;
  const visible = enabled && !blocked && mine;

  // One short pulse only when one step (a second, or a lesson) carries the learner across the
  // goal during this visit. Switching goal type, or data still loading, starts the count over.
  const fill = useRef<HTMLDivElement>(null);
  const previous = useRef<{ type: GoalType; seconds: number; goalSeconds: number } | null>(null);
  useEffect(() => {
    if (!ready) {
      previous.current = null;
      return;
    }
    const before = previous.current?.type === goalType ? previous.current : null;
    const next = { type: goalType, seconds: count, goalSeconds: progress.goalSeconds };
    const pulse = crossedGoal(before, next);
    previous.current = next;
    if (!pulse) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    fill.current?.animate?.([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
      duration: 700,
      easing: "ease-out",
    });
  }, [count, progress.goalSeconds, goalType, ready]);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label={progress.label}
      aria-valuemin={0}
      aria-valuemax={progress.valueMax}
      aria-valuenow={progress.valueNow}
      aria-valuetext={progress.valueText}
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

const TYPE_LABELS: Record<GoalType, string> = { minutes: "Minutes", lessons: "Lessons" };

/** The on/off switch, goal type (minutes or lessons), daily goal and today's total. Device-local; sits with the other device preferences. */
export function PracticeBarSetting() {
  const { settings, progress } = usePracticeGoal();
  const { enabled, goalType, goalMinutes, goalLessons } = settings;
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
      <div className="mt-3 space-y-2">
        <RadioGroupPrimitive.Root
          value={goalType}
          onValueChange={(value) => setPracticeGoalType(clampGoalType(value))}
          aria-label="Daily goal type"
          orientation="horizontal"
          data-testid="practice-bar-type"
          className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1"
        >
          {(Object.keys(TYPE_LABELS) as GoalType[]).map((type) => (
            <RadioGroupPrimitive.Item
              key={type}
              value={type}
              data-testid={`practice-bar-type-${type}`}
              className="flex h-10 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-gold data-[state=checked]:text-[#0B0B0F]"
            >
              {TYPE_LABELS[type]}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-foreground">
          <span className="text-muted-foreground">Daily goal</span>
          {goalType === "minutes" ? (
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
          ) : (
            <select
              value={goalLessons}
              onChange={(event) => setPracticeGoalLessons(Number(event.target.value))}
              data-testid="practice-bar-goal-lessons"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LESSON_GOAL_OPTIONS.map((lessons) => (
                <option key={lessons} value={lessons}>
                  {lessons} {lessons === 1 ? "lesson" : "lessons"}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      {enabled && (
        <p
          data-testid="practice-bar-today"
          className="mt-2 font-mono text-xs tabular-nums text-foreground/80"
        >
          Today: {progress.status}
        </p>
      )}
    </div>
  );
}
