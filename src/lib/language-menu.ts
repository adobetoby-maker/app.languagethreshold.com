// Built by TAC — 2026-11-21
// Language chooser rows and native-language defaults, read from the language-pack registry so no
// screen keeps its own hand-typed language list (language-pack model sections 5 and 14).

import {
  historicalCoursePack,
  listedPacks,
  packFor,
  packIndexEntry,
  sameLanguage,
  type LanguagePack,
} from "@/data/language-packs/registry";
import { nativeLanguageName, type Language, type NativeLanguage } from "@/data/languages";

export interface LanguageOption {
  id: Language;
  /** English name of the language ("Spanish"). */
  label: string;
  /** The language's own name, capitalised ("Español"). */
  native: string;
  pack: LanguagePack;
}

function capitalise(text: string, locale: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text;
}

function contentDepth(pack: LanguagePack): number {
  return packIndexEntry(pack)?.modules.length ?? 0;
}

/** Every language a learner may choose, deepest catalog first, then by English name. */
export function languageOptions(): LanguageOption[] {
  return listedPacks()
    .slice()
    .sort((a, b) => contentDepth(b) - contentDepth(a) || a.name.localeCompare(b.name))
    .map((pack) => ({
      id: pack.name as Language,
      label: pack.name,
      native: capitalise(pack.endonym, pack.code),
      pack,
    }));
}

/** The native (explanation) language a target's course pairs with by default, or null. */
export function defaultNativeFor(language: string | null | undefined): NativeLanguage | null {
  const pack = packFor(language);
  return pack ? nativeLanguageName(pack.native.default) : null;
}

/**
 * The native language to switch to when a learner picks `target` while their native language is
 * the same language (English learners whose native was English move to the English course's
 * default native, Spanish). Null when no switch is needed.
 */
export function nativeAfterTargetChange(
  target: string | null | undefined,
  native: string | null | undefined,
): NativeLanguage | null {
  if (!target || !native || !sameLanguage(target, native)) return null;
  const paired = defaultNativeFor(target);
  return paired && !sameLanguage(paired, native) ? paired : null;
}

/** The native (explanation) languages a target's course is written for (its pack's native.supported). */
export function nativeChoicesFor(target: string | null | undefined): NativeLanguage[] {
  const pack = packFor(target);
  if (!pack) return [];
  return pack.native.supported
    .map((code) => nativeLanguageName(code))
    .filter((name): name is NativeLanguage => name !== null && !sameLanguage(name, pack.code));
}

/**
 * True when picking `target` must ask the learner's native language: their current native is not
 * one the target's course is explained in (an English learner whose setting is still English).
 * The app never guesses it from the target (fail closed: ask).
 */
export function needsNativeQuestion(
  target: string | null | undefined,
  currentNative: string | null | undefined,
): boolean {
  const choices = nativeChoicesFor(target);
  return choices.length > 0 && !choices.some((choice) => choice === currentNative);
}

/** True when the pack's script needs Character Studio (kanji / hanzi + radicals). */
export function hasCharacterStudio(pack: LanguagePack): boolean {
  return pack.script.iso15924.some((s) => ["Hani", "Jpan", "Hans", "Hant"].includes(s));
}

/** The language offered first (and used when a link names none): the one with the deepest catalog. */
export function defaultLanguage(): Language {
  return languageOptions()[0].id;
}

/**
 * For a course whose cards are authored in the learner's native language (the target's pack pairs
 * with a non-English native by default, as the English pack does), the native language the deck
 * columns follow; null for every other course.
 */
export function nativeFirstDeckLanguage(
  target: string | null | undefined,
  native: string | null | undefined,
): NativeLanguage | null {
  const paired = defaultNativeFor(target);
  if (!paired || paired === "English") return null;
  return native && native !== "English" ? (native as NativeLanguage) : null;
}

/**
 * The language of the starter vocabulary deck (src/data/spanish-basics-flashcards.json): the
 * historical course's language, read from the registry.
 */
export function starterDeckLanguage(): Language {
  return historicalCoursePack().name as Language;
}
