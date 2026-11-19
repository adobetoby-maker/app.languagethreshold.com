import dance from "./interests-spanish-dance-team-core.json" with { type: "json" };
import cosmetology from "./interests-spanish-cosmetology-core.json" with { type: "json" };
import source from "./interests-spanish-practice.json" with { type: "json" };
import type { LessonGrammar, LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sb, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
export interface InterestLesson {
  stage: "foundation" | "core" | "master";
  reading: { title: string; target: string[]; native: string[] };
  speaking: string;
  openingLine: string;
  partnerRole: string;
  grammar: LessonGrammar;
}
const practice = source as Record<string, Record<string, InterestLesson>>;
export const INTERESTS_SPANISH_VERSION = "interests-es-en-2026-11-19-draft-v1";
export function interestLesson(
  moduleId: string,
  n: number,
  target = "Spanish",
  native = "English",
): InterestLesson | null {
  if (
    target !== "Spanish" ||
    native !== "English" ||
    !Number.isInteger(n) ||
    !Object.hasOwn(practice, moduleId)
  )
    return null;
  return practice[moduleId][String(n)] ?? null;
}
export function interestLessonCount(moduleId: string) {
  return Object.hasOwn(practice, moduleId) ? Object.keys(practice[moduleId]).length : 0;
}
export function interestTeaching(moduleId: string, n: number, target: string, native: string) {
  const lesson = interestLesson(moduleId, n, target, native);
  return lesson
    ? lessonTeachingSettings(
        lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n,
        lesson.speaking,
      )
    : null;
}
export const INTEREST_CURRICULA: Record<string, ModuleCurriculum> = Object.fromEntries(
  [dance, cosmetology].map((core) => [
    core.module,
    {
      moduleId: core.module,
      headline: core.headline,
      threshold: core.threshold,
      lessons: core.lessons.map((lesson) => ({
        n: lesson.n,
        title: lesson.title,
        objective: lesson.objective,
        words: lesson.words as LessonWord[],
        readingTemplate: lesson.readingTemplate,
        steps: [
          r(`Read ${lesson.title} and explain the agreed next step.`, 5),
          wm("Match and recall the lesson words, then use them in your own sentence.", 5),
          sb(interestLesson(core.module, lesson.n)!.grammar.focus, 5),
          sp(lesson.speaking, 7),
        ],
      })),
    },
  ]),
);
