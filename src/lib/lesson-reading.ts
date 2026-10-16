import { ROOFING_LESSON_PASSAGES } from "../data/roofing-lesson-passages.ts";
import { LANDSCAPER_LESSON_CONTENT } from "../data/landscaper-lesson-content.ts";

/** Authored translations belong to an exact pair, never just a target language. */
export function authoredLessonReading(
  moduleId: string,
  lessonNumber: number | undefined,
  targetLanguage: string,
  instructionLanguage: string,
) {
  if (targetLanguage !== "Spanish" || instructionLanguage !== "English" || !lessonNumber)
    return null;
  const passage =
    moduleId === "roofing"
      ? ROOFING_LESSON_PASSAGES[lessonNumber]
      : moduleId === "landscaper"
        ? LANDSCAPER_LESSON_CONTENT[lessonNumber]?.reading
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
  return id?.startsWith("esl-") ? "Spanish" : "English";
}
