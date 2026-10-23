// Built by TAC — 2026-10-22
// Pure logic for the practice time bar: what counts as practice, the day key, pruning, goal
// clamping, and the stored shape. No DOM, no storage, no timers: the hook owns those.

export const PRACTICE_TIME_KEY = "lt.practice-time.v1";
/** Seconds of no pointer/key/touch activity after which the clock stops. */
export const IDLE_CUTOFF_MS = 60_000;
/** Calendar days kept in storage, today included. */
export const RETAIN_DAYS = 14;
/** At most one write this often while counting; visibilitychange/pagehide flush sooner. */
export const SAVE_INTERVAL_MS = 10_000;
export const GOAL_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_GOAL_MINUTES = 10;

export interface PracticeTimeData {
  /** Show the bar. Default on. */
  enabled: boolean;
  /** Daily goal in minutes, always one of GOAL_OPTIONS. */
  goalMinutes: number;
  /** Active practice seconds by local date (YYYY-MM-DD). */
  days: Record<string, number>;
}

export const DEFAULT_PRACTICE_DATA: PracticeTimeData = {
  enabled: true,
  goalMinutes: DEFAULT_GOAL_MINUTES,
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
  goalSeconds: number;
  /** aria-valuenow: seconds, never above goalSeconds. */
  valueNow: number;
  reached: boolean;
  label: string;
}

export function practiceProgress(seconds: number, goalMinutes: number): PracticeProgress {
  const goal = clampGoalMinutes(goalMinutes);
  const goalSeconds = goal * 60;
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const valueNow = Math.min(safe, goalSeconds);
  return {
    fraction: valueNow / goalSeconds,
    goalSeconds,
    valueNow,
    reached: safe >= goalSeconds,
    label: `Today's practice: ${Math.floor(valueNow / 60)} of ${goal} minutes`,
  };
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
    goalMinutes: o.goalMinutes === undefined ? DEFAULT_GOAL_MINUTES : clampGoalMinutes(o.goalMinutes),
    days: pruneDays(days, now),
  };
}

export function serializePracticeData(data: PracticeTimeData, now: Date): string {
  return JSON.stringify({
    v: 1,
    enabled: data.enabled,
    goalMinutes: clampGoalMinutes(data.goalMinutes),
    days: pruneDays(data.days, now),
  });
}
