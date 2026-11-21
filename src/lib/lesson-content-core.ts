// Built by TAC — 2026-10-17
// Pure helpers for authored lesson content: a lesson-specific passage, vocabulary and verbs for
// every Core 30 lesson. No React, no network, so the offline generator
// (scripts/build-lesson-content.mts), the app loader (src/lib/lesson-content.ts) and the node
// tests all share one definition of "valid content".
//
// FIELD MEANING (same convention as lesson-words-core.ts): in a LessonWord `es` is the text in
// the TARGET language (the one being learned) and `en` is the learner's NATIVE language text.
// Passages say it plainly: `target` / `native`.

import type { LessonWord } from "../data/curriculum.ts";
import { cleanLessonWords, isCorrectTypedAnswer, languageTag } from "./lesson-words-core.ts";
import { PACKS, packFor, type LanguagePack } from "../data/language-packs/registry.ts";
import { nativeLanguageName } from "../data/languages.ts";
import { requiredVerbFormKeys } from "./language-pack-text.ts";
import { contentRulesFor } from "../data/language-packs/content-rules.ts";

export const LESSON_CONTENT_VERSION = 1;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LessonPassageContent {
  title: string;
  /** Sentences in the language being learned. */
  target: string[];
  /** Sentence-aligned translation into the learner's native language. */
  native: string[];
}

export interface LessonVerbExample {
  target: string;
  native: string;
}

export interface LessonVerb {
  /** Dictionary form in the target language ("cortar"; English: "clean"). */
  infinitive: string;
  /** Meaning in the native language ("to cut"; for English targets: "limpiar"). */
  native: string;
  /** Present tense, keyed by VerbFormKey for the target language. */
  forms: Record<string, string>;
  example: LessonVerbExample;
  note?: string;
}

export interface LessonContentLesson {
  /** Absent when the passage is authored elsewhere (roofing). */
  passage?: LessonPassageContent;
  /** Absent when the words are authored elsewhere (roofing). */
  words?: LessonWord[];
  verbs: LessonVerb[];
}

export interface LessonContentFile {
  version: number;
  module: string;
  /** Target language (the one being learned). */
  language: string;
  nativeLanguage: string;
  model?: string;
  generatedAt?: string;
  /** True once a person who reads the language has gone through the file. */
  reviewed: boolean;
  /** Keyed by lesson number as a string. */
  lessons: Record<string, LessonContentLesson>;
}

/** Which parts of a lesson are produced (the rest are authored elsewhere). */
export interface ContentParts {
  passage: boolean;
  words: boolean;
  verbs: boolean;
}

// ─── Limits ──────────────────────────────────────────────────────────────────

export const CONTENT_LIMITS = {
  minSentences: 5,
  maxSentences: 9,
  maxSentenceLength: 260,
  maxTitleLength: 70,
  minTerms: 8,
  maxTerms: 12,
  minPhrases: 4,
  maxPhrases: 6,
  minTermsUsed: 5,
  minPhrasesUsed: 1,
  minVerbs: 3,
  maxVerbs: 5,
  maxNoteLength: 160,
} as const;

/** The numeric limits a lesson's content is validated against (a profile per kind of module). */
export interface ContentLimits {
  minSentences: number;
  maxSentences: number;
  maxSentenceLength: number;
  maxTitleLength: number;
  minTerms: number;
  maxTerms: number;
  minPhrases: number;
  maxPhrases: number;
  minTermsUsed: number;
  minPhrasesUsed: number;
  minVerbs: number;
  maxVerbs: number;
  maxNoteLength: number;
  preserveAccentContrasts?: boolean;
  maxTermWords?: number;
  maxPhraseWords?: number;
}

/**
 * Master 20 lessons (module id "master-<trade>") are longer and denser than the Core 30:
 * 12-18 sentences, 12-16 terms, 6-8 phrases and exactly five verbs.
 */
export const MASTER_CONTENT_LIMITS: ContentLimits = {
  minSentences: 12,
  maxSentences: 18,
  maxSentenceLength: 260,
  maxTitleLength: 70,
  minTerms: 12,
  maxTerms: 16,
  minPhrases: 6,
  maxPhrases: 8,
  minTermsUsed: 8,
  minPhrasesUsed: 2,
  minVerbs: 5,
  maxVerbs: 5,
  maxNoteLength: 160,
};

/** The limits profile for a module id: Master for "master-*", the Core 30 limits for the rest. */
export function contentLimitsFor(moduleId: string | null | undefined): ContentLimits {
  const base = moduleId?.startsWith("master-") ? MASTER_CONTENT_LIMITS : CONTENT_LIMITS;
  // Spanish clinical compounds and complete shift reports need their full wording.
  if (/^(foundation-|master-)?or-cleaning$/.test(moduleId ?? ""))
    return { ...base, maxTermWords: 7, maxPhraseWords: 18 };
  // Pronunciation keeps a compact word set and spends Master time on sound/prosody
  // transfer. Preserve accent distinctions such as público/publico/publicó.
  if (/^(foundation-|master-)?sound-like-a-native$/.test(moduleId ?? "")) return {
    ...base, minTerms: 6, maxTerms: 10, minPhrases: 4, maxPhrases: 6,
    minSentences: moduleId?.startsWith("master-") ? 8 : 5,
    minTermsUsed: 5, minPhrasesUsed: 1, minVerbs: 3, maxVerbs: 3,
    preserveAccentContrasts: true,
  };
  return moduleId && /^(foundation-|master-)?[a-z]+-conjugation-patterns$/.test(moduleId)
    ? { ...base, minVerbs: 10, maxVerbs: 10 }
    : base;
}

