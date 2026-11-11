import practice from "./or-cleaning-practice.json" with { type: "json" };
import cores from "./or-cleaning-core.json" with { type: "json" };
import type { ModuleCurriculum, LessonWord, LessonGrammar } from "./curriculum.ts";
import { r, wm, sb, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
export const OR_CLEANING_VERSION = "or-cleaning-pairs-2026-11-11-draft";
type Practice = (typeof practice)["or-evs"]["1"];
export function orCleaningLesson(
  moduleId: string,
  n: number,
  target: string,
  native: string,
): Practice | null {
  if (!Object.hasOwn(practice, moduleId) || !Number.isInteger(n)) return null;
  const l = (practice as Record<string, Record<string, Practice>>)[moduleId]?.[String(n)];
  return l?.target === target && l.native === native ? l : null;
}
export function orCleaningTeaching(moduleId: string, n: number, target: string, native: string) {
  const l = orCleaningLesson(moduleId, n, target, native);
  return l
    ? lessonTeachingSettings(
        l.stage === "foundation" ? 1 : l.stage === "master" ? 30 : n,
        l.speaking,
      )
    : null;
}
export const OR_CLEANING_CURRICULA: Record<string, ModuleCurriculum> = Object.fromEntries(
  Object.entries(cores).map(([id, c]) => [
    id,
    {
      moduleId: id,
      headline: c.headline,
      threshold: c.threshold,
      lessons: c.lessons.map((l) => ({
        n: l.n,
        title: l.title,
        objective: l.objective,
        words: l.words as LessonWord[],
        readingTemplate: l.readingTemplate,
        ...("grammar" in l ? { grammar: l.grammar as LessonGrammar } : {}),
        steps: [
          r(`Read the shift conversation: ${l.focus}.`, 5),
          wm("Match the lesson terms and phrases to their meanings.", 5),
          sb("Build a clear request or shift update.", 5),
          sp(l.speaking, 7),
        ],
      })),
    },
  ]),
);
