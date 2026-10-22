// Built by TAC — 2026-10-20
// Verb Games: shared game rules (round lengths, scoring constants) and leaderboard scope keys.

import { FAMILIES, familyById } from "./families.ts";
import { frameSlots } from "./pool.ts";
import type { FrameSlot } from "./pool.ts";
import type { CrushLevel, FamilyId, GameId, PatternData, RoundConfig, RoundMode, SourceFilter, VerbEntry } from "./types.ts";

/** Round length per game. Task 16's e2e fast-forwards `ROUND_MS[game] + 1000`. */
export const ROUND_MS: Record<GameId, number> = { bubble: 60_000, crush: 90_000 };

// ---- Round modes ----------------------------------------------------------------------------

const TIMED: RoundMode = Object.freeze({ kind: "timed" }) as RoundMode;

/** Word counts offered for a count round, in picker order. */
export const COUNT_SIZES = [5, 10, 15] as const;

/**
 * Count and forever rounds have no clock, but they still stop here (30 minutes) so a replay can
 * never run without end: Bubble escapes at least one frame every 3.5 s, so this bounds the work.
 */
export const UNTIMED_MAX_MS = 30 * 60_000;

/** The most events an untimed (count or forever) log may carry; the server rejects more. */
export const MAX_UNTIMED_EVENTS = 2000;

/** The round's mode; an absent mode (every log from before modes existed) is timed. */
export function modeOf(config: Pick<RoundConfig, "mode">): RoundMode {
  return config.mode ?? TIMED;
}

export function isTimed(config: Pick<RoundConfig, "mode">): boolean {
  return modeOf(config).kind === "timed";
}

/** When the round stops at the latest: the game clock when timed, else the untimed cap. */
export function roundLimitMs(config: Pick<RoundConfig, "game" | "mode">): number {
  return isTimed(config) ? ROUND_MS[config.game] : UNTIMED_MAX_MS;
}

/** "" for timed, "count10", "forever". Used in scope keys and the `vmode` URL param. */
export function modeKey(mode: RoundMode): string {
  return mode.kind === "timed" ? "" : mode.kind === "count" ? `count${mode.n}` : "forever";
}

/** The inverse of `modeKey` (plus "timed"); null for anything else. */
export function modeFromKey(key: string | null | undefined): RoundMode | null {
  if (key === "timed") return TIMED;
  if (key === "forever") return { kind: "forever" };
  const n = /^count(5|10|15)$/.exec(key ?? "")?.[1];
  return n ? { kind: "count", n: Number(n) as 5 | 10 | 15 } : null;
}

/** True iff `value` is a well-formed RoundMode (untrusted JSON safe). */
export function isRoundMode(value: unknown): value is RoundMode {
  if (typeof value !== "object" || value === null) return false;
  const m = value as { kind?: unknown; n?: unknown };
  if (m.kind === "timed" || m.kind === "forever") return true;
  return m.kind === "count" && (COUNT_SIZES as readonly unknown[]).includes(m.n);
}

/** The goal list size and starting moves of a Crush round: count scales the moves by N / goalCount, rounded up. */
export function crushTargets(level: CrushLevel, mode: RoundMode): { goalCount: number; moveBudget: number } {
  if (mode.kind !== "count") return { goalCount: level.goalCount, moveBudget: level.moveBudget };
  return { goalCount: mode.n, moveBudget: Math.ceil((level.moveBudget * mode.n) / level.goalCount) };
}

// ---- Pattern picks ------------------------------------------------------------------------

/** What a round draws from: "mix", or one or more families. */
export type FamilyPick = "mix" | FamilyId[];

/** A family, "mix", or a list of families, as the level checks accept it. */
export type FamilyChoice = FamilyId | "mix" | readonly FamilyId[];

/** A list of families in FAMILIES order without repeats (unknown ids dropped). */
export function orderFamilies(ids: readonly FamilyId[]): FamilyId[] {
  const want = new Set(ids);
  return FAMILIES.map((f) => f.id).filter((id) => want.has(id));
}

/** The round's pick: `families` when set (one or more), else `family` ("mix" or one family). */
export function familyPick(config: { family: FamilyId | "mix"; families?: readonly FamilyId[] }): FamilyPick {
  if (Array.isArray(config.families) && config.families.length > 0) return orderFamilies(config.families);
  return config.family === "mix" ? "mix" : [config.family];
}

function choicePick(choice: FamilyChoice): FamilyPick {
  if (choice === "mix") return "mix";
  return typeof choice === "string" ? [choice] : orderFamilies(choice);
}

