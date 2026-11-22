// Built by TAC — 2026-11-21
// The target-language line of a phrase card whose translations are keyed by language name.
// Fail closed: a language with no row gets the English headword marked "not yet translated",
// never another language's phrase presented as the learner's target language.

export const NOT_YET_TRANSLATED = "Not yet translated in this language";

/** The translation for `language` (stored name), or null when the card has none. */
export function translationFor(
  translations: Record<string, string> | undefined,
  language: string,
): string | null {
  const text = translations?.[language];
  return text && text.trim() ? text : null;
}