// ─── Verb forms ──────────────────────────────────────────────────────────────

type PackLike = string | LanguagePack | null | undefined;

const packOf = (language: PackLike): LanguagePack | null =>
  typeof language === "string" ? packFor(language) : (language ?? null);

/** Keys of `LessonVerb.forms` for a target language, in learning order. Null = no verb support. */
export function verbFormKeys(language: PackLike): readonly string[] | null {
  const pack = packOf(language);
  // A form-axis language (Japanese: plain/polite, te) has no person table to drill.
  if (!pack || pack.grammar.verbForms.axis !== "person") return null;
  const keys = requiredVerbFormKeys(pack);
  return keys.length > 0 ? keys : null;
}

/**
 * The pronoun shown for a form key, from the pack. Without a language the first pack that defines
 * the key answers; the key itself when none does.
 */
export function verbFormLabel(key: string, language?: PackLike): string {
  const own = packOf(language);
  const candidates = own ? [own] : Object.values(PACKS);
  for (const pack of candidates) {
    const hit = pack.grammar.verbForms.keys.find((k) => k.key === key);
    if (hit) return hit.label;
  }
  return key;
}

/** Tool-schema keys are ASCII only (the API rejects "tú"): the file's key with marks removed. */
const asciiKey = (key: string): string => key.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** The keys a model is asked to return for a target language (ASCII), in learning order. */
export function modelFormKeys(language: PackLike): readonly string[] {
  return (verbFormKeys(language) ?? []).map(asciiKey);
}

/** Map a model key back onto the file's key for a language (unknown keys pass through). */
export function formKeyOfModelKey(language: PackLike, key: string): string {
  return (verbFormKeys(language) ?? []).find((k) => asciiKey(k) === key) ?? key;
}

/** A reflexive verb's forms carry the pronoun ("me lavo", "m'appelle"); a learner may type it or not. */
export function stripReflexive(form: string, pack: LanguagePack): string {
  const pronouns = pack.grammar.reflexivePronouns;
  if (pronouns.length === 0) return form.trim();
  const lead = [...pronouns]
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const spaced = new RegExp(`^(?:${lead.join("|")})(?:\\s+|(?<=['’ʼ]))`, "iu");
  return form.replace(spaced, "").trim();
}

// ─── Text helpers (accent-insensitive matching) ──────────────────────────────

export const foldText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const WORD_CHARS = String.raw`\p{L}\p{N}`;

/**
 * Words of a string for a pack, case and marks removed. Letters and digits of any script; a pack's
 * `typography.wordInnerCharacters` (the Swahili n' in ng'ombe) stay inside the word.
 */
export const wordsIn = (text: string, pack?: LanguagePack | null): string[] => {
  const inner = (pack?.typography.wordInnerCharacters ?? []).map((c) => c.replace(/[\\\]^-]/g, "\\$&"));
  const pattern = inner.length
    ? new RegExp(`[${WORD_CHARS}]+(?:[${inner.join("")}][${WORD_CHARS}]+)*`, "gu")
    : new RegExp(`[${WORD_CHARS}]+`, "gu");
  return foldText(text).match(pattern) ?? [];
};

/** Words of a string with no pack (letters and digits of any script, marks removed). */
export const wordsOf = (text: string): string[] => wordsIn(text);

/** Prefix stem so inflections match: hundido/hundidos, reparación/reparar, escalonar/escalonen. */
export const stemOf = (word: string): string =>
  word.slice(0, Math.min(word.length, Math.max(4, Math.ceil(word.length * 0.6))));

const startsWithStem = (passageWord: string, word: string): boolean =>
  passageWord.startsWith(stemOf(word));

/** A lesson term may list alternates ("Cubierta / Forro de techo", "Ventilación (de caballete)"). */
const termAlternates = (target: string): string[] =>
  target
    .split(/[/()]/)
    .map((part) => part.trim())
    .filter(Boolean);

// An alternate matches when every content word (4+ letters) appears, by stem; short words count
// as content only when the alternate has no longer word ("Arnés" is fine, "de" is skipped).
const alternateMatches = (alternate: string, passageWords: string[]): boolean => {
  const words = wordsOf(alternate);
  const content = words.filter((w) => w.length >= 4);
  const needed = content.length > 0 ? content : words;
  return needed.length > 0 && needed.every((w) => passageWords.some((pw) => startsWithStem(pw, w)));
};

/** True when the lesson term (target-language text) appears in the passage words. */
export const termMatches = (targetTerm: string, passageWords: string[]): boolean =>
  termAlternates(targetTerm).some((alt) => alternateMatches(alt, passageWords));

/**
 * A phrase matches when any run of three consecutive phrase words (the whole phrase if
 * shorter) appears in the passage in order, each word allowing inflection by stem.
 */
