// Built by TAC — 2026-10-20
// Verb Games: Verb Crush round engine. A 5x5 board of stems and endings; a stem directly left of
// an ending pops when the word is a goal form of the level. Pure and seeded; the log holds only
// accepted swaps, so the server replays a round through this same engine (like Bubble Pop).

import { PERSON_ENDINGS, personForEnding } from "./classify.ts";
import { isAnyPresentForm, norm } from "./distractors.ts";
import { reasonText } from "./families.ts";
import type { FrameSlot } from "./pool.ts";
import { createRng, pickIndex } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { ROUND_MS, crushGoalSlots, onCorrect, roundFamilies } from "./rules.ts";
import { PERSONS } from "./types.ts";
import type {
  Completion,
  FamilyId,
  Miss,
  Outcome,
  PatternData,
  Person,
  RoundConfig,
  RoundEvent,
  RoundResult,
  VerbEntry,
} from "./types.ts";

export const CRUSH_SIZE = 5;
const CELLS = CRUSH_SIZE * CRUSH_SIZE;

/** Points for one pop before the streak multiplier and the chain step. */
const POP_POINTS = 50;
/** Generation tries this many derived seeds before falling back to a placed pop. */
const MAX_ATTEMPTS = 50;
/** Ruling F14: about a third of the starting stem->ending pairs are seeded invalid words. */
const TRAP_SHARE = 1 / 3;
/** Deck: chance a drawn piece comes from the goal pieces rather than any piece of a goal verb. */
const GOAL_WEIGHT = 0.6;
/** Safety cap on cascade passes in one swap (refills are random, so a chain always stops). */
const MAX_CHAIN = 25;

export interface CrushTile {
  id: number;
  kind: "stem" | "ending";
  label: string;
  infinitive: string;
}

export interface CrushView {
  cells: CrushTile[];
  goalCount: number;
  made: number;
  movesLeft: number;
  score: number;
  streak: number;
  t: number;
  ended: boolean;
  won: boolean;
  lastReason: string | null;
}

export interface CrushRound {
  view(): CrushView;
  /**
   * Swaps two orthogonally adjacent cells at time `t`. Invalid (and not logged) when the round
   * has ended, `t` is not finite, `t` is earlier than the round's current time (`view().t`), `t`
   * is at or after the round end, or the cells are not adjacent. Callers pass
   * `Math.max(eventT, view().t)` so a late UI event is never rejected for running backwards.
   */
  swap(t: number, a: number, b: number): Outcome[];
  /** Moves time forward; at or after `ROUND_MS.crush` the round ends. Same `t` guard as `swap`. */
  advance(t: number): Outcome[];
  /**
   * Ends the round and returns the result. A round that already ended (goal, moves or time)
   * keeps its end time; otherwise it ends at `t` clamped to the round length. The server
   * replays with `end(ROUND_MS.crush)`.
   */
  end(t: number): RoundResult;
  /** The first adjacent swap (row-major, right then down) that pops, or null. */
  findPopSwap(): [number, number] | null;
  /** Accepted swaps only, in order (traps included). Invalid swaps are never logged. */
  events(): RoundEvent[];
}

/** Orthogonal neighbors on the 5x5 grid (left/right only within a row). */
export function adjacent(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0 || a >= CELLS || b >= CELLS) return false;
  const dr = Math.abs(Math.floor(a / CRUSH_SIZE) - Math.floor(b / CRUSH_SIZE));
  const dc = Math.abs((a % CRUSH_SIZE) - (b % CRUSH_SIZE));
  return dr + dc === 1;
}

type Piece = Omit<CrushTile, "id">;

/** Every ending a tile can carry: the regular person endings (classify.ts, F26) plus -go. */
const ALL_ENDINGS: readonly string[] = [...new Set([...PERSONS.flatMap((p) => PERSON_ENDINGS[p]), "go"])];

/** The person an ending tile stands for: the regular table (F26), and -go is yo. */
function personOf(ending: string): Person | null {
  return ending === "go" ? "yo" : personForEnding(ending);
}

/** The regular endings of a verb's class (-ar / -er / -ir), one per person, from PERSON_ENDINGS. */
function classEndings(infinitive: string): string[] {
  const inf = norm(infinitive).replace(/ír$/, "ir");
  const cls = inf.slice(-2);
  if (cls !== "ar" && cls !== "er" && cls !== "ir") return [];
  return PERSONS.map((p) => {
    const list = PERSON_ENDINGS[p];
    if (list.length === 1) return list[0] as string;
    const at = cls === "ar" ? 0 : list.length === 3 && cls === "ir" ? 2 : 1;
    return list[at] as string;
  });
}

