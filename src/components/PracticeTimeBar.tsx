// Built by TAC — 2026-10-22
import { useEffect, useRef } from "react";
import { Timer } from "lucide-react";
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

/**
 * Render once, inside the primary nav (`position: fixed`), which is the persistent app bar on
 * every tab. It owns the single 1s ticker and draws the 3px line on the nav's top edge as an
 * absolute child, so it adds no height. Hidden, and not counting, while the bar is switched off
 * or a paywall is up (see PracticeBlocker).
 */
export function PracticeTimeBar() {
  const { enabled, goalMinutes } = usePracticeSettings();
  const blocked = usePracticeBlocked();
  const active = enabled && !blocked;
  usePracticeTimeTicker(active);
  const seconds = useTodayPracticeSeconds();
  const progress = practiceProgress(seconds, goalMinutes);

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

  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label={progress.label}
      aria-valuemin={0}
      aria-valuemax={progress.goalSeconds}
      aria-valuenow={progress.valueNow}
      data-testid="practice-time-bar"
      className="pointer-events-none absolute inset-x-0 -top-px h-[3px] overflow-hidden bg-foreground/25"
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

/** The on/off switch and daily goal for the bar. Device-local; lives on the Dashboard. */
export function PracticeBarSetting() {
  const { enabled, goalMinutes } = usePracticeSettings();
  const seconds = useTodayPracticeSeconds();
  const progress = practiceProgress(seconds, goalMinutes);
  return (
    <section
      aria-labelledby="practice-bar-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
          <Timer className="h-5 w-5 text-gold-ink" strokeWidth={1.6} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="practice-bar-heading" className="text-sm font-semibold text-foreground">
            Practice bar
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A thin gold line above the bottom bar fills with today&apos;s active practice time.
            Saved on this device only.
          </p>
          {enabled && (
            <p
              data-testid="practice-bar-today"
              className="mt-2 font-mono text-xs tabular-nums text-foreground/80"
            >
              Today: {Math.floor(progress.valueNow / 60)} of {goalMinutes} min
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-3 text-sm text-foreground">
              <Switch
                checked={enabled}
                onCheckedChange={setPracticeEnabled}
                data-testid="practice-bar-switch"
                aria-label="Show practice bar"
              />
              <span>{enabled ? "On" : "Off"}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
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
        </div>
      </div>
    </section>
  );
}
