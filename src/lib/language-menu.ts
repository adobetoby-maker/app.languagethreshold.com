// Built by TAC — 2026-11-21
// Language chooser rows and native-language defaults, read from the language-pack registry so no
// screen keeps its own hand-typed language list (language-pack model sections 5 and 14).

import {
  historicalCoursePack,
  listedPacks,
  packFor,
  sameLanguage,
  workplaceCoursePack,
  type LanguagePack,
} from "@/data/language-packs/registry";
import { catalogLessonPack } from "@/data/language-packs/catalog-lessons";
import { nativeLanguageName, type Language, type NativeLanguage } from "@/data/languages";
import { appData } from "@/data/language-packs/app-data";

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

/**
 * Every language a learner may choose, in the chooser's order (app/<code>.json chooserOrder, or
 * wizardOrder for the onboarding wizard, which never listed some languages), then by English name.
 */
export function languageOptions(list: "chooser" | "wizard" = "chooser"): LanguageOption[] {
  const place = (pack: LanguagePack) =>
    list === "wizard" ? appData(pack).wizardOrder : appData(pack).chooserOrder;
  return listedPacks()
    .filter((pack) => place(pack) !== null)
    .sort((a, b) => place(a)! - place(b)! || a.name.localeCompare(b.name))
    .map((pack) => ({
      id: pack.name as Language,
      label: appData(pack).chooserLabel ?? pack.name,
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
  // Only the workplace course (English) and the catalog-pack languages (French, Italian) switch;
  // every other language leaves the setting as it always has.
  const pack = packFor(target);
  if (!pack) return null;
  if (!sameLanguage(pack.code, workplaceCoursePack().code) && !catalogLessonPack(pack.code))
    return null;
  const paired = defaultNativeFor(target);
  return paired && !sameLanguage(paired, native) ? paired : null;
}

/**
 * The native language to set silently when a learner picks `target` in a language chooser, or
 * null to leave it. The workplace course (English) has always paired with its default native
 * (Spanish). A language whose lessons come from its pack catalog (French, Italian) switches to its
 * default native when the learner's current one is not a native its catalog is written for. Every
 * other language leaves the setting as it is, as it always has.
 */
export function nativeOnPick(
  target: string | null | undefined,
  currentNative: string | null | undefined,
): NativeLanguage | null {
  const pack = packFor(target);
  if (!pack) return null;
  if (sameLanguage(pack.code, workplaceCoursePack().code)) return defaultNativeFor(pack.code);
  if (!catalogLessonPack(pack.code)) return null;
  const supported = pack.native.supported.some((code) => sameLanguage(code, currentNative));
  return supported ? null : defaultNativeFor(pack.code);
}

/** True when the pack's script needs Character Studio (kanji / hanzi + radicals). */
export function hasCharacterStudio(pack: LanguagePack): boolean {
  return pack.script.iso15924.some((s) => ["Hani", "Jpan", "Hans", "Hant"].includes(s));
}

/** The language offered first (and used when a link names none). */
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
