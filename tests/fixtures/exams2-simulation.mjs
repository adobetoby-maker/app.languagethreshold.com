// Built by TAC — 2026-10-23
// Simulated learners for the exams v2 adaptive diagnostic tests. Every learner has known
// per-lesson abilities (logits); true lesson mastery = sigmoid(ability), the chance of a medium
// item right with no guessing. Truth classes use the engine's own thresholds. The figures this
// produces describe the engine on these simulated learners only: real agreement depends on how
// real learners' knowledge is structured.
import {
  classify,
  classifyMastery,
  classifyPhase,
  diagnosticPool,
  estimate,
  nextDiagnosticItem,
} from "../../src/lib/exams2/adaptive.ts";
import { publicOptionId } from "../../src/lib/exams2/public-item.ts";
import { scoreItem } from "../../src/lib/exams2/scoring.ts";

export const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/** Small seeded PRNG (mulberry32) so the simulation is reproducible. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(next() + 1e-12)) * Math.cos(2 * Math.PI * next());
  return { next, gauss };
}

// Roofing Core 30 job phases (materials, tear-off, install, safety, closeout).
const JOB_PHASE = (lesson) =>
  lesson <= 5 ? 0 : lesson <= 10 ? 1 : lesson <= 20 ? 2 : lesson <= 25 ? 3 : 4;
const KNOWN = 2.2;
const UNKNOWN = -2.2;

/**
 * Learner kinds.
 *  Contiguous knowledge:
 *  - progress: studied lessons 1..k (k uniform 0..30); the last two studied are still shaky.
 *  - even: about the same level everywhere (beginners through heritage speakers).
 *  - phase: knows some roofing job phases (an experienced roofer) and not others.
 *  Non-contiguous or middling knowledge (the blind verifier's kinds):
 *  - independent: each lesson known or not on its own coin flip.
 *  - random-half: exactly 15 lessons, chosen at random, known.
 *  - mid-level: everything in the middle band (partly learned all over).
 */
export const CONTIGUOUS_KINDS = ["progress", "even", "phase"];
export const SCATTERED_KINDS = ["independent", "random-half", "mid-level"];
export const ALL_KINDS = [...CONTIGUOUS_KINDS, ...SCATTERED_KINDS];

export function makeLearner(kind, r) {
  const theta = [];
  const noisy = (base, sd = 0.5) => base + sd * r.gauss();
  if (kind === "progress") {
    const k = Math.floor(r.next() * 31);
    for (let l = 1; l <= 30; l++) theta.push(noisy(l <= k - 2 ? KNOWN : l <= k ? 0.4 : UNKNOWN));
  } else if (kind === "even") {
    const g = 1.8 * r.gauss();
    for (let l = 1; l <= 30; l++) theta.push(noisy(g, 0.4));
  } else if (kind === "phase") {
    const known = [0, 1, 2, 3, 4].map(() => r.next() < 0.5);
    for (let l = 1; l <= 30; l++) theta.push(noisy(known[JOB_PHASE(l)] ? KNOWN : UNKNOWN));
  } else if (kind === "independent") {
    for (let l = 1; l <= 30; l++) theta.push(noisy(r.next() < 0.5 ? KNOWN : UNKNOWN));
  } else if (kind === "random-half") {
    const order = Array.from({ length: 30 }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const known = new Set(order.slice(0, 15));
    for (let l = 1; l <= 30; l++) theta.push(noisy(known.has(l - 1) ? KNOWN : UNKNOWN));
  } else if (kind === "mid-level") {
    const g = 0.45 + 0.35 * r.gauss();
    for (let l = 1; l <= 30; l++) theta.push(noisy(g, 0.4));
  } else throw new Error(`unknown learner kind ${kind}`);
  return theta;
}

/**
 * How a simulated learner answers. Knowing the item: right. Not knowing: on multiple choice,
 * half press "I don't know" and half guess among 4; typed is wrong; match pairs are known or
 * left unmatched independently. Answers go through the real scorer.
 */
function answer(item, theta, r, seed) {
  const know = () => r.next() < sigmoid(theta - (item.difficulty - 2));
  const option = (id) => publicOptionId(seed, item.id, id);
  if (item.type === "mc") {
    if (know()) return { type: "mc", optionId: option(item.correctOptionId) };
    if (r.next() < 0.5) return { type: "dont_know" };
    return { type: "mc", optionId: option(item.options[Math.floor(r.next() * 4)].id) };
  }
  if (item.type === "typed")
    return know() ? { type: "typed", text: item.accepted[0] } : { type: "typed", text: "no se" };
  const matches = {};
  for (const pair of item.pairs) if (know()) matches[pair.left] = pair.right;
  return { type: "match", matches };
}

export function runSession(pool, seed, theta, r) {
  const responses = [];
  for (let next; (next = nextDiagnosticItem(pool, seed, responses));) {
    const item = pool.byId.get(next.itemId);
    const scored = scoreItem(item, answer(item, theta[item.lesson - 1], r, seed), seed);
    responses.push({ itemId: next.itemId, y: scored.points, dontKnow: scored.dontKnow });
  }
  return responses;
}

/**
 * Run `perKind` learners of each kind (interleaved, one seeded stream). Returns lesson-level and
 * phase-level agreement per kind, item exposure and the sessions.
 */
export function simulate(bank, { kinds = ALL_KINDS, perKind = 100, baseSeed = 20261023 } = {}) {
  const pool = diagnosticPool(bank);
  const r = rng(baseSeed);
  const exposure = new Map();
  const stats = Object.fromEntries(
    kinds.map((kind) => [kind, { lesson: [0, 0], phase: [0, 0], phaseConfidence: {} }]),
  );
  const sessions = [];
  for (let i = 0; i < perKind * kinds.length; i++) {
    const kind = kinds[i % kinds.length];
    const theta = makeLearner(kind, r);
    const seed = `sim-${baseSeed}-${i}`;
    const responses = runSession(pool, seed, theta, r);
    for (const { itemId } of responses) exposure.set(itemId, (exposure.get(itemId) ?? 0) + 1);
    const est = estimate(pool, responses);
    const s = stats[kind];
    est.lessons.forEach((belief, j) => {
      s.lesson[0] += classify(belief).status === classifyMastery(sigmoid(theta[j]));
      s.lesson[1]++;
    });
    for (const phase of est.phases) {
      const truth = classifyMastery(
        phase.lessons.reduce((sum, l) => sum + sigmoid(theta[l - 1]), 0) / phase.lessons.length,
      );
      const call = classifyPhase(phase);
      const c = (s.phaseConfidence[call.confidence] ??= [0, 0]);
      c[0] += call.status === truth;
      c[1]++;
      s.phase[0] += call.status === truth;
      s.phase[1]++;
    }
    sessions.push({ kind, seed, responses });
  }
  const learners = perKind * kinds.length;
  return {
    pool,
    stats,
    sessions,
    maxExposure: Math.max(...exposure.values()) / learners,
    rate: (pair) => pair[0] / pair[1],
  };
}

export const pct = (x) => (x * 100).toFixed(1) + "%";
