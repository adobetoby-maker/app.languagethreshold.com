// Core 30 plan: one new lesson every 3 days, a review of all mastered lessons every 4 days.
// Pure scheduling logic. Callers pass `today` ("YYYY-MM-DD", local); nothing here reads the clock.

export interface Core30Review {
  at: string;
  ok: boolean;
}

export const CORE30_WAYS = ["see", "recall", "hear", "type", "say", "write"] as const;
export type Core30Way = (typeof CORE30_WAYS)[number];

/** Namespaced visits survive older clients, whose merge preserves visits but drops new fields. */
export function wayVisitAt(log: Core30LessonLog | undefined, way: Core30Way): string | undefined {
  return earlier(log?.wayVisits?.[way], log?.visits?.[`way:${way}`]);
}

export function openedWayCount(log: Core30LessonLog | undefined): number {
  return CORE30_WAYS.filter((way) => Boolean(wayVisitAt(log, way))).length;
}

export interface Core30LessonLog {
  /** Legacy step indices and namespaced way:<id> keys; value = first-open ISO time. */
  visits: Record<string, string>;
  /** First opening of each learning mode. Kept separate from legacy curriculum step indices. */
  wayVisits?: Partial<Record<Core30Way, string>>;
  masteredAt?: string;
  needsPractice?: boolean;
  reviews?: Core30Review[];
}

export interface Core30ModuleLog {
  startDate?: string;
  /** ISO time the startDate was last set; the later stamp wins on cloud merge. */
  startDateSetAt?: string;
  /** key = lesson number as string */
  lessons: Record<string, Core30LessonLog>;
  lastReviewAt?: string;
}

/** key = moduleId */
export type Core30Log = Record<string, Core30ModuleLog>;

export const CORE30_NEW_LESSON_EVERY_DAYS = 3;
export const CORE30_REVIEW_EVERY_DAYS = 4;
export const CORE30_PLAN_DAYS = 90;

