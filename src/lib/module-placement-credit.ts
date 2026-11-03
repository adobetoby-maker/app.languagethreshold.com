import { core30ScopeKey, type Core30ProgressContext } from "./core30-scope.ts";
import { core30SetMastered } from "./core30-state.ts";
import type { Core30Log } from "./core30-plan.ts";
import { PLACEMENT_VERSION } from "./module-placement.ts";

export interface PlacementCreditInput {
  lessons: { moduleId: string; n: number }[];
  context: Core30ProgressContext;
  attemptId: string;
  at: string;
}
export function applyPlacementCredit(log: Core30Log, input: PlacementCreditInput): Core30Log {
  // Independent practice cannot grant completion in a managed enrollment.
  if (
    input.context.enrollmentId ||
    !input.lessons.length ||
    input.lessons.length > 180 ||
    !input.attemptId ||
    !Number.isFinite(Date.parse(input.at)) ||
    input.lessons.some(
      (l) =>
        !/^[a-z][a-z0-9-]{0,79}$/.test(l.moduleId) || !Number.isInteger(l.n) || l.n < 1 || l.n > 60,
    )
  )
    return log;
  let next = log;
  for (const lesson of input.lessons) {
    const key = core30ScopeKey(lesson.moduleId, input.context);
    if (next[key]?.lessons[String(lesson.n)]?.placementCredit?.attemptId === input.attemptId)
      continue;
    next = core30SetMastered(next, { moduleId: key, lesson: lesson.n, at: input.at });
    const entry = next[key].lessons[String(lesson.n)];
    next = {
      ...next,
      [key]: {
        ...next[key],
        lessons: {
          ...next[key].lessons,
          [String(lesson.n)]: {
            ...entry,
            placementCredit: entry.placementCredit ?? {
              at: input.at,
              version: PLACEMENT_VERSION,
              attemptId: input.attemptId,
            },
          },
        },
      },
    };
  }
  return next;
}
