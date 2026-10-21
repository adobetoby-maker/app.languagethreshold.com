// Built by TAC — 2026-10-21
// Verb Games: server-side replay scoring. The client never sends a score: the server rebuilds
// the round from the log's config and seed, replays the logged inputs through the same engines
// the client plays on, and ignores any number the client reports. Also hosts `buildRoundLog`,
// the one place a finished round becomes a `RoundLog`, so both screens build it identically.

import { createBubbleRound } from "./bubble.ts";
import type { BubbleRound } from "./bubble.ts";
import { createCrushRound } from "./crush.ts";
import type { CrushRound } from "./crush.ts";
import { FAMILIES } from "./families.ts";
import { frameSlots } from "./pool.ts";
import { ROUND_MS, levelAvailable, roundFamilies } from "./rules.ts";
import type {
  FamilyId,
  GameId,
  PatternData,
  RoundConfig,
  RoundEvent,
  RoundLog,
  RoundResult,
  SourceFilter,
} from "./types.ts";

export type HardReason =
  | "out-of-order"
  | "after-end"
  | "invalid-event"
  | "too-many-events"
  | "unknown-scope"
  | "replay-error";

export type Verdict =
  | { ok: true; result: RoundResult; ranked: boolean; softReasons: string[] }
  | { ok: false; stale: true }
  /** `detail` is set only for `replay-error` (the engine exception message), for the caller to log. */
  | { ok: false; hard: true; reason: HardReason; detail?: string };

/** Soft reasons: the round scores and is stored, but never ranks. */
export type SoftReason = "list-mode" | "fast-picks" | "abandoned" | "empty" | "module-pool";

/** A gap between consecutive events shorter than this is a machine-speed input. */
const FAST_GAP_MS = 250;
/** This many fast gaps in one round make it unranked. */
const FAST_GAPS_TO_FLAG = 3;
/** Slack past the round length before an event is out of range; picks past the end are invalid anyway. */
const AFTER_END_SLACK_MS = 1000;
/** The fastest honest input rate: one event per 100 ms. */
const MIN_EVENT_GAP_MS = 100;

const hard = (reason: HardReason): Verdict => ({ ok: false, hard: true, reason });

/** An exception from the engines or the data is a replay fault, never a verdict on the log. */
const replayError = (error: unknown): Verdict => ({
  ok: false,
  hard: true,
  reason: "replay-error",
  detail: error instanceof Error ? error.message : String(error),
});

/**
 * Builds the log of a finished round. `endedAt` is `now` (default: the current time) as an ISO
 * string; `dataHash` pins the pattern data the round was played on. Config and events are
 * copied, so later changes to the caller's objects never reach the log. `quitAtMs` (round-relative
 * ms) is set only when the player leaves before the timer; it is left off the log otherwise.
 */
export function buildRoundLog(
  config: RoundConfig,
  events: readonly RoundEvent[],
  data: PatternData,
  now: number | Date = Date.now(),
  quitAtMs?: number,
): RoundLog {
  return {
    v: 1,
    clientRoundId: crypto.randomUUID(),
    dataHash: data.dataHash,
    config: structuredClone(config),
    endedAt: new Date(now).toISOString(),
    events: events.map((e) => ({ ...e })),
    ...(quitAtMs === undefined ? {} : { quitAtMs }),
  };
}

const FAMILY_IDS: ReadonlySet<string> = new Set(FAMILIES.map((f) => f.id));

const MODULE_ID_PATTERN = /^[a-z0-9-]+$/;
const MODULE_ID_MAX = 64;

const MODULE_IDS = new WeakMap<PatternData, Set<string>>();

/** Module ids that appear in the data's verb sources, built once per PatternData object. */
function moduleIds(data: PatternData): Set<string> {
  let ids = MODULE_IDS.get(data);
  if (!ids) {
    ids = new Set();
    for (const verb of data.verbs) {
      for (const source of verb.sources) if (source.kind === "module") ids.add(source.moduleId);
    }
    MODULE_IDS.set(data, ids);
  }
  return ids;
}

/** A source the data can serve: core, or a module/both whose module id really exists in the data. */
function validSource(data: PatternData, source: unknown): source is SourceFilter {
  if (typeof source !== "object" || source === null) return false;
  const s = source as { kind?: unknown; moduleId?: unknown };
  if (s.kind === "core") return true;
  if (s.kind !== "module" && s.kind !== "both") return false;
  const id = s.moduleId;
  return (
    typeof id === "string" &&
    id.length <= MODULE_ID_MAX &&
    MODULE_ID_PATTERN.test(id) &&
    moduleIds(data).has(id)
  );
}

