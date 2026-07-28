export interface VocabItem {
  word: string;
  translation: string;
  category: string;
  correctCount: number;
}

export type VocabByLanguage<Language extends string> = Partial<Record<Language, VocabItem[]>>;
export type VocabRevisionByLanguage<Language extends string> = Partial<Record<Language, number>>;

export interface ReconciledVocab<Language extends string> {
  vocabByLanguage: VocabByLanguage<Language>;
  vocabRevisionsByLanguage: VocabRevisionByLanguage<Language>;
}

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
  let changed = false;
  const next = current.map((item) => {
    if (vocabWordKey(item.word) !== key) return item;
    changed = true;
    return { ...item, correctCount: (item.correctCount ?? 0) + 1 };
  });
  if (!changed) return byLanguage;

  return {
    ...byLanguage,
    [language]: next,
  };
}

/** Regression drill: step mastered words back so they re-enter rotation. */
export function applyRegressionReset<Language extends string>(
  byLanguage: VocabByLanguage<Language>,
  language: Language,
  threshold: number,
): VocabByLanguage<Language> {
  const current = byLanguage[language] ?? [];
  let changed = false;
  const next = current.map((item) => {
    if ((item.correctCount ?? 0) < threshold) return item;
    changed = true;
    return { ...item, correctCount: threshold - 2 };
  });
  if (!changed) return byLanguage;

  return {
    ...byLanguage,
    [language]: next,
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

function revisionFor<Language extends string>(
  revisions: VocabRevisionByLanguage<Language>,
  language: Language,
): number | undefined {
  const revision = revisions[language];
  return typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 0
    ? revision
    : undefined;
}

export function bumpVocabRevision<Language extends string>(
  revisions: VocabRevisionByLanguage<Language>,
  language: Language,
): VocabRevisionByLanguage<Language> {
  return {
    ...revisions,
    [language]: (revisionFor(revisions, language) ?? 0) + 1,
  };
}

/**
 * Reconciles complete per-language snapshots without resurrecting deletions.
 *
 * A higher explicit revision is authoritative. Equal revisions union additions
 * and retain the highest mastery count. Unversioned legacy snapshots union
 * unless the local side has an explicit revision; that lets a new local
 * replacement defeat stale pre-revision cloud data while preserving old words
 * during first-time migration.
 */
export function reconcileVocabByLanguage<Language extends string>(
  local: VocabByLanguage<Language>,
  remote: VocabByLanguage<Language>,
  localRevisions: VocabRevisionByLanguage<Language>,
  remoteRevisions: VocabRevisionByLanguage<Language>,
): ReconciledVocab<Language> {
  const vocabByLanguage: VocabByLanguage<Language> = {};
  const vocabRevisionsByLanguage: VocabRevisionByLanguage<Language> = {};
  const languages = new Set([
    ...(Object.keys(local) as Language[]),
    ...(Object.keys(remote) as Language[]),
    ...(Object.keys(localRevisions) as Language[]),
    ...(Object.keys(remoteRevisions) as Language[]),
  ]);

  for (const language of languages) {
    const localRevision = revisionFor(localRevisions, language);
    const remoteRevision = revisionFor(remoteRevisions, language);
    const localItems = local[language] ?? [];
    const remoteItems = remote[language] ?? [];

    if (
      localRevision !== undefined &&
      (remoteRevision === undefined || localRevision > remoteRevision)
    ) {
      vocabByLanguage[language] = mergeVocabItems([], localItems);
    } else if (
      remoteRevision !== undefined &&
      localRevision !== undefined &&
      remoteRevision > localRevision
    ) {
      vocabByLanguage[language] = mergeVocabItems([], remoteItems);
    } else {
      vocabByLanguage[language] = mergeVocabItems(localItems, remoteItems);
    }

    const revision = Math.max(localRevision ?? 0, remoteRevision ?? 0);
    if (revision > 0) vocabRevisionsByLanguage[language] = revision;
  }

  return { vocabByLanguage, vocabRevisionsByLanguage };
}

export function mergeVocabByLanguage<Language extends string>(
  local: VocabByLanguage<Language>,
  remote: VocabByLanguage<Language>,
): VocabByLanguage<Language> {
  return reconcileVocabByLanguage(local, remote, {}, {}).vocabByLanguage;
}
