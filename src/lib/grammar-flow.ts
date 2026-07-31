import type { CefrLevel } from "@/state/grammar-state";

/**
 * Pure progression rules for the Grammar lesson flow. DUO-003.
 *
 * Kept free of React and of the store so the wraparound and end-of-level rules
 * are testable without a browser — which is where DUO-003 review found the
 * subtle bugs living:
 *
 *  - "next incomplete" must follow CANONICAL `LevelState.lessons` order, not the
 *    module-focused sort `LevelSidebar` applies for display. Otherwise
 *    progression silently depends on which module happens to be active.
 *  - being LAST IN THE ARRAY is not the same as completing a level. A learner
 *    who works out of order can finish the final lesson with earlier ones
 *    outstanding; that must wrap, not declare the level complete.
 */

export const CEFR_ORDER: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type GrammarNextStep =
  | { kind: "next-lesson"; lessonId: string }
  | { kind: "level-complete"; nextLevel: CefrLevel }
  | { kind: "course-complete" };

export function nextCefrLevel(level: CefrLevel): CefrLevel | null {
  const i = CEFR_ORDER.indexOf(level);
  if (i === -1 || i === CEFR_ORDER.length - 1) return null;
  return CEFR_ORDER[i + 1];
}

/**
 * Resolves what should happen after `currentLessonId` is completed.
 *
 * @param lessons   canonical ordered lesson ids for the level
 * @param completed completion map INCLUDING the lesson just finished
 */
export function resolveNextStep(
  level: CefrLevel,
  lessons: readonly string[],
  currentLessonId: string,
  completed: Readonly<Record<string, boolean>>,
): GrammarNextStep {
  const outstanding = lessons.filter((id) => !completed[id]);

  if (outstanding.length === 0) {
    const next = nextCefrLevel(level);
    return next ? { kind: "level-complete", nextLevel: next } : { kind: "course-complete" };
  }

  // Prefer the next outstanding lesson AFTER the current position, so a learner
  // moving forward keeps moving forward.
  const pos = lessons.indexOf(currentLessonId);
  if (pos !== -1) {
    const ahead = lessons.slice(pos + 1).find((id) => !completed[id]);
    if (ahead) return { kind: "next-lesson", lessonId: ahead };
  }

  // Otherwise wrap to the earliest outstanding lesson. This is the case where
  // the current lesson is last in the array but earlier work remains — NOT a
  // level milestone.
  return { kind: "next-lesson", lessonId: outstanding[0] };
}

/**
 * True when every lesson in the level is complete. Mirrors QuizCard's existing
 * `allDone` derivation so both read from one rule.
 */
export function isLevelComplete(
  lessons: readonly string[],
  completed: Readonly<Record<string, boolean>>,
): boolean {
  return lessons.length > 0 && lessons.every((id) => completed[id]);
}
