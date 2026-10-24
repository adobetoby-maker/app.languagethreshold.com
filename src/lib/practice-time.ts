// Built by TAC — 2026-10-22
// Pure logic for the practice time bar: what counts as practice, the day key, pruning, goal
// clamping, and the stored shape. No DOM, no storage, no timers: the hook owns those.
import type { Core30Log } from "./core30-plan";

export const PRACTICE_TIME_KEY = "lt.practice-time.v1";
/** Seconds of no pointer/key/touch activity after which the clock stops. */
export const IDLE_CUTOFF_MS = 60_000;
/** Calendar days kept in storage, today included. */
export const RETAIN_DAYS = 14;
/** At most one write this often while counting; visibilitychange/pagehide flush sooner. */
export const SAVE_INTERVAL_MS = 10_000;
export const GOAL_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_GOAL_MINUTES = 10;
/** What the bar fills toward: minutes of active practice, or lessons mastered. */
export const GOAL_TYPES = ["minutes", "lessons"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];
export const DEFAULT_GOAL_TYPE: GoalType = "minutes";
export const LESSON_GOAL_OPTIONS = [1, 2, 3] as const;
export const DEFAULT_GOAL_LESSONS = 1;

export interface PracticeTimeData {
  /** Show the bar. Default on. */
  enabled: boolean;
  /** What the bar measures. Stored data without it (shipped before lesson goals) means minutes. */
  goalType: GoalType;
  /** Daily goal in minutes, always one of GOAL_OPTIONS. */
  goalMinutes: number;
  /** Daily goal in lessons, always one of LESSON_GOAL_OPTIONS. */
  goalLessons: number;
  /** Active practice seconds by local date (YYYY-MM-DD). */
  days: Record<string, number>;
}

export const DEFAULT_PRACTICE_DATA: PracticeTimeData = {
  enabled: true,
  goalType: DEFAULT_GOAL_TYPE,
  goalMinutes: DEFAULT_GOAL_MINUTES,
  goalLessons: DEFAULT_GOAL_LESSONS,
  days: {},
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The learner's local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Snaps any input to the nearest allowed goal (ties go lower); junk becomes the default. */
export function clampGoalMinutes(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT_GOAL_MINUTES;
  let best: number = GOAL_OPTIONS[0];
  for (const option of GOAL_OPTIONS) {
    if (Math.abs(option - n) < Math.abs(best - n)) best = option;
  }
  return best;
}

/** Anything but the literal "lessons" is minutes: old and junk values keep today's behavior. */
export function clampGoalType(value: unknown): GoalType {
  return value === "lessons" ? "lessons" : "minutes";
}

/** Snaps any input to 1, 2 or 3 lessons (ties go lower); junk becomes 1. */
export function clampGoalLessons(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT_GOAL_LESSONS;
  let best: number = LESSON_GOAL_OPTIONS[0];
  for (const option of LESSON_GOAL_OPTIONS) {
    if (Math.abs(option - n) < Math.abs(best - n)) best = option;
  }
  return best;
}

/** Drops invalid keys and every day older than the last RETAIN_DAYS calendar days. */
export function pruneDays(days: Record<string, number>, now: Date): Record<string, number> {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (RETAIN_DAYS - 1));
  const cutoffKey = localDateKey(cutoff);
  const kept: Record<string, number> = {};
  for (const [key, seconds] of Object.entries(days)) {
    if (DAY_KEY.test(key) && key >= cutoffKey && Number.isFinite(seconds) && seconds > 0) {
      kept[key] = Math.floor(seconds);
    }
  }
  return kept;
}

/** True when this second counts: tab visible and the learner acted within the idle cutoff. */
export function isCounting(ctx: {
  visible: boolean;
  now: number;
  /** null until the learner has acted since load: a fresh mount earns no credit. */
  lastInteractionAt: number | null;
}): boolean {
  if (!ctx.visible || ctx.lastInteractionAt === null) return false;
  const idle = ctx.now - ctx.lastInteractionAt;
  return idle >= 0 && idle < IDLE_CUTOFF_MS;
}

