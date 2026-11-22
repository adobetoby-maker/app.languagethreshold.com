// Built by TAC — 2026-10-15
// Pure helpers for per-lesson word lists (no React, no network). Used by
// src/lib/lesson-words.ts (client cache), src/fns/lesson-words.functions.ts (server
// validation), Core30Review and LessonPracticeKit, and unit-tested directly.
//
// FIELD MEANING (inherited from LessonWord, which was written for Spanish):
//   `es`   = the text in the language being LEARNED (the target language)
//   `en`   = the text in the learner's NATIVE language
// The field names are historical; they do not mean Spanish/English any more.

import type { LessonWord } from "../data/curriculum.ts";
import { isCorrectAnswer } from "./lesson-practice.ts";
import {
  historicalCoursePair,
  packFor,
  workplaceCoursePack,
  type LanguagePack,
} from "../data/language-packs/registry.ts";
import { nativeLanguageCode, nativeLanguageName } from "../data/languages.ts";
import { followsPackRules } from "../data/language-packs/pack-rules.ts";

export type LessonWordsStatus = "authored" | "loading" | "ready" | "error";

export const LESSON_WORDS_CACHE_PREFIX = "lt.lessonWords.v1";

/** Counts the server asks for, and the minimums it accepts before reporting success. */
export const WORD_LIMITS = {
  maxTerms: 12,
  maxPhrases: 6,
  minTerms: 6,
  minPhrases: 3,
  maxNativeLength: 140,
  maxTargetLength: 180,
  maxNoteLength: 140,
} as const;

// ─── Cache keys + storage ────────────────────────────────────────────────────

export function lessonWordsKey(
  moduleId: string,
  lessonNumber: number,
  language: string,
  nativeLanguage: string,
): string {
  return `${LESSON_WORDS_CACHE_PREFIX}.${moduleId}.${lessonNumber}.${language}.${nativeLanguage}`;
}

