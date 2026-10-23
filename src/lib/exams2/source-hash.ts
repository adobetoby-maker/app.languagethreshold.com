// Built by TAC — 2026-10-23
/**
 * Fingerprint of a Core 30 lesson's source content, stored per lesson in a bank (`sourceHash`) so
 * an offline drift check can warn the owner when a lesson changes after its items were written.
 * Covers what items test: title, objective, the lesson word list and the step instructions.
 * Pure module: callers pass the lesson object in.
 */
import { canonicalJson, sha256Hex } from "./hash.ts";

export interface LessonSource {
  n: number;
  title: string;
  objective: string;
  words?: { en: string; es: string; kind: string }[];
  steps?: { instruction: string }[];
}

export function lessonSourceHash(lesson: LessonSource): string {
  return sha256Hex(
    canonicalJson({
      lesson: lesson.n,
      title: lesson.title,
      objective: lesson.objective,
      words: (lesson.words ?? []).map(({ en, es, kind }) => ({ en, es, kind })),
      steps: (lesson.steps ?? []).map((step) => step.instruction),
    }),
  );
}
