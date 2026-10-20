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
  return moduleId?.startsWith("master-") ? MASTER_CONTENT_LIMITS : CONTENT_LIMITS;
}

// ─── Verb forms ──────────────────────────────────────────────────────────────

const SPANISH_FORM_KEYS = ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"] as const;
const ENGLISH_FORM_KEYS = ["i", "you", "he_she", "we", "they"] as const;

/** Keys of `LessonVerb.forms` for a target language, in learning order. Null = no verb support. */
export function verbFormKeys(language: string): readonly string[] | null {
  if (language === "Spanish") return SPANISH_FORM_KEYS;
  if (language === "English") return ENGLISH_FORM_KEYS;
  return null;
}

const FORM_LABELS: Record<string, string> = {
  yo: "yo",
  tú: "tú",
  él_ella_usted: "él / ella / usted",
  nosotros: "nosotros",
  ellos_ustedes: "ellos / ustedes",
  i: "I",
  you: "you",
  he_she: "he / she",
  we: "we",
  they: "they",
};

/** The pronoun shown for a form key. */
export function verbFormLabel(key: string): string {
  return FORM_LABELS[key] ?? key;
}

/** Tool-schema keys are ASCII only (the API rejects "tú"); map them onto the file's keys. */
const MODEL_KEY_TO_FORM_KEY: Record<string, string> = {
  yo: "yo",
  tu: "tú",
  el_ella_usted: "él_ella_usted",
  nosotros: "nosotros",
  ellos_ustedes: "ellos_ustedes",
  i: "i",
  you: "you",
  he_she: "he_she",
  we: "we",
  they: "they",
};

export const MODEL_FORM_KEYS = {
  Spanish: ["yo", "tu", "el_ella_usted", "nosotros", "ellos_ustedes"],
  English: ["i", "you", "he_she", "we", "they"],
} as const;

/** A reflexive verb's forms carry the pronoun ("me lavo"); a learner may type it or not. */
export function stripReflexive(form: string): string {
  return form.replace(/^(?:me|te|se|nos|os)\s+/i, "").trim();
}

// ─── Text helpers (accent-insensitive matching) ──────────────────────────────