export const phraseMatches = (targetPhrase: string, passageWords: string[]): boolean => {
  const words = wordsOf(targetPhrase);
  const size = Math.min(3, words.length);
  if (size === 0) return false;
  for (let start = 0; start + size <= words.length; start += 1) {
    const run = words.slice(start, start + size);
    for (let at = 0; at + size <= passageWords.length; at += 1) {
      if (run.every((w, i) => startsWithStem(passageWords[at + i], w))) return true;
    }
  }
  return false;
};

const digitsOf = (text: string): string[] => text.match(/\d+/g) ?? [];

// ─── Invisible characters ────────────────────────────────────────────────────

// Characters a reader cannot see that break matching, speech and typed answers: the soft hyphen,
// zero-width space / joiners, the word joiner, the byte-order mark, C0 / C1 control characters
// (tabs and newlines included: content strings are single lines), and a non-breaking space glued
// between two letters (inside a word).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const INVISIBLE_CHARS = /[\u00AD\u200B-\u200D\u2060\uFEFF\u0000-\u001F\u007F-\u009F]|(?<=\p{L})[\u00A0\u202F\u2007](?=\p{L})/u;

/** A description of the first invisible character in `text`, or null when there is none. */
export function invisibleCharIssue(text: string): string | null {
  const match = INVISIBLE_CHARS.exec(text);
  if (!match) return null;
  const code = match[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
  const at = match.index;
  const around = text.slice(Math.max(0, at - 12), at + 12).replace(INVISIBLE_CHARS, "\u2423");
  return `invisible character U+${code} in "${around}" (retype the word without it)`;
}

/** Error messages for every string in `value` (deep) that holds an invisible character. */
export function invisibleCharErrors(label: string, value: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      const issue = invisibleCharIssue(node);
      if (issue) out.push(`${path}: ${issue}`);
    } else if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [key, item] of Object.entries(node)) walk(item, `${path}.${key}`);
    }
  };
  walk(value, label);
  return out;
}

// ─── Cleaning untrusted data (model output, fetched files) ───────────────────

const asString = (value: unknown): string =>
  typeof value === "string" ? value.normalize("NFC").trim() : "";

/** Passage with string arrays of equal, non-zero length; null otherwise. */
export function cleanPassage(raw: unknown): LessonPassageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const { title, target, native } = raw as Record<string, unknown>;
  if (!Array.isArray(target) || !Array.isArray(native)) return null;
  const cleanTitle = asString(title);
  const t = target.map(asString);
  const n = native.map(asString);
  if (!cleanTitle || t.length === 0 || t.length !== n.length) return null;
  if (t.some((s) => !s) || n.some((s) => !s)) return null;
  return { title: cleanTitle, target: t, native: n };
}

/** Verbs with every form present for the language; entries missing anything are dropped. */
export function cleanLessonVerbs(raw: unknown, language: string): LessonVerb[] {
  const keys = verbFormKeys(language);
  if (!keys || !Array.isArray(raw)) return [];
  const out: LessonVerb[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { infinitive, native, forms, example, note } = item as Record<string, unknown>;
    const inf = asString(infinitive);
    const meaning = asString(native);
    if (!inf || !meaning || !forms || typeof forms !== "object") continue;
    const cleanForms: Record<string, string> = {};
    let complete = true;
    for (const key of keys) {
      const form = asString((forms as Record<string, unknown>)[key]);
      if (!form) complete = false;
      cleanForms[key] = form;
    }
    if (!complete) continue;
    const ex = example && typeof example === "object" ? (example as Record<string, unknown>) : {};
    const exTarget = asString(ex.target);
    const exNative = asString(ex.native);
    if (!exTarget || !exNative) continue;
    const dedupe = foldText(inf);
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const verb: LessonVerb = {
      infinitive: inf,
      native: meaning,
      forms: cleanForms,
      example: { target: exTarget, native: exNative },
    };
    const cleanNote = asString(note);
    if (cleanNote && cleanNote.length <= CONTENT_LIMITS.maxNoteLength) verb.note = cleanNote;
    out.push(verb);
  }
  return out;
}

/** Maps the tool's ASCII form keys (tu) onto the file's keys (tú) before cleaning. */
export function verbsFromModelOutput(raw: unknown, language: string): LessonVerb[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((item) => {
    if (!item || typeof item !== "object") return item;
    const record = item as Record<string, unknown>;
    const forms: Record<string, unknown> = {};
    if (record.forms && typeof record.forms === "object") {
      for (const [key, value] of Object.entries(record.forms as Record<string, unknown>)) {
        forms[formKeyOfModelKey(language, key)] = value;
      }
    }
    return { ...record, forms };
  });
  return cleanLessonVerbs(mapped, language);
}

// ─── Validation (used by the generator, its retries, and the tests) ──────────

export interface ValidateContext {
  /** Target language name ("Spanish" | "English"). */
  language: string;
  nativeLanguage: string;
  /** Which parts the lesson must contain. */
  parts: ContentParts;
  /** The lesson's words when they are authored elsewhere, so the passage can be checked against them. */
  words?: readonly LessonWord[];
  /** Limits profile (contentLimitsFor(moduleId)); the Core 30 limits when absent. */
  limits?: ContentLimits;
}

