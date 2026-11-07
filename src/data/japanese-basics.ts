import core from "./japanese-basics-core.json" with { type: "json" };
import practice from "./japanese-basics-practice.json" with { type: "json" };
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";

export const JAPANESE_BASICS_VERSION = "japanese-101-ja-en-v1-draft";
export const JAPANESE_BASICS_IDS = [
  "foundation-japanese-basics", "japanese-basics", "master-japanese-basics",
] as const;

export function japaneseBasicsLesson(moduleId: string, n: number, target = "Japanese", native = "English") {
  if (target !== "Japanese" || native !== "English" || !Object.hasOwn(practice, moduleId)) return null;
  const lessons = practice[moduleId as keyof typeof practice] as Record<string, unknown>;
  return (lessons[String(n)] ?? null) as (typeof practice)["japanese-basics"]["1"] | null;
}

export function japaneseBasicsTeaching(moduleId: string, n: number, target = "Japanese", native = "English") {
  const lesson = japaneseBasicsLesson(moduleId, n, target, native);
  return lesson ? lessonTeachingSettings(lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n, lesson.speaking) : null;
}

export const JAPANESE_BASICS_CURRICULUM: ModuleCurriculum = {
  moduleId: "japanese-basics",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((lesson) => ({
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: lesson.words as LessonWord[],
    grammar: japaneseBasicsLesson("japanese-basics", lesson.n)!.grammar,
    steps: [
      r(`Read ${lesson.title} and notice the Japanese form in context.`, 5),
      wm("Recall and build the lesson sentences, then check and retry.", 5),
      sp(lesson.speaking, 6),
    ],
  })),
};
