import { PACKS, packIndexEntry } from "./language-packs/registry.ts";

/**
 * A target language as stored state names it ("Spanish"): a registered pack's name or legacy name,
 * resolved through packFor (src/data/language-packs/registry.ts). Not a closed union: the registry
 * decides which languages exist, so adding a language never edits a type here.
 */
export type Language = string;

/**
 * Every registered target language (stored names), deepest catalog first, then by English name.
 * Derived from the registry; never a hand-kept list.
 */
export const LANGUAGES: Language[] = PACKS.slice()
  .sort(
    (a, b) =>
      (packIndexEntry(b)?.modules.length ?? 0) - (packIndexEntry(a)?.modules.length ?? 0) ||
      a.name.localeCompare(b.name),
  )
  .map((pack) => pack.name);

// The learner's native ("translation") language — used for the left pane,
// definitions, lesson explanations, etc. Default English; expandable.
export type NativeLanguage =
  | "English"
  | "Spanish"
  | "French"
  | "German"
  | "Italian"
  | "Portuguese"
  | "Dutch"
  | "Polish"
  | "Russian"
  | "Turkish"
  | "Arabic"
  | "Hindi"
  | "Chinese (Simplified)"
  | "Japanese"
  | "Korean";

export const NATIVE_LANGUAGES: NativeLanguage[] = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Polish",
  "Russian",
  "Turkish",
  "Arabic",
  "Hindi",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
];

// ─── Codes (language-pack model sections 3.1 and 5) ───────────────────────────
// Target languages are identified by their pack (src/data/language-packs/registry.ts); the
// `Language` names above are stored-state labels until the Language → LanguageCode migration, and
// resolve to a pack through its legacyNames. Native languages are an app setting (the model keeps
// the 15-language translation picker out of the packs), so their codes live here.

/** BCP-47 primary subtags of the native-language setting. */
export const NATIVE_LANGUAGE_CODES: Record<NativeLanguage, string> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Portuguese: "pt",
  Dutch: "nl",
  Polish: "pl",
  Russian: "ru",
  Turkish: "tr",
  Arabic: "ar",
  Hindi: "hi",
  "Chinese (Simplified)": "zh",
  Japanese: "ja",
  Korean: "ko",
};

/** The code of a native-language setting value, or null for anything else. */
export function nativeLanguageCode(name: string | null | undefined): string | null {
  return name && Object.hasOwn(NATIVE_LANGUAGE_CODES, name)
    ? NATIVE_LANGUAGE_CODES[name as NativeLanguage]
    : null;
}

/** The native-language setting value for a code ("es" → "Spanish"), or null. */
export function nativeLanguageName(code: string | null | undefined): NativeLanguage | null {
  const entry = Object.entries(NATIVE_LANGUAGE_CODES).find(([, value]) => value === code);
  return entry ? (entry[0] as NativeLanguage) : null;
}
