// Built by TAC — 2026-10-20
// Verb Games: shared game rules (round lengths, scoring constants) and leaderboard scope keys.

import { FAMILIES, familyById } from "./families.ts";
import { frameSlots } from "./pool.ts";
import type { FamilyId, GameId, PatternData, RoundConfig } from "./types.ts";

/** Round length per game. Task 16's e2e fast-forwards `ROUND_MS[game] + 1000`. */
export const ROUND_MS: Record<GameId, number> = { bubble: 60_000, crush: 90_000 };

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
  if (config.family !== "mix") return [config.family];
  return FAMILIES.map((f) => f.id).filter((id) => frameSlots(data, [id], "family", config.source).length > 0);
}

/**
 * Board scope key. Bubble: "go-yo" | "mix". Crush: "L1:go-yo", "L2:mix", "L3:crossover".
 * A Crush round without a level has no board, so it throws instead of inventing a key.
 */
export function scopeKey(config: RoundConfig): string {
  if (config.game === "bubble") return familyShort(config.family);
  if (config.level === null) throw new Error("Crush scope needs a level");
  if (config.level === CROSSOVER_LEVEL) return `L${config.level}:crossover`;
  return `L${config.level}:${familyShort(config.family)}`;
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
