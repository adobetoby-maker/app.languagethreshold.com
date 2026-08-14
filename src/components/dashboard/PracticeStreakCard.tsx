import { useMemo, useState } from "react";
import { CalendarDays, Flame, Plane, RotateCcw, ShieldCheck } from "lucide-react";
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
      label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date),
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
  const days = useMemo(recentDays, [streak.practiceDates]);
  const today = localDateKey();
  const breakActive = Boolean(
    streak.travelBreak &&
    today >= streak.travelBreak.startsOn &&
    today <= streak.travelBreak.endsOn,
  );

  function useTravelPass() {
    if (streak.travelPasses <= 0 || breakActive) return;
    dispatch({ type: "START_TRAVEL_BREAK", payload: { days: breakDays } });
    setPlanningBreak(false);
    toast("Travel break activated", {
      description: `Your streak is protected for ${breakDays} ${breakDays === 1 ? "day" : "days"}.`,
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-300/30 bg-gradient-to-br from-orange-400/10 via-card/75 to-card/45">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-300/35 bg-orange-300/10">
              <Flame className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-300">
                Lesson streak
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                {streak.current} {streak.current === 1 ? "day" : "days"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Best {streak.best} · {streak.today.lessonsCompleted} completed today
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-sky-200 tabular-nums">{streak.travelPasses}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              travel {streak.travelPasses === 1 ? "pass" : "passes"}
            </p>
          </div>
        </div>

        <div
          role="group"
          className="mt-5 grid grid-cols-7 gap-2"
          aria-label="Last seven practice days"
        >
          {days.map((day) => {
            const completed = streak.practiceDates.includes(day.key);
            return (
              <div key={day.key} className="text-center">
                <span className="font-mono text-[9px] text-muted-foreground">{day.label}</span>
                <span
                  className={
                    "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] " +
                    (completed
                      ? "border-orange-300 bg-orange-300 text-slate-950"
                      : day.key === today
                        ? "border-orange-300/60 bg-orange-300/10 text-orange-200"
                        : "border-border/70 text-muted-foreground")
                  }
                  title={completed ? "Practice completed" : "No completed practice"}
                >
                  {completed ? "✓" : "·"}
                </span>
              </div>
            );
          })}
        </div>

        {recoveryRemaining > 0 ? (
          <div className="mt-5 rounded-xl border border-orange-300/45 bg-orange-300/10 p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-orange-100">
                  Restore your {streak.recovery?.previousStreak}-day streak
                </p>
                <p className="mt-1 text-xs leading-relaxed text-orange-100/75">
                  Complete {recoveryRemaining} more {recoveryRemaining === 1 ? "lesson" : "lessons"}
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
                    onClick={() => dispatch({ type: "SET_TAB", payload: "guide" })}
                    className="min-h-11 rounded-xl border border-orange-300/40 px-4 py-2 text-xs font-semibold text-orange-100"
                  >
                    Open lessons
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : breakActive && streak.travelBreak ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-300/35 bg-sky-300/10 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
            <div>
              <p className="font-semibold text-sky-100">Travel break is protecting your streak</p>
              <p className="mt-1 text-xs text-sky-100/70">
                Daily practice reminders are paused through{" "}
                {formatBreakEnd(streak.travelBreak.endsOn)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {streak.lastPracticeDate === today
                    ? "Today’s streak is protected"
                    : "Complete one lesson to protect today"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Earn one travel pass at every seven-day milestone, up to three.
                </p>
              </div>
            </div>
            {streak.travelPasses > 0 && !planningBreak && (
              <button
                type="button"
                onClick={() => setPlanningBreak(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-300/35 px-4 py-2 text-xs font-semibold text-sky-100"
              >
                <Plane className="h-3.5 w-3.5" /> Plan travel break
              </button>
            )}
          </div>
        )}

        {planningBreak && !breakActive && (
          <div className="mt-3 rounded-xl border border-sky-300/35 bg-sky-300/10 p-4">
            <p className="text-sm font-semibold text-sky-100">Use one travel pass</p>
            <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
              Protect your current streak and pause reminders while you are away.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-sky-100/80">
                Break length
                <select
                  value={breakDays}
                  onChange={(event) => setBreakDays(Number(event.target.value))}
                  className="ml-2 min-h-11 rounded-xl border border-sky-300/35 bg-background px-3 py-2 text-sm text-foreground"
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
