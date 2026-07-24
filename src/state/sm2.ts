// SM-2 spaced-repetition scheduler — same algorithm as juniorlinguist's
// useSM2.ts, adapted to be a pure function module. Storage lives in
// app-state's `vocabSM2` field (parallel to `patternProgress`) rather than
// its own localStorage key, so it rides the existing hydrate/persist/
// Supabase-sync pipeline instead of a second one.

export interface SM2Card {
  easeFactor: number; // starts 2.5; floor 1.3
  interval: number; // days until next review
  repetition: number; // consecutive successful reviews
  nextReviewDate: string; // YYYY-MM-DD
}

export type SM2Store = Record<string, SM2Card>;

const DEFAULT_CARD: Omit<SM2Card, "nextReviewDate"> = {
  easeFactor: 2.5,
  interval: 1,
  repetition: 0,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getSM2Card(store: SM2Store, key: string): SM2Card {
  return store[key] ?? { ...DEFAULT_CARD, nextReviewDate: today() };
}

/**
 * grade: 0 = "not yet" (forgot), 3 = "got it", 5 = "already knew it"
 * Returns the updated card — caller is responsible for writing it back
 * into the store (via APP dispatch) since this module has no side effects.
 */
export function updateSM2(store: SM2Store, key: string, grade: 0 | 3 | 5): SM2Card {
  const card = getSM2Card(store, key);
  let { easeFactor, interval, repetition } = card;

  if (grade < 3) {
    repetition = 0;
    interval = 1;
  } else {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    repetition += 1;
  }

  return { easeFactor, interval, repetition, nextReviewDate: addDays(interval) };
}

export function isDue(store: SM2Store, key: string): boolean {
  const t = today();
  return (store[key]?.nextReviewDate ?? t) <= t;
}

export function getDueCount(store: SM2Store, keys: string[]): number {
  return keys.filter((k) => isDue(store, k)).length;
}

/** Sort items so due cards come first, preserving relative order within each group. */
export function sortByDue<T>(store: SM2Store, items: T[], keyOf: (item: T) => string): T[] {
  const t = today();
  return [...items].sort((a, b) => {
    const aDue = (store[keyOf(a)]?.nextReviewDate ?? t) <= t ? 0 : 1;
    const bDue = (store[keyOf(b)]?.nextReviewDate ?? t) <= t ? 0 : 1;
    return aDue - bDue;
  });
}