const QUOTES_OR_DASH = /^\s*[—–]|["“”«»]/;
// Words that are unmistakably Spanish / English, to catch a note written in the wrong language.
// Marker words for judging which language a short note is written in. A note may quote a
// word or phrase in the other language ("bajarse del autobús", "presents with"), so the
// check compares counts instead of rejecting on any single marker.
// The marker patterns come from the packs (contentChecks.targetMarkers / nativeMarkers).
function markerCount(text: string, pattern: string | undefined): number {
  return pattern ? (text.match(new RegExp(pattern, "gi")) ?? []).length : 0;
}
// A note states the final rule only. These patterns catch the model thinking out loud inside a
// note ("Stem change e to ie? No: e to i"). Everything is tested outside quoted text, and a note
// may still gloss a word ("En realidad means in fact, actually", "Déjame: let me, informal",
// "Let me know is avíseme"), so:
//  - a self-correction needs the shape "? No:" / "... no:" / ". No:" / "— no," (a colon, or a dash
//    and comma), or "? No," / "... no," followed by a rule-like correction ("e to i", "it is");
//    a Spanish answer such as "¿Tiene alergias? No, ninguna." is not one;
//  - deliberation words only count where a thought opens (start of the note or right after
//    . ! ? … ; , or a dash; a colon introduces a gloss) and never after "means" or as the subject
//    of a gloss ("Actually is a false friend").
const RULE_LIKE = String.raw`(?:[a-zñ]{1,2}\s+(?:to|a)\s+[a-zñ]{1,2}\b|it\s+is\b|it's\b|it\s+has\b|actually\b|should\b|must\b)`;
const THOUGHT_START = String.raw`(?:^\s*|[.!?…;,—–-]\s*)`;
const SELF_TALK_PUNCTUATION: readonly RegExp[] = [
  /(?:\?|\.\.\.|…|\.)\s*no\s*:/i,
  /[—–]\s*no\s*[,:]/i,
  new RegExp(String.raw`(?:\?|\.\.\.|…|\.)\s*no\s*,\s*${RULE_LIKE}`, "i"),
  /\bno,?\s+wait\b(?!\s+(?:time|for|until)\b)/i,
];
const SELF_TALK_WORDS: readonly RegExp[] = [
  new RegExp(String.raw`${THOUGHT_START}wait\s*(?:[,—–]|\.\.\.|…|-\s)`, "i"),
  new RegExp(String.raw`${THOUGHT_START}actually\b(?!\s+(?:is|are|means)\b)`, "i"),
  /\bhmm+\b/i,
  /\boops\b/i,
  /\bor rather\b/i,
  new RegExp(String.raw`${THOUGHT_START}correction\s*:`, "i"),
  new RegExp(String.raw`${THOUGHT_START}let me\b(?!\s+(?:know|is|means)\b)`, "i"),
  new RegExp(String.raw`${THOUGHT_START}espera\s*,\s*en realidad\b`, "i"),
];
// Quoted text; a single quote only counts at a word edge, so "don't" never opens a quote.
const QUOTED_TEXT =
  /"[^"]*"|“[^”]*”|(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])‘[^’]*’(?![\p{L}\p{N}])/gu;
const MEANS_GLOSS = /\bmeans\b[^.!?;]*/gi;

/** The matching self-talk fragment when a verb or word note thinks out loud, else null. */
export function selfTalkIssue(note: string): string | null {
  const unquoted = note.replace(QUOTED_TEXT, " ");
  for (const pattern of SELF_TALK_PUNCTUATION) {
    const hit = unquoted.match(pattern);
    if (hit) return hit[0].trim();
  }
  const withoutGloss = unquoted.replace(MEANS_GLOSS, " ");
  for (const pattern of SELF_TALK_WORDS) {
    const hit = withoutGloss.match(pattern);
    if (hit) return hit[0].trim();
  }
  return null;
}

