import core from "./spanish-basics-core.json" with { type: "json" };
import practice from "./spanish-basics-practice.json" with { type: "json" };
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";

export const SPANISH_BASICS_VERSION = "spanish-101-es-en-v1-draft";
export const SPANISH_BASICS_IDS = [
  "foundation-spanish-basics",
  "spanish-basics",
  "master-spanish-basics",
] as const;
export function spanishBasicsLesson(
  moduleId: string,
  n: number,
  target = "Spanish",
  native = "English",
) {
  if (target !== "Spanish" || native !== "English" || !Object.hasOwn(practice, moduleId))
    return null;
  const lessons = practice[moduleId as keyof typeof practice];
  return (lessons as Record<string, (typeof practice)["spanish-basics"]["1"]>)[String(n)] ?? null;
}
export function spanishBasicsTeaching(moduleId: string, n: number) {
  const lesson = spanishBasicsLesson(moduleId, n);
  return lesson
    ? lessonTeachingSettings(
        lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n,
        lesson.speaking,
      )
    : null;
}
export const SPANISH_BASICS_CURRICULUM: ModuleCurriculum = {
  moduleId: "spanish-basics",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((lesson) => ({
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: lesson.words as LessonWord[],
    grammar: spanishBasicsLesson("spanish-basics", lesson.n)!.grammar,
    steps: [
      r(`Read ${lesson.title}; explain the grammar in your own words.`, 5),
      wm(
        "Recall the words and build the lesson's sentences without the model, then check and retry.",
        5,
      ),
      sp(lesson.speaking, 6),
    ],
  })),
};
