/** A colored split may teach a fixed stem only when it reconstructs every actual form. */
export function hasConsistentGrammarMorphology(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const morph = value as { base?: unknown; table?: unknown };
  if (
    !morph.base ||
    typeof morph.base !== "object" ||
    !Array.isArray(morph.table) ||
    !morph.table.length
  )
    return false;
  const base = morph.base as Record<string, unknown>;
  const text = (part: unknown) => (typeof part === "string" ? part.normalize("NFC").trim() : null);
  const root = text(base.root);
  if (!root) return false;
  const reconstructs = (part: Record<string, unknown>, full: unknown) => {
    const stem = text(part.root),
      ending = text(part.ending),
      word = text(full);
    return stem === root && ending !== null && !!word && text(stem + ending) === word;
  };
  return (
    reconstructs(base, base.word) &&
    morph.table.every((row) => row && typeof row === "object" && reconstructs(row, row.full))
  );
}