/**
 * One ticker beat. Returns data with one more second on the local day of `now` when the second
 * counts; otherwise returns `data` itself (same reference), so callers can skip a save.
 * A new local date starts at zero because the day key is read from `now` every beat.
 */
export function applyTick(
  data: PracticeTimeData,
  ctx: { now: number; visible: boolean; lastInteractionAt: number | null },
): PracticeTimeData {
  if (!isCounting(ctx)) return data;
  const date = new Date(ctx.now);
  const key = localDateKey(date);
  const days = pruneDays(data.days, date);
  days[key] = (days[key] ?? 0) + 1;
  return { ...data, days };
}

/** Per-day maximum of two records, so a window's unsaved seconds survive another window's save. */
export function mergeDays(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...a };
  for (const [key, seconds] of Object.entries(b)) {
    if (!(key in merged) || seconds > merged[key]) merged[key] = seconds;
  }
  return merged;
}

/**
 * True only when a ticker beat carried the learner across the goal: the goal is unchanged and
 * the count rose by exactly one second. A first client value, a reload or a goal change is not a pulse.
 */
export function crossedGoal(prev: { seconds: number; goalSeconds: number } | null, next: {
  seconds: number;
  goalSeconds: number;
}): boolean {
  return (
    prev !== null &&
    prev.goalSeconds === next.goalSeconds &&
    next.seconds === prev.seconds + 1 &&
    prev.seconds < next.goalSeconds &&
    next.seconds >= next.goalSeconds
  );
}

/** Seconds practiced on the local day of `now`. */
export function secondsToday(data: PracticeTimeData, now: number): number {
  return data.days[localDateKey(new Date(now))] ?? 0;
}

/** Write to storage now? Only when something changed and 10 seconds passed (or a flush forces it). */
export function shouldSave(ctx: {
  dirty: boolean;
  now: number;
  lastSaveAt: number;
  force?: boolean;
}): boolean {
  if (!ctx.dirty) return false;
  return ctx.force === true || ctx.now - ctx.lastSaveAt >= SAVE_INTERVAL_MS;
}

export interface PracticeProgress {
  /** 0 to 1, clamped. */
  fraction: number;
  /** Minutes goals only: the goal in seconds. For lessons goals it is the goal in lessons. */
  goalSeconds: number;
  /** aria-valuemax: seconds for a minutes goal, lessons for a lessons goal. */
  valueMax: number;
  /** aria-valuenow: seconds (minutes goal) or lessons (lessons goal), never above valueMax. */
  valueNow: number;
  reached: boolean;
  /** aria-label of the bar. */
  label: string;
  /** aria-valuetext: "6 of 10 minutes today" or "1 of 2 lessons today". */
  valueText: string;
  /** The settings status line after "Today: ": "6 of 10 min" or "1 of 2 lessons". */
  status: string;
}

export function practiceProgress(seconds: number, goalMinutes: number): PracticeProgress {
  const goal = clampGoalMinutes(goalMinutes);
  const goalSeconds = goal * 60;
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const valueNow = Math.min(safe, goalSeconds);
  const whole = Math.floor(valueNow / 60);
  return {
    fraction: valueNow / goalSeconds,
    goalSeconds,
    valueMax: goalSeconds,
    valueNow,
    reached: safe >= goalSeconds,
    label: `Today's practice: ${whole} of ${goal} minutes`,
    valueText: `${whole} of ${goal} minutes today`,
    status: `${whole} of ${goal} min`,
  };
}

const lessonsWord = (goal: number) => (goal === 1 ? "lesson" : "lessons");

/** Progress toward a lessons-per-day goal: min(lessonsToday / goal, 1). */
export function lessonProgress(lessons: number, goalLessons: number): PracticeProgress {
  const goal = clampGoalLessons(goalLessons);
  const safe = Number.isFinite(lessons) && lessons > 0 ? Math.floor(lessons) : 0;
  const valueNow = Math.min(safe, goal);
  const word = lessonsWord(goal);
  return {
    fraction: valueNow / goal,
    goalSeconds: goal,
    valueMax: goal,
    valueNow,
    reached: safe >= goal,
    label: `Today's practice: ${valueNow} of ${goal} ${word}`,
    valueText: `${valueNow} of ${goal} ${word} today`,
    status: `${valueNow} of ${goal} ${word}`,
  };
}

