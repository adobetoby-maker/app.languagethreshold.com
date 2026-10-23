// Built by TAC — 2026-10-21
// Verb Games: per-device state (mastery, personal bests, ranks, unsent round queue, settings).
// Pure functions only; persistence lives in src/hooks/use-verb-device.ts.

import { FAMILIES, isFamilyId } from "./families.ts";
import { isRoundMode, scopeKey } from "./rules.ts";
import { SERIES_STEPS, isSeriesStep, type SeriesStep } from "./series.ts";
import type { FamilyId, PatternData, RoundLog, RoundMode, RoundResult, SourceFilter } from "./types.ts";

export type VerbStep = "see" | "hear" | "recall";

/** One family's pattern series: steps passed (always an in-order prefix), best score per step. */
export interface SeriesProgress {
  passed: SeriesStep[];
  /**
   * The best run's score per step: right answers (Pick, Listen, Type), cards rated Good or Easy
   * (Cards), clean pairs (Match: pairs never part of a wrong attempt).
   */
  best: Partial<Record<SeriesStep, number>>;
  /** Match only: the best run's board size and its real mistake count (which can exceed the pairs). */
  match?: { pairs: number; mistakes: number };
  /** When Type it was first passed: the family is mastered. */
  masteredAt?: string;
}

export interface VerbDeviceState {
  v: 1;
  /** Key "familyId|infinitive". */
  mastery: Record<string, { picks: number; correct: number }>;
  /** Key "game|scopeKey": timed "bubble|go-yo", or with a mode "bubble|go-yo|forever", "crush|L1:go-yo|count10". */
  bests: Record<string, { score: number; moves: number; at: string }>;
  ranks: Record<string, { period: string; rank: number | null }>;
  queue: RoundLog[];
  /** `mode` is the picker's last choice; absent means timed. */
  settings: { source: "module" | "core" | "both"; listMode: boolean; mode?: RoundMode };
  unitSteps: Partial<Record<FamilyId, VerbStep[]>>;
  /** Pattern series progress per family. Absent in blobs saved before the series; read as {}. */
  series: Partial<Record<FamilyId, SeriesProgress>>;
}

export const EMPTY_VERB_DEVICE: VerbDeviceState = Object.freeze({
  v: 1,
  mastery: Object.freeze({}),
  bests: Object.freeze({}),
  ranks: Object.freeze({}),
  queue: Object.freeze([]),
  settings: Object.freeze({ source: "core", listMode: false }),
  unitSteps: Object.freeze({}),
  series: Object.freeze({}),
}) as unknown as VerbDeviceState;

export const MASTERY = { minPicks: 30, accuracy: 0.85 } as const;
export const MAX_QUEUE = 50;

const STEPS: readonly VerbStep[] = ["see", "hear", "recall"];
const SOURCES = ["module", "core", "both"] as const;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Keys that would reach Object.prototype through a plain-object write (JSON.parse keeps "__proto__" as an own key). */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
/** Own entries of a stored map, without prototype-reaching keys. */
const safeEntries = (r: Record<string, unknown>) => Object.entries(r).filter(([k]) => !UNSAFE_KEYS.has(k));

function fresh(): VerbDeviceState {
  return { v: 1, mastery: {}, bests: {}, ranks: {}, queue: [], settings: { source: "core", listMode: false }, unitSteps: {}, series: {} };
}

