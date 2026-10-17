/** Match displayed grammar options using the same rule as practice answer checking. */
export function normalizeGrammarAnswer(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?¿¡«»"'()[\]]+$/g, "")
    .replace(/^[¿¡«"'([]+/g, "");
}