/** The bar's progress for whichever goal type the learner chose. */
export function goalProgress(input: {
  goalType: GoalType;
  seconds: number;
  goalMinutes: number;
  lessons: number;
  goalLessons: number;
}): PracticeProgress {
  return input.goalType === "lessons"
    ? lessonProgress(input.lessons, input.goalLessons)
    : practiceProgress(input.seconds, input.goalMinutes);
}

function localDateKeyOf(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : localDateKey(new Date(ms));
}

/**
 * Distinct lessons the learner declared mastered on the local calendar day `dateKey`, any module.
 * The signal is Core 30/60 `masteredAt`, an ISO time written once when "I've mastered this
 * lesson" is pressed (the earliest stamp is kept), so mastering again the same day, re-opening a
 * lesson, or recording a lesson already mastered earlier never adds to it. Scoped log keys are
 * JSON ["core30", 1, moduleId, target, native, enrollment]; an unclaimed legacy bare-module key
 * is skipped for any lesson its scoped copy (made when the learner claims the record) holds.
 */
export function lessonsCompletedOn(log: Core30Log | null | undefined, dateKey: string): number {
  if (!log || typeof log !== "object") return 0;
  let count = 0;
  const scopedToday = new Set<string>();
  const bareToday = new Set<string>();
  for (const [key, moduleLog] of Object.entries(log)) {
    let moduleId = key;
    let scoped = false;
    try {
      const parsed: unknown = JSON.parse(key);
      if (Array.isArray(parsed) && parsed[0] === "core30" && typeof parsed[2] === "string") {
        scoped = true;
        moduleId = parsed[2];
      }
    } catch {
      /* a bare module id is not JSON */
    }
    for (const [lesson, entry] of Object.entries(moduleLog?.lessons ?? {})) {
      if (localDateKeyOf(entry?.masteredAt) !== dateKey) continue;
      const id = `${moduleId}|${lesson}`;
      if (scoped) {
        count += 1;
        scopedToday.add(id);
      } else {
        bareToday.add(id);
      }
    }
  }
  for (const id of bareToday) if (!scopedToday.has(id)) count += 1;
  return count;
}

/** Reads the stored JSON; anything missing or malformed falls back to defaults field by field. */
export function parsePracticeData(raw: string | null | undefined, now: Date): PracticeTimeData {
  let value: unknown = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    value = null;
  }
  if (typeof value !== "object" || value === null) return { ...DEFAULT_PRACTICE_DATA, days: {} };
  const o = value as Record<string, unknown>;
  const days: Record<string, number> = {};
  if (typeof o.days === "object" && o.days !== null) {
    for (const [key, seconds] of Object.entries(o.days as Record<string, unknown>)) {
      if (typeof seconds === "number") days[key] = seconds;
    }
  }
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : true,
    // Data saved before lesson goals has no type or lessons goal: it is a minutes goal.
    goalType: clampGoalType(o.goalType),
    goalMinutes: o.goalMinutes === undefined ? DEFAULT_GOAL_MINUTES : clampGoalMinutes(o.goalMinutes),
    goalLessons: o.goalLessons === undefined ? DEFAULT_GOAL_LESSONS : clampGoalLessons(o.goalLessons),
    days: pruneDays(days, now),
  };
}

export function serializePracticeData(data: PracticeTimeData, now: Date): string {
  return JSON.stringify({
    v: 1,
    enabled: data.enabled,
    goalType: clampGoalType(data.goalType),
    goalMinutes: clampGoalMinutes(data.goalMinutes),
    goalLessons: clampGoalLessons(data.goalLessons),
    days: pruneDays(data.days, now),
  });
}
