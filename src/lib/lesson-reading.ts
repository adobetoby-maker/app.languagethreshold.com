import { interestLesson } from "../data/interests-spanish.ts";
import { orCleaningLesson } from "../data/or-cleaning.ts";
import { placeLesson } from "../data/place-directions.ts";
import { soundLesson } from "../data/sound-like-a-native.ts";
import { spanishBasicsLesson } from "../data/spanish-basics.ts";
import { japaneseBasicsLesson } from "../data/japanese-basics.ts";
import { ROOFING_LESSON_PASSAGES } from "../data/roofing-lesson-passages.ts";
import { LANDSCAPER_LESSON_CONTENT } from "../data/landscaper-lesson-content.ts";
import { FOREMAN_LESSON_CONTENT } from "../data/construction-foreman-lesson-content.ts";
import { militaryLessonPractice } from "../data/military-practice.ts";
import { packFor } from "../data/language-packs/registry.ts";
import { nativeLanguageCode, nativeLanguageName } from "../data/languages.ts";

interface ReadingSource {
  title: string;
  target: readonly string[];
  native: readonly string[];
}

const asReading = (moduleId: string, lessonNumber: number, source: ReadingSource) => ({
  id: `${moduleId}-lesson-${lessonNumber}`,
  title: source.title,
  sentences: source.target.map((target, i) => ({ target, en: source.native[i] })),
});

type ReadingFinder = (moduleId: string, lessonNumber: number) => ReadingSource | null | undefined;

/**
 * Authored reading tracks for one exact pair, in lookup order. A pair with no row has no authored
 * reading (the caller falls back to generated content); adding a language is adding a row here,
 * not another branch. Keys are "<target code>><native code>".
 */
const PAIR_TRACKS: Record<string, readonly ReadingFinder[]> = {
  "en>es": [(moduleId, n) => militaryLessonPractice(moduleId, n)?.reading],
  "ja>en": [(moduleId, n) => japaneseBasicsLesson(moduleId, n, "Japanese", "English")?.reading],
  "es>en": [
    (moduleId, n) => placeLesson(moduleId, n, "Spanish", "English")?.reading,
    (moduleId, n) => soundLesson(moduleId, n, "Spanish", "English")?.reading,
    (moduleId, n) => spanishBasicsLesson(moduleId, n, "Spanish", "English")?.reading,
    (moduleId, n) => {
      const passage =
        moduleId === "roofing"
          ? ROOFING_LESSON_PASSAGES[n]
          : moduleId === "landscaper"
            ? LANDSCAPER_LESSON_CONTENT[n]?.reading
            : moduleId === "construction-foreman"
              ? FOREMAN_LESSON_CONTENT[n]?.reading
              : null;
      return passage
        ? { title: passage.title, target: passage.es, native: passage.es.map((_, i) => passage.en[i] ?? "") }
        : null;
    },
  ],
};

const codeOf = (name: string): string => packFor(name)?.code ?? nativeLanguageCode(name) ?? name;

/** Authored translations belong to an exact pair, never just a target language. */
export function authoredLessonReading(
  moduleId: string,
  lessonNumber: number | undefined,
  targetLanguage: string,
  instructionLanguage: string,
) {
  if (lessonNumber) {
    // Pair-aware authored sources decide for themselves whether they cover the pair.
    const interest = interestLesson(moduleId, lessonNumber, targetLanguage, instructionLanguage);
    if (interest) return asReading(moduleId, lessonNumber, interest.reading);
    const cleaning = orCleaningLesson(moduleId, lessonNumber, targetLanguage, instructionLanguage);
    if (cleaning) return asReading(moduleId, lessonNumber, cleaning.reading);
  }
  if (!lessonNumber) return null;
  const finders = PAIR_TRACKS[`${codeOf(targetLanguage)}>${codeOf(instructionLanguage)}`] ?? [];
  for (const find of finders) {
    const source = find(moduleId, lessonNumber);
    if (source) return asReading(moduleId, lessonNumber, source);
  }
  return null;
}

/** The ESL library (ids "esl-…", "seed-en-…") is the one written for English-target learners. */
const ESL_CODE = "en";
const eslPack = () => packFor(ESL_CODE);

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
  // The existing ESL library reverses an explicitly mapped passage of the ESL learner's native pair.
  const eslNative = eslPack()?.native.default;
  const reversed =
    languageCode === ESL_CODE && readingTemplate && eslNative
      ? `esl-${readingTemplate.replace("{lang}", eslNative)}`
      : null;
  return reversed && availableIds.includes(reversed) ? reversed : null;
}

export function libraryTranslationLanguage(id: string | null) {
  const pack = eslPack();
  const eslNative = nativeLanguageName(pack?.native.default);
  const eslOwn = new RegExp(`^seed-${ESL_CODE}-(?:foundation-|master-)?(?:military|or-evs)-lesson-`);
  return id?.startsWith("esl-") || eslOwn.test(id ?? "") ? (eslNative ?? "") : "English";
}