/** True for a pick of two or more families (never ranked). */
export function isMultiPick(config: { family: FamilyId | "mix"; families?: readonly FamilyId[] }): boolean {
  const pick = familyPick(config);
  return pick !== "mix" && pick.length > 1;
}

/** How long the reason band stays up after a miss. Play never pauses while it shows. */
export const REASON_MS = 1200;

/** Bubble: the sentence prompt replaces the bare person prompt from this point in the round. */
export const SENTENCE_AFTER_MS = 30_000;

/** Bubble: base points for a correct pick, and the most the speed bonus can add. */
export const CORRECT_POINTS = 100;
export const SPEED_BONUS_MAX = 20;

export const MAX_MULTIPLIER = 8;

/** Streak multiplier: min(8, streak). A streak of 0 never scores, so callers use `onCorrect`. */
export function streakMultiplier(streak: number): number {
  return Math.min(MAX_MULTIPLIER, Math.max(0, Math.floor(streak)));
}

/**
 * Scoring order (ruling F21, shared by Bubble and Crush): on a correct pick the streak is
 * incremented FIRST, and only then is the multiplier read, so the first correct answer scores x1.
 * A miss resets the streak to 0. Crush increments once per pop (not per swap); its `chainStep`
 * counts cascade passes (1, 2, ...) and multiplies on top of this.
 */
export function onCorrect(streak: number): { streak: number; multiplier: number } {
  const next = streak + 1;
  return { streak: next, multiplier: streakMultiplier(next) };
}

/** Bubble lifetime: 6000 ms, shortened 500 ms every 10 s, never under 3500 ms. */
export function bubbleLifetimeMs(t: number): number {
  return Math.max(3500, 6000 - 500 * Math.floor(t / 10_000));
}

/** Bubbles on screen: 4, then 5 from 20 s, then 6 from 40 s. */
export function bubbleCount(t: number): number {
  return t < 20_000 ? 4 : t < 40_000 ? 5 : 6;
}

const FAMILY_PREFIX = "es.present.";

function familyShort(family: FamilyId | "mix"): string {
  return family === "mix" ? "mix" : family.slice(FAMILY_PREFIX.length);
}

/** "mix", "go-yo", or "ar+go-yo" for a multi pick. */
function pickShort(config: RoundConfig): string {
  const pick = familyPick(config);
  return pick === "mix" ? "mix" : pick.map(familyShort).join("+");
}

/** Crush level 3 is the fixed "crossover" level; its families come from the level row. */
const CROSSOVER_LEVEL = 3;

/**
 * Families a round draws from. Crush level 3 uses its own fixed list; otherwise `mix` is every
 * family that has at least one frame in the round's source, and a single family is itself.
 */
export function roundFamilies(config: RoundConfig, data: PatternData): FamilyId[] {
  if (config.game === "crush" && config.level !== null) {
    const row = data.crushLevels.find((l) => l.level === config.level);
    if (row && Array.isArray(row.families)) return [...row.families];
  }
  const pick = familyPick(config);
  if (pick !== "mix") return pick;
  return FAMILIES.map((f) => f.id).filter((id) => frameSlots(data, [id], "family", config.source).length > 0);
}

/**
 * Board scope key. Bubble: "go-yo" | "mix". Crush: "L1:go-yo", "L2:mix", "L3:crossover".
 * A multi pick joins its families ("ar+go-yo"); a count or forever round appends its mode
 * ("L1:go-yo|count10", "go-yo|forever"). Timed keys are exactly what they were before modes.
 * A Crush round without a level has no board, so it throws instead of inventing a key.
 */
export function scopeKey(config: RoundConfig): string {
  const mode = modeKey(modeOf(config));
  const suffix = mode ? `|${mode}` : "";
  if (config.game === "bubble") return `${pickShort(config)}${suffix}`;
  if (config.level === null) throw new Error("Crush scope needs a level");
  if (config.level === CROSSOVER_LEVEL) return `L${config.level}:crossover${suffix}`;
  return `L${config.level}:${pickShort(config)}${suffix}`;
}

export interface BoardScope {
  key: string;
  label: string;
}

const hasFamily = (data: PatternData, id: FamilyId): boolean =>
  data.verbs.some((v) => v.forms.some((f) => f.families.includes(id)));

/**
 * Every board scope key for a game, for the leaderboard picker. Bubble: one per family present
 * in the data (FAMILIES order), then "mix". Crush: for each level in `data.crushLevels`, one per
 * family then "mix" when the level lets the player pick; the fixed crossover level (3) is one scope.
 * Each key is produced by `scopeKey`, so the list can never drift from it.
 */
