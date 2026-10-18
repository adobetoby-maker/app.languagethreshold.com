/** Public module practice drafts only; never learner text or assessment content. */
export interface ModuleDeckPair {
  english: string;
  translation: string;
  kind: "term" | "phrase";
}
export const MODULE_DECK_LIMITS = {
  minPerKind: 16,
  maxPerKind: 20,
  nativeLength: 180,
  targetLength: 240,
} as const;

export function cleanModuleDeck(raw: unknown, targetLanguage?: string): ModuleDeckPair[] | null {
  if (!Array.isArray(raw) || raw.length > 100) return null;
  const pairs: ModuleDeckPair[] = [],
    seen = new Set<string>();
  const counts = { term: 0, phrase: 0 };
  for (const entry of raw) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.english !== "string" ||
      typeof entry.translation !== "string"
    )
      continue;
    const english = entry.english.normalize("NFC").trim(),
      translation = entry.translation.normalize("NFC").trim();
    const kind: unknown = entry.kind;
    if (
      (kind !== "term" && kind !== "phrase") ||
      !english ||
      !translation ||
      english.length > MODULE_DECK_LIMITS.nativeLength ||
      translation.length > MODULE_DECK_LIMITS.targetLength ||
      counts[kind] >= MODULE_DECK_LIMITS.maxPerKind
    )
      continue;
    const key = english.toLocaleLowerCase("en");
    if (
      seen.has(key) ||
      (targetLanguage && translation.toLocaleLowerCase() === targetLanguage.toLocaleLowerCase())
    )
      continue;
    seen.add(key);
    counts[kind]++;
    pairs.push({ english, translation, kind });
  }
  return counts.term >= MODULE_DECK_LIMITS.minPerKind &&
    counts.phrase >= MODULE_DECK_LIMITS.minPerKind
    ? pairs
    : null;
}