const DAY_MS = 86_400_000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function parseKey(dateKey: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatUtc(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(dateKey: string, days: number): string {
  return formatUtc(parseKey(dateKey) + days * DAY_MS);
}

/** toKey - fromKey in whole days. */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((parseKey(toKey) - parseKey(fromKey)) / DAY_MS);
}

export function lessonDueDate(startDate: string, lessonNumber: number): string {
  return addDays(startDate, CORE30_NEW_LESSON_EVERY_DAYS * (lessonNumber - 1));
}

/** start+4, +8, ... while <= start+90. */
export function reviewDates(startDate: string): string[] {
  const out: string[] = [];
  for (
    let offset = CORE30_REVIEW_EVERY_DAYS;
    offset <= CORE30_PLAN_DAYS;
    offset += CORE30_REVIEW_EVERY_DAYS
  ) {
    out.push(addDays(startDate, offset));
  }
  return out;
}

/** Sorted lesson numbers that carry a masteredAt stamp. */
export function masteredLessons(log: Core30ModuleLog | undefined): number[] {
  if (!log?.lessons) return [];
  return Object.entries(log.lessons)
    .filter(([, l]) => !!l?.masteredAt)
    .map(([k]) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

function needsPracticeLessons(log: Core30ModuleLog | undefined): number[] {
  if (!log?.lessons) return [];
  return Object.entries(log.lessons)
    .filter(([, l]) => !!l?.needsPractice)
    .map(([k]) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

export interface Core30Today {
  started: boolean;
  startDate?: string;
  dayNumber: number;
  totalLessons: number;
  masteredCount: number;
  expectedMastered: number;
  status: "not-started" | "ahead" | "on-track" | "behind";
  behindBy: number;
  nextLesson: { n: number; dueDate: string; overdue: boolean } | null;
  reviewDue: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
  reviewLessons: number[];
  needsPractice: number[];
}

function isoToDateKey(iso: string): string | undefined {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return toDateKey(new Date(t));
}

export function planToday(
  log: Core30ModuleLog | undefined,
  totalLessons: number,
  today: string,
): Core30Today {
  const mastered = masteredLessons(log);
  const needsPractice = needsPracticeLessons(log);
  const startDate = log?.startDate;
  if (!startDate || Number.isNaN(parseKey(startDate))) {
    return {
      started: false,
      dayNumber: 0,
      totalLessons,
      masteredCount: mastered.length,
      expectedMastered: 0,
      status: "not-started",
      behindBy: 0,
      nextLesson: null,
      reviewDue: false,
      reviewLessons: [],
      needsPractice,
    };
  }

  const rawDay = daysBetween(startDate, today) + 1;
  const dayNumber = rawDay < 1 ? 0 : rawDay;
  const expectedMastered =
    dayNumber < 1
      ? 0
      : Math.min(totalLessons, Math.floor((dayNumber - 1) / CORE30_NEW_LESSON_EVERY_DAYS) + 1);
  const masteredCount = mastered.length;
  const masteredSet = new Set(mastered);
  let nextLesson: Core30Today["nextLesson"] = null;
  for (let n = 1; n <= totalLessons; n++) {
    if (!masteredSet.has(n)) {
      const dueDate = lessonDueDate(startDate, n);
      nextLesson = { n, dueDate, overdue: dueDate < today };
      break;
    }
  }

  // A learner whose only gap is the lesson due today is not behind yet: "behind" needs an
  // overdue lesson, and behindBy is 0 whenever the status is not "behind".
  const gap = Math.max(0, expectedMastered - masteredCount);
  const isBehind = gap > 0 && !!nextLesson?.overdue;
  const behindBy = isBehind ? gap : 0;
  const status: Core30Today["status"] = isBehind
    ? "behind"
    : masteredCount > expectedMastered
      ? "ahead"
      : "on-track";

  const dates = reviewDates(startDate);
  const pastDates = dates.filter((d) => d <= today);
  const lastReviewDate = pastDates.length ? pastDates[pastDates.length - 1] : undefined;
  const nextReviewDate = dates.find((d) => d > today);
  const lastDoneKey = log?.lastReviewAt ? isoToDateKey(log.lastReviewAt) : undefined;
  const reviewDue =
    masteredCount > 0 && pastDates.some((d) => lastDoneKey === undefined || d > lastDoneKey);

  return {
    started: true,
    startDate,
    dayNumber,
    totalLessons,
    masteredCount,
    expectedMastered,
    status,
    behindBy,
    nextLesson,
    reviewDue,
    lastReviewDate,
    nextReviewDate,
    reviewLessons: reviewDue ? mastered : [],
    needsPractice,
  };
}

export interface Core30CalendarDay {
  date: string;
  day: number;
  newLesson?: number;
  review: boolean;
}

/**
 * One entry per plan day that has a new lesson or a review. `day` is 1-based:
 * day 1 is the start date, so lesson n lands on day 3*(n-1)+1 and the first review on day 5.
 */
export function planCalendar(startDate: string, totalLessons: number): Core30CalendarDay[] {
  const lastLessonDay =
    totalLessons > 0 ? CORE30_NEW_LESSON_EVERY_DAYS * (totalLessons - 1) + 1 : 0;
  const lastDay = Math.max(CORE30_PLAN_DAYS, lastLessonDay);
  const out: Core30CalendarDay[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const offset = day - 1;
    let newLesson: number | undefined;
    if (offset % CORE30_NEW_LESSON_EVERY_DAYS === 0) {
      const n = offset / CORE30_NEW_LESSON_EVERY_DAYS + 1;
      if (n <= totalLessons) newLesson = n;
    }
    const review =
      offset >= CORE30_REVIEW_EVERY_DAYS &&
      offset <= CORE30_PLAN_DAYS &&
      offset % CORE30_REVIEW_EVERY_DAYS === 0;
    if (newLesson === undefined && !review) continue;
    const entry: Core30CalendarDay = { date: addDays(startDate, offset), day, review };
    if (newLesson !== undefined) entry.newLesson = newLesson;
    out.push(entry);
  }
  return out;
}

function earlier(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a <= b ? a : b;
  return tb < ta ? b : a;
}

function later(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a >= b ? a : b;
  return tb > ta ? b : a;
}

function latestReviewAt(reviews: Core30Review[] | undefined): string | undefined {
  let best: string | undefined;
  for (const r of reviews ?? []) best = later(best, r.at);
  return best;
}

function mergeLesson(
  local: Core30LessonLog | undefined,
  remote: Core30LessonLog | undefined,
): Core30LessonLog {
  const visits: Record<string, string> = {};
  for (const src of [local?.visits, remote?.visits]) {
    for (const [step, at] of Object.entries(src ?? {})) {
      visits[step] = earlier(visits[step], at) as string;
    }
  }

  const byAt = new Map<string, Core30Review>();
  for (const r of [...(local?.reviews ?? []), ...(remote?.reviews ?? [])]) {
    if (!byAt.has(r.at)) byAt.set(r.at, { at: r.at, ok: r.ok });
  }
  const reviews = [...byAt.values()].sort((a, b) => {
    const ta = Date.parse(a.at);
    const tb = Date.parse(b.at);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
    return ta - tb;
  });

  const out: Core30LessonLog = { visits };
  const wayVisits: Partial<Record<Core30Way, string>> = {};
  for (const way of CORE30_WAYS) {
    const at = earlier(wayVisitAt(local, way), wayVisitAt(remote, way));
    if (at) {
      wayVisits[way] = at;
      visits[`way:${way}`] = at;
    }
  }
  if (Object.keys(wayVisits).length) out.wayVisits = wayVisits;
  const masteredAt = earlier(local?.masteredAt, remote?.masteredAt);
  if (masteredAt) out.masteredAt = masteredAt;

  const localLatest = latestReviewAt(local?.reviews);
  const remoteLatest = latestReviewAt(remote?.reviews);
  let needsPractice: boolean | undefined;
  if (localLatest && remoteLatest) {
    needsPractice =
      later(localLatest, remoteLatest) === remoteLatest && remoteLatest !== localLatest
        ? remote?.needsPractice
        : local?.needsPractice;
  } else if (remoteLatest) {
    needsPractice = remote?.needsPractice;
  } else if (localLatest) {
    needsPractice = local?.needsPractice;
  } else {
    needsPractice = local?.needsPractice ?? remote?.needsPractice;
  }
  if (needsPractice !== undefined) out.needsPractice = needsPractice;
  if (reviews.length) out.reviews = reviews;
  return out;
}

function mergeModule(
  local: Core30ModuleLog | undefined,
  remote: Core30ModuleLog | undefined,
): Core30ModuleLog {
  const lessons: Record<string, Core30LessonLog> = {};
  const keys = new Set([
    ...Object.keys(local?.lessons ?? {}),
    ...Object.keys(remote?.lessons ?? {}),
  ]);
  for (const k of keys) lessons[k] = mergeLesson(local?.lessons?.[k], remote?.lessons?.[k]);
  const out: Core30ModuleLog = { lessons };
  let startDate = local?.startDate ?? remote?.startDate;
  let startDateSetAt: string | undefined;
  if (local?.startDateSetAt && remote?.startDateSetAt) {
    // Both stamped: the later edit wins (ties keep local).
    const winner =
      later(local.startDateSetAt, remote.startDateSetAt) === remote.startDateSetAt &&
      remote.startDateSetAt !== local.startDateSetAt
        ? remote
        : local;
    startDate = winner.startDate ?? startDate;
    startDateSetAt = winner.startDateSetAt;
  } else if (local?.startDateSetAt) {
    startDate = local.startDate ?? startDate;
    startDateSetAt = local.startDateSetAt;
  } else if (remote?.startDateSetAt) {
    startDate = remote.startDate ?? startDate;
    startDateSetAt = remote.startDateSetAt;
  }
  if (startDate) out.startDate = startDate;
  if (startDateSetAt) out.startDateSetAt = startDateSetAt;
  const lastReviewAt = later(local?.lastReviewAt, remote?.lastReviewAt);
  if (lastReviewAt) out.lastReviewAt = lastReviewAt;
  return out;
}

export function mergeCore30Log(
  local: Core30Log | undefined,
  remote: Core30Log | undefined,
): Core30Log {
  const out: Core30Log = {};
  const ids = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  for (const id of ids) out[id] = mergeModule(local?.[id], remote?.[id]);
  return out;
}

export function summarizeCore30(
  log: Core30ModuleLog | undefined,
  totalLessons: number,
  today: string,
): {
  started: boolean;
  startDate?: string;
  lessonsOpened: number;
  mastered: number;
  needsPractice: number;
  lastReviewAt?: string;
  status: Core30Today["status"];
  behindBy: number;
  totalLessons: number;
} {
  const plan = planToday(log, totalLessons, today);
  const lessonsOpened = Object.values(log?.lessons ?? {}).filter(
    (l) =>
      Object.keys(l?.visits ?? {}).length > 0 || CORE30_WAYS.some((way) => l?.wayVisits?.[way]),
  ).length;
  return {
    started: plan.started,
    startDate: plan.startDate,
    lessonsOpened,
    mastered: plan.masteredCount,
    needsPractice: plan.needsPractice.length,
    lastReviewAt: log?.lastReviewAt,
    status: plan.status,
    behindBy: plan.behindBy,
    totalLessons,
  };
}