/** The slice of the Storage interface the cache needs (so tests can pass a fake). */
export interface WordsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): WordsStorage | null {
  try {
    const store = (globalThis as { localStorage?: WordsStorage }).localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

/** Reads and validates a cached word list. Null on a miss, bad JSON, or blocked storage. */
export function readCachedWords(
  key: string,
  storage: WordsStorage | null = defaultStorage(),
): LessonWord[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const words = cleanLessonWords(parsed);
    return words.length > 0 ? words : null;
  } catch {
    return null;
  }
}

export function writeCachedWords(
  key: string,
  words: LessonWord[],
  storage: WordsStorage | null = defaultStorage(),
): boolean {
  if (!storage || words.length === 0) return false;
  try {
    storage.setItem(key, JSON.stringify(words));
    return true;
  } catch {
    return false;
  }
}

/** Convenience read used by screens that must not trigger a network call (Core30Review). */
export function readCachedLessonWords(
  moduleId: string,
  lessonNumber: number,
  language: string,
  nativeLanguage: string,
  storage?: WordsStorage | null,
): LessonWord[] | null {
  return readCachedWords(
    lessonWordsKey(moduleId, lessonNumber, language, nativeLanguage),
    storage === undefined ? defaultStorage() : storage,
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

function dedupeKey(text: string): string {
  return text.normalize("NFC").trim().toLocaleLowerCase();
}

/**
 * Turns untrusted input (model output, cache contents) into clean LessonWords:
 * trims, drops entries with missing or oversized text or an unknown kind, dedupes on
 * both sides (case-insensitive), then caps terms and phrases. Terms come first.
 */
export function cleanLessonWords(
  raw: unknown,
  limits: { maxTerms: number; maxPhrases: number } = WORD_LIMITS,
): LessonWord[] {
  if (!Array.isArray(raw)) return [];
  const seenNative = new Set<string>();
  const seenTarget = new Set<string>();
  const terms: LessonWord[] = [];
  const phrases: LessonWord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { en, es, kind, note } = item as Record<string, unknown>;
    if (typeof en !== "string" || typeof es !== "string") continue;
    if (kind !== "term" && kind !== "phrase") continue;
    const native = en.normalize("NFC").trim();
    const target = es.normalize("NFC").trim();
    if (!native || !target) continue;
    if (
      native.length > WORD_LIMITS.maxNativeLength ||
      target.length > WORD_LIMITS.maxTargetLength
    ) {
      continue;
    }
    const nativeKey = dedupeKey(native);
    const targetKey = dedupeKey(target);
    if (seenNative.has(nativeKey) || seenTarget.has(targetKey)) continue;
    const bucket = kind === "term" ? terms : phrases;
    const cap = kind === "term" ? limits.maxTerms : limits.maxPhrases;
    if (bucket.length >= cap) continue;
    seenNative.add(nativeKey);
    seenTarget.add(targetKey);
    const cleanNote = typeof note === "string" ? note.trim() : "";
    const entry: LessonWord = { en: native, es: target, kind };
    if (cleanNote && cleanNote.length <= WORD_LIMITS.maxNoteLength) entry.note = cleanNote;
    bucket.push(entry);
  }
  return [...terms, ...phrases];
}

/** True when a cleaned list is big enough to be worth a practice kit. */
export function hasEnoughWords(words: readonly LessonWord[]): boolean {
  const terms = words.filter((word) => word.kind === "term").length;
  const phrases = words.length - terms;
  return terms >= WORD_LIMITS.minTerms && phrases >= WORD_LIMITS.minPhrases;
}

/**
 * Model output shape: two arrays of {native, target, note?}. Maps to LessonWords
 * (en = native, es = target) with kinds assigned, then cleans.
 */
export function wordsFromModelOutput(input: unknown): LessonWord[] {
  if (!input || typeof input !== "object") return [];
  const { terms, phrases } = input as { terms?: unknown; phrases?: unknown };
  const map = (list: unknown, kind: "term" | "phrase") =>
    Array.isArray(list)
      ? list.map((item) => {
          const pair = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return { en: pair.native, es: pair.target, kind, note: pair.note };
        })
      : [];
  return cleanLessonWords([...map(terms, "term"), ...map(phrases, "phrase")]);
}

// ─── Which words does a learner get? ─────────────────────────────────────────

/** The language pair a module's authored words are written for. */
export interface AuthoredWordsPair {
  /** The language being learned (what the `es` field holds). */
  language: string;
  /** The learner's native language (what the `en` field holds). */
  nativeLanguage: string;
}

/**
 * Modules written before module records carried an `authoredPair` (the hand-written trades) were
 * authored in the historical course pair (its app file sets historicalCourse): `es` holds the
 * target, `en` the native. A fact about that data, read from the registry, never a default for
 * another language: a module that names its `authoredPair` is never read through it.
 */
export function historicalAuthoredPair(): AuthoredWordsPair {
  const pair = historicalCoursePair();
  return { language: pair.target, nativeLanguage: pair.native };
}

/**
 * English-for-work modules (learnDirection "en-target"): their stage files store the workplace
 * target text in `es` and the gloss in `en`, already in the LessonWord convention, so the words
 * need no swapping. The native is the workplace course's default native.
 */
export function workplaceAuthoredPair(): AuthoredWordsPair {
  const pack = workplaceCoursePack();
  return { language: pack.name, nativeLanguage: nativeLanguageName(pack.native.default) ?? "" };
}

/** The pair a module's authored words are written for, from its AppModule.learnDirection. */
export function authoredWordsPair(learnDirection?: string | null): AuthoredWordsPair {
  return learnDirection === "en-target" ? workplaceAuthoredPair() : historicalAuthoredPair();
}

/** Prefer an explicitly authored pair; historical modules keep their direction-based default. */
export function authoredWordsPairForModule(module?: {
  authoredPair?: { target: string; native: string };
  learnDirection?: string | null;
} | null): AuthoredWordsPair {
  return module?.authoredPair
    ? { language: module.authoredPair.target, nativeLanguage: module.authoredPair.native }
    : authoredWordsPair(module?.learnDirection);
}

/**
 * Authored words are served only to the pair they were written for (Spanish target / English
 * native by default, English target / Spanish native for en-target modules). Any other pair,
 * including the reverse of the written pair, is generated instead: the sides and the notes
 * would be in the wrong language.
 */
export function pickAuthoredWords(
  authored: readonly LessonWord[] | undefined,
  language: string,
  nativeLanguage: string,
  writtenFor: AuthoredWordsPair,
): LessonWord[] | null {
  if (
    language !== writtenFor.language ||
    nativeLanguage !== writtenFor.nativeLanguage ||
    !authored ||
    authored.length === 0
  )
    return null;
  return [...authored];
}

// ─── Pre-built static decks (public/lesson-decks) ────────────────────────────

/** Schema version of a deck file; the loader ignores any other version. */
export const LESSON_DECK_VERSION = 1;

/** Shape of public/lesson-decks/<code>/<moduleId>.json (written by scripts/build-lesson-decks.mts). */
export interface LessonDeck {
  version: number;
  module: string;
  /** Target language (the one being learned). */
  language: string;
  nativeLanguage: string;
  model?: string;
  generatedAt?: string;
  /** Keyed by lesson number as a string. */
  lessons: Record<string, LessonWord[]>;
}

/** Directory name for a language in the deck tree: its BCP-47 primary subtag ("es", "ja"). */
export function deckLanguageDir(language: string): string {
  return languageTag(language);
}

/** The native language a target language's deck is written for: its pack's native default. */
export function deckNativeLanguage(targetLanguage: string): string {
  return nativeLanguageName(packFor(targetLanguage)?.native.default) ?? "";
}

/** Site-relative URL of a module's deck for one target language. */
export function lessonDeckPath(moduleId: string, language: string): string {
  return `/lesson-decks/${deckLanguageDir(language)}/${encodeURIComponent(moduleId)}.json`;
}

/**
 * Validates an untrusted deck (parsed JSON): right version, matching module + language,
 * lessons cleaned with the same rules as live generation. Null when it is unusable.
 */
export function parseLessonDeck(
  raw: unknown,
  expected: { moduleId: string; language: string },
): LessonDeck | null {
  if (!raw || typeof raw !== "object") return null;
  const deck = raw as Record<string, unknown>;
  if (deck.version !== LESSON_DECK_VERSION) return null;
  if (deck.module !== expected.moduleId || deck.language !== expected.language) return null;
  if (typeof deck.nativeLanguage !== "string" || !deck.nativeLanguage) return null;
  if (!deck.lessons || typeof deck.lessons !== "object" || Array.isArray(deck.lessons)) {
    return null;
  }
  const lessons: Record<string, LessonWord[]> = {};
  for (const [number, list] of Object.entries(deck.lessons as Record<string, unknown>)) {
    const words = cleanLessonWords(list);
    if (hasEnoughWords(words)) lessons[number] = words;
  }
  return {
    version: LESSON_DECK_VERSION,
    module: expected.moduleId,
    language: expected.language,
    nativeLanguage: deck.nativeLanguage,
    model: typeof deck.model === "string" ? deck.model : undefined,
    generatedAt: typeof deck.generatedAt === "string" ? deck.generatedAt : undefined,
    lessons,
  };
}

/**
 * Words for one lesson from a loaded deck. Only used when the deck was written for the
 * learner's native language (a Spanish-native English deck is no use to a French native).
 */
export function pickDeckWords(
  deck: LessonDeck | null | undefined,
  lessonNumber: number,
  nativeLanguage: string,
): LessonWord[] | null {
  if (!deck || deck.nativeLanguage !== nativeLanguage) return null;
  const words = deck.lessons[String(lessonNumber)];
  return words && words.length > 0 ? [...words] : null;
}

// ─── Languages: tags, short codes, helper keys ───────────────────────────────

/**
 * BCP-47 primary subtag for a `lang` attribute or a content path: the target language's pack code
 * (resolved from a code or a stored legacy name), else the native-language setting's code, else
 * "und". The code comes from the pack registry, never from a hand-kept name table.
 */
export function languageTag(language: string): string {
  return packFor(language)?.code ?? nativeLanguageCode(language) ?? "und";
}

/** Short uppercase label for toggles ("ES", "FR"); falls back to the first two letters. */
export function languageCode(language: string): string {
  const tag = languageTag(language);
  return (tag === "und" ? language.slice(0, 2) : tag).toUpperCase();
}

// ─── Typed-answer checking ───────────────────────────────────────────────────

/** True when every letter in the text is Latin script (digits and punctuation are ignored). */
export function isLatinScript(text: string): boolean {
  return !/(?!\p{Script=Latin})\p{L}/u.test(text);
}

const HAN_KANA_HANGUL = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * Comparison form for non-Latin answers. Nothing is transliterated or accent-stripped (the
 * Latin helper would erase vowel marks and turn CJK into blanks). NFKC folds full-width
 * forms; punctuation goes; for CJK text spaces go too (they are not meaningful there),
 * for other scripts runs of spaces collapse to one.
 */
export function normalizeScriptAnswer(text: string): string {
  const folded = text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ");
  return HAN_KANA_HANGUL.test(folded)
    ? folded.replace(/\s+/g, "")
    : folded.replace(/\s+/g, " ").trim();
}

function scriptVariants(target: string): string[] {
  const variants = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeScriptAnswer(value);
    if (normalized) variants.add(normalized);
  };
  add(target);
  const beforeParen = target.split(/\s*[(（]/)[0];
  add(beforeParen);
  for (const side of target.split(/\s+\/\s+|／/)) add(side.split(/\s*[(（]/)[0]);
  return [...variants];
}

/**
 * Is `input` a correct typed answer for `target` in this pack? A pack written in Latin script keeps
 * the accent- and case-insensitive check the Spanish kit has always had (the pack's typed accent
 * policy replaces it in the Type/Write work; see audit/pwa-foundation.md). Any other script is
 * compared exactly (after NFKC, punctuation and, for CJK, space removal), so a missing vowel mark
 * or a different character is wrong rather than silently accepted. The pack is required.
 */
export function isCorrectTypedAnswer(input: string, target: string, pack: LanguagePack): boolean {
  // Base rule for Spanish, Japanese and languages without a pack: any Latin-script target (pinyin,
  // romaji) gets the accent-blind check. A course pack only does so in a Latin-script language.
  const latin = followsPackRules(pack)
    ? pack.script.iso15924.includes("Latn") && isLatinScript(target)
    : isLatinScript(target);
  if (latin) return isCorrectAnswer(input, target, pack);
  const normalized = normalizeScriptAnswer(input);
  if (!normalized) return false;
  return scriptVariants(target).includes(normalized);
}
