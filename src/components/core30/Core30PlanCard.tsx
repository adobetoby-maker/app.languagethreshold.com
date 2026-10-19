import { core30ScopeKey } from "@/lib/core30-scope";
// Built by TAC — 2026-10-15
import { useMemo, useState } from "react";
import { planLocalDay } from "@/lib/assessments/plan-timing";
import type { AssessedPlanTiming } from "@/components/exams/DailyLessonPlan";
import { CalendarCheck, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useApp } from "@/state/app-state";
import { cn } from "@/lib/utils";
import {
  core30PaceFor,
  masteredLessons,
  planCalendar,
  planToday,
  toDateKey,
} from "@/lib/core30-plan";

const DATE_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "YYYY-MM-DD" -> "Oct 15" (local calendar date, no timezone shift). */
function formatPlanDate(dateKey: string | undefined): string {
  if (!dateKey) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(
    undefined,
    DATE_FMT,
  );
}

const GOLD_BUTTON = {
  background: "linear-gradient(135deg, #C9A84C 0%, #E8C878 100%)",
  color: "#0B0B0F",
} as const;

export function Core30PlanCard({
  enrollmentId,
  moduleId,
  totalLessons,
  onOpenLesson,
  onStartReview,
  reviewEveryDays,
  assessedTiming,
  managedPlanUrl,
}: {
  enrollmentId?: string;
  moduleId: string;
  totalLessons: number;
  onOpenLesson: (lessonNumber: number) => void;
  onStartReview: () => void;
  reviewEveryDays?: number;
  assessedTiming?: AssessedPlanTiming;
  managedPlanUrl?: string;
}) {
  const { state, dispatch } = useApp();
  // Foundation modules run a shorter plan; every other module keeps 3 days / 4 days / 90 days.
  const pace = core30PaceFor(moduleId);
  const reviewDays = reviewEveryDays ?? pace.reviewEveryDays;
  const lessonCadence =
    pace.newLessonEveryDays === 1 ? "every day" : `every ${pace.newLessonEveryDays} days`;
  const context = {
    targetLanguage: state.selectedLanguage,
    instructionLanguage: state.nativeLanguage,
    enrollmentId,
  };
  const progressKey = core30ScopeKey(moduleId, context);
  const storedLog = state.core30Log[progressKey];
  const log = useMemo(
    () =>
      assessedTiming?.startDate
        ? { ...storedLog, lessons: storedLog?.lessons ?? {}, startDate: assessedTiming.startDate }
        : storedLog,
    [storedLog, assessedTiming?.startDate],
  );
  const paused = assessedTiming?.status === "paused";
  const today =
    paused && assessedTiming.pausedOn
      ? assessedTiming.pausedOn
      : (planLocalDay(assessedTiming?.timezone) ?? toDateKey(new Date()));
  const plan = planToday(log, totalLessons, today, reviewDays, pace);
  const [draftDate, setDraftDate] = useState(today);
  const [changingDate, setChangingDate] = useState(false);

  const masteredSet = useMemo(() => new Set(masteredLessons(log)), [log]);
  const calendar = useMemo(
    () => (plan.startDate ? planCalendar(plan.startDate, totalLessons, reviewDays, pace) : []),
    [plan.startDate, totalLessons, reviewDays, pace],
  );
  const lastReviewKey = log?.lastReviewAt
    ? toDateKey(new Date(Date.parse(log.lastReviewAt)))
    : undefined;

  function saveStartDate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) return;
    dispatch({
      type: "CORE30_SET_START_DATE",
      payload: { moduleId, context, date: draftDate, at: new Date().toISOString() },
    });
    setChangingDate(false);
  }

  if (!plan.started) {
    return (
      <div
        data-testid="core30-plan-card"
        className="mb-5 rounded-2xl border border-gold/25 bg-gold/[0.05] p-5"
      >
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.6} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/70">
              {pace.planDays}-day plan
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Learn all {totalLessons} lessons in {pace.planDays} days
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              One new lesson {lessonCadence}. Every {reviewDays} days you review every lesson you
              have mastered so far. You mark each lesson mastered yourself; the app records the
              steps you open.
            </p>
            <label className="mt-4 block text-[11px] text-white/50" htmlFor="core30-start-date">
              Start date
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                id="core30-start-date"
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="min-h-11 rounded-lg border border-white/15 bg-background/60 px-3 text-sm text-white"
              />
              <button
                type="button"
                data-testid="core30-start-plan"
                onClick={saveStartDate}
                disabled={!draftDate}
                className="min-h-11 rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={GOLD_BUTTON}
              >
                Start my {pace.planDays}-day plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dayLabel =
    plan.dayNumber < 1
      ? `Starts ${formatPlanDate(plan.startDate)}`
      : plan.dayNumber <= pace.planDays
        ? `Day ${plan.dayNumber} of ${pace.planDays}`
        : `Day ${plan.dayNumber} · past the ${pace.planDays}-day window`;
  const statusLabel = paused
    ? "Paused · practice is available"
    : plan.status === "ahead"
      ? "Ahead"
      : plan.status === "behind"
        ? `${plan.behindBy} lesson${plan.behindBy === 1 ? "" : "s"} to catch up`
        : "On track";
  const allMastered = plan.masteredCount >= totalLessons;

  return (
    <div
      data-testid="core30-plan-card"
      className="mb-5 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-gold" strokeWidth={1.6} />
          <h2 className="text-base font-semibold text-white">{dayLabel}</h2>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-semibold",
            plan.status === "behind"
              ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
              : plan.status === "ahead"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-gold/40 bg-gold/10 text-gold",
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/[0.07] bg-card/40 p-3">
          <p className="text-white/40">Currently mastered</p>
          <p className="mt-0.5 font-mono text-base text-white">
            {plan.masteredCount} / {totalLessons}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-card/40 p-3">
          <p className="text-white/40">Next review</p>
          <p className="mt-0.5 font-mono text-base text-white">
            {plan.reviewDue
              ? "Today"
              : plan.nextReviewDate
                ? formatPlanDate(plan.nextReviewDate)
                : "None left"}
          </p>
        </div>
      </div>

      {allMastered ? (
        <p className="mt-3 text-sm text-gold">All {totalLessons} lessons mastered.</p>
      ) : null}

      {/* One gold primary action: the review when it is due, otherwise today's lesson. */}
      {plan.previouslyMasteredCount > 0 && plan.reviewDue && (
        <button
          type="button"
          onClick={onStartReview}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={GOLD_BUTTON}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Start today&rsquo;s review
        </button>
      )}

      {!allMastered && plan.nextLesson ? (
        <button
          type="button"
          onClick={() => onOpenLesson(plan.nextLesson!.n)}
          className={cn(
            "mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-left transition-colors",
            plan.reviewDue && plan.previouslyMasteredCount > 0
              ? "border border-gold/30 bg-transparent hover:bg-gold/10"
              : "hover:opacity-90",
          )}
          style={plan.reviewDue && plan.previouslyMasteredCount > 0 ? undefined : GOLD_BUTTON}
        >
          <span className="min-w-0">
            <span
              className={cn(
                "block text-sm font-semibold",
                plan.reviewDue && plan.previouslyMasteredCount > 0
                  ? "text-white"
                  : "text-[#0B0B0F]",
              )}
            >
              {plan.reviewDue && plan.previouslyMasteredCount > 0 ? "Then" : "Today"}: Lesson{" "}
              {plan.nextLesson.n}
            </span>
            <span
              className={cn(
                "block text-[11px]",
                plan.reviewDue && plan.previouslyMasteredCount > 0
                  ? plan.nextLesson.overdue
                    ? "text-amber-300"
                    : "text-white/50"
                  : "text-[#0B0B0F]/70",
              )}
            >
              {plan.nextLesson.overdue ? "Was due " : "Due "}
              {formatPlanDate(plan.nextLesson.dueDate)}
            </span>
          </span>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0",
              plan.reviewDue && plan.previouslyMasteredCount > 0
                ? "text-white/50"
                : "text-[#0B0B0F]/70",
            )}
          />
        </button>
      ) : null}

      {plan.needsPractice.length > 0 && (
        <p className="mt-3 text-[11px] text-amber-300">
          Needs practice: Lesson{plan.needsPractice.length > 1 ? "s" : ""}{" "}
          {plan.needsPractice.join(", ")}. These lessons are excluded from the mastered total; your
          earlier history is kept.
        </p>
      )}

      {plan.previouslyMasteredCount > 0 && !plan.reviewDue && (
        <button
          type="button"
          onClick={onStartReview}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-transparent px-4 py-2 text-sm font-semibold text-gold transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Review now
        </button>
      )}

      <details className="group mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs text-white/60 select-none hover:text-white">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          Plan calendar · {totalLessons} lessons, reviews every {reviewDays} days
        </summary>
        <ol className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {calendar.map((entry) => {
            const lessonDone = entry.newLesson !== undefined && masteredSet.has(entry.newLesson);
            const reviewDone =
              entry.review && lastReviewKey !== undefined && entry.date <= lastReviewKey;
            const isToday = entry.date === today;
            const overdue = entry.newLesson !== undefined && !lessonDone && entry.date < today;
            const body = (
              <>
                <span className="flex items-center gap-1 text-[11px] font-semibold">
                  {entry.newLesson !== undefined ? `Lesson ${entry.newLesson}` : "Review"}
                  {(entry.newLesson !== undefined ? lessonDone : reviewDone) && (
                    <CheckCircle2 className="h-3 w-3 text-gold" strokeWidth={2} aria-label="done" />
                  )}
                </span>
                {entry.newLesson !== undefined && entry.review && (
                  <span className="text-[10px] text-white/50">+ review</span>
                )}
                <span className="text-[10px] font-mono text-white/40">
                  {formatPlanDate(entry.date)}
                </span>
              </>
            );
            const cellClass = cn(
              "flex min-h-11 flex-col items-start justify-center rounded-lg border px-2 py-1 text-left",
              entry.newLesson !== undefined
                ? "border-white/[0.1] bg-card/50 text-white"
                : "border-dashed border-white/[0.1] bg-transparent text-white/60",
              lessonDone && "border-gold/30 bg-gold/[0.07]",
              overdue && "border-amber-400/40",
              isToday && "ring-1 ring-gold",
            );
            return (
              <li key={entry.date}>
                {entry.newLesson !== undefined ? (
                  <button
                    type="button"
                    className={cn(cellClass, "w-full")}
                    onClick={() => onOpenLesson(entry.newLesson!)}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={cellClass}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </details>

      <div className="mt-3">
        {managedPlanUrl ? (
          <a
            href={managedPlanUrl}
            className="inline-flex min-h-11 items-center text-sm text-gold underline"
          >
            Manage assessment dates and pauses
          </a>
        ) : changingDate ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="core30-change-date">
              New start date
            </label>
            <input
              id="core30-change-date"
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="min-h-11 rounded-lg border border-white/15 bg-background/60 px-3 text-sm text-white"
            />
            <button
              type="button"
              onClick={saveStartDate}
              className="min-h-11 rounded-lg border border-gold/40 bg-gold/10 px-4 text-xs font-semibold text-gold hover:bg-gold/20"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setChangingDate(false)}
              className="min-h-11 rounded-lg px-3 text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftDate(plan.startDate ?? today);
              setChangingDate(true);
            }}
            className="min-h-11 rounded-xl border border-white/20 bg-transparent px-4 text-xs font-semibold text-white/80 transition-colors hover:border-gold/40 hover:text-white"
          >
            Change start date ({formatPlanDate(plan.startDate)})
          </button>
        )}
      </div>
    </div>
  );
}
