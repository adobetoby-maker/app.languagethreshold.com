import { soundLesson } from "../data/sound-like-a-native.ts";
import { spanishBasicsLesson } from "../data/spanish-basics.ts";
import { ROOFING_LESSON_PASSAGES } from "../data/roofing-lesson-passages.ts";
import { LANDSCAPER_LESSON_CONTENT } from "../data/landscaper-lesson-content.ts";
import { FOREMAN_LESSON_CONTENT } from "../data/construction-foreman-lesson-content.ts";
import { militaryLessonPractice } from "../data/military-practice.ts";

/** Authored translations belong to an exact pair, never just a target language. */
export function authoredLessonReading(
  moduleId: string,
  lessonNumber: number | undefined,
  targetLanguage: string,
  instructionLanguage: string,
) {
  if (targetLanguage === "English" && instructionLanguage === "Spanish" && lessonNumber) {
    const draft = militaryLessonPractice(moduleId, lessonNumber);
    return draft
      ? {
          id: `${moduleId}-lesson-${lessonNumber}`,
          title: draft.reading.title,
          sentences: draft.reading.target.map((target, i) => ({
            target,
            en: draft.reading.native[i],
          })),
        }
      : null;
  }
  if (targetLanguage !== "Spanish" || instructionLanguage !== "English" || !lessonNumber)
    return null;
  const sound = soundLesson(moduleId, lessonNumber, targetLanguage, instructionLanguage);
  if (sound)
    return {
      id: `${moduleId}-lesson-${lessonNumber}`,
      title: sound.reading.title,
      sentences: sound.reading.target.map((target, i) => ({ target, en: sound.reading.native[i] })),
    };
  const basics = spanishBasicsLesson(moduleId, lessonNumber, targetLanguage, instructionLanguage);
  if (basics)
    return {
      id: `${moduleId}-lesson-${lessonNumber}`,
      title: basics.reading.title,
      sentences: basics.reading.target.map((target, i) => ({
        target,
        en: basics.reading.native[i],
      })),
    };
  const passage =
    moduleId === "roofing"
      ? ROOFING_LESSON_PASSAGES[lessonNumber]
      : moduleId === "landscaper"
        ? LANDSCAPER_LESSON_CONTENT[lessonNumber]?.reading
        : moduleId === "construction-foreman"
          ? FOREMAN_LESSON_CONTENT[lessonNumber]?.reading
          : null;
  return passage
    ? {
        id: `${moduleId}-lesson-${lessonNumber}`,
        title: passage.title,
        sentences: passage.es.map((target, i) => ({ target, en: passage.en[i] ?? "" })),
      }
    : null;
}

/** A missing explicit mapping must not silently become a different module reading. */
export function exactLessonLibraryId(
  readingTemplate: string | undefined,
  languageCode: string,
  availableIds: readonly string[],
  mappedLessonCount = 1,
) {
  if (mappedLessonCount > 1) return null;
  const id = readingTemplate?.replace("{lang}", languageCode);
  if (id && availableIds.includes(id)) return id;
  // The existing ESL library reverses an explicitly mapped Spanish/English passage.
  const reversed =
    languageCode === "en" && readingTemplate
      ? `esl-${readingTemplate.replace("{lang}", "es")}`
      : null;
  return reversed && availableIds.includes(reversed) ? reversed : null;
}

export function libraryTranslationLanguage(id: string | null) {
  return id?.startsWith("esl-") ||
    /^seed-en-(?:foundation-|master-)?military-lesson-/.test(id ?? "")
    ? "Spanish"
    : "English";
}