/** Anything foreign, outdated or corrupt becomes empty; valid parts of a v1 blob are kept. */
export function readVerbDevice(raw: unknown): VerbDeviceState {
  const out = fresh();
  if (!isRecord(raw) || raw.v !== 1) return out;
  if (isRecord(raw.mastery)) {
    for (const [k, m] of safeEntries(raw.mastery)) {
      if (isRecord(m) && isCount(m.picks) && isCount(m.correct) && m.correct <= m.picks) out.mastery[k] = { picks: m.picks, correct: m.correct };
    }
  }
  if (isRecord(raw.bests)) {
    for (const [k, b] of safeEntries(raw.bests)) {
      if (isRecord(b) && isNum(b.score) && isNum(b.moves) && typeof b.at === "string") out.bests[k] = { score: b.score, moves: b.moves, at: b.at };
    }
  }
  if (isRecord(raw.ranks)) {
    for (const [k, r] of safeEntries(raw.ranks)) {
      if (isRecord(r) && typeof r.period === "string" && (r.rank === null || isCount(r.rank))) out.ranks[k] = { period: r.period, rank: r.rank };
    }
  }
  if (Array.isArray(raw.queue)) {
    const logs = raw.queue.filter((l): l is RoundLog => isRecord(l) && l.v === 1 && typeof l.clientRoundId === "string" && isRecord(l.config) && Array.isArray(l.events));
    out.queue = logs.slice(-MAX_QUEUE);
  }
  if (isRecord(raw.settings)) {
    const { source, listMode, mode } = raw.settings;
    if ((SOURCES as readonly unknown[]).includes(source) && typeof listMode === "boolean") {
      out.settings = { source: source as VerbDeviceState["settings"]["source"], listMode };
      // A bad remembered mode is dropped (timed), never a reason to lose the other settings.
      if (isRoundMode(mode)) out.settings.mode = mode.kind === "count" ? { kind: "count", n: mode.n } : { kind: mode.kind };
    }
  }
  if (isRecord(raw.unitSteps)) {
    for (const [k, steps] of Object.entries(raw.unitSteps)) {
      if (!isFamilyId(k) || !Array.isArray(steps)) continue;
      const kept = steps.filter((s): s is VerbStep => (STEPS as readonly unknown[]).includes(s));
      const unique = [...new Set(kept)];
      if (unique.length > 0) out.unitSteps[k] = unique;
    }
  }
  if (isRecord(raw.series)) {
    for (const [k, p] of safeEntries(raw.series)) {
      if (!isFamilyId(k) || !isRecord(p)) continue;
      const stored = Array.isArray(p.passed) ? p.passed : [];
      // Only the in-order prefix counts: a step is passed only when every step before it is.
      const passed: SeriesStep[] = [];
      for (const step of SERIES_STEPS) {
        if (!stored.includes(step)) break;
        passed.push(step);
      }
      const best: Partial<Record<SeriesStep, number>> = {};
      if (isRecord(p.best)) {
        for (const [step, n] of safeEntries(p.best)) if (isSeriesStep(step) && isCount(n)) best[step] = n;
      }
      const progress: SeriesProgress = { passed, best };
      if (isRecord(p.match) && isCount(p.match.pairs) && p.match.pairs > 0 && isCount(p.match.mistakes)) {
        progress.match = { pairs: p.match.pairs, mistakes: p.match.mistakes };
      }
      if (passed.includes("type") && typeof p.masteredAt === "string") progress.masteredAt = p.masteredAt;
      out.series[k] = progress;
    }
  }
  return out;
}

/**
 * Stores the round's best for its scope (higher score, or equal score in fewer moves) and optionally
 * queues the log. List-mode rounds never set a best (they are never ranked) but are still queued.
 * Mastery is recorded separately by `recordPicks`.
 */
export function recordRound(s: VerbDeviceState, log: RoundLog, result: RoundResult, opts: { queue: boolean }): VerbDeviceState {
  let bests = s.bests;
  let scope: string | null = null;
  try {
    scope = scopeKey(log.config);
  } catch {
    scope = null; // a Crush round without a level has no board and no best
  }
  if (scope !== null && !log.config.listMode) {
    const key = `${log.config.game}|${scope}`;
    const prev = s.bests[key];
    if (!prev || result.score > prev.score || (result.score === prev.score && result.moves < prev.moves)) {
      bests = { ...s.bests, [key]: { score: result.score, moves: result.moves, at: log.endedAt } };
    }
  }
  const queue = opts.queue ? [...s.queue.filter((l) => l.clientRoundId !== log.clientRoundId), log].slice(-MAX_QUEUE) : s.queue;
  return { ...s, bests, queue };
}

export function recordPicks(
  s: VerbDeviceState,
  picks: { familyId: FamilyId; infinitive: string; correct: boolean }[],
): VerbDeviceState {
  if (picks.length === 0) return s;
  const mastery = { ...s.mastery };
  for (const p of picks) {
    const key = `${p.familyId}|${p.infinitive}`;
    const prev = mastery[key] ?? { picks: 0, correct: 0 };
    mastery[key] = { picks: prev.picks + 1, correct: prev.correct + (p.correct ? 1 : 0) };
  }
  return { ...s, mastery };
}

const isMastered = (picks: number, correct: number) => picks >= MASTERY.minPicks && correct / picks >= MASTERY.accuracy;

export function familyMastery(
  s: VerbDeviceState,
  familyId: FamilyId,
  infinitives: readonly string[],
): { picks: number; correct: number; mastered: boolean; verbsMastered: number } {
  let picks = 0;
  let correct = 0;
  let verbsMastered = 0;
  for (const inf of infinitives) {
    const m = s.mastery[`${familyId}|${inf}`];
    if (!m) continue;
    picks += m.picks;
    correct += m.correct;
    if (isMastered(m.picks, m.correct)) verbsMastered += 1;
  }
  return { picks, correct, mastered: isMastered(picks, correct), verbsMastered };
}

/**
 * First family not yet mastered, ordered by tier then FAMILIES order. A family counts as mastered by
 * its game picks or by passing its pattern series. Families with no verbs in the data are skipped.
 */