const ENDS_LIKE_SENTENCE = /[.?!…。？！]["'”’»）)\]』」]*$/;

function validatePassage(
  passage: LessonPassageContent | undefined,
  words: readonly LessonWord[],
  ctx: ValidateContext,
  errors: string[],
) {
  const limits: ContentLimits = ctx.limits ?? CONTENT_LIMITS;
  const targetPack = packOf(ctx.language);
  const nativePack = packOf(ctx.nativeLanguage);
  if (!passage) {
    errors.push("passage is missing");
    return;
  }
  if (!passage.title.trim() || passage.title.length > limits.maxTitleLength) {
    errors.push(`passage title must be 1-${limits.maxTitleLength} characters`);
  }
  const count = passage.target.length;
  if (count !== passage.native.length) {
    errors.push(
      `passage has ${count} ${ctx.language} sentences but ${passage.native.length} ${ctx.nativeLanguage} sentences; they must align one to one`,
    );
    return;
  }
  if (count < limits.minSentences || count > limits.maxSentences) {
    errors.push(
      `passage has ${count} sentences; it must have ${limits.minSentences} to ${limits.maxSentences}`,
    );
  }
  for (const [i, target] of passage.target.entries()) {
    const native = passage.native[i];
    const label = `sentence ${i + 1}`;
    if (!target.trim() || !native.trim()) {
      errors.push(`${label} is empty`);
      continue;
    }
    if (!ENDS_LIKE_SENTENCE.test(target.trim())) {
      errors.push(`${label} (${ctx.language}) must end with . ? or !: ${target}`);
    }
    if (!ENDS_LIKE_SENTENCE.test(native.trim())) {
      errors.push(`${label} (${ctx.nativeLanguage}) must end with . ? or !: ${native}`);
    }
    if (targetPack?.script.wordSeparator !== "none" && (QUOTES_OR_DASH.test(target) || QUOTES_OR_DASH.test(native))) {
      errors.push(
        `${label} uses quotation marks or a dialogue dash; report speech with a colon instead: ${target}`,
      );
    }
    if (target.length > limits.maxSentenceLength || native.length > limits.maxSentenceLength) {
      errors.push(`${label} is too long; split it into two sentences`);
    }
    for (const [pack, text] of [
      [targetPack, target],
      [nativePack, native],
    ] as const) {
      if (!pack?.typography.invertedPunctuation) continue;
      if (text.includes("?") && !text.includes("¿")) errors.push(`${label}: missing ¿ in: ${text}`);
      if (text.includes("!") && !text.includes("¡")) errors.push(`${label}: missing ¡ in: ${text}`);
      if (text.includes("¿") && !text.includes("?")) errors.push(`${label}: ¿ without ? in: ${text}`);
      if (text.includes("¡") && !text.includes("!")) errors.push(`${label}: ¡ without ! in: ${text}`);
    }
    if (digitsOf(target).join(",") !== digitsOf(native).join(",")) {
      errors.push(
        `${label}: numbers differ between ${ctx.language} and ${ctx.nativeLanguage} (use the same digits on both sides, never convert units)`,
      );
    }
  }

  const passageWords = passage.target.flatMap((sentence) => wordsIn(sentence, targetPack));
  const terms = words.filter((w) => w.kind === "term");
  const phrases = words.filter((w) => w.kind === "phrase");
  // Japanese has no mandatory word spaces. The Latin token/stem matcher returns zero for kana.
  const unspaced = targetPack?.script.wordSeparator === "none";
  const japanesePassage = unspaced
    ? passage.target.join("").normalize("NFC").replace(/\s+/g, "")
    : "";
  const usedTerms = terms.filter((term) => unspaced
    ? japanesePassage.includes(term.es.normalize("NFC").replace(/\s+/g, ""))
    : termMatches(term.es, passageWords));
  const usedPhrases = phrases.filter((phrase) => unspaced
    ? japanesePassage.includes(phrase.es.normalize("NFC").replace(/\s+/g, ""))
    : phraseMatches(phrase.es, passageWords));
  if (usedTerms.length < limits.minTermsUsed) {
    errors.push(
      `passage uses only ${usedTerms.length} of the lesson's terms (needs ${limits.minTermsUsed}); used: ${
        usedTerms.map((t) => t.es).join(", ") || "none"
      }. Work more of the lesson's own terms into the passage, written as they appear in the word list`,
    );
  }
  if (usedPhrases.length < limits.minPhrasesUsed) {
    errors.push(
      "passage uses none of the lesson's phrases; include at least one lesson phrase (or most of its words, in order) in a sentence",
    );
  }
}

function validateWords(words: readonly LessonWord[] | undefined, ctx: ValidateContext, errors: string[]) {
  const limits: ContentLimits = ctx.limits ?? CONTENT_LIMITS;
  if (!words) {
    errors.push("words are missing");
    return;
  }
  const terms = words.filter((w) => w.kind === "term");
  const phrases = words.filter((w) => w.kind === "phrase");
  if (terms.length < limits.minTerms || terms.length > limits.maxTerms) {
    errors.push(
      `${terms.length} terms; there must be ${limits.minTerms} to ${limits.maxTerms} (distinct, at most 4 words each, no duplicates)`,
    );
  }
  if (phrases.length < limits.minPhrases || phrases.length > limits.maxPhrases) {
    errors.push(
      `${phrases.length} phrases; there must be ${limits.minPhrases} to ${limits.maxPhrases} (distinct, at most 12 words each, no duplicates)`,
    );
  }
  const seenNative = new Set<string>();
  const seenTarget = new Set<string>();
  for (const word of words) {
    const nativeKey = foldText(word.en).trim();
    const targetKey = limits.preserveAccentContrasts
      ? word.es.normalize("NFC").trim().toLocaleLowerCase()
      : foldText(word.es).trim();
    if (seenNative.has(nativeKey)) errors.push(`duplicate ${ctx.nativeLanguage} entry: ${word.en}`);
    if (seenTarget.has(targetKey)) errors.push(`duplicate ${ctx.language} entry: ${word.es}`);
    seenNative.add(nativeKey);
    seenTarget.add(targetKey);
    if (digitsOf(word.en).join(",") !== digitsOf(word.es).join(",")) {
      errors.push(`numbers differ in "${word.es}" / "${word.en}"`);
    }
    const wordSelfTalk = word.note ? selfTalkIssue(word.note) : null;
    if (wordSelfTalk) {
      errors.push(
        `"${word.es}": the note thinks out loud ("${wordSelfTalk}"); state the final rule only: ${word.note}`,
      );
    }
    const limit = word.kind === "term" ? (limits.maxTermWords ?? 5) : (limits.maxPhraseWords ?? 14);
    if (wordsOf(word.es).length > limit) errors.push(`"${word.es}" is too long for a ${word.kind}`);
  }
}

function validateVerbs(verbs: readonly LessonVerb[] | undefined, ctx: ValidateContext, errors: string[]) {
  const limits: ContentLimits = ctx.limits ?? CONTENT_LIMITS;
  const pack = packOf(ctx.language);
  const keys = verbFormKeys(pack);
  if (!pack || !keys) {
    // A pack with no person table (Japanese: plain/polite and tense/aspect) teaches verbs in
    // grammar examples; a form trainer is separate work. Empty verbs are fine.
    if (pack && (!verbs || verbs.length === 0)) return;
    errors.push(`verbs are not supported for ${ctx.language}`);
    return;
  }
  if (!verbs) {
    errors.push("verbs are missing");
    return;
  }
  if (verbs.length < limits.minVerbs || verbs.length > limits.maxVerbs) {
    errors.push(`${verbs.length} verbs; ${limits.minVerbs === limits.maxVerbs ? `there must be exactly ${limits.minVerbs}` : `there must be ${limits.minVerbs} to ${limits.maxVerbs}`}`);
  }
  const seen = new Set<string>();
  const rules = contentRulesFor(pack);
  const checks = pack.contentChecks;
  const infinitive = checks.infinitivePattern ? new RegExp(checks.infinitivePattern, "u") : null;
  const pronounFirst =
    checks.pronounFirstPattern && !pack.grammar.verbForms.includesSubject
      ? new RegExp(checks.pronounFirstPattern, "iu")
      : null;
  const reflexives = new Set(pack.grammar.reflexivePronouns.map((p) => p.toLowerCase()));
  for (const verb of verbs) {
    const name = verb.infinitive;
    const infKey = foldText(name);
    if (seen.has(infKey)) errors.push(`duplicate verb: ${name}`);
    seen.add(infKey);
    if (infinitive && !infinitive.test(name.trim())) {
      errors.push(`"${name}" is not a ${pack.name} infinitive (a plain ${pack.name} verb, dictionary form, matching ${checks.infinitivePattern})`);
    }
    if (!verb.native.trim()) errors.push(`${name}: meaning is empty`);
    if (verb.note) {
      // Notes are for the learner, so they are written in the learner's native language.
      const nativePack = packOf(ctx.nativeLanguage);
      const wrong = markerCount(verb.note, checks.targetMarkers);
      const nativePattern = nativePack ? checks.nativeMarkers[nativePack.code] : undefined;
      const right = markerCount(verb.note, nativePattern);
      const wrongLanguage = Boolean(nativePattern) && wrong >= 2 && right === 0;
      if (wrongLanguage) {
        errors.push(`${name}: the note must be written in ${ctx.nativeLanguage}: ${verb.note}`);
      }
      const selfTalk = selfTalkIssue(verb.note);
      if (selfTalk) {
        errors.push(
          `${name}: the note thinks out loud ("${selfTalk}"); state the final rule only, with no deliberation or self-correction: ${verb.note}`,
        );
      }
    }
    const forms = keys.map((key) => (verb.forms[key] ?? "").trim());
    for (const [i, form] of forms.entries()) {
      if (!form) {
        errors.push(`${name}: form "${keys[i]}" is empty`);
        continue;
      }
      if (wordsOf(form).length > 3) errors.push(`${name}: "${form}" is not a single verb form`);
      if (pronounFirst?.test(form)) errors.push(`${name}: give the verb form only, without the pronoun: "${form}"`);
    }
    if (forms.some((f) => !f)) continue;
    if (rules.distinctForms && new Set(forms.map(foldText)).size !== forms.length) {
      errors.push(`${name}: the ${forms.length === 5 ? "five" : forms.length} present-tense forms must all be different`);
    }
    for (const [at, ending, who, text] of rules.endings) {
      if (forms[at] !== undefined && !ending.test(forms[at])) errors.push(`${name}: ${who} form "${forms[at]}" ${text}`);
    }
    for (const [a, b, text] of rules.mustDiffer) {
      if (forms[a] !== undefined && foldText(forms[a]) === foldText(forms[b])) errors.push(`${name}: ${text}: "${forms[a]}"`);
    }
    // The example is a short sentence from the lesson that really uses the verb.
    const exampleWords = wordsIn(verb.example.target, pack);
    if (exampleWords.length === 0 || !verb.example.native.trim()) {
      errors.push(`${name}: example is empty`);
      continue;
    }
    // The verb's stem (cort- for cortar) catches every regular form and the commands built on
    // it (corten); a very short stem (us- for usar) must also be a short word, so it does not
    // match unrelated words. Irregular forms are caught through the five forms themselves.
    const infWords = wordsIn(name, pack);
    // A leading reflexive pronoun is not the verb ("se laver", "s'appeler"); the head is the next word.
    const headAt = infWords.length > 1 && reflexives.has(infWords[0]) ? 1 : 0;
    const base = infWords[headAt] ?? "";
    // Reflexive infinitives drop their suffix (sentarse -> sentar) so the stem is the verb's own.
    const inf = rules.reflexiveSuffix && rules.reflexiveSuffix.test(base) ? base.slice(0, -2) : base;
    const stem = inf.slice(0, Math.max(1, inf.length - 2));
    const formTails = forms.map((f) => wordsIn(stripReflexive(f, pack), pack).pop() ?? "");
    // Stem variants keep commands and subjunctives recognisable: vowel changes (sient-, jueg-),
    // spelling changes before -e (toqu-, llegu-, empec-, protej-) and the yo-form stem (pong-).
    const stems = new Set([stem]);
    if (rules.stemVariants) {
      const vowel = (st: string, from: string, to: string) => {
        const i = st.lastIndexOf(from);
        return i >= 0 ? st.slice(0, i) + to + st.slice(i + from.length) : st;
      };
      for (const v of [vowel(stem, "e", "ie"), vowel(stem, "o", "ue"), vowel(stem, "u", "ue"), vowel(stem, "e", "i")])
        stems.add(v);
      for (const st of [...stems]) {
        if (st.endsWith("c")) stems.add(`${st.slice(0, -1)}qu`);
        if (st.endsWith("g")) stems.add(`${st}u`).add(`${st.slice(0, -1)}j`);
        if (st.endsWith("z")) stems.add(`${st.slice(0, -1)}c`);
      }
      const yo = formTails[0] ?? "";
      if (yo.length >= 4 && yo.endsWith("o")) stems.add(yo.slice(0, -1));
    }
    const extraForms = rules.extraForms[inf] ?? [];
    const SHORT_ENDINGS = ["", "a", "an", "as", "e", "en", "es", "o", "oy", "ar", "er", "ir", "amos", "emos", "imos", "ad", "ed"];
    const usesStem = (w: string) =>
      [...stems].some((st) =>
        st.length >= 3
          ? w.startsWith(st)
          : st.length === 2
            ? w.startsWith(st) && w.length <= st.length + 5
            : SHORT_ENDINGS.some((end) => w === st + end || (w.startsWith(st + end) && /^(se|me|te|nos|le|les|lo|la|los|las)$/.test(w.slice(st.length + end.length)))),
      );
    const used = exampleWords.some(
      (w) =>
        usesStem(w) ||
        extraForms.includes(w) ||
        formTails.some((tail) => tail && w === tail),
    );
    if (!used) {
      errors.push(`${name}: the example "${verb.example.target}" does not use any form of the verb`);
    }
    if (digitsOf(verb.example.target).join(",") !== digitsOf(verb.example.native).join(",")) {
      errors.push(`${name}: numbers differ between the example and its translation`);
    }
    if (pack.typography.invertedPunctuation) {
      for (const text of [verb.example.target]) {
        if (text.includes("?") && !text.includes("¿")) errors.push(`${name}: missing ¿ in example`);
        if (text.includes("!") && !text.includes("¡")) errors.push(`${name}: missing ¡ in example`);
      }
    }
  }
}

/** Every rule a generated lesson must pass. Returns the error list (empty = valid). */
export function validateLessonContent(
  content: { passage?: LessonPassageContent; words?: LessonWord[]; verbs?: LessonVerb[] },
  ctx: ValidateContext,
): string[] {
  const errors: string[] = [];
  const words = ctx.parts.words ? content.words : (ctx.words ?? content.words);
  if (ctx.parts.words) validateWords(content.words, ctx, errors);
  if (ctx.parts.passage) validatePassage(content.passage, words ?? [], ctx, errors);
  if (ctx.parts.verbs) validateVerbs(content.verbs, ctx, errors);
  if (ctx.parts.passage && content.passage) errors.push(...invisibleCharErrors("passage", content.passage));
  if (ctx.parts.words && content.words) errors.push(...invisibleCharErrors("words", content.words));
  if (ctx.parts.verbs && content.verbs) errors.push(...invisibleCharErrors("verbs", content.verbs));
  return errors;
}

// ─── Files ───────────────────────────────────────────────────────────────────

/** Site-relative URL of a module's content file for one target language. */
export function lessonContentPath(moduleId: string, language: string): string {
  return `/lesson-content/${languageTag(language)}/${encodeURIComponent(moduleId)}.json`;
}

/** The native language a target language's content is written for (the target pack's native default). */
export function contentNativeLanguage(targetLanguage: string): string {
  return nativeLanguageName(packFor(targetLanguage)?.native.default) ?? "";
}

/**
 * Validates an untrusted content file (parsed JSON) for the app: right version, matching
 * module + language, lessons cleaned the same way live data is. Null when it is unusable.
 * (The strict quality rules run in the generator and the tests, not on every learner's phone.)
 */
export function parseLessonContent(
  raw: unknown,
  expected: { moduleId: string; language: string },
): LessonContentFile | null {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as Record<string, unknown>;
  if (file.version !== LESSON_CONTENT_VERSION) return null;
  if (file.module !== expected.moduleId || file.language !== expected.language) return null;
  if (typeof file.nativeLanguage !== "string" || !file.nativeLanguage) return null;
  if (!file.lessons || typeof file.lessons !== "object" || Array.isArray(file.lessons)) return null;
  const lessons: Record<string, LessonContentLesson> = {};
  for (const [number, value] of Object.entries(file.lessons as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const lesson = value as Record<string, unknown>;
    const passage = cleanPassage(lesson.passage) ?? undefined;
    const words = cleanLessonWords(lesson.words);
    const verbs = cleanLessonVerbs(lesson.verbs, expected.language);
    if (!passage && words.length === 0 && verbs.length === 0) continue;
    const entry: LessonContentLesson = { verbs };
    if (passage) entry.passage = passage;
    if (words.length > 0) entry.words = words;
    lessons[number] = entry;
  }
  return {
    version: LESSON_CONTENT_VERSION,
    module: expected.moduleId,
    language: expected.language,
    nativeLanguage: file.nativeLanguage,
    model: typeof file.model === "string" ? file.model : undefined,
    generatedAt: typeof file.generatedAt === "string" ? file.generatedAt : undefined,
    reviewed: file.reviewed === true,
    lessons,
  };
}

function pick(
  file: LessonContentFile | null | undefined,
  lessonNumber: number,
  nativeLanguage: string,
): LessonContentLesson | null {
  if (!file || file.nativeLanguage !== nativeLanguage) return null;
  return file.lessons[String(lessonNumber)] ?? null;
}

/** The lesson's generated passage, only when the file was written for the learner's native language. */
export function pickContentPassage(
  file: LessonContentFile | null | undefined,
  lessonNumber: number,
  nativeLanguage: string,
): LessonPassageContent | null {
  return pick(file, lessonNumber, nativeLanguage)?.passage ?? null;
}

/** The lesson's generated word list (needs enough terms and phrases to be worth a practice kit). */
export function pickContentWords(
  file: LessonContentFile | null | undefined,
  lessonNumber: number,
  nativeLanguage: string,
): LessonWord[] | null {
  const words = pick(file, lessonNumber, nativeLanguage)?.words;
  if (!words || words.length === 0) return null;
  const terms = words.filter((w) => w.kind === "term").length;
  if (terms < 6 || words.length - terms < 3) return null;
  return [...words];
}

/** The lesson's verbs. */
export function pickContentVerbs(
  file: LessonContentFile | null | undefined,
  lessonNumber: number,
  nativeLanguage: string,
): LessonVerb[] {
  return pick(file, lessonNumber, nativeLanguage)?.verbs ?? [];
}

// ─── Conjugation practice ────────────────────────────────────────────────────

/**
 * Is `input` a correct typed form for `expected`? The same typed-answer rule as Type it
 * (accent- and case-insensitive for Latin scripts), and a reflexive pronoun is optional
 * ("se lava" and "lava" both count).
 */
export function isCorrectForm(input: string, expected: string, pack: LanguagePack): boolean {
  return (
    isCorrectTypedAnswer(input, expected, pack) ||
    isCorrectTypedAnswer(input, stripReflexive(expected, pack), pack) ||
    subjectVariants(expected, pack).some((variant) => isCorrectTypedAnswer(input, variant, pack))
  );
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * For a pack whose forms carry their subject ("ils/elles ont", "j'aime"): the bare form ("ont")
 * and the form with each one subject of its group ("ils ont", "elles ont"). Empty otherwise.
 */
export function subjectVariants(expected: string, pack: LanguagePack): string[] {
  if (!pack.grammar.verbForms.includesSubject) return [];
  const subjects = [
    ...new Set(pack.grammar.verbForms.keys.flatMap((key) => key.subjects ?? [])),
  ].sort((a, b) => b.length - a.length);
  if (subjects.length === 0) return [];
  const one = `(?:${subjects.map(escapeRegExp).join("|")})`;
  const match = expected
    .trim()
    .match(new RegExp(`^(${one}(?:\\s*/\\s*${one})*)(?:\\s+|(?<=['’ʼ]))(\\S.*)$`, "u"));
  if (!match) return [];
  const bare = match[2];
  const group = match[1].split("/").map((subject) => subject.trim());
  return [bare, ...group.map((s) => (/['’ʼ]$/u.test(s) ? `${s}${bare}` : `${s} ${bare}`))];
}

export interface ConjugationItem {
  verb: LessonVerb;
  key: string;
  /** Pronoun shown in the prompt ("yo", "él / ella / usted"). */
  pronoun: string;
  /** The expected present-tense form. */
  expected: string;
}

/** Every form of every verb, in order. The caller shuffles. */
export function conjugationItems(verbs: readonly LessonVerb[], language: string): ConjugationItem[] {
  const keys = verbFormKeys(language);
  if (!keys) return [];
  const items: ConjugationItem[] = [];
  for (const verb of verbs) {
    for (const key of keys) {
      const expected = verb.forms[key];
      if (expected) items.push({ verb, key, pronoun: verbFormLabel(key, language), expected });
    }
  }
  return items;
}
