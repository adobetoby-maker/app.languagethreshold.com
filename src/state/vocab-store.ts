export interface VocabItem {
  word: string;
  translation: string;
  category: string;
  correctCount: number;
}

export type VocabByLanguage<Language extends string> = Partial<Record<Language, VocabItem[]>>;

export function vocabWordKey(word: string): string {
  // Deterministic, locale-independent. `toLocaleLowerCase()` folds using the
  // ambient locale, so under a Turkish locale dotted I/İ produce different keys
  // and the same word can be stored twice. Vocabulary keys must not depend on
  // where the learner's device happens to be. Synthesis correction 3.
  return word.trim().toLowerCase();
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

/**
 * Folds the pre-migration single list into the per-language map.
 *
 * `fallbackLanguage` exists because the original defect produced exactly the
 * state `vocabLang === null` WITH a populated `userVocab` — ADD_VOCAB_ITEMS
 * appended words without ever setting the label, which is why they were
 * invisible. Guarding only on `legacyLanguage` would therefore discard the
 * vocabulary of precisely the learners this migration is meant to rescue.
 *
 * Attributing orphaned words to the learner's current language is a guess, but
 * a recoverable one; dropping them is not. Synthesis correction 1.
 */
export function includeLegacyVocab<Language extends string>(
  byLanguage: VocabByLanguage<Language> | undefined,
  legacyLanguage: Language | null | undefined,
  legacyItems: readonly VocabItem[] | undefined,
  fallbackLanguage?: Language | null,
): VocabByLanguage<Language> {
  const next: VocabByLanguage<Language> = { ...(byLanguage ?? {}) };
  if (!legacyItems?.length) return next;

  const target = legacyLanguage ?? fallbackLanguage ?? null;
  if (!target) return next;

  next[target] = mergeVocabItems(next[target] ?? [], legacyItems);
  return next;
}

/**
 * Reads the durable per-language list. `userVocab` is a DERIVED VIEW of this and
 * must never be written directly — see the writers below.
 */
export function deriveUserVocab<Language extends string>(
  byLanguage: VocabByLanguage<Language> | undefined,
  language: Language,
): VocabItem[] {
  return byLanguage?.[language] ?? [];
}

/**
 * The three writers below exist because `mergeVocabItems` resolves collisions
 * with `Math.max`. That clamp is correct for reconciling legacy/remote data —
 * it must never lose a learner's progress — but it makes any DELIBERATE
 * decrease impossible. Reducers that previously mutated the derived `userVocab`
 * were silently reconciled away on the next HYDRATE or SET_LANGUAGE:
 * increments survived (max kept them) and decrements did not.
 *
 * So in-app writes go straight to `vocabByLanguage` and never travel through
 * the legacy-merge path. Once the derived view is recomputed from the map, the
 * subsequent merge-on-hydrate compares identical data and is a no-op.
 */
export function applyMasteryIncrement<Language extends string>(
  byLanguage: VocabByLanguage<Language>,
  language: Language,
  word: string,
): VocabByLanguage<Language> {
  const key = vocabWordKey(word);
  const current = byLanguage[language] ?? [];
  return {
    ...byLanguage,
    [language]: current.map((item) =>
      vocabWordKey(item.word) === key
        ? { ...item, correctCount: (item.correctCount ?? 0) + 1 }
        : item,
    ),
  };
}

/** Regression drill: step mastered words back so they re-enter rotation. */
export function applyRegressionReset<Language extends string>(
  byLanguage: VocabByLanguage<Language>,
  language: Language,
  threshold: number,
): VocabByLanguage<Language> {
  const current = byLanguage[language] ?? [];
  return {
    ...byLanguage,
    [language]: current.map((item) =>
      (item.correctCount ?? 0) >= threshold ? { ...item, correctCount: threshold - 2 } : item,
    ),
  };
}

/** Wholesale replacement (Pen Pal vocabulary builder). */
export function replaceLanguageVocab<Language extends string>(
  byLanguage: VocabByLanguage<Language>,
  language: Language,
  items: readonly VocabItem[],
): VocabByLanguage<Language> {
  return {
    ...byLanguage,
    [language]: items.map((item) => ({ ...item, correctCount: item.correctCount ?? 0 })),
  };
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