export const foldText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Words of a string, accents and punctuation removed. */
export const wordsOf = (text: string): string[] => foldText(text).match(/[a-z0-9]+/g) ?? [];

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
        forms[MODEL_KEY_TO_FORM_KEY[key] ?? key] = value;
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
const SPANISH_MARKERS = /\b(es|muy|verbo|cambio|mandato|los|las|para|del|cuando|forma|la|el|que|con|se|una|un|en|por|pero|este|esta|tiene|persona|significa|termina)\b/gi;
const ENGLISH_MARKERS = /\b(the|and|with|is|are|use|form|verb|command|stem|change|to|of|it|in|for|this|when|means|your|as|say|not|he|his|her|used|usually|often|like|after|before|also|only|than)\b/gi;
function markerCount(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}
const ENDS_LIKE_SENTENCE = /[.?!…]["'”’»)\]]*$/;
const SPANISH_PRONOUN_FIRST = /^(yo|tú|tu|él|el|ella|usted|nosotros|nosotras|ustedes|ellos|ellas)\s/i;
const ENGLISH_PRONOUN_FIRST = /^(i|you|he|she|it|we|they)\s/i;

function validatePassage(
  passage: LessonPassageContent | undefined,
  words: readonly LessonWord[],
  ctx: ValidateContext,
  errors: string[],
) {
  const limits = ctx.limits ?? CONTENT_LIMITS;
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
    if (QUOTES_OR_DASH.test(target) || QUOTES_OR_DASH.test(native)) {
      errors.push(
        `${label} uses quotation marks or a dialogue dash; report speech with a colon instead: ${target}`,
      );
    }
    if (target.length > limits.maxSentenceLength || native.length > limits.maxSentenceLength) {
      errors.push(`${label} is too long; split it into two sentences`);
    }
    for (const [side, text] of [
      [ctx.language, target],
      [ctx.nativeLanguage, native],
    ] as const) {
      if (side !== "Spanish") continue;
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

  const passageWords = passage.target.flatMap(wordsOf);
  const terms = words.filter((w) => w.kind === "term");
  const phrases = words.filter((w) => w.kind === "phrase");
  const usedTerms = terms.filter((term) => termMatches(term.es, passageWords));
  const usedPhrases = phrases.filter((phrase) => phraseMatches(phrase.es, passageWords));
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
  const limits = ctx.limits ?? CONTENT_LIMITS;
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
    const targetKey = foldText(word.es).trim();
    if (seenNative.has(nativeKey)) errors.push(`duplicate ${ctx.nativeLanguage} entry: ${word.en}`);
    if (seenTarget.has(targetKey)) errors.push(`duplicate ${ctx.language} entry: ${word.es}`);
    seenNative.add(nativeKey);
    seenTarget.add(targetKey);
    if (digitsOf(word.en).join(",") !== digitsOf(word.es).join(",")) {
      errors.push(`numbers differ in "${word.es}" / "${word.en}"`);
    }
    const limit = word.kind === "term" ? 5 : 14;
    if (wordsOf(word.es).length > limit) errors.push(`"${word.es}" is too long for a ${word.kind}`);
  }
}

function validateVerbs(verbs: readonly LessonVerb[] | undefined, ctx: ValidateContext, errors: string[]) {
  const limits = ctx.limits ?? CONTENT_LIMITS;
  const keys = verbFormKeys(ctx.language);
  if (!keys) {
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
  const spanish = ctx.language === "Spanish";
  for (const verb of verbs) {
    const name = verb.infinitive;
    const infKey = foldText(name);
    if (seen.has(infKey)) errors.push(`duplicate verb: ${name}`);
    seen.add(infKey);
    if (spanish) {
      if (!/^\p{L}*(ar|er|ir|ír)(se)?$/u.test(name.trim())) {
        errors.push(`"${name}" is not a Spanish infinitive (one word ending in -ar, -er, -ir or -se)`);
      }
    } else if (!/^[a-z]+( [a-z]+)?$/.test(name.trim()) || /^to\s/.test(name.trim())) {
      errors.push(`"${name}" is not a plain English verb (one or two lowercase words, no "to")`);
    }
    if (!verb.native.trim()) errors.push(`${name}: meaning is empty`);
    if (verb.note) {
      // Notes are for the learner, so they are written in the learner's native language.
      const es = markerCount(verb.note, SPANISH_MARKERS);
      const en = markerCount(verb.note, ENGLISH_MARKERS);
      // Flag only a note with no native-language words at all: notes often quote target
      // words or whole example phrases ("a + el becomes al", "Used with en: …").
      const [wrong, right] =
        ctx.nativeLanguage === "English" ? [es, en] : ctx.nativeLanguage === "Spanish" ? [en, es] : [0, 0];
      const wrongLanguage = wrong >= 2 && right === 0;
      if (wrongLanguage) {
        errors.push(`${name}: the note must be written in ${ctx.nativeLanguage}: ${verb.note}`);
      }
    }
    const forms = keys.map((key) => (verb.forms[key] ?? "").trim());
    for (const [i, form] of forms.entries()) {
      if (!form) {
        errors.push(`${name}: form "${keys[i]}" is empty`);
        continue;
      }
      if (wordsOf(form).length > 3) errors.push(`${name}: "${form}" is not a single verb form`);
      const first = spanish ? SPANISH_PRONOUN_FIRST : ENGLISH_PRONOUN_FIRST;
      if (first.test(form)) errors.push(`${name}: give the verb form only, without the pronoun: "${form}"`);
    }
    if (forms.some((f) => !f)) continue;
    if (spanish) {
      if (new Set(forms.map(foldText)).size !== forms.length) {
        errors.push(`${name}: the five present-tense forms must all be different`);
      }
      const [, tu, , nosotros, ellos] = forms;
      if (!/s$/i.test(tu)) errors.push(`${name}: tú form "${tu}" should end in -s`);
      if (!/mos$/i.test(nosotros)) errors.push(`${name}: nosotros form "${nosotros}" should end in -mos`);
      if (!/n$/i.test(ellos)) errors.push(`${name}: ellos/ustedes form "${ellos}" should end in -n`);
    } else if (foldText(forms[2]) === foldText(forms[0])) {
      errors.push(`${name}: the he/she form "${forms[2]}" must differ from the I form (add the -s)`);
    }
    // The example is a short sentence from the lesson that really uses the verb.
    const exampleWords = wordsOf(verb.example.target);
    if (exampleWords.length === 0 || !verb.example.native.trim()) {
      errors.push(`${name}: example is empty`);
      continue;
    }
    // The verb's stem (cort- for cortar) catches every regular form and the commands built on
    // it (corten); a very short stem (us- for usar) must also be a short word, so it does not
    // match unrelated words. Irregular forms are caught through the five forms themselves.
    const infWords = wordsOf(name);
    const base = infWords[0] ?? "";
    const stem = base.slice(0, Math.max(2, base.length - 2));
    const formTails = forms.map((f) => wordsOf(stripReflexive(f)).pop() ?? "");
    const usesStem = (w: string) =>
      stem.length >= 3 ? w.startsWith(stem) : w.startsWith(stem) && w.length <= stem.length + 5;
    const used = exampleWords.some(
      (w) => usesStem(w) || formTails.some((tail) => tail && w === tail),
    );
    if (!used) {
      errors.push(`${name}: the example "${verb.example.target}" does not use any form of the verb`);
    }
    if (digitsOf(verb.example.target).join(",") !== digitsOf(verb.example.native).join(",")) {
      errors.push(`${name}: numbers differ between the example and its translation`);
    }
    if (spanish) {
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
  return errors;
}

// ─── Files ───────────────────────────────────────────────────────────────────

/** Site-relative URL of a module's content file for one target language. */
export function lessonContentPath(moduleId: string, language: string): string {
  return `/lesson-content/${languageTag(language)}/${encodeURIComponent(moduleId)}.json`;
}

/** The native language a target language's content is written for (English: Spanish natives). */
export function contentNativeLanguage(targetLanguage: string): string {
  return targetLanguage === "English" ? "Spanish" : "English";
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
export function isCorrectForm(input: string, expected: string): boolean {
  return (
    isCorrectTypedAnswer(input, expected) || isCorrectTypedAnswer(input, stripReflexive(expected))
  );
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
      if (expected) items.push({ verb, key, pronoun: verbFormLabel(key), expected });
    }
  }
  return items;
}
