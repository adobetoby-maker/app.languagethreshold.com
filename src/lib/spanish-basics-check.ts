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