/** A stem pair: stem at `i`, ending at `i + 1`, same row. */
function isPair(cells: readonly Piece[], i: number): boolean {
  return i % CRUSH_SIZE < CRUSH_SIZE - 1 && cells[i]?.kind === "stem" && cells[i + 1]?.kind === "ending";
}

/** Stem indices of the pairs that contain cell `i` (at most one). */
function pairsTouching(cells: readonly Piece[], i: number): number[] {
  if (isPair(cells, i)) return [i];
  if (i % CRUSH_SIZE > 0 && isPair(cells, i - 1)) return [i - 1];
  return [];
}

function wordAt(cells: readonly Piece[], i: number): string {
  return (cells[i] as Piece).label + (cells[i + 1] as Piece).label;
}

function derivedSeed(seed: number, n: number): number {
  return ((seed >>> 0) + Math.imul(n + 1, 0x9e3779b1)) >>> 0;
}

export function createCrushRound(
  data: PatternData,
  config: RoundConfig,
  options?: { layout?: CrushTile[] },
): CrushRound {
  if (config.level === null) throw new Error("Crush needs a level");
  const row = data.crushLevels.find((l) => l.level === config.level);
  if (!row) throw new Error(`Unknown Crush level: ${String(config.level)}`);
  const goals: FrameSlot[] = crushGoalSlots(data, row, config.family, config.source);
  if (goals.length === 0) throw new Error("No goal forms for this level");
  const families = roundFamilies(config, data);
  const roundMs = ROUND_MS.crush;

  const verbByInf = new Map<string, VerbEntry>(data.verbs.map((v) => [v.infinitive, v]));
  const formOf = (infinitive: string, person: Person) =>
    verbByInf.get(infinitive)?.forms.find((f) => f.person === person);

  const goalByWord = new Map<string, FrameSlot[]>();
  for (const slot of goals) {
    const word = norm(formOf(slot.infinitive, slot.person)?.full ?? "");
    goalByWord.set(word, [...(goalByWord.get(word) ?? []), slot]);
  }
  const isGoal = (word: string) => goalByWord.has(norm(word));
  // isAnyPresentForm scans every verb; the cache keeps its exact answer per word.
  const validCache = new Map<string, boolean>();
  const isValid = (word: string) => {
    const key = norm(word);
    let hit = validCache.get(key);
    if (hit === undefined) {
      hit = isAnyPresentForm(data, key);
      validCache.set(key, hit);
    }
    return hit;
  };

  // ---- The deck: stems and endings of the goal verbs, weighted toward the goal pieces -------
  const distinct = (pieces: Piece[]): Piece[] => {
    const seen = new Set<string>();
    return pieces.filter((p) => {
      const key = `${p.kind}|${p.label}|${p.infinitive}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const goalStems: Piece[] = [];
  const goalEndings: Piece[] = [];
  for (const slot of goals) {
    const form = formOf(slot.infinitive, slot.person);
    if (!form) continue;
    goalStems.push({ kind: "stem", label: form.stem, infinitive: slot.infinitive });
    goalEndings.push({ kind: "ending", label: form.ending, infinitive: slot.infinitive });
  }
  const goalVerbs = [...new Set(goals.map((g) => g.infinitive))];
  const allStems: Piece[] = [...goalStems];
  const allEndings: Piece[] = [...goalEndings];
  for (const inf of goalVerbs) {
    for (const f of verbByInf.get(inf)?.forms ?? []) {
      if (f.ending === "" || f.stem === "") continue;
      allStems.push({ kind: "stem", label: f.stem, infinitive: inf });
      allEndings.push({ kind: "ending", label: f.ending, infinitive: inf });
    }
  }
  const deck = {
    goalStems: distinct(goalStems),
    goalEndings: distinct(goalEndings),
    allStems: distinct(allStems),
    allEndings: distinct(allEndings),
  };
  const pick = <T>(rng: Rng, items: readonly T[]): T => items[pickIndex(rng, items.length)] as T;
  const drawStem = (rng: Rng): Piece => pick(rng, rng() < GOAL_WEIGHT ? deck.goalStems : deck.allStems);
  const drawEnding = (rng: Rng): Piece => pick(rng, rng() < GOAL_WEIGHT ? deck.goalEndings : deck.allEndings);
  const draw = (rng: Rng): Piece => (rng() < 0.5 ? drawStem(rng) : drawEnding(rng));

  // ---- Board helpers --------------------------------------------------------------------------
  const goalPairs = (cells: readonly Piece[]): number[] => {
    const out: number[] = [];
    for (let i = 0; i < CELLS; i++) if (isPair(cells, i) && isGoal(wordAt(cells, i))) out.push(i);
    return out;
  };

  const popsAfterSwap = (cells: Piece[], a: number, b: number): boolean => {
    const next = [...cells];
    [next[a], next[b]] = [next[b] as Piece, next[a] as Piece];
    return [a, b].some((i) => pairsTouching(next, i).some((s) => isGoal(wordAt(next, s))));
  };

  const findPopSwapOn = (cells: Piece[]): [number, number] | null => {
    for (let i = 0; i < CELLS; i++) {
      if (i % CRUSH_SIZE < CRUSH_SIZE - 1 && popsAfterSwap(cells, i, i + 1)) return [i, i + 1];
      if (i + CRUSH_SIZE < CELLS && popsAfterSwap(cells, i, i + CRUSH_SIZE)) return [i, i + CRUSH_SIZE];
    }
    return null;
  };

  /** Plausible invalid endings for a stem: its verb's regular class endings that make no word. */
  const trapEndings = (stem: Piece): string[] =>
    classEndings(stem.infinitive).filter((e) => !isValid(stem.label + e) && !isGoal(stem.label + e));
  /** Endings that make a valid present form of some verb that is not a goal (neutral). */
  const neutralEndings = (stem: Piece): string[] =>
    ALL_ENDINGS.filter((e) => isValid(stem.label + e) && !isGoal(stem.label + e));

  /**
   * Ruling F14: walk the stem->ending pairs left to right; about a third become a plausible
   * invalid word (ten + o), the rest a neutral valid form. A stem that has no neutral option
   * (every valid form is a goal, or it has none) cannot keep a pair without biasing the share,
   * so its ending turns into a stem. The board never starts with a goal pair.
   */
  const seedPairs = (cells: Piece[], rng: Rng): void => {
    for (let i = 0; i < CELLS; i++) {
      if (!isPair(cells, i)) continue;
      const stem = cells[i] as Piece;
      const current = (cells[i + 1] as Piece).label;
      const trap = trapEndings(stem);
      const neutral = neutralEndings(stem);
      if (neutral.length === 0 || trap.length === 0) {
        cells[i + 1] = drawStem(rng);
      } else if (rng() < TRAP_SHARE) {
        cells[i + 1] = { kind: "ending", label: pick(rng, trap), infinitive: stem.infinitive };
      } else if (!neutral.includes(current)) {
        cells[i + 1] = { kind: "ending", label: pick(rng, neutral), infinitive: stem.infinitive };
      }
    }
  };

  let nextId = 0;
  const withIds = (cells: Piece[]): CrushTile[] => cells.map((p) => ({ id: nextId++, ...p }));

  /** Board number `generation`: derived seeds, then the placed-pop fallback. */
  const generate = (generation: number): CrushTile[] => {
    let cells: Piece[] = [];
    let rng: Rng = createRng(config.seed);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      rng = createRng(derivedSeed(config.seed, generation * MAX_ATTEMPTS + attempt));
      cells = Array.from({ length: CELLS }, () => draw(rng));
      seedPairs(cells, rng);
      if (goalPairs(cells).length === 0 && findPopSwapOn(cells) !== null) return withIds(cells);
    }
    // Fallback: a goal stem at column 0, a filler at column 1 and its ending at column 2 of row 0.
    const slot = pick(rng, goals);
    const form = formOf(slot.infinitive, slot.person);
    if (!form) throw new Error("Goal form missing");
    const stem: Piece = { kind: "stem", label: form.stem, infinitive: slot.infinitive };
    const fillers = ALL_ENDINGS.filter((e) => !isGoal(stem.label + e));
    cells[0] = stem;
    cells[1] = { kind: "ending", label: pick(rng, fillers), infinitive: slot.infinitive };
    cells[2] = { kind: "ending", label: form.ending, infinitive: slot.infinitive };
    return withIds(cells);
  };

  let cells: CrushTile[];
  if (options?.layout) {
    if (options.layout.length !== CELLS) throw new Error(`A Crush layout has ${CELLS} cells`);
    cells = options.layout.map((c) => ({ id: c.id, kind: c.kind, label: c.label, infinitive: c.infinitive }));
    nextId = Math.max(...cells.map((c) => c.id)) + 1;
  } else {
    cells = generate(0);
  }

  const deckRng = createRng(config.seed);
  let generation = 0;
  let movesLeft = row.moveBudget;
  let made = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let now = 0;
  let ended = false;
  let won = false;
  let endedAt = 0;
  let lastReason: string | null = null;
  let swaps = 0;
  const completions: Completion[] = [];
  const misses: Miss[] = [];
  const log: RoundEvent[] = [];

  function pop(t: number, i: number, chainStep: number): Outcome {
    const stem = cells[i] as CrushTile;
    const candidates = goalByWord.get(norm(wordAt(cells, i))) as FrameSlot[];
    const slot = candidates.find((s) => s.infinitive === stem.infinitive) ?? (candidates[0] as FrameSlot);
    const form = formOf(slot.infinitive, slot.person);
    // Ruling F21: the streak goes up first (once per pop), then the multiplier is min(8, streak).
    const step = onCorrect(streak);
    streak = step.streak;
    bestStreak = Math.max(bestStreak, streak);
    const points = POP_POINTS * step.multiplier * chainStep;
    score += points;
    made++;
    const completion: Completion = {
      t,
      infinitive: slot.infinitive,
      person: slot.person,
      familyId: slot.familyId,
      form: form?.full ?? wordAt(cells, i),
      english: form?.english ?? "",
      points,
    };
    completions.push(completion);
    return { kind: "complete", completion };
  }

  /** A trap miss for the pair at stem index `i`, or null when no correct form can be named. */
  function trapMiss(t: number, i: number): Outcome | null {
    const stem = cells[i] as CrushTile;
    const ending = cells[i + 1] as CrushTile;
    const person = personOf(ending.label);
    const form = person ? formOf(stem.infinitive, person) : undefined;
    if (!person || !form) return null;
    const familyId: FamilyId | null = form.families.find((f) => families.includes(f)) ?? form.families[0] ?? null;
    const attempted = stem.label + ending.label;
    const why = familyId ? ` · ${reasonText(familyId, { infinitive: stem.infinitive, person, ending: form.ending })}` : "";
    const reason = `${attempted} ✗ → ${form.full}${why}`;
    const m: Miss = {
      t,
      infinitive: stem.infinitive,
      person,
      familyId,
      attempted,
      correct: form.full,
      english: form.english,
      reason,
    };
    misses.push(m);
    streak = 0;
    lastReason = reason;
    return { kind: "miss", miss: m };
  }

  function exchange(a: number, b: number): void {
    [cells[a], cells[b]] = [cells[b] as CrushTile, cells[a] as CrushTile];
  }

  function finish(at: number): void {
    ended = true;
    endedAt = at;
    now = Math.max(now, at);
  }

  return {
    view() {
      return {
        cells: cells.map((c) => ({ ...c })),
        goalCount: row.goalCount,
        made,
        movesLeft,
        score,
        streak,
        t: now,
        ended,
        won,
        lastReason,
      };
    },

    swap(t, a, b) {
      if (ended || !Number.isFinite(t) || t < now || t >= roundMs || !adjacent(a, b)) return [{ kind: "invalid" }];
      now = t;
      log.push({ t, kind: "swap", a, b });
      swaps++;
      exchange(a, b);
      const out: Outcome[] = [];

      // Pop every goal pair; refills that make new goal pairs pop in the next chain step.
      let popped = false;
      for (let chainStep = 1; chainStep <= MAX_CHAIN; chainStep++) {
        const pairs = goalPairs(cells);
        if (pairs.length === 0) break;
        popped = true;
        for (const i of pairs) out.push(pop(t, i, chainStep));
        for (const i of pairs) {
          cells[i] = { id: nextId++, ...draw(deckRng) };
          cells[i + 1] = { id: nextId++, ...draw(deckRng) };
        }
      }

      if (!popped) {
        // A moved cell in an invalid word is a trap: reverted, streak lost, no move spent.
        // A valid present form of any verb that is not a goal is neutral (move spent).
        for (const i of [a, b]) {
          for (const s of pairsTouching(cells, i)) {
            if (isValid(wordAt(cells, s))) continue;
            const miss = trapMiss(t, s);
            if (miss) {
              exchange(a, b);
              return [miss];
            }
          }
        }
      }

      movesLeft--;
      if (made >= row.goalCount) {
        won = true;
        finish(t);
        out.push({ kind: "end" });
      } else if (movesLeft <= 0) {
        finish(t);
        out.push({ kind: "end" });
      } else if (findPopSwapOn(cells) === null) {
        // No pop left on the board: a fresh board, score and streak unchanged.
        cells = generate(++generation);
      }
      return out;
    },

    advance(t) {
      if (ended || !Number.isFinite(t) || t < now) return [];
      now = Math.min(t, roundMs);
      if (t >= roundMs) {
        finish(roundMs);
        return [{ kind: "end" }];
      }
      return [];
    },

    end(t) {
      if (!ended) finish(Number.isFinite(t) ? Math.max(now, Math.min(t, roundMs)) : now);
      return {
        score,
        moves: row.moveBudget - movesLeft,
        picks: swaps,
        correct: completions.length,
        bestStreak,
        durationMs: endedAt,
        completions: [...completions],
        misses: [...misses],
        won,
      };
    },

    findPopSwap() {
      return ended ? null : findPopSwapOn(cells);
    },

    events() {
      return log.map((e) => ({ ...e }));
    },
  };
}