/** True iff the config names a real game, family, level and source that the data can play. */
function validScope(data: PatternData, config: unknown): config is RoundConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Partial<RoundConfig>;
  if (c.game !== "bubble" && c.game !== "crush") return false;
  if (c.family !== "mix" && !(typeof c.family === "string" && FAMILY_IDS.has(c.family))) return false;
  if (!validSource(data, c.source)) return false;
  if (typeof c.seed !== "number" || !Number.isFinite(c.seed)) return false;
  if (typeof c.listMode !== "boolean" || typeof c.reducedMotion !== "boolean") return false;
  if (c.game === "bubble") {
    // Bubble needs at least one frame in the family and source, else the round cannot be built.
    return c.level === null && frameSlots(data, roundFamilies(c as RoundConfig, data), "family", c.source).length > 0;
  }
  // A Crush log must carry its level, and the level must be playable with this family and source.
  const row = data.crushLevels.find((l) => l.level === c.level);
  return row !== undefined && levelAvailable(data, row, c.family as FamilyId | "mix", c.source);
}

/** Replays one event on a round; false when the engine rejects it (or the event is malformed). */
function replayEvent(game: GameId, round: BubbleRound | CrushRound, event: RoundEvent): boolean {
  if (game === "bubble") {
    if (event.kind !== "pick") return false;
    const r = round as BubbleRound;
    r.advance(event.t);
    return !r.pick(event.t, event.frame, event.piece).some((o) => o.kind === "invalid");
  }
  if (event.kind !== "swap") return false;
  const r = round as CrushRound;
  r.advance(event.t);
  return !r.swap(event.t, event.a, event.b).some((o) => o.kind === "invalid");
}

function wellFormed(event: unknown): event is RoundEvent {
  if (typeof event !== "object" || event === null) return false;
  const e = event as Record<string, unknown>;
  if (typeof e.t !== "number" || !Number.isFinite(e.t)) return false;
  if (e.kind === "pick") return Number.isInteger(e.frame) && Number.isInteger(e.piece);
  if (e.kind === "swap") return Number.isInteger(e.a) && Number.isInteger(e.b);
  return false;
}

/**
 * Judges a round log against the current pattern data. Order: envelope, stale data (nothing is replayed),
 * unknown scope, event count, event order and range, then the replay itself. The server ends the
 * replay at the full round length; the log holds inputs only. The verdict's numbers always come
 * from the replay, never from the client.
 */
export function scoreRound(data: PatternData, log: RoundLog): Verdict {
  // Envelope first: the log is untrusted JSON, so nothing below may throw on its shape.
  if (typeof log !== "object" || log === null || log.v !== 1 || !Array.isArray(log.events)) {
    return hard("invalid-event");
  }
  if (log.dataHash !== data.dataHash) return { ok: false, stale: true };
  try {
    if (!validScope(data, log.config)) return hard("unknown-scope");
  } catch (error) {
    return replayError(error);
  }
  const config = log.config;
  const roundMs = ROUND_MS[config.game];
  if (log.events.length > roundMs / MIN_EVENT_GAP_MS) return hard("too-many-events");

  const events = log.events as unknown[];
  let prev = -Infinity;
  for (const event of events) {
    if (!wellFormed(event)) return hard("invalid-event");
    if (event.t < prev) return hard("out-of-order");
    if (event.t > roundMs + AFTER_END_SLACK_MS) return hard("after-end");
    prev = event.t;
  }
  // quitAtMs is the explicit abandon signal: a finite time, never before the last accepted event.
  const quitAtMs: unknown = log.quitAtMs;
  if (quitAtMs !== undefined) {
    if (typeof quitAtMs !== "number" || !Number.isFinite(quitAtMs) || quitAtMs < Math.max(0, prev)) {
      return hard("invalid-event");
    }
  }

  let result: RoundResult;
  try {
    const round = config.game === "bubble" ? createBubbleRound(data, config) : createCrushRound(data, config);
    for (const event of events as RoundEvent[]) {
      if (!replayEvent(config.game, round, event)) return hard("invalid-event");
    }
    result = round.end(roundMs);
  } catch (error) {
    // The scope was valid, so an engine exception is a replay fault. Hand it to the caller to log.
    return replayError(error);
  }

  const soft: SoftReason[] = [];
  if (config.listMode) soft.push("list-mode");
  let fast = 0;
  for (let i = 1; i < events.length; i++) {
    if ((events[i] as RoundEvent).t - (events[i - 1] as RoundEvent).t < FAST_GAP_MS) fast++;
  }
  if (fast >= FAST_GAPS_TO_FLAG) soft.push("fast-picks");
  // Abandoned = the player left before the timer (explicit quitAtMs). A Crush round that ended on
  // its own (goal met or no moves left) is never abandoned.
  if (typeof quitAtMs === "number" && quitAtMs < roundMs && result.durationMs >= roundMs) soft.push("abandoned");
  // A round with no inputs, or one that scored nothing, never reaches a board.
  if (events.length === 0 || result.score === 0) soft.push("empty");
  // Boards are one per scope key across the app; a module-only pool is a different difficulty.
  if (config.source.kind === "module") soft.push("module-pool");
  return { ok: true, result, ranked: soft.length === 0, softReasons: soft };
}
