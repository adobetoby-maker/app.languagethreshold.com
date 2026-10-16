import { getCurriculum, type LessonWord } from "../data/curriculum.ts";
import { getLessonDefinition, type LessonDefinition } from "./lesson-definition.ts";

/** Draft source coverage only. Neither runtime availability nor human review is inferred. */
export function summarizeLessonSourceCoverage(
  definitions: readonly LessonDefinition[],
  required = 30,
) {
  const byNumber = new Map<number, LessonDefinition>();
  const duplicateLessonNumbers: number[] = [];
  for (const lesson of definitions) {
    if (byNumber.has(lesson.lessonNumber)) duplicateLessonNumbers.push(lesson.lessonNumber);
    else byNumber.set(lesson.lessonNumber, lesson);
  }
  const lessons = [...byNumber.values()].sort((a, b) => a.lessonNumber - b.lessonNumber);
  const numbers = (predicate: (lesson: LessonDefinition) => boolean) =>
    lessons.filter(predicate).map((lesson) => lesson.lessonNumber);
  const hasWords = (lesson: LessonDefinition) => lesson.words.length > 0;
  const hasPassage = (lesson: LessonDefinition) =>
    !!lesson.reading?.sentences.length &&
    lesson.reading.sentences.every(
      (sentence) => !!sentence.target.trim() && !!sentence.native.trim(),
    );
  const missingLessonNumbers = Array.from({ length: required }, (_, index) => index + 1).filter(
    (number) => !byNumber.has(number),
  );
  const missingWordLists = numbers((lesson) => !hasWords(lesson));
  const vocabularyQuantityGaps = numbers((lesson) => !lessonVocabularyMeetsBaseline(lesson.words));
  const missingPassages = numbers((lesson) => !hasPassage(lesson));
  const missingTeachingSettings = numbers((lesson) => !lesson.teaching);
  const lessonsWithoutExplicitRecallStep = numbers(
    (lesson) => !lesson.source.steps.some((step) => ["wordMatch", "games"].includes(step.tab)),
  );
  return {
    lessonsWithWords: lessons.length - missingWordLists.length,
    lessonsWithinVocabularyBaseline: lessons.length - vocabularyQuantityGaps.length,
    lessonsWithPassages: lessons.length - missingPassages.length,
    lessonsWithTeachingSettings: lessons.length - missingTeachingSettings.length,
    missingLessonNumbers,
    duplicateLessonNumbers: [...new Set(duplicateLessonNumbers)].sort((a, b) => a - b),
    missingWordLists,
    vocabularyQuantityGaps,
    missingPassages,
    missingTeachingSettings,
    lessonsWithoutExplicitRecallStep,
    structurallyComplete:
      missingLessonNumbers.length === 0 &&
      duplicateLessonNumbers.length === 0 &&
      vocabularyQuantityGaps.length === 0 &&
      missingPassages.length === 0 &&
      missingTeachingSettings.length === 0,
  };
}

export function lessonVocabularyMeetsBaseline(words: readonly LessonWord[]) {
  if (!words.every((word) => word.en.trim() && word.es.trim())) return false;
  const terms = words.filter((word) => word.kind === "term").length;
  const phrases = words.filter((word) => word.kind === "phrase").length;
  return terms >= 8 && terms <= 12 && phrases >= 4 && phrases <= 6;
}

export function lessonSourceCoverage(
  moduleId: string,
  targetLanguage: string,
  instructionLanguage: string,
) {
  const definitions = (getCurriculum(moduleId)?.lessons ?? [])
    .map((lesson) =>
      getLessonDefinition({
        moduleId,
        lessonNumber: lesson.n,
        targetLanguage,
        instructionLanguage,
        contentVersion: "source-inventory",
      }),
    )
    .filter((lesson): lesson is LessonDefinition => lesson !== null);
  return summarizeLessonSourceCoverage(definitions);
}

export type LessonSourceCoverage = ReturnType<typeof summarizeLessonSourceCoverage>;
