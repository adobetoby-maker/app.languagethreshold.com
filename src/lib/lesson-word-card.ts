import { resolveTutorLesson, type TutorLessonReference } from "./lesson-tutor-context.ts";
import type { WordCardData } from "../fns/word-lookup.functions.ts";

function exactWord(value: string) {
  // Ignore sentence punctuation, not accents or inflections. A partial match
  // must never turn a compound's definition into a definition of one token.
  return value
    .normalize("NFC")
    .trim()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
    .toLowerCase();
}

/** Public curriculum data already included in the lesson pack; no AI inference. */
export function lessonWordCard(
  reference: TutorLessonReference | undefined,
  word: string,
  targetLanguage: string,
  nativeLanguage: string,
): WordCardData | null {
  if (
    !reference ||
    reference.targetLanguage !== targetLanguage ||
    reference.instructionLanguage !== nativeLanguage
  )
    return null;
  const lesson = resolveTutorLesson(reference);
  const entry = lesson?.words.find((item) => exactWord(item.es) === exactWord(word));
  if (!entry?.es.trim() || !entry.en.trim()) return null;
  return {
    headword: entry.es,
    baseDefinition: entry.en,
    partOfSpeech: "",
    phonetic: "",
    conjugationNote: "",
    contextNuance: entry.note ?? "",
    exampleSentence: "",
    exampleTranslation: "",
  };
}
