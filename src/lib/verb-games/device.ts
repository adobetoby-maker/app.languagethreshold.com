// Built by TAC — 2026-10-21
// Verb Games: per-device state (mastery, personal bests, ranks, unsent round queue, settings).
// Pure functions only; persistence lives in src/hooks/use-verb-device.ts.

import { FAMILIES, isFamilyId } from "./families.ts";
import { scopeKey } from "./rules.ts";
import type { FamilyId, PatternData, RoundLog, RoundResult, SourceFilter } from "./types.ts";

export type VerbStep = "see" | "hear" | "recall";

export interface VerbDeviceState {
  v: 1;
  /** Key "familyId|infinitive". */
  mastery: Record<string, { picks: number; correct: number }>;
  /** Key "game|scopeKey". */
  bests: Record<string, { score: number; moves: number; at: string }>;
  ranks: Record<string, { period: string; rank: number | null }>;
  queue: RoundLog[];
  settings: { source: "module" | "core" | "both"; listMode: boolean };
  unitSteps: Partial<Record<FamilyId, VerbStep[]>>;
}

export const EMPTY_VERB_DEVICE: VerbDeviceState = Object.freeze({
  v: 1,
  mastery: Object.freeze({}),
  bests: Object.freeze({}),
  ranks: Object.freeze({}),
  queue: Object.freeze([]),
  settings: Object.freeze({ source: "core", listMode: false }),
  unitSteps: Object.freeze({}),
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
  return { v: 1, mastery: {}, bests: {}, ranks: {}, queue: [], settings: { source: "core", listMode: false }, unitSteps: {} };
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
    const { source, listMode } = raw.settings;
    if ((SOURCES as readonly unknown[]).includes(source) && typeof listMode === "boolean") {
      out.settings = { source: source as VerbDeviceState["settings"]["source"], listMode };
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

/** First family not yet mastered, ordered by tier then FAMILIES order. Families with no verbs in the data are skipped. */
export function suggestedFamily(s: VerbDeviceState, data: PatternData): FamilyId {
  const ordered = FAMILIES.map((f, i) => ({ f, i })).sort((a, b) => a.f.tier - b.f.tier || a.i - b.i).map(({ f }) => f.id);
  const present = ordered.filter((id) => data.verbs.some((v) => v.forms.some((f) => f.families.includes(id))));
  const candidates = present.length > 0 ? present : ordered;
  for (const id of candidates) {
    const infs = data.verbs.filter((v) => v.forms.some((f) => f.families.includes(id))).map((v) => v.infinitive);
    if (!familyMastery(s, id, infs).mastered) return id;
  }
  return candidates[0];
}

export function markStep(s: VerbDeviceState, familyId: FamilyId, step: VerbStep): VerbDeviceState {
  const have = s.unitSteps[familyId] ?? [];
  if (have.includes(step)) return s;
  return { ...s, unitSteps: { ...s.unitSteps, [familyId]: [...have, step] } };
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
