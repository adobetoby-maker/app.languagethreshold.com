import type { LanguagePack } from "../data/language-packs/types.ts";
import { followsPackRules } from "../data/language-packs/pack-rules.ts";
/** Exact cloze forms: ignore case/punctuation, but preserve accents (el ≠ él, esta ≠ está). */
export function correctSpanishCloze(input: string, expected: string): boolean {
  const normalize = (value: string) =>
    value
      .normalize("NFC")
      .toLocaleLowerCase("es")
      .replace(/[¿?¡!.,;:]/g, "")
      .trim()
      .replace(/\s+/g, " ");
  return !!normalize(input) && normalize(input) === normalize(expected);
}

/**
 * The same exact-cloze rule for any pack: case and sentence punctuation are ignored, marks are
 * kept (el ≠ él, ou ≠ où). Apostrophe variants count as the pack's apostrophe, and a script
 * written without spaces (Japanese) ignores whitespace. Spanish answers grade exactly as
 * correctSpanishCloze.
 */
export function correctCloze(input: string, expected: string, pack: LanguagePack): boolean {
  // Spanish and Japanese keep the base checks exactly (owner decisions 2 and 3): Spanish uses
  // correctSpanishCloze; Japanese compares NFC text with whitespace removed and nothing else.
  if (!followsPackRules(pack)) {
    if (pack.script.wordSeparator !== "none") return correctSpanishCloze(input, expected);
    const strip = (value: string) => value.normalize("NFC").replace(/\s+/g, "").trim();
    return strip(input) === strip(expected);
  }
  const normalize = (value: string) => {
    let text = value.normalize("NFC");
    for (const variant of pack.typography.apostropheVariants)
      text = text.split(variant).join(pack.typography.apostrophe);
    text = text
      .toLocaleLowerCase(pack.code)
      .replace(/[¿?¡!.,;:]/g, "")
      .trim()
      .replace(/\s+/g, pack.script.wordSeparator === "none" ? "" : " ");
    return text;
  };
  return !!normalize(input) && normalize(input) === normalize(expected);
}
