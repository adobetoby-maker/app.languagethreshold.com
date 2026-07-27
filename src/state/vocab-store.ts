export interface VocabItem {
  word: string;
  translation: string;
  category: string;
  correctCount: number;
}

export type VocabByLanguage<Language extends string> = Partial<Record<Language, VocabItem[]>>;

export function vocabWordKey(word: string): string {
  return word.trim().toLocaleLowerCase();
}

export function mergeVocabItems(
  current: readonly VocabItem[],
  incoming: readonly VocabItem[],
): VocabItem[] {
  const merged = current.map((item) => ({ ...item, correctCount: item.correctCount ?? 0 }));
  const indices = new Map(merged.map((item, index) => [vocabWordKey(item.word), index]));

  for (const item of incoming) {
    const key = vocabWordKey(item.word);
    if (!key) continue;
    const existingIndex = indices.get(key);
    if (existingIndex === undefined) {
      indices.set(key, merged.length);
      merged.push({ ...item, correctCount: item.correctCount ?? 0 });
      continue;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      ...item,
      correctCount: Math.max(existing.correctCount ?? 0, item.correctCount ?? 0),
    };
  }

  return merged;
}

export function includeLegacyVocab<Language extends string>(
  byLanguage: VocabByLanguage<Language> | undefined,
  legacyLanguage: Language | null | undefined,
  legacyItems: readonly VocabItem[] | undefined,
): VocabByLanguage<Language> {
  const next: VocabByLanguage<Language> = { ...(byLanguage ?? {}) };
  if (legacyLanguage && legacyItems?.length) {
    next[legacyLanguage] = mergeVocabItems(next[legacyLanguage] ?? [], legacyItems);
  }
  return next;
}

export function mergeVocabByLanguage<Language extends string>(
  local: VocabByLanguage<Language>,
  remote: VocabByLanguage<Language>,
): VocabByLanguage<Language> {
  const merged: VocabByLanguage<Language> = { ...local };
  const languages = new Set([
    ...(Object.keys(local) as Language[]),
    ...(Object.keys(remote) as Language[]),
  ]);

  for (const language of languages) {
    merged[language] = mergeVocabItems(local[language] ?? [], remote[language] ?? []);
  }

  return merged;
}
