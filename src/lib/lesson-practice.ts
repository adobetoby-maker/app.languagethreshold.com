// Pure logic for the in-lesson practice kit (no React, no DOM). Imported by
// src/components/core30/LessonPracticeKit.tsx and unit-tested directly.

import type { AccentMode, LanguagePack } from "../data/language-packs/types.ts";
import { foldMarks, normalizeKey } from "./language-pack-text.ts";
import { followsPackRules } from "../data/language-packs/pack-rules.ts";

export interface PracticeWord {
  en: string;
  es: string;
  kind: "term" | "phrase";
  note?: string;
}

export type RandomFn = () => number;

const MAX_SINGLE_ROUND = 12;
const MAX_ROUND_SIZE = 6;

// ─── Typed-answer checking (language-pack model section 8) ──────────────────────────────────────
//
// Every rule comes from the pack: apostrophe and space folding (typography), accent policy and
// fold table (answerRules), typed alternates (œ ↔ oe), protected pairs, article handling and
// elision. There is no language name or code in this file.

type TypedMode = AccentMode | "legacy";

/**
 * How typed accents are compared. A pack with unscoped legacy ids (`ids.legacyUnscopedStorage`:
 * Spanish and Japanese, whose behaviour predates the pack model) keeps the accent-blind check
 * until the owner decides model section 18 delta 2; every other pack follows its own
 * `answerRules.accentPolicy.typed`.
 */
export function typedAccentMode(pack: LanguagePack): TypedMode {
  return pack.ids.legacyUnscopedStorage ? "legacy" : pack.answerRules.accentPolicy.typed;
}

function usesElision(pack: LanguagePack): boolean {
  return pack.dictionary.lookup.elisionPrefixes.length > 0;
}

/**
 * Lowercase and punctuation-free comparison form: step 1 of the pipeline (normalizeKey), accent
 * handling by mode, apostrophes and punctuation become spaces, whitespace collapses.
 */
export function normalizeAnswer(text: string, pack: LanguagePack): string {
  if (!followsPackRules(pack)) return baseNormalizeAnswer(text);
  const mode = typedAccentMode(pack);
  let key = normalizeKey(text, pack);
  // A pack with no fold table (a legacy adapter) folds every mark, as the kit always has.
  const noFoldTable = Object.keys(pack.answerRules.fold).length === 0;
  if (mode === "legacy" || ((mode === "fold" || mode === "fold-except-protected") && noFoldTable)) {
    key = key.normalize("NFD").replace(/\p{M}/gu, "");
    for (const [ligature, plain] of Object.entries(pack.answerRules.ligatures))
      key = key.replaceAll(ligature, plain);
  } else if (mode === "fold" || mode === "fold-except-protected") {
    key = foldMarks(key, pack);
  }
  return key
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The base app's comparison form (df664f7c9), kept for Spanish, Japanese and every language
 * without a released pack (owner decisions 2 and 3): lowercase, combining accents stripped,
 * punctuation-free, whitespace collapsed.
 */
function baseNormalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The same key with elided apostrophes closed up: "l eau" and "leau" are one answer. */
function joinedKey(spaced: string, pack: LanguagePack): string | null {
  if (!usesElision(pack)) return null;
  const tokens = spaced.split(" ");
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (i + 1 < tokens.length && isElisionToken(tokens[i], pack)) {
      out.push(tokens[i] + tokens[i + 1]);
      i += 1;
    } else out.push(tokens[i]);
  }
  return out.join(" ");
}

