import { useMemo, useState } from "react";
import { Bell, Flame, Plane, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MAX_TRAVEL_BREAK_DAYS, recoveryLessonsRemaining } from "@/lib/practice-streak";
import { useApp } from "@/state/app-state";

function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function recentDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: localDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
      fullLabel: new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(date),
    };
  });
}

function formatBreakEnd(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function PracticeStreakCard() {
  const { state, dispatch } = useApp();
  const [planningBreak, setPlanningBreak] = useState(false);
  const [breakDays, setBreakDays] = useState(3);
  const streak = state.practiceStreak;
  const recoveryRemaining = recoveryLessonsRemaining(streak);
  const today = localDateKey();
  const days = useMemo(recentDays, [today, streak.practiceDates]);
  const breakActive = Boolean(
    streak.travelBreak &&
    today >= streak.travelBreak.startsOn &&
    today <= streak.travelBreak.endsOn,
  );
  const practicedToday = streak.practiceDates.includes(today);
  const headline =
    recoveryRemaining > 0
      ? "Your streak can be restored"
      : streak.current === 0
        ? "Start your streak today"
        : streak.current === 1
          ? "You’ve started a streak!"
          : `${streak.current} days of showing up`;
  const guidance =
    recoveryRemaining > 0
      ? `Complete ${recoveryRemaining} more ${recoveryRemaining === 1 ? "practice activity" : "practice activities"} today to restore your ${streak.recovery?.previousStreak}-day streak.`
      : breakActive
        ? `Your travel break protects your streak through ${formatBreakEnd(streak.travelBreak!.endsOn)}.`
        : practicedToday
          ? "Today counts. Come back tomorrow to keep it going."
          : streak.current > 0
            ? "Complete a lesson or speaking mission today to keep your streak."
            : "Complete a lesson or speaking mission to begin. One day at a time.";

  function useTravelPass() {
    if (streak.travelPasses <= 0 || breakActive) return;
    dispatch({ type: "START_TRAVEL_BREAK", payload: { days: breakDays } });
    setPlanningBreak(false);
    toast("Travel break activated", {
      description: `Your streak is protected for ${breakDays} ${breakDays === 1 ? "day" : "days"}.`,
    });
  }

  return (
    <section
      id="streak-zone"
      tabIndex={-1}
      aria-labelledby="streak-heading"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-orange-300/30 bg-card px-4 py-7 text-center outline-none sm:px-8"
    >
      <div className="mx-auto max-w-lg">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--streak-surface)]"
          aria-hidden="true"
        >
          <Flame className="h-8 w-8 text-[var(--streak-ink)]" />
        </div>
        <h2 id="streak-heading" className="mt-4 font-serif text-2xl text-foreground sm:text-3xl">
          {headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guidance}</p>

        <div
          role="group"
          className="mt-6 grid grid-cols-7 gap-1 rounded-2xl border border-border/70 bg-background/40 px-2 py-3 sm:gap-2"
          aria-label="Last seven practice days"
        >
          {days.map((day) => {
            const completed = streak.practiceDates.includes(day.key);
            return (
              <div key={day.key} className="text-center">
                <span className="font-sans text-xs text-muted-foreground">{day.label}</span>
                <span
                  className={
                    "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full border text-xs " +
                    (completed
                      ? "border-orange-300 bg-orange-300 text-slate-950"
                      : day.key === today
                        ? "border-orange-300/60 bg-[var(--streak-surface)] text-[var(--streak-ink)]"
                        : "border-border/70 text-muted-foreground")
                  }
                  aria-label={`${day.fullLabel}: ${completed ? "practice completed" : day.key === today ? "not practiced yet" : "no completed practice"}`}
                >
                  {completed ? "✓" : "·"}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {streak.current} {streak.current === 1 ? "day" : "days"} now · Best {streak.best}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_TAB", payload: "core30" })}
            className="min-h-11 rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-slate-950"
          >
            Continue learning
          </button>
          <a
            href="#daily-practice-reminder"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground"
          >
            <Bell className="h-4 w-4" aria-hidden="true" /> Reminder settings
          </a>
        </div>

        {recoveryRemaining > 0 ? (
          <div className="mt-5 rounded-xl border border-orange-300/45 bg-[var(--streak-surface)] p-4 text-left">
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-[var(--streak-ink)]" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--streak-ink)]">
                  Restore your {streak.recovery?.previousStreak}-day streak
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--streak-ink)]">
                  Complete {recoveryRemaining} more{" "}
                  {recoveryRemaining === 1 ? "practice activity" : "practice activities"}
                  today. The progress disappears tomorrow if recovery is unfinished.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_TAB", payload: "speak" })}
                    className="min-h-11 rounded-xl bg-orange-300 px-4 py-2 text-xs font-semibold text-slate-950"
                  >
                    Speak now
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SET_TAB", payload: "core30" })}
                    className="min-h-11 rounded-xl border border-orange-300/40 px-4 py-2 text-xs font-semibold text-[var(--streak-ink)]"
                  >
                    Open lessons
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : breakActive && streak.travelBreak ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-surface)] p-4 text-left">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--info-ink)]" />
            <div>
              <p className="font-semibold text-[var(--info-ink)]">
                Travel break is protecting your streak
              </p>
              <p className="mt-1 text-xs text-[var(--info-ink)]">
                Daily practice reminders are paused through{" "}
                {formatBreakEnd(streak.travelBreak.endsOn)}.
              </p>
            </div>
          </div>
        ) : null}

        {streak.travelPasses > 0 && !breakActive && !planningBreak && (
          <details className="mt-5 rounded-xl border border-border/60 px-4 py-3 text-left">
            <summary className="cursor-pointer text-sm text-foreground">
              Travel passes ({streak.travelPasses})
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Earn a pass every seven days, up to three. Use one to pause reminders and protect your
              streak while away.
            </p>
            <button
              type="button"
              onClick={() => setPlanningBreak(true)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--info-border)] px-4 py-2 text-sm font-semibold text-[var(--info-ink)]"
            >
              <Plane className="h-4 w-4" /> Plan travel break
            </button>
          </details>
        )}

        {planningBreak && !breakActive && (
          <div className="mt-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-surface)] p-4 text-left">
            <p className="text-sm font-semibold text-[var(--info-ink)]">Use one travel pass</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--info-ink)]">
              Protect your current streak and pause reminders while you are away.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-[var(--info-ink)]">
                Break length
                <select
                  value={breakDays}
                  onChange={(event) => setBreakDays(Number(event.target.value))}
                  className="ml-2 min-h-11 rounded-xl border border-[var(--info-border)] bg-background px-3 py-2 text-sm text-foreground"
                >
                  {Array.from({ length: MAX_TRAVEL_BREAK_DAYS }, (_, index) => index + 1).map(
                    (days) => (
                      <option key={days} value={days}>
                        {days} {days === 1 ? "day" : "days"}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button
                type="button"
                onClick={useTravelPass}
                className="min-h-11 rounded-xl bg-sky-200 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Use 1 pass
              </button>
              <button
                type="button"
                onClick={() => setPlanningBreak(false)}
                className="min-h-11 rounded-xl px-3 py-2 text-xs text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
