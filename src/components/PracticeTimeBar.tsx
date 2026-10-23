// Built by TAC — 2026-10-22
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  setPracticeEnabled,
  setPracticeGoalMinutes,
  usePracticeSettings,
  usePracticeTimeTicker,
  useTodayPracticeSeconds,
} from "@/hooks/use-practice-time";
import { GOAL_OPTIONS, practiceProgress } from "@/lib/practice-time";

/**
 * The primary nav is the persistent app bar on every tab, on phone and desktop. Its top edge is
 * where the line sits. The nav lives in AppSidebar, so the bar is portaled in rather than
 * rendered there; the nav is `position: fixed`, so an absolute child adds no height.
 */
function usePrimaryNav(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => document.querySelector<HTMLElement>('nav[aria-label="Primary"]');
    const found = find();
    if (found) {
      setHost(found);
      return;
    }
    const observer = new MutationObserver(() => {
      const next = find();
      if (next) {
        setHost(next);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return host;
}

/** Mount once at shell level: it owns the single 1s ticker and draws the bar. */
export function PracticeTimeBar() {
  const { enabled, goalMinutes } = usePracticeSettings();
  usePracticeTimeTicker(enabled);
  const seconds = useTodayPracticeSeconds();
  const host = usePrimaryNav();
  const progress = practiceProgress(seconds, goalMinutes);

  // One short pulse when the goal is crossed while the learner is watching; never on load.
  const fill = useRef<HTMLDivElement>(null);
  const wasReached = useRef<boolean | null>(null);
  useEffect(() => {
    const before = wasReached.current;
    wasReached.current = progress.reached;
    if (before !== false || !progress.reached) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    fill.current?.animate?.([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
      duration: 700,
      easing: "ease-out",
    });
  }, [progress.reached]);

  if (!enabled || !host) return null;
  return createPortal(
    <div
      role="progressbar"
      aria-label={progress.label}
      aria-valuemin={0}
      aria-valuemax={progress.goalSeconds}
      aria-valuenow={progress.valueNow}
      data-testid="practice-time-bar"
      className="pointer-events-none absolute inset-x-0 -top-px h-[3px] overflow-hidden bg-foreground/15"
    >
      <div
        ref={fill}
        data-testid="practice-time-fill"
        className="h-full bg-gold transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
        style={{ width: `${progress.fraction * 100}%` }}
      />
    </div>,
    host,
  );
}

/** The on/off switch and daily goal for the bar. Device-local; lives on the Dashboard. */
export function PracticeBarSetting() {
  const { enabled, goalMinutes } = usePracticeSettings();
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
