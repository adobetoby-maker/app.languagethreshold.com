import core from "./spanish-basics-core.json" with { type: "json" };
import basicsPractice from "./spanish-basics-practice.json" with { type: "json" };
import nextPractice from "./spanish-next-practice.json" with { type: "json" };

export interface SpanishPattern {
  id: string;
  title: string;
  verbs: { infinitive: string; native: string; forms: Record<string, string> }[];
}
type SpanishPractice = (typeof basicsPractice)["spanish-basics"]["1"] & {
  pattern?: SpanishPattern;
  primaryVerb?: string;
  frequencyRank?: number;
  structureId?: string;
};
const practice: Record<string, Record<string, SpanishPractice>> = {
  ...basicsPractice,
  ...nextPractice,
};
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
  return practice[moduleId]?.[String(n)] ?? null;
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

/** One checked form per distinct verb, rotating the person in transfer lessons. */
export function spanishPatternWords(
  moduleId: string,
  n: number,
  target: string,
  native: string,
): LessonWord[] | null {
  const lesson = spanishBasicsLesson(moduleId, n, target, native);
  if (!lesson?.pattern) return null;
  return lesson.checks.map((check, i) => ({
    es: check.answer,
    en: `${lesson.pattern!.verbs[i].native} · ${check.prompt.replace(" → ____", "")}`,
    kind: "term" as const,
    note: lesson.pattern!.title,
  }));
}
