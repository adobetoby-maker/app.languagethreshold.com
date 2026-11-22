import { resolveTutorLesson, type TutorLessonReference } from "./lesson-tutor-context.ts";
import type { LanguagePack } from "../data/language-packs/registry.ts";
import { packFor } from "../data/language-packs/registry.ts";
import type { WordCardData } from "../fns/word-lookup.functions.ts";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Drops one leading article (or elided article: l', un') or infinitive marker from a single
 * lower-cased headword, using the pack's own lists, so "le disjoncteur" and "disjoncteur" meet.
 * Only when exactly one word remains; a phrase keeps its words.
 */
export function stripLeadingArticle(value: string, pack: LanguagePack | null): string {
  if (!pack) return value;
  const articles = pack.grammar.nounSystem.articles;
  const lookup = pack.dictionary.lookup;
  const lead = [
    ...(lookup.stripArticles ? [...(articles.definite ?? []), ...(articles.indefinite ?? [])] : []),
    ...lookup.stripPrefixes,
  ].filter((entry) => !/['’ʼ]$/u.test(entry));
  const elided = [
    ...(lookup.stripArticles ? [...(articles.definite ?? []), ...(articles.indefinite ?? [])] : []),
    ...lookup.elisionPrefixes,
  ].filter((entry) => /['’ʼ]$/u.test(entry));
  const spaced = lead.length
    ? new RegExp(`^(?:${lead.map(escapeRegExp).join("|")})\\s+(?=\\S+$)`, "u")
    : null;
  const apostrophe = elided.length
    ? new RegExp(`^(?:${elided.map((e) => escapeRegExp(e.slice(0, -1))).join("|")})['’ʼ](?=\\S+$)`, "u")
    : null;
  return value.replace(spaced ?? /^$/u, "").replace(apostrophe ?? /^$/u, "");
}

function exactWord(value: string, pack: LanguagePack | null) {
  // Ignore sentence punctuation and a leading article, not accents or inflections. A partial match
  // must never turn a compound's definition into a definition of one token.
  const locale = pack?.variety.tag;
  const folded = value
    .normalize("NFC")
    .trim()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
  return stripLeadingArticle(locale ? folded.toLocaleLowerCase(locale) : folded.toLowerCase(), pack);
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
  const pack = packFor(targetLanguage);
  const entry = lesson?.words.find((item) =>
    (item.kind === "term" ? [item.es, ...item.es.split(/\s+\/\s+/u)] : [item.es]).some(
      (candidate) => exactWord(candidate, pack) === exactWord(word, pack),
    ),
  );
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
