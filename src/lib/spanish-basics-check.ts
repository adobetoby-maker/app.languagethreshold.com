import type { LanguagePack } from "../data/language-packs/types.ts";
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
export function correctCloze(
  input: string,
  expected: string,
  pack: Pick<LanguagePack, "code" | "script" | "typography">,
): boolean {
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
