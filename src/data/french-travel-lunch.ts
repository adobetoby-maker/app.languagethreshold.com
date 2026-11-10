import core from "./french-travel-lunch-core.json" with { type: "json" };
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, sp, wm } from "./curriculum-helpers.ts";

/** Draft source for the exact French→English Lunch Core. No release flag is changed here. */
export const FRENCH_LUNCH_CORE_VERSION = "french-travel-lunch-core-fr-en-v1-draft";

export function frenchLunchCoreLesson(
  n: number,
  target = "French",
  native = "English",
) {
  if (target !== "French" || native !== "English") return null;
  return core.lessons.find((lesson) => lesson.n === n) ?? null;
}

export const FRENCH_LUNCH_CORE_CURRICULUM: ModuleCurriculum = {
  moduleId: "travel-lunch",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((lesson) => ({
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: lesson.words as LessonWord[],
    steps: [
      r(`Read the ${lesson.title} dialogue and compare each French line with its English meaning.`, 7),
      wm(`Recall the words and phrases from ${lesson.title}, then check each meaning.`, 6),
      sp(lesson.speaking.goal, 8),
    ],
  })),
};
