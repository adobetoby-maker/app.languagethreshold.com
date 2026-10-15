// Pure logic for the in-lesson practice kit (no React, no DOM). Imported by
// src/components/core30/LessonPracticeKit.tsx and unit-tested directly.

export interface PracticeWord {
  en: string;
  es: string;
  kind: "term" | "phrase";
  note?: string;
}

export type RandomFn = () => number;

const MAX_SINGLE_ROUND = 12;
const MAX_ROUND_SIZE = 6;

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every normalized string accepted as a correct Spanish answer for `es`:
 * the full entry, the part before " (" or " / ", and each side of " / ".
 */
export function answerVariants(es: string): string[] {
  const variants = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeAnswer(value);
    if (normalized) variants.add(normalized);
  };
  add(es);
  const beforeParen = es.split(" (")[0];
  add(beforeParen);
  for (const side of beforeParen.split(" / ")) add(side);
  for (const side of es.split(" / ")) add(side.split(" (")[0]);
  return [...variants];
}

export function isCorrectAnswer(input: string, es: string): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return answerVariants(es).includes(normalized);
}

/** Fisher-Yates; returns a new array. `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Split items into memory-match rounds. Up to 12 items play as one round;
 * more are spread as evenly as possible over rounds of at most 6 (13 -> 5,4,4,
 * never a lonely 1-pair round).
 */
export function splitRounds<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [];
  if (items.length <= MAX_SINGLE_ROUND) return [[...items]];
  const rounds = Math.ceil(items.length / MAX_ROUND_SIZE);
  const base = Math.floor(items.length / rounds);
  const extra = items.length % rounds;
  const out: T[][] = [];
  let cursor = 0;
  for (let r = 0; r < rounds; r += 1) {
    const size = base + (r < extra ? 1 : 0);
    out.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return out;
}

export interface MatchTile {
  id: string;
  pairId: number;
  side: "es" | "en";
  text: string;
}

/** Two shuffled tiles (ES + EN) per word; `pairId` is the index within `round`. */
export function buildMatchTiles(
  round: readonly PracticeWord[],
  random: RandomFn = Math.random,
): MatchTile[] {
  const tiles: MatchTile[] = [];
  round.forEach((word, pairId) => {
    tiles.push({ id: `${pairId}-es`, pairId, side: "es", text: word.es });
    tiles.push({ id: `${pairId}-en`, pairId, side: "en", text: word.en });
  });
  return shuffle(tiles, random);
}

/**
 * Four-option (or fewer if the lesson is tiny) multiple choice of English
 * answers. Distractors come from the same lesson, distinct from the answer's
 * English text, preferring the same kind (term/phrase) first.
 */
export function buildListenOptions(
  words: readonly PracticeWord[],
  target: PracticeWord,
  random: RandomFn = Math.random,
  optionCount = 4,
): string[] {
  const answerKey = target.en.trim().toLowerCase();
  const seen = new Set<string>([answerKey]);
  const pool: PracticeWord[] = [];
  for (const word of words) {
    const key = word.en.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(word);
  }
  const sameKind = shuffle(
    pool.filter((word) => word.kind === target.kind),
    random,
  );
  const otherKind = shuffle(
    pool.filter((word) => word.kind !== target.kind),
    random,
  );
  const distractors = [...sameKind, ...otherKind].slice(0, Math.max(0, optionCount - 1));
  return shuffle([target.en, ...distractors.map((word) => word.en)], random);
}

/** Deck queue of word indices; Got it removes the front card, Again re-queues it at the back. */
export function advanceDeck(queue: readonly number[], outcome: "got" | "again"): number[] {
  if (queue.length === 0) return [];
  const [front, ...rest] = queue;
  return outcome === "again" ? [...rest, front] : rest;
}

/** Terms first, then phrases, keeping each group's original order. */
export function groupByKind(words: readonly PracticeWord[]): {
  terms: PracticeWord[];
  phrases: PracticeWord[];
} {
  return {
    terms: words.filter((word) => word.kind === "term"),
    phrases: words.filter((word) => word.kind === "phrase"),
  };
}

/** Same key rule as vocabWordKey in src/state/vocab-store.ts. */
export function vocabKey(word: string): string {
  return word.trim().toLowerCase();
}

/** Words not already known, deduplicated within the batch. */
export function wordsToAdd(
  words: readonly PracticeWord[],
  isKnown: (es: string) => boolean,
): PracticeWord[] {
  const seen = new Set<string>();
  const out: PracticeWord[] = [];
  for (const word of words) {
    const key = vocabKey(word.es);
    if (!key || seen.has(key) || isKnown(word.es)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}
