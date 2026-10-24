// Built by TAC — 2026-10-23
/**
 * Pure timing rules for exams v2 (ticket T8): the 45-second question clock and the A/B/C windows.
 * No server-only imports, no React, nothing reads the clock: callers pass `nowMs` / `today`.
 *
 * Question clock. Every question has one server-side "served at" time: the instant the previous
 * question was resolved (answered, or timed out), or the session start for the first question.
 * An answer that arrives within 45 s of that is on time; up to 5 s more is a grace period for
 * network delay; after that it is late and the server records the question as unanswered.
 *
 * Windows (design section 3). A is open from day 0. B opens on day 45 of the Core 30 plan, or
 * earlier once lessons 1-15 are mastered. C opens on day 90, or once all 30 lessons are mastered.
 * Day 0 is the plan's start date. Dates are UTC calendar days.
 */
import {
  addDays,
  daysBetween,
  masteredLessons,
  type Core30Log,
  type Core30ModuleLog,
} from "../core30-plan.ts";
import { core30ScopeKey } from "../core30-scope.ts";

export const QUESTION_LIMIT_MS = 45_000;
export const QUESTION_GRACE_MS = 5_000;
/** The countdown turns amber at this many seconds left, and red at the second constant. */
export const WARN_SECONDS = 10;
export const URGENT_SECONDS = 5;

export type AnswerTiming = "on_time" | "grace" | "late";

/** Milliseconds since the question was served; never negative. */
export function elapsedMs(servedAtMs: number, nowMs: number): number {
  return Math.max(0, nowMs - servedAtMs);
}

/** Milliseconds left on the visible clock, floored at 0 (grace is not shown to the learner). */
export function remainingMs(elapsed: number, limitMs = QUESTION_LIMIT_MS): number {
  return Math.max(0, limitMs - Math.max(0, elapsed));
}

/** Whole seconds shown on the clock: rounds up, so "0" appears only when time has run out. */
export function secondsLeft(remaining: number): number {
  return Math.max(0, Math.ceil(remaining / 1000));
}

/** on_time up to 45 s, grace up to 50 s, late after that. */
export function classifyAnswer(
  servedAtMs: number,
  nowMs: number,
): { elapsedMs: number; timing: AnswerTiming } {
  const elapsed = elapsedMs(servedAtMs, nowMs);
  const timing: AnswerTiming =
    elapsed <= QUESTION_LIMIT_MS
      ? "on_time"
      : elapsed <= QUESTION_LIMIT_MS + QUESTION_GRACE_MS
        ? "grace"
        : "late";
  return { elapsedMs: elapsed, timing };
}

/** Colour band of the visible countdown. */
export type ClockTone = "calm" | "warn" | "urgent" | "expired";
export function clockTone(remaining: number): ClockTone {
  const seconds = secondsLeft(remaining);
  if (seconds <= 0) return "expired";
  if (seconds <= URGENT_SECONDS) return "urgent";
  if (seconds <= WARN_SECONDS) return "warn";
  return "calm";
}

/**
 * When the current question was served. The session keeps one `at` per resolved question, so the
 * current one started when the previous one was resolved (or at the session start). A session
 * whose last response has no `at` (written before the clock existed) is not timed: it returns
 * `nowMs`. A stored time in the future (clock skew between servers) is clamped to `nowMs`.
 */
export function servedAtOf(
  session: { started_at: string; responses?: readonly { at?: string }[] | null },
  nowMs: number,
): number {
  const responses = session.responses ?? [];
  const last = responses[responses.length - 1];
  const stamp = responses.length ? last?.at : session.started_at;
  const ms = stamp ? Date.parse(stamp) : Number.NaN;
  return Number.isFinite(ms) ? Math.min(ms, nowMs) : nowMs;
}

/** What the client needs to draw the clock, with no clock-skew dependence. */
export interface QuestionTimer {
  limitMs: number;
  graceMs: number;
  /** Server-measured time since the question was served. */
  elapsedMs: number;
}
export function questionTimer(servedAtMs: number, nowMs: number): QuestionTimer {
  return {
    limitMs: QUESTION_LIMIT_MS,
    graceMs: QUESTION_GRACE_MS,
    elapsedMs: elapsedMs(servedAtMs, nowMs),
  };
}

// ── Windows ──────────────────────────────────────────────────────────────────

export type WindowKind = "A" | "B" | "C";
export const FORM_QUESTIONS: Record<WindowKind, number> = { A: 30, B: 30, C: 60 };
export const FORM_TITLES: Record<WindowKind, string> = {
  A: "Baseline",
  B: "Midpoint",
  C: "Final",
};
export const B_OPENS_DAY = 45;
export const C_OPENS_DAY = 90;
/** B opens early when lessons 1..15 are mastered. */
export const B_LESSONS = 15;
/** A is "on time" until lesson 3 is done or day 7; after that it is a late baseline. */
export const A_SOFT_DAY = 7;
export const A_SOFT_LESSONS = 3;

