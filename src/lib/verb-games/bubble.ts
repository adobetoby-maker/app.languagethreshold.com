// Built by TAC — 2026-10-20
// Verb Games: Bubble Pop round engine. Pure and seeded; the log holds only picks, so the server
// can replay a round through this same engine. Play never pauses on a miss.

import { forFrame, norm } from "./distractors.ts";
import { reasonText } from "./families.ts";
import { buildFrame, nextSlot } from "./frames.ts";
import type { Frame } from "./frames.ts";
import { frameSlots, poolVerbs } from "./pool.ts";
import type { FrameSlot } from "./pool.ts";
import { createRng, shuffle } from "./rng.ts";
import {
  CORRECT_POINTS,
  MAX_UNTIMED_EVENTS,
  SENTENCE_AFTER_MS,
  SPEED_BONUS_MAX,
  bubbleCount,
  bubbleLifetimeMs,
  isTimed,
  modeOf,
  onCorrect,
  roundFamilies,
  roundLimitMs,
} from "./rules.ts";
import type {
  Completion,
  EndReason,
  Miss,
  Outcome,
  PatternData,
  RoundConfig,
  RoundEvent,
  RoundResult,
  VerbEntry,
} from "./types.ts";

export interface BubblePiece {
  id: number;
  label: string;
  correct: boolean;
}

export interface BubbleView {
  frame: Frame;
  pieces: BubblePiece[];
  removed: number[];
  shownAt: number;
  deadline: number;
  score: number;
  streak: number;
  t: number;
  ended: boolean;
  /** Why the round ended; null while it is running. */
  endReason: EndReason | null;
  lastReason: string | null;
  /** Correct picks so far (a count round ends when this reaches its N). */
  made: number;
}

export interface BubbleRound {
  view(): BubbleView;
  /** Moves time forward: every frame whose deadline has passed escapes as a miss. */
  advance(t: number): Outcome[];
  /**
   * A pick at time `t`. A count or forever round ends on its own (reason `cap`) when this pick
   * makes the log reach `MAX_UNTIMED_EVENTS`. Frames whose deadline passed before `t` escape first (their misses come
   * back in the same array), so a log that leaves out the escapes replays to the same state.
   */
  pick(t: number, frame: number, piece: number): Outcome[];
  /**
   * Ends the round at `t` (clamped to the round length) and returns the result. A count or forever
   * round that already ended on its own keeps its own end time.
   */
  end(t: number): RoundResult;
  /** Accepted picks only, in order. Invalid picks and escapes are never logged. */
  events(): RoundEvent[];
}