export function boardScopes(game: GameId, data: PatternData): BoardScope[] {
  const families = FAMILIES.map((f) => f.id).filter((id) => hasFamily(data, id));
  const base = { game, source: { kind: "core" } as const, seed: 0, listMode: false, reducedMotion: false };
  if (game === "bubble") {
    return [
      ...families.map((id) => ({
        key: scopeKey({ ...base, family: id, level: null }),
        label: familyById(id).label,
      })),
      { key: scopeKey({ ...base, family: "mix", level: null }), label: "All patterns" },
    ];
  }
  const scopes: BoardScope[] = [];
  for (const row of data.crushLevels) {
    if (row.level === CROSSOVER_LEVEL) {
      scopes.push({ key: scopeKey({ ...base, family: "mix", level: row.level }), label: `Level ${row.level} · Crossover` });
      continue;
    }
    for (const id of families) {
      scopes.push({
        key: scopeKey({ ...base, family: id, level: row.level }),
        label: `Level ${row.level} · ${familyById(id).label}`,
      });
    }
    scopes.push({ key: scopeKey({ ...base, family: "mix", level: row.level }), label: `Level ${row.level} · All patterns` });
  }
  return scopes;
}

// ---- Verb Crush levels (Task 8) -------------------------------------------------------------

const VERB_INDEX = new WeakMap<PatternData, Map<string, VerbEntry>>();

/**
 * Verbs by infinitive, built once per PatternData object (compiled data is never mutated after
 * load, so the cache stays exact). Replaces linear `data.verbs.find` scans in hot paths.
 */
export function verbIndex(data: PatternData): Map<string, VerbEntry> {
  let index = VERB_INDEX.get(data);
  if (!index) {
    index = new Map(data.verbs.map((v) => [v.infinitive, v]));
    VERB_INDEX.set(data, index);
  }
  return index;
}

/** Families a Crush level draws from: its fixed list, else the picked families (or mix). */
function crushFamilies(data: PatternData, level: CrushLevel, family: FamilyChoice, source: SourceFilter): FamilyId[] {
  if (Array.isArray(level.families)) return [...level.families];
  const pick = choicePick(family);
  const config: RoundConfig = { game: "crush", family: "mix", level: null, source, seed: 0, listMode: false, reducedMotion: false };
  if (pick !== "mix") config.families = pick;
  return roundFamilies(config, data);
}

/**
 * The goal slots of a Crush level: forms of the source's verbs in the level's families and
 * persons ("family" = each family's `appliesTo`). Forms the compiler could not split into
 * stem + ending (ending "") cannot be built from tiles, so they are never goals.
 * Shared by `levelAvailable` and the Crush engine so the two can never disagree.
 */
export function crushGoalSlots(
  data: PatternData,
  level: CrushLevel,
  family: FamilyChoice,
  source: SourceFilter,
): FrameSlot[] {
  const verbs = verbIndex(data);
  return frameSlots(data, crushFamilies(data, level, family, source), level.persons, source).filter((slot) => {
    const verb = verbs.get(slot.infinitive);
    const form = verb?.forms.find((f) => f.person === slot.person);
    return form !== undefined && form.ending !== "" && form.stem !== "";
  });
}

/** Distinct goal forms a level needs before it can be offered. */
const MIN_GOAL_FORMS = 3;

/**
 * The family choice may be a list (a multi pick): the check then runs on the union pool.
 * True iff the level's persons fit the round's families (`"family"`, or every listed person is
 * in some round family's `appliesTo`) and the level has at least 3 distinct goal forms.
 */
export function levelAvailable(
  data: PatternData,
  level: CrushLevel,
  family: FamilyChoice,
  source: SourceFilter,
): boolean {
  const families = crushFamilies(data, level, family, source);
  if (families.length === 0) return false;
  if (level.persons !== "family") {
    const persons = level.persons;
    const covered = persons.every((p) => families.some((id) => familyById(id).appliesTo.includes(p)));
    if (!covered) return false;
  }
  const forms = new Set<string>();
  const verbs = verbIndex(data);
  for (const slot of crushGoalSlots(data, level, family, source)) {
    const form = verbs.get(slot.infinitive)?.forms.find((f) => f.person === slot.person);
    if (form) forms.add(form.full.normalize("NFC").toLowerCase());
  }
  return forms.size >= MIN_GOAL_FORMS;
}