function isElisionToken(token: string, pack: LanguagePack): boolean {
  return pack.dictionary.lookup.elisionPrefixes.some(
    (prefix) =>
      prefix.replace(/['’ʼ‘]/gu, "").toLocaleLowerCase(pack.script.segmenterLocale) === token,
  );
}

/** Every article of the pack as a normalized token run ("l'" → "l", "de la" → "de la"), longest first. */
function articleKeys(pack: LanguagePack): string[] {
  const { definite = [], indefinite = [], partitive = [] } = pack.grammar.nounSystem.articles;
  const keys = new Set<string>();
  for (const article of [...definite, ...indefinite, ...partitive]) {
    const key = normalizeAnswer(article, pack);
    if (key) keys.add(key);
  }
  return [...keys].sort((a, b) => b.length - a.length);
}

/** `spaced` without its leading article, or null when it has none (or nothing else). */
function withoutArticle(spaced: string, pack: LanguagePack): string | null {
  for (const article of articleKeys(pack)) {
    if (spaced.startsWith(`${article} `) && spaced.length > article.length + 1)
      return spaced.slice(article.length + 1);
  }
  return null;
}

/** Typed alternates (œ ↔ oe): the expected text with each listed letter written the other way. */
function withAlternates(text: string, pack: LanguagePack): string {
  let out = text;
  for (const [letter, substitute] of Object.entries(pack.answerRules.typedAlternates))
    out = out.replaceAll(letter, substitute);
  return out;
}

/**
 * Every raw string accepted as a correct answer for the entry `target`: the full entry, the part
 * before " (" or " / ", and each side of " / ".
 */
function entryForms(target: string): string[] {
  const forms = new Set<string>();
  forms.add(target);
  const beforeParen = target.split(" (")[0];
  forms.add(beforeParen);
  for (const side of beforeParen.split(" / ")) forms.add(side);
  for (const side of target.split(" / ")) forms.add(side.split(" (")[0]);
  return [...forms];
}

/**
 * Every normalized string accepted as a correct answer for `target`: the entry forms, the typed
 * alternates, and, when the pack accepts a bare noun (`articleOptional: "accept"`), the forms
 * without their article.
 */
export function answerVariants(target: string, pack: LanguagePack): string[] {
  if (!followsPackRules(pack))
    return [...new Set(entryForms(target).map(baseNormalizeAnswer).filter(Boolean))];
  const variants = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeAnswer(value, pack);
    if (normalized) variants.add(normalized);
  };
  for (const form of entryForms(target)) {
    add(form);
    if (Object.keys(pack.answerRules.typedAlternates).length > 0)
      add(withAlternates(form.toLocaleLowerCase(pack.script.segmenterLocale), pack));
  }
  if (pack.answerRules.articleOptional === "accept") {
    for (const variant of [...variants]) {
      const bare = withoutArticle(variant, pack);
      if (bare) variants.add(bare);
    }
  }
  return [...variants];
}

function matchesAny(normalized: string, variants: readonly string[], pack: LanguagePack): boolean {
  if (variants.includes(normalized)) return true;
  const joined = joinedKey(normalized, pack);
  return joined !== null && variants.some((variant) => joinedKey(variant, pack) === joined);
}

export function isCorrectAnswer(input: string, target: string, pack: LanguagePack): boolean {
  const normalized = normalizeAnswer(input, pack);
  if (!normalized) return false;
  if (!followsPackRules(pack)) return answerVariants(target, pack).includes(normalized);
  return matchesAny(normalized, answerVariants(target, pack), pack);
}

export type TypedAnswerHint =
  | { kind: "accent"; text: string }
  | { kind: "different-word"; text: string }
  | { kind: "article"; text: string };

/**
 * Why a wrong typed answer was wrong, when it is one of the pack's taught near misses: right
 * letters with the wrong marks (`accentHint`), a protected pair ("où" for "ou"), or a bare noun
 * where the pack asks for its article (`articleOptional: "hint"`). Null otherwise.
 */
export function typedAnswerHint(
  input: string,
  target: string,
  pack: LanguagePack,
): TypedAnswerHint | null {
  const normalized = normalizeAnswer(input, pack);
  if (!normalized || isCorrectAnswer(input, target, pack)) return null;
  const rules = pack.answerRules;
  if (rules.articleOptional === "hint") {
    for (const variant of answerVariants(target, pack)) {
      if (withoutArticle(variant, pack) === normalized)
        return { kind: "article", text: "Add the article" };
    }
  }
  if (typedAccentMode(pack) !== "strict") return null;
  const foldWords = (text: string) =>
    foldMarks(normalizeKey(text, pack), pack)
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const folded = foldWords(input);
  for (const variant of answerVariants(target, pack)) {
    if (foldWords(variant) !== folded) continue;
    const given = normalized.split(" ");
    const wanted = variant.split(" ");
    const swapped = wanted.findIndex(
      (word, index) =>
        word !== given[index] &&
        rules.protectedPairs.some((pair) => pair.includes(word) && pair.includes(given[index])),
    );
    if (swapped >= 0)
      return {
        kind: "different-word",
        text: `That is a different word: ${wanted[swapped]} vs ${given[swapped]}`,
      };
    if (rules.accentHint)
      return { kind: "accent", text: `The words are right. Check the ${rules.markName}.` };
  }
  return null;
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
