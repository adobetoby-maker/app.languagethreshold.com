// Pure Core 30 state transitions. The reducer in src/state/app-state.tsx delegates here so the
// logic can be unit tested under node (the .tsx reducer cannot be imported by node tests).
import type { Core30Log, Core30LessonLog } from "./core30-plan";

function withLesson(
  log: Core30Log,
  moduleId: string,
  lesson: number,
  update: (l: Core30LessonLog) => Core30LessonLog,
): Core30Log {
  const mod = log[moduleId] ?? { lessons: {} };
  const key = String(lesson);
  const current = mod.lessons[key] ?? { visits: {} };
  return {
    ...log,
    [moduleId]: { ...mod, lessons: { ...mod.lessons, [key]: update(current) } },
  };
}

/** Records the FIRST time a step is opened. A repeat visit returns the same log reference. */
export function core30StepOpened(
  log: Core30Log,
  payload: { moduleId: string; lesson: number; step: number; at: string },
): Core30Log {
  const { moduleId, lesson, step, at } = payload;
  if (log[moduleId]?.lessons[String(lesson)]?.visits?.[String(step)]) return log;
  return withLesson(log, moduleId, lesson, (l) => ({
    ...l,
    visits: { ...l.visits, [String(step)]: at },
  }));
}

/**
 * Marks a lesson mastered (earliest masteredAt kept). There is deliberately no un-master:
 * the cloud merge keeps the earliest masteredAt, so deleting it locally would be silently undone.
 * Re-mastering after a failed review logs a passing check so the newest review wins on merge,
 * without touching the module's review cycle (lastReviewAt).
 */
export function core30SetMastered(
  log: Core30Log,
  payload: { moduleId: string; lesson: number; at: string },
): Core30Log {
  const { moduleId, lesson, at } = payload;
  return withLesson(log, moduleId, lesson, (l) => {
    if (!l.needsPractice) return { ...l, masteredAt: l.masteredAt ?? at };
    return {
      ...l,
      masteredAt: l.masteredAt ?? at,
      needsPractice: false,
      reviews: [...(l.reviews ?? []), { at, ok: true }],
    };
  });
}

export function core30SetStartDate(
  log: Core30Log,
  payload: { moduleId: string; date: string; at?: string },
): Core30Log {
  const { moduleId, date, at } = payload;
  const mod = log[moduleId] ?? { lessons: {} };
  return {
    ...log,
    [moduleId]: { ...mod, startDate: date, ...(at ? { startDateSetAt: at } : {}) },
  };
}

export function core30RecordReview(
  log: Core30Log,
  payload: { moduleId: string; at: string; results: { lesson: number; ok: boolean }[] },
): Core30Log {
  const { moduleId, at, results } = payload;
  const base = log[moduleId] ?? { lessons: {} };
  let next: Core30Log = { ...log, [moduleId]: { ...base, lastReviewAt: at } };
  for (const r of results) {
    next = withLesson(next, moduleId, r.lesson, (l) => ({
      ...l,
      needsPractice: !r.ok,
      reviews: [...(l.reviews ?? []), { at, ok: r.ok }],
    }));
  }
  return next;
}
