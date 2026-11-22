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
import { PACKS, historicalCoursePack, packFor } from "../data/language-packs/registry.ts";
import { appData } from "../data/language-packs/app-data.ts";
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

type ReadingFinder = (
  moduleId: string,
  lessonNumber: number,
  targetLanguage: string,
  nativeLanguage: string,
) => ReadingSource | null | undefined;

/** A trade's hand-authored passages (roofing, landscaping, crew lead), written in the historical pair. */
function tradePassage(moduleId: string, n: number): ReadingSource | null {
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
}

/**
 * Authored reading tracks, by the id a language's app file lists for a native language
 * (app/<code>.json readingTracks: { "<native code>": [track ids, in lookup order] }), the PWA's
 * form of the pack's content.readingTracks. A pair whose app file lists none has no authored
 * reading (the caller falls back to generated content). Each finder is also pair-checked by its
 * own content, so a track never serves another pair's text.
 */
const READING_TRACKS: Record<string, ReadingFinder> = {
  "military-esl": (moduleId, n) => militaryLessonPractice(moduleId, n)?.reading,
  "japanese-basics": (moduleId, n, target, native) =>
    japaneseBasicsLesson(moduleId, n, target, native)?.reading,
  "place-directions": (moduleId, n, target, native) => placeLesson(moduleId, n, target, native)?.reading,
  "sound-like-a-native": (moduleId, n, target, native) =>
    soundLesson(moduleId, n, target, native)?.reading,
  "spanish-basics": (moduleId, n, target, native) =>
    spanishBasicsLesson(moduleId, n, target, native)?.reading,
  "trade-passages": (moduleId, n) => tradePassage(moduleId, n),
};

/** The finders a pair's target language lists for its native language. */
function readingTracksFor(targetLanguage: string, instructionLanguage: string): ReadingFinder[] {
  const pack = packFor(targetLanguage);
  const native = codeOf(instructionLanguage);
  const ids = pack ? (appData(pack).readingTracks[native] ?? []) : [];
  return ids.flatMap((id) => (READING_TRACKS[id] ? [READING_TRACKS[id]] : []));
}

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
  for (const find of readingTracksFor(targetLanguage, instructionLanguage)) {
    const source = find(moduleId, lessonNumber, targetLanguage, instructionLanguage);
    if (source) return asReading(moduleId, lessonNumber, source);
  }
  return null;
}

/**
 * The ESL library is the one written for learners of one target language: the pack whose app file
 * names its own library id prefix (app/<code>.json libraryIdPrefix, "esl-"). Its own seed ids are
 * "seed-<code>-…".
 */
const eslPack = () => PACKS.find((pack) => appData(pack).libraryIdPrefix) ?? null;
const eslPrefix = () => {
  const pack = eslPack();
  return pack ? (appData(pack).libraryIdPrefix ?? "") : "";
};

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
  const esl = eslPack();
  const eslNative = esl?.native.default;
  const reversed =
    esl && languageCode === esl.code && readingTemplate && eslNative
      ? `${eslPrefix()}${readingTemplate.replace("{lang}", eslNative)}`
      : null;
  return reversed && availableIds.includes(reversed) ? reversed : null;
}

export function libraryTranslationLanguage(id: string | null) {
  const pack = eslPack();
  const eslNative = nativeLanguageName(pack?.native.default);
  const eslOwn = pack
    ? new RegExp(`^seed-${pack.code}-(?:foundation-|master-)?(?:military|or-evs)-lesson-`)
    : null;
  const prefix = eslPrefix();
  if (id && ((prefix && id.startsWith(prefix)) || eslOwn?.test(id))) return eslNative ?? "";
  // Every other library entry is glossed in the historical course's native language.
  return nativeLanguageName(historicalCoursePack().native.default) ?? "";
}
