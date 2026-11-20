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
 * never a lonely 1-pair round). Lessons may set a smaller round limit (3–12).
 */
export function splitRounds<T>(items: readonly T[], maxPairs?: number): T[][] {
  if (maxPairs !== undefined && (!Number.isInteger(maxPairs) || maxPairs < 3 || maxPairs > 12)) {
    throw new RangeError("A matching round limit must be between three and twelve pairs.");
  }
  if (items.length === 0) return [];
  if (items.length <= (maxPairs ?? MAX_SINGLE_ROUND)) return [[...items]];
  const rounds = Math.ceil(items.length / (maxPairs ?? MAX_ROUND_SIZE));
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

/** How long both mismatched tiles stay red before they can be tried again. */
export const MATCH_MISMATCH_MS = 600;

/** One matching round as the learner sees it. */
export interface MatchBoard {
  /** The tile tapped first, waiting for its partner. */
  selected: string | null;
  /** `pairId`s already matched in this round. */
  matched: readonly number[];
  /** Both tiles of a wrong pair while the red feedback shows; empty otherwise. */
  wrong: readonly string[];
  mistakes: number;
}

export const EMPTY_MATCH_BOARD: MatchBoard = {
  selected: null,
  matched: [],
  wrong: [],
  mistakes: 0,
};

export type MatchTapOutcome = "ignored" | "selected" | "deselected" | "matched" | "mismatch";

export interface MatchTapResult {
  board: MatchBoard;
  outcome: MatchTapOutcome;
  /** Target-language text to read aloud for this tap, or null. */
  speak: string | null;
}

/**
 * The rules of one tap on a matching tile.
 * A wrong pair marks BOTH tiles red and counts one mistake; taps are ignored until
 * `clearMatchMismatch` runs, and then both tiles are free to be tried again.
 */
export function tapMatchTile(
  board: MatchBoard,
  tiles: readonly MatchTile[],
  tile: MatchTile,
): MatchTapResult {
  const pairs = new Set(tiles.map((item) => item.pairId)).size;
  const roundDone = pairs > 0 && board.matched.length === pairs;
  if (board.wrong.length > 0 || board.matched.includes(tile.pairId) || roundDone)
    return { board, outcome: "ignored", speak: null };
  // Every accepted tap on a target-language tile is read aloud, whatever it leads to.
  const speak = tile.side === "es" ? tile.text : null;
  if (board.selected === null)
    return { board: { ...board, selected: tile.id }, outcome: "selected", speak };
  if (board.selected === tile.id)
    return { board: { ...board, selected: null }, outcome: "deselected", speak };
  const first = tiles.find((item) => item.id === board.selected);
  // Two tiles from the same column cannot pair: the newer one becomes the selection.
  if (!first || first.side === tile.side)
    return { board: { ...board, selected: tile.id }, outcome: "selected", speak };
  if (first.pairId === tile.pairId)
    return {
      board: { ...board, selected: null, matched: [...board.matched, tile.pairId] },
      outcome: "matched",
      speak,
    };
  return {
    board: { ...board, wrong: [first.id, tile.id], mistakes: board.mistakes + 1 },
    outcome: "mismatch",
    speak,
  };
}

export type MatchTileState = "matched" | "wrong" | "selected" | "idle";

/**
 * How one tile is shown. "wrong" (red) outranks "selected", so the tile tapped first turns
 * red together with the second one instead of keeping its selection highlight.
 */
export function matchTileState(board: MatchBoard, tile: MatchTile): MatchTileState {
  if (board.matched.includes(tile.pairId)) return "matched";
  if (board.wrong.includes(tile.id)) return "wrong";
  return board.selected === tile.id ? "selected" : "idle";
}

/** End of the red feedback: nothing is selected or marked, so the same tiles can be retried. */
export function clearMatchMismatch(board: MatchBoard): MatchBoard {
  return board.wrong.length === 0 ? board : { ...board, wrong: [], selected: null };
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
