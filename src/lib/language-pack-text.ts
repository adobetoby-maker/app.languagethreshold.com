// Built by TAC — 2026-11-21
// Pack-driven text, keyboard and locale helpers (language-pack model sections 3.2, 3.3, 3.6, 8, 9).
// Pure: no React, no DOM. Every function takes the pack as a required argument; there is no default
// language and no fallback to another language's data.

import type { LanguagePack } from "../data/language-packs/registry.ts";
import { languageFamily } from "../data/mission-tts.ts";

/**
 * Section 8 step 1: Unicode normalization, apostrophe and space folding, locale lowercase,
 * whitespace collapse (removed for scripts without word spaces), trim of
 * typography.trimCharacters, trim again. Used for audio keys, lookups and grading.
 */
export function normalizeKey(text: string, pack: LanguagePack): string {
  let s = text.normalize(pack.answerRules.unicodeNormalization);
  for (const v of pack.typography.apostropheVariants) s = s.replaceAll(v, pack.typography.apostrophe);
  for (const v of pack.typography.spaceVariants) s = s.replaceAll(v, " ");
  s = s
    .toLocaleLowerCase(pack.script.segmenterLocale)
    .split(/\s+/)
    .filter(Boolean)
    .join(pack.script.wordSeparator === "none" ? "" : " ");
  const trim = new Set([...pack.typography.trimCharacters, " "]);
  const chars = [...s];
  let a = 0;
  let b = chars.length;
  while (a < b && trim.has(chars[a])) a++;
  while (b > a && trim.has(chars[b - 1])) b--;
  return chars.slice(a, b).join("");
}

/**
 * Section 8 step 4 F(x): fold the pack's marks (answerRules.fold), never a letter in neverFold;
 * ligatures fold too (only folded modes call this). Characters outside the fold table are kept.
 */
export function foldMarks(text: string, pack: LanguagePack): string {
  const { fold, neverFold, ligatures } = pack.answerRules;
  const keep = new Set(neverFold);
  let out = "";
  for (const c of text) {
    if (keep.has(c)) out += c;
    else out += ligatures[c] ?? fold[c] ?? c;
  }
  return out;
}

/** Word tokens of a text, segmented with the pack's locale (section 3.2 segmenterLocale). */
export function tokenizeWords(text: string, pack: LanguagePack): string[] {
  const normalized = normalizeKey(text, pack);
  if (pack.answerRules.tokenizer === "graphemes")
    return [...normalized].filter((c) => /[\p{L}\p{N}]/u.test(c));
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Segmenter) return normalized.match(/[\p{L}\p{N}'’\p{M}]+/gu) ?? [];
  const seg = new Segmenter(pack.script.segmenterLocale, { granularity: "word" });
  return [...seg.segment(normalized)].filter((s) => s.isWordLike).map((s) => s.segment);
}

/** The accent row under every typed answer (section 9). Empty: render no row. */
export function specialCharacters(pack: LanguagePack): readonly string[] {
  return pack.keyboard.ime ? [] : pack.keyboard.specialCharacters;
}

/** The letters of the accent row (no punctuation keys): for single-word fields such as a verb form. */
export function specialLetters(pack: LanguagePack): readonly string[] {
  return specialCharacters(pack).filter((c) => /\p{L}/u.test(c));
}

/**
 * Letter-game keys and the mask set (section 9): every letter of the pack alphabet. Empty for a
 * pack without one (IME scripts): build keys from the round's own answers instead.
 */
export function gameAlphabet(pack: LanguagePack): readonly string[] {
  return [...pack.keyboard.alphabet];
}

/** True when `locale` ("es-MX") belongs to the pack's language. */
export function localeBelongsToPack(locale: string | null | undefined, pack: LanguagePack): boolean {
  if (!locale) return false;
  const family = languageFamily(locale);
  return (
    family === languageFamily(pack.speech.tts.languageCode) ||
    pack.speech.accents.some((accent) => languageFamily(accent.tag) === family)
  );
}

/** The pack's default listening accent tag (exactly one accent is default), or null if none. */
export function defaultAccentTag(pack: LanguagePack): string | null {
  return (
    pack.speech.accents.find((accent) => accent.default)?.tag ??
    pack.speech.accents[0]?.tag ??
    pack.speech.tts.locales[0] ??
    null
  );
}

/**
 * The locale a surface speaks for this pack: the learner's chosen accent when it belongs to the
 * pack, otherwise the pack's default accent. Null when the pack has no voice locale at all: the
 * caller hides the speaker or shows voiceUnavailableLabel(pack). Never another language's accent.
 */
export function listeningLocaleFor(accent: string | null | undefined, pack: LanguagePack): string | null {
  if (accent && localeBelongsToPack(accent, pack)) return accent;
  return defaultAccentTag(pack);
}

/**
 * Speech-recognition locales to try, in order: the learner's accent when it belongs to the pack,
 * then pack.speech.recognition.locales. Empty when the pack has no recognizer (mode "none"):
 * the caller switches to pack.speech.recognition.fallback.
 */
export function recognitionLocales(accent: string | null | undefined, pack: LanguagePack): string[] {
  if (pack.speech.recognition.mode === "none") return [];
  const out = new Set<string>();
  if (accent && localeBelongsToPack(accent, pack)) out.add(accent);
  for (const locale of pack.speech.recognition.locales) out.add(locale);
  return [...out];
}

/** Verb-form keys a pack requires on every person row, in learning order (section 10). */
export function requiredVerbFormKeys(pack: LanguagePack): string[] {
  return pack.grammar.verbForms.keys
    .filter((key) => key.required)
    .sort((a, b) => a.order - b.order)
    .map((key) => key.key);
}