export function suggestedFamily(s: VerbDeviceState, data: PatternData): FamilyId {
  const ordered = FAMILIES.map((f, i) => ({ f, i })).sort((a, b) => a.f.tier - b.f.tier || a.i - b.i).map(({ f }) => f.id);
  const present = ordered.filter((id) => data.verbs.some((v) => v.forms.some((f) => f.families.includes(id))));
  const candidates = present.length > 0 ? present : ordered;
  for (const id of candidates) {
    const infs = data.verbs.filter((v) => v.forms.some((f) => f.families.includes(id))).map((v) => v.infinitive);
    if (!familyMastery(s, id, infs).mastered && !seriesMastered(s, id)) return id;
  }
  return candidates[0];
}

export function markStep(s: VerbDeviceState, familyId: FamilyId, step: VerbStep): VerbDeviceState {
  const have = s.unitSteps[familyId] ?? [];
  if (have.includes(step)) return s;
  return { ...s, unitSteps: { ...s.unitSteps, [familyId]: [...have, step] } };
}

const NO_PROGRESS: SeriesProgress = Object.freeze({ passed: Object.freeze([]), best: Object.freeze({}) }) as unknown as SeriesProgress;

export function seriesProgress(s: VerbDeviceState, familyId: FamilyId): SeriesProgress {
  return s.series?.[familyId] ?? NO_PROGRESS;
}

/** Step 1 is always open; every later step opens when the one before it has been passed. */
export function stepUnlocked(s: VerbDeviceState, familyId: FamilyId, step: SeriesStep): boolean {
  const i = SERIES_STEPS.indexOf(step);
  return i === 0 || seriesProgress(s, familyId).passed.includes(SERIES_STEPS[i - 1] as SeriesStep);
}

/** Passing step 5 (Type it) masters the family. */
export function seriesMastered(s: VerbDeviceState, familyId: FamilyId): boolean {
  return seriesProgress(s, familyId).passed.includes("type");
}

/**
 * Records one finished step run: keeps the best score and, on a pass, adds the step. A locked step
 * returns the same state (steps unlock in order). Passing Type it sets `masteredAt` once. A Match run
 * also passes its board size and mistakes; the best run's two numbers are kept (more clean pairs, or as many
 * with fewer mistakes).
 */
export function recordSeriesStep(
  s: VerbDeviceState,
  familyId: FamilyId,
  step: SeriesStep,
  run: { score: number; passed: boolean; at: string; pairs?: number; mistakes?: number },
): VerbDeviceState {
  if (!stepUnlocked(s, familyId, step)) return s;
  const prev = seriesProgress(s, familyId);
  const score = Math.max(0, Math.floor(run.score));
  const prevBest = prev.best[step] ?? -1;
  const best = prevBest < score ? { ...prev.best, [step]: score } : prev.best;
  const passed = run.passed && !prev.passed.includes(step) ? [...prev.passed, step] : prev.passed;
  let match = prev.match;
  if (step === "match" && isCount(run.pairs) && run.pairs > 0 && isCount(run.mistakes)) {
    const better = prevBest < score || (prevBest === score && (!prev.match || run.mistakes < prev.match.mistakes));
    if (better) match = { pairs: run.pairs, mistakes: run.mistakes };
  }
  if (best === prev.best && passed === prev.passed && match === prev.match) return s;
  const next: SeriesProgress = { passed: [...passed], best: { ...best } };
  if (match) next.match = { ...match };
  const masteredAt = prev.masteredAt ?? (passed.includes("type") ? run.at : undefined);
  if (masteredAt !== undefined) next.masteredAt = masteredAt;
  return { ...s, series: { ...s.series, [familyId]: next } };
}

/** Device `settings.source` plus a module id as a round SourceFilter; module/both without a module id fall back to core. */
export function sourceFilterFor(
  settings: Pick<VerbDeviceState["settings"], "source">,
  moduleId: string | null | undefined,
): SourceFilter {
  if (!moduleId) return { kind: "core" };
  if (settings.source === "module") return { kind: "module", moduleId };
  if (settings.source === "both") return { kind: "both", moduleId };
  return { kind: "core" };
}

// ---- Hydration gate (pure, so the hook's ordering rules are testable without React) ----------

export interface DeviceBox {
  state: VerbDeviceState;
  hydrated: boolean;
}

/** Before the store has been read: empty state, updates ignored. */
export const UNHYDRATED_DEVICE: DeviceBox = Object.freeze({ state: EMPTY_VERB_DEVICE, hydrated: false });

export function hydrateDeviceBox(raw: unknown): DeviceBox {
  return { state: readVerbDevice(raw), hydrated: true };
}

/** An update before hydration returns the same box, so an empty state can never overwrite saved data. */
export function updateDeviceBox(box: DeviceBox, fn: (s: VerbDeviceState) => VerbDeviceState): DeviceBox {
  if (!box.hydrated) return box;
  const next = fn(box.state);
  return next === box.state ? box : { state: next, hydrated: true };
}