export function createBubbleRound(data: PatternData, config: RoundConfig): BubbleRound {
  const rng = createRng(config.seed);
  const slots = frameSlots(data, roundFamilies(config, data), "family", config.source);
  if (slots.length === 0) throw new Error("No frames for this round");
  const pool: VerbEntry[] = poolVerbs(data, config.source);
  const mode = modeOf(config);
  // Timed: the 60 s clock. Count and forever: no clock, only the untimed cap.
  const roundMs = roundLimitMs(config);

  let prevSlot: FrameSlot | null = null;
  let frameCount = 0;
  let frame!: Frame;
  let pieces: BubblePiece[] = [];
  let removed: number[] = [];
  let shownAt = 0;
  let deadline = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let now = 0;
  let ended = false;
  let endReason: EndReason | null = null;
  const timed = isTimed(config);
  /** The reason for reaching the round limit: the clock when timed, else the untimed cap. */
  const limitReason: EndReason = timed ? "time" : "cap";
  let lastReason: string | null = null;
  /** Set only when a count or forever round ends on its own (never in a timed round). */
  let naturalEnd: number | null = null;
  let picks = 0;
  const completions: Completion[] = [];
  const misses: Miss[] = [];
  const log: RoundEvent[] = [];

  function show(at: number): void {
    const slot = nextSlot(rng, slots, prevSlot);
    prevSlot = slot;
    frame = buildFrame(data, slot, frameCount++, at >= SENTENCE_AFTER_MS);
    const wrong = forFrame(frame, data, pool, bubbleCount(at) - 1, rng);
    const labels = shuffle(rng, [frame.answer, ...wrong]);
    const answer = norm(frame.answer);
    // Only the frame's exact form is correct (NFC + lower-case); a wrong form is never accepted.
    pieces = labels.map((label, id) => ({ id, label, correct: norm(label) === answer }));
    removed = [];
    shownAt = at;
    deadline = at + bubbleLifetimeMs(at);
  }

  function reasonFor(): string {
    const verb = data.verbs.find((v) => v.infinitive === frame.infinitive);
    const form = verb?.forms.find((f) => f.person === frame.person);
    return reasonText(frame.familyId, {
      infinitive: frame.infinitive,
      person: frame.person,
      ending: form?.ending ?? "",
    });
  }

  function miss(t: number, attempted: string | null, reason: string): Outcome {
    const m: Miss = {
      t,
      infinitive: frame.infinitive,
      person: frame.person,
      familyId: frame.familyId,
      attempted,
      correct: frame.answer,
      english: frame.english,
      reason,
    };
    misses.push(m);
    streak = 0;
    lastReason = reason;
    return { kind: "miss", miss: m };
  }

  function endNaturally(at: number, out: Outcome[], reason: EndReason): void {
    ended = true;
    endReason = reason;
    naturalEnd = at;
    now = Math.max(now, at);
    out.push({ kind: "end" });
  }

  /**
   * Escapes every frame whose deadline is before `t` (and before the round ends). In a forever
   * round the first escape is the end: it is a miss and no next frame is shown.
   */
  function escapesUntil(t: number): Outcome[] {
    const out: Outcome[] = [];
    const limit = Math.min(t, roundMs);
    while (deadline < limit) {
      const at = deadline;
      out.push(miss(at, null, `Time's up → ${frame.answer} · ${reasonFor()}`));
      if (mode.kind === "forever") {
        endNaturally(at, out, "miss");
        return out;
      }
      show(at);
      out.push({ kind: "frame", index: frame.index });
    }
    now = Math.max(now, limit);
    return out;
  }

  show(0);

  function pickOnce(t: number, frameIndex: number, pieceId: number): Outcome[] {
    if (ended || !Number.isFinite(t) || t < now || t >= roundMs) return [{ kind: "invalid" }];
    const out = escapesUntil(t);
    if (ended) {
      // Forever: a frame escaped before this pick, so the round is already over.
      out.push({ kind: "invalid" });
      return out;
    }
    const piece = Number.isInteger(pieceId) ? pieces[pieceId] : undefined;
    if (frameIndex !== frame.index || !piece || removed.includes(piece.id)) {
      out.push({ kind: "invalid" });
      return out;
    }
    log.push({ t, kind: "pick", frame: frameIndex, piece: piece.id });
    picks++;
    if (piece.correct) {
      // Ruling F21: the streak goes up first, then the multiplier is min(8, streak).
      const step = onCorrect(streak);
      streak = step.streak;
      bestStreak = Math.max(bestStreak, streak);
      const lifetime = deadline - shownAt;
      const points = CORRECT_POINTS * step.multiplier + Math.round((SPEED_BONUS_MAX * (deadline - t)) / lifetime);
      score += points;
      const completion: Completion = {
        t,
        infinitive: frame.infinitive,
        person: frame.person,
        familyId: frame.familyId,
        form: frame.answer,
        english: frame.english,
        points,
      };
      completions.push(completion);
      out.push({ kind: "complete", completion });
      if (mode.kind === "count" && completions.length >= mode.n) {
        // Count: the Nth correct form ends the round; no next frame is shown.
        endNaturally(t, out, "goal");
        return out;
      }
      show(t);
      out.push({ kind: "frame", index: frame.index });
    } else {
      removed.push(piece.id);
      out.push(miss(t, piece.label, `${piece.label} ✗ → ${frame.answer} · ${reasonFor()}`));
      // Forever: the first wrong pick ends the round.
      if (mode.kind === "forever") endNaturally(t, out, "miss");
    }
    return out;
  }

  return {
    view() {
      return {
        frame: { ...frame, sentence: frame.sentence ? { ...frame.sentence } : null },
        pieces: pieces.map((p) => ({ ...p })),
        removed: [...removed],
        shownAt,
        deadline,
        score,
        streak,
        t: now,
        ended,
        endReason,
        lastReason,
        made: completions.length,
      };
    },

    advance(t) {
      if (ended || !Number.isFinite(t) || t < now) return [];
      const out = escapesUntil(t);
      if (!ended && t >= roundMs) {
        ended = true;
        endReason = limitReason;
        out.push({ kind: "end" });
      }
      return out;
    },

    pick(t, frameIndex, pieceId) {
      const logged = log.length;
      const out = pickOnce(t, frameIndex, pieceId);
      // A count or forever log never grows past the cap the server accepts: this pick is the last
      // one. The round ends here like any natural end (no quit time), so its replay ends the same way.
      if (log.length > logged && !ended && !timed && log.length >= MAX_UNTIMED_EVENTS) endNaturally(t, out, "cap");
      return out;
    },

    end(t) {
      const at = Number.isFinite(t) ? Math.max(now, Math.min(t, roundMs)) : now;
      if (!ended) escapesUntil(at);
      if (endReason === null) endReason = at >= roundMs ? limitReason : "player";
      ended = true;
      return {
        score,
        moves: 0,
        picks,
        correct: completions.length,
        bestStreak,
        durationMs: naturalEnd ?? at,
        completions: [...completions],
        misses: [...misses],
        won: mode.kind === "count" && completions.length >= mode.n,
      };
    },

    events() {
      return log.map((e) => ({ ...e }));
    },
  };
}
