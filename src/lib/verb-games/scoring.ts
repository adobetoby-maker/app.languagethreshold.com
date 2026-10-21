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
import { ROUND_MS, levelAvailable } from "./rules.ts";
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

export type HardReason = "out-of-order" | "after-end" | "invalid-event" | "too-many-events" | "unknown-scope";

export type Verdict =
  | { ok: true; result: RoundResult; ranked: boolean; softReasons: string[] }
  | { ok: false; stale: true }
  | { ok: false; hard: true; reason: HardReason };

/** Soft reasons: the round scores and is stored, but never ranks. */
export type SoftReason = "list-mode" | "fast-picks" | "abandoned";

/** A gap between consecutive events shorter than this is a machine-speed input. */
const FAST_GAP_MS = 250;
/** This many fast gaps in one round make it unranked. */
const FAST_GAPS_TO_FLAG = 3;
/** A round that did not end on its own and went quiet this long before the timer is abandoned. */
const ABANDON_GAP_MS = 15_000;
/** Slack past the round length before an event is out of range; picks past the end are invalid anyway. */
const AFTER_END_SLACK_MS = 1000;
/** The fastest honest input rate: one event per 100 ms. */
const MIN_EVENT_GAP_MS = 100;

const hard = (reason: HardReason): Verdict => ({ ok: false, hard: true, reason });

/**
 * Builds the log of a finished round. `endedAt` is `now` (default: the current time) as an ISO
 * string; `dataHash` pins the pattern data the round was played on. Config and events are
 * copied, so later changes to the caller's objects never reach the log.
 */
export function buildRoundLog(
  config: RoundConfig,
  events: readonly RoundEvent[],
  data: PatternData,
  now: number | Date = Date.now(),
): RoundLog {
  return {
    v: 1,
    clientRoundId: crypto.randomUUID(),
    dataHash: data.dataHash,
    config: structuredClone(config),
    endedAt: new Date(now).toISOString(),
    events: events.map((e) => ({ ...e })),
  };
}

const FAMILY_IDS: ReadonlySet<string> = new Set(FAMILIES.map((f) => f.id));

function validSource(source: unknown): source is SourceFilter {
  if (typeof source !== "object" || source === null) return false;
  const s = source as { kind?: unknown; moduleId?: unknown };
  if (s.kind === "core") return true;
  return (s.kind === "module" || s.kind === "both") && typeof s.moduleId === "string" && s.moduleId !== "";
}

/** True iff the config names a real game, family, level and source that the data can play. */
function validScope(data: PatternData, config: unknown): config is RoundConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Partial<RoundConfig>;
  if (c.game !== "bubble" && c.game !== "crush") return false;
  if (c.family !== "mix" && !(typeof c.family === "string" && FAMILY_IDS.has(c.family))) return false;
  if (!validSource(c.source)) return false;
  if (typeof c.seed !== "number" || !Number.isFinite(c.seed)) return false;
  if (typeof c.listMode !== "boolean" || typeof c.reducedMotion !== "boolean") return false;
  if (c.game === "bubble") return c.level === null;
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
 * Judges a round log against the current pattern data. Order: stale data (nothing is replayed),
 * unknown scope, event count, event order and range, then the replay itself. The server ends the
 * replay at the full round length; the log holds inputs only. The verdict's numbers always come
 * from the replay, never from the client.
 */
export function scoreRound(data: PatternData, log: RoundLog): Verdict {
  if (log.dataHash !== data.dataHash) return { ok: false, stale: true };
  if (!validScope(data, log.config)) return hard("unknown-scope");
  const config = log.config;
  const roundMs = ROUND_MS[config.game];
  if (!Array.isArray(log.events)) return hard("invalid-event");
  if (log.events.length > roundMs / MIN_EVENT_GAP_MS) return hard("too-many-events");

  const events = log.events as unknown[];
  let prev = -Infinity;
  for (const event of events) {
    if (!wellFormed(event)) return hard("invalid-event");
    if (event.t < prev) return hard("out-of-order");
    if (event.t > roundMs + AFTER_END_SLACK_MS) return hard("after-end");
    prev = event.t;
  }

  let result: RoundResult;
  try {
    const round = config.game === "bubble" ? createBubbleRound(data, config) : createCrushRound(data, config);
    for (const event of events as RoundEvent[]) {
      if (!replayEvent(config.game, round, event)) return hard("invalid-event");
    }
    result = round.end(roundMs);
  } catch {
    // The data cannot build this round (for example no frames in the source): not a playable scope.
    return hard("unknown-scope");
  }

  const soft: SoftReason[] = [];
  if (config.listMode) soft.push("list-mode");
  let fast = 0;
  for (let i = 1; i < events.length; i++) {
    if ((events[i] as RoundEvent).t - (events[i - 1] as RoundEvent).t < FAST_GAP_MS) fast++;
  }
  if (fast >= FAST_GAPS_TO_FLAG) soft.push("fast-picks");
  // A round that did not end by itself (Crush goal or moves) and went quiet before the timer.
  const lastT = events.length === 0 ? 0 : (events[events.length - 1] as RoundEvent).t;
  if (result.durationMs >= roundMs && lastT < roundMs - ABANDON_GAP_MS) soft.push("abandoned");
  return { ok: true, result, ranked: soft.length === 0, softReasons: soft };
}