export interface WindowContext {
  /** Core 30 plan start, YYYY-MM-DD. Unknown when the learner has not started the plan. */
  startDate?: string;
  /** Lessons the learner marked mastered (and not "needs practice"). */
  mastered: readonly number[];
  lessonCount: number;
  /** UTC calendar day, YYYY-MM-DD. */
  today: string;
}
export interface FormWindow {
  kind: WindowKind;
  open: boolean;
  /** Why it is open: the day rule, the lessons rule, or always (A). */
  via?: "always" | "day" | "lessons";
  /** First day the day rule opens this form; set when the start date is known. */
  opensOn?: string;
  /** The lessons that open it early (1..to), with how many of them are done. */
  lessons?: { from: number; to: number; done: number };
  /** A only: the soft window has passed. */
  lateBaseline?: boolean;
}

const isDateKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** The window for one form. Pure. */
export function examWindow(kind: WindowKind, ctx: WindowContext): FormWindow {
  const start = isDateKey(ctx.startDate) ? ctx.startDate : undefined;
  const day = start ? daysBetween(start, ctx.today) : undefined;
  const mastered = new Set(ctx.mastered);
  const doneUpTo = (to: number) => {
    let done = 0;
    for (let n = 1; n <= to; n++) if (mastered.has(n)) done++;
    return done;
  };
  if (kind === "A") {
    const late =
      (day !== undefined && day > A_SOFT_DAY) || doneUpTo(A_SOFT_LESSONS) >= A_SOFT_LESSONS;
    return { kind, open: true, via: "always", ...(late ? { lateBaseline: true } : {}) };
  }
  const to = kind === "B" ? B_LESSONS : ctx.lessonCount;
  const opensDay = kind === "B" ? B_OPENS_DAY : C_OPENS_DAY;
  const done = doneUpTo(to);
  const lessons = { from: 1, to, done };
  const opensOn = start ? addDays(start, opensDay) : undefined;
  const base = { kind, lessons, ...(opensOn ? { opensOn } : {}) };
  if (done >= to) return { ...base, open: true, via: "lessons" };
  if (day !== undefined && day >= opensDay) return { ...base, open: true, via: "day" };
  return { ...base, open: false };
}

export function examWindows(ctx: WindowContext): Record<WindowKind, FormWindow> {
  return { A: examWindow("A", ctx), B: examWindow("B", ctx), C: examWindow("C", ctx) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Dec 7, 2026" from YYYY-MM-DD, with no time-zone shift. */
export function formatDateKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  return `${MONTHS[Number(match[2]) - 1] ?? match[2]} ${Number(match[3])}, ${match[1]}`;
}

/** "lessons 1–15" */
const lessonRange = (from: number, to: number) => `lessons ${from}–${to}`;

/** The learner-facing line for a locked form: "Opens Dec 7, 2026, or when lessons 1–15 are done." */
export function lockedMessage(window: FormWindow): string {
  if (window.open) return "";
  const when = window.opensOn ? `Opens ${formatDateKey(window.opensOn)}` : "";
  const early = window.lessons
    ? `${window.lessons.to === window.lessons.from ? "when lesson " + window.lessons.from + " is" : "when " + lessonRange(window.lessons.from, window.lessons.to) + " are"} done`
    : "";
  if (when && early) return `${when}, or ${early}.`;
  if (when) return `${when}.`;
  return early ? `Opens ${early}.` : "Not open yet.";
}

// ── Reading the learner's Core 30 log ────────────────────────────────────────

/**
 * The Core 30 record that belongs to a module and language pair: the independent-practice record
 * first, then the enrollment records for the same pair (latest start date wins), then the archived
 * bare-module record.
 */
export function pickCore30Log(
  logs: Core30Log,
  moduleId: string,
  target: string,
  native: string,
): Core30ModuleLog | undefined {
  const exact =
    logs[core30ScopeKey(moduleId, { targetLanguage: target, instructionLanguage: native })];
  if (exact) return exact;
  const prefix = JSON.stringify(["core30", 1, moduleId, target, native]).slice(0, -1) + ",";
  const enrollments = Object.entries(logs)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, log]) => log)
    .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  return enrollments[0] ?? logs[moduleId];
}

/** Window context from a learner's log (undefined log = plan not started). */
export function windowContext(
  log: Core30ModuleLog | undefined,
  lessonCount: number,
  today: string,
): WindowContext {
  return {
    ...(log?.startDate ? { startDate: log.startDate } : {}),
    mastered: masteredLessons(log),
    lessonCount,
    today,
  };
}

/** UTC calendar day of an instant. */
export const utcDateKey = (nowMs: number) => new Date(nowMs).toISOString().slice(0, 10);
