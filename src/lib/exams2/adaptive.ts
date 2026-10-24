// Built by TAC — 2026-10-23
/**
 * The 50-question adaptive diagnostic ("<Trade> Spanish Check", design section 4).
 *
 * Stateless: the next item is a pure function of (bank, seed, responses), so a session resumes on
 * any device and the server can recompute exactly what it served. Pure module: no server-only
 * imports, no React, no clocks, no Math.random.
 *
 * Model: 1-parameter logistic with a guessing floor and Gaussian (Laplace) approximations.
 * A global level G is folded from every answer exactly as in the design (it sets the opening
 * targets). Lesson levels are fitted jointly: each lesson shares the global level and has its own
 * effect, correlated with neighbouring lessons (see PRIOR_MODELS). The design's independent
 * per-lesson update reached about 67% strong/shaky/new agreement in simulation because 50
 * questions over 30 lessons leave one or two answers per lesson; borrowing strength from
 * neighbouring lessons is what lifts it above the 85% target.
 */
import { moduleLessonUrl } from "../learning-link.ts";
import { LESSON_COUNT, lessonTitle, type BankItem, type ExamBank } from "./bank.ts";
import { seededUnit } from "./hash.ts";

export const DIAGNOSTIC_LENGTH = 50;
/**
 * At most 3 items per lesson (the design allows up to 4). In simulation a 4th item added nothing
 * to agreement and pushed the most-asked lessons' items past the 45% exposure limit.
 */
export const MAX_PER_LESSON = 3;
/**
 * The first and last lessons have only one neighbour, so the model stays less sure of them and
 * would keep asking them; capping them at 2 keeps their items under the exposure limit.
 */
export const MAX_PER_END_LESSON = 2;
export const lessonCap = (lesson: number) =>
  lesson === 1 || lesson === LESSON_COUNT ? MAX_PER_END_LESSON : MAX_PER_LESSON;
export const MIN_TYPED = 8;
/** Every phase gets at least this many questions, so each phase result rests on real evidence. */
export const MIN_PER_PHASE = 6;
export const TYPED_FROM_STEP = 30;
export const SWEEP = [2, 8, 14, 20, 26, 5, 11, 17, 23, 29] as const;
export const GLOBAL_PRIOR = { mu: 0, v: 1.5 } as const;
export const STRONG_MASTERY = 0.75;
export const NEW_MASTERY = 0.45;
export const STRONG_LOWER = 0.55;
/** Items whose difficulty is within this many logits of the closest one are equally eligible. */
export const ITEM_TOLERANCE = 1;
/** Lessons scoring within this share of the best, up to LESSON_CHOICES, are equally eligible. */
export const LESSON_SCORE_BAND = 0.75;
export const LESSON_CHOICES = 5;

export interface DiagnosticResponse {
  itemId: string;
  /** Score in [0, 1]: 0/1 for mc and typed, a fraction for match. */
  y: number;
  /** "I don't know": scored 0 with no guessing allowance. */
  dontKnow?: boolean;
}
export interface Belief {
  mu: number;
  v: number;
}
export interface LessonEstimate extends Belief {
  lesson: number;
  seen: number;
  correct: number;
}
export interface PhaseEstimate {
  /** Index into the bank's phases. */
  index: number;
  id: string;
  title: string;
  lessons: number[];
  /** Mean of the phase's lesson masteries (chance of a medium item right). */
  mastery: number;
  /** Posterior standard deviation of `mastery`. */
  sd: number;
  seen: number;
  correct: number;
}
export interface DiagnosticEstimate {
  global: Belief;
  lessons: LessonEstimate[];
  phases: PhaseEstimate[];
}
export type LessonStatus = "strong" | "shaky" | "new";
export type Confidence = "high" | "medium" | "low";

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));
const LOGIT_STRONG = logit(STRONG_MASTERY);
const LOGIT_NEW = logit(NEW_MASTERY);

/** Item difficulty on the logit scale: authored 1/2/3 -> -1/0/+1. */
export const itemB = (item: Pick<BankItem, "difficulty">) => item.difficulty - 2;
/** Guessing floor: only a real multiple-choice answer can be a lucky guess. */
export function guessFloor(item: Pick<BankItem, "type" | "options">, dontKnow = false): number {
  if (dontKnow || item.type !== "mc") return 0;
  return 0.8 / Math.max(2, item.options?.length ?? 4);
}
export function pCorrect(theta: number, b: number, c: number) {
  return c + (1 - c) * sigmoid(theta - b);
}

/** One Laplace step of the design's update rule. */
export function update(belief: Belief, b: number, c: number, y: number): Belief {
  const s = sigmoid(belief.mu - b);
  const p = Math.min(1 - 1e-9, Math.max(1e-9, c + (1 - c) * s));
  const dp = (1 - c) * s * (1 - s);
  const info = (dp * dp) / (p * (1 - p));
  const v = 1 / (1 / belief.v + info);
  return { mu: belief.mu + (v * (y - p) * dp) / (p * (1 - p)), v };
}

export interface DiagnosticPool {
  bank: ExamBank;
  byId: Map<string, BankItem>;
  byLesson: Map<number, BankItem[]>;
  /** Phase index of each lesson (1-based lesson -> index into bank.phases). */
  phaseOf: Map<number, number>;
}
/** Index the bank's diagnostic pool once; reuse it across calls. */
export function diagnosticPool(bank: ExamBank): DiagnosticPool {
  const all = new Map(bank.items.map((item) => [item.id, item]));
  const byId = new Map<string, BankItem>();
  const byLesson = new Map<number, BankItem[]>();
  for (let lesson = 1; lesson <= LESSON_COUNT; lesson++) byLesson.set(lesson, []);
  for (const id of bank.diagnosticPool) {
    const item = all.get(id);
    if (!item) throw new Error("Diagnostic pool references an unknown item.");
    byId.set(id, item);
    byLesson.get(item.lesson)?.push(item);
  }
  const phaseOf = new Map<number, number>();
  (Array.isArray(bank.phases) ? bank.phases : []).forEach((phase, index) => {
    for (const lesson of phase.lessons) phaseOf.set(lesson, index);
  });
  if (phaseOf.size !== LESSON_COUNT)
    throw new Error("The bank's phases must cover all 30 lessons.");
  return { bank, byId, byLesson, phaseOf };
}

function responseItem(pool: DiagnosticPool, response: DiagnosticResponse): BankItem {
  const item = pool.byId.get(response.itemId);
  if (!item) throw new Error("Response for an item outside the diagnostic pool.");
  if (!(response.y >= 0 && response.y <= 1)) throw new Error("Response score must be within 0..1.");
  if (response.dontKnow === true && response.y !== 0)
    throw new Error('An "I don\'t know" response must score 0.');
  return item;
}

/**
 * Lesson prior. Every lesson shares the global level (variance GLOBAL_PRIOR.v, as in the design)
 * plus a lesson effect. Core 30 lessons are sequential and grouped by job phase, so the lesson
 * effect is correlated between neighbouring lessons (AR(1) over lesson order) on top of an
 * independent part. Four prior models are fitted and averaged by their Laplace evidence:
 *  - "even": small lesson effects; the learner is about equally good across the module.
 *  - "uneven": large lesson effects, moderately correlated with neighbours.
 *  - "patchy": large lesson effects with no neighbour correlation (knowledge scattered
 *    lesson by lesson).
 *  - "stretches": large, strongly neighbour-correlated effects; the learner knows long stretches
 *    of the module (the lessons studied so far, or one job phase) and not others.
 * The answers decide which description fits; nothing is assumed about the learner in advance.
 */
export const PRIOR_MODELS = [
  { name: "even", effectVariance: 0.1, correlation: 0.75, nuggetVariance: 0.1 },
  { name: "uneven", effectVariance: 3.0, correlation: 0.75, nuggetVariance: 0.4 },
  { name: "patchy", effectVariance: 5.0, correlation: 0, nuggetVariance: 0 },
  { name: "stretches", effectVariance: 5.0, correlation: 0.92, nuggetVariance: 0.2 },
] as const;

interface PreparedPrior {
  precision: Float64Array;
  logDet: number;
}
let preparedPriors: PreparedPrior[] | null = null;
function prepareModels(): PreparedPrior[] {
  return (preparedPriors ??= PRIOR_MODELS.map((model) => {
    const n = LESSON_COUNT;
    const cov = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        cov[i * n + j] =
          GLOBAL_PRIOR.v +
          model.effectVariance * model.correlation ** Math.abs(i - j) +
          (i === j ? model.nuggetVariance : 0);
    const l = cholesky(cov, n);
    let logDet = 0;
    for (let i = 0; i < n; i++) logDet += 2 * Math.log(l[i * n + i]);
    return { precision: inverseFromCholesky(l, n), logDet };
  }));
}
/** Cholesky factor (lower) of a symmetric positive-definite n x n matrix. */
function cholesky(a: Float64Array, n: number): Float64Array {
  const l = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let sum = a[i * n + j];
      for (let k = 0; k < j; k++) sum -= l[i * n + k] * l[j * n + k];
      if (i === j) {
        if (!(sum > 0)) throw new Error("Covariance is not positive definite.");
        l[i * n + i] = Math.sqrt(sum);
      } else l[i * n + j] = sum / l[j * n + j];
    }
  return l;
}
function choleskySolve(l: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= l[i * n + k] * y[k];
    y[i] = sum / l[i * n + i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= l[k * n + i] * x[k];
    x[i] = sum / l[i * n + i];
  }
  return x;
}
function inverseFromCholesky(l: Float64Array, n: number): Float64Array {
  const inv = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    const e = new Float64Array(n);
    e[j] = 1;
    const col = choleskySolve(l, n, e);
    for (let i = 0; i < n; i++) inv[i * n + j] = col[i];
  }
  return inv;
}

interface Observation {
  lesson: number;
  b: number;
  c: number;
  y: number;
}
function logLikelihood(o: Observation, theta: number) {
  const p = Math.min(1 - 1e-9, Math.max(1e-9, o.c + (1 - o.c) * sigmoid(theta - o.b)));
  return o.y * Math.log(p) + (1 - o.y) * Math.log(1 - p);
}

/** Laplace fit (Fisher scoring) of the 30 lesson levels under one prior, plus its log evidence. */
function fitLessons(obs: readonly Observation[], prior: PreparedPrior) {
  const n = LESSON_COUNT;
  const { precision } = prior;
  let theta = new Float64Array(n);
  for (let iteration = 0; ; iteration++) {
    const grad = new Float64Array(n);
    const info = new Float64Array(n);
    for (const o of obs) {
      const s = sigmoid(theta[o.lesson] - o.b);
      const p = Math.min(1 - 1e-9, Math.max(1e-9, o.c + (1 - o.c) * s));
      const dp = (1 - o.c) * s * (1 - s);
      grad[o.lesson] += ((o.y - p) * dp) / (p * (1 - p));
      info[o.lesson] += (dp * dp) / (p * (1 - p));
    }
    const h = new Float64Array(n * n);
    h.set(precision);
    for (let i = 0; i < n; i++) {
      h[i * n + i] += info[i];
      let pull = 0;
      for (let j = 0; j < n; j++) pull += precision[i * n + j] * theta[j];
      grad[i] -= pull;
    }
    const l = cholesky(h, n);
    const step = choleskySolve(l, n, grad);
    let largest = 0;
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      // Damp large steps; the guessing floor can make the first steps overshoot.
      const delta = Math.max(-2, Math.min(2, step[i]));
      next[i] = theta[i] + delta;
      largest = Math.max(largest, Math.abs(delta));
    }
    const converged = largest < 1e-6 || iteration >= 24;
    if (!converged) {
      theta = next;
      continue;
    }
    // Laplace evidence: log p(y) ~ loglik(theta) - 1/2 theta' P theta - 1/2 log|Sigma| - 1/2 log|H|.
    let logLik = 0;
    for (const o of obs) logLik += logLikelihood(o, theta[o.lesson]);
    let quad = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) quad += theta[i] * precision[i * n + j] * theta[j];
    let logDetH = 0;
    for (let i = 0; i < n; i++) logDetH += 2 * Math.log(l[i * n + i]);
    const posterior = inverseFromCholesky(l, n);
    return {
      mu: Array.from(theta),
      v: Array.from({ length: n }, (_, i) => posterior[i * n + i]),
      cov: posterior,
      logEvidence: logLik - 0.5 * quad - 0.5 * prior.logDet - 0.5 * logDetH,
    };
  }
}

export function estimate(
  pool: DiagnosticPool,
  responses: readonly DiagnosticResponse[],
): DiagnosticEstimate {
  const n = LESSON_COUNT;
  // Global level: the design's sequential Laplace fold over every answer.
  let global: Belief = { ...GLOBAL_PRIOR };
  const obs: Observation[] = [];
  const seen = new Array<number>(n).fill(0);
  const correct = new Array<number>(n).fill(0);
  for (const r of responses) {
    const item = responseItem(pool, r);
    const b = itemB(item);
    const c = guessFloor(item, r.dontKnow);
    global = update(global, b, c, r.y);
    obs.push({ lesson: item.lesson - 1, b, c, y: r.y });
    seen[item.lesson - 1]++;
    correct[item.lesson - 1] += r.y;
  }
  // Lessons: fit each prior model, then average them by evidence (equal prior odds).
  const fits = prepareModels().map((prior) => fitLessons(obs, prior));
  const top = Math.max(...fits.map((fit) => fit.logEvidence));
  const weights = fits.map((fit) => Math.exp(fit.logEvidence - top));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const lessons: LessonEstimate[] = [];
  for (let i = 0; i < n; i++) {
    let mu = 0;
    let second = 0;
    fits.forEach((fit, k) => {
      const w = weights[k] / totalWeight;
      mu += w * fit.mu[i];
      second += w * (fit.v[i] + fit.mu[i] ** 2);
    });
    lessons.push({
      lesson: i + 1,
      mu,
      v: Math.max(1e-9, second - mu * mu),
      seen: seen[i],
      correct: correct[i],
    });
  }
  // Phases: mean lesson mastery, with its uncertainty from the joint posterior (delta method,
  // using the lesson covariances), mixed over the prior models like the lessons.
  const phases: PhaseEstimate[] = pool.bank.phases.map((phase, index) => {
    const idx = phase.lessons.map((lesson) => lesson - 1);
    let mean = 0;
    let second = 0;
    fits.forEach((fit, k) => {
      const w = weights[k] / totalWeight;
      const masteries = idx.map((i) => sigmoid(fit.mu[i]));
      const g = masteries.map((m) => (m * (1 - m)) / idx.length);
      const m = masteries.reduce((sum, value) => sum + value, 0) / idx.length;
      let variance = 0;
      idx.forEach((i, a) => idx.forEach((j, b) => (variance += g[a] * g[b] * fit.cov[i * n + j])));
      mean += w * m;
      second += w * (variance + m * m);
    });
    return {
      index,
      id: phase.id,
      title: phase.title,
      lessons: phase.lessons.slice(),
      mastery: mean,
      sd: Math.sqrt(Math.max(1e-12, second - mean * mean)),
      seen: idx.reduce((sum, i) => sum + seen[i], 0),
      correct: idx.reduce((sum, i) => sum + correct[i], 0),
    };
  });
  return { global, lessons, phases };
}

/** Chance of getting a medium item right with no guessing. */
export const mastery = (belief: Belief) => sigmoid(belief.mu);

export function classify(belief: Belief): {
  status: LessonStatus;
  confidence: Confidence;
  mastery: number;
} {
  const sd = Math.sqrt(belief.v);
  const m = mastery(belief);
  const status: LessonStatus =
    m >= STRONG_MASTERY && sigmoid(belief.mu - sd) >= STRONG_LOWER
      ? "strong"
      : m < NEW_MASTERY
        ? "new"
        : "shaky";
  const confidence: Confidence = sd < 0.6 ? "high" : sd < 0.9 ? "medium" : "low";
  return { status, confidence, mastery: m };
}

const normalCdf = (z: number) => {
  // Abramowitz-Stegun 7.1.26 erf approximation (abs error < 1.5e-7).
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
};

/**
 * Phase call, on the mastery scale: strong when mastery >= .75 and one sd below it is still
 * >= .55 (the lesson rule's caution), new below .45, otherwise shaky. Confidence is the chance,
 * under the posterior, that the phase really is in the called band: >= .8 high, >= .6 medium.
 */
export function classifyPhase(phase: Pick<PhaseEstimate, "mastery" | "sd">): {
  status: LessonStatus;
  confidence: Confidence;
  probability: number;
} {
  const { mastery: m, sd } = phase;
  const status: LessonStatus =
    m >= STRONG_MASTERY && m - sd >= STRONG_LOWER ? "strong" : m < NEW_MASTERY ? "new" : "shaky";
  const below = (x: number) => normalCdf((x - m) / sd);
  const probability =
    status === "strong"
      ? 1 - below(STRONG_MASTERY)
      : status === "new"
        ? below(NEW_MASTERY)
        : below(STRONG_MASTERY) - below(NEW_MASTERY);
  const confidence: Confidence =
    probability >= 0.8 ? "high" : probability >= 0.6 ? "medium" : "low";
  return { status, confidence, probability };
}

/** Ground-truth class for a known mastery, with the same thresholds (used by simulations). */
export function classifyMastery(m: number): LessonStatus {
  return m >= STRONG_MASTERY ? "strong" : m < NEW_MASTERY ? "new" : "shaky";
}

/**
 * How much the next answer in this lesson could change its strong/shaky/new call: high when the
 * estimate sits near a class boundary relative to its uncertainty. Unseen lessons get 3x.
 * (The design multiplied this by sd as well; in simulation that kept re-asking the two end
 * lessons, which have only one neighbour, and pushed their items past the exposure limit
 * without improving agreement.)
 */
function lessonScore(belief: LessonEstimate): number {
  const sd = Math.sqrt(belief.v);
  const distance = Math.min(Math.abs(belief.mu - LOGIT_STRONG), Math.abs(belief.mu - LOGIT_NEW));
  return (belief.seen === 0 ? 3 : 1) * Math.exp(-0.5 * (distance / sd) ** 2);
}

function seededPick<T>(values: readonly T[], ...parts: (string | number)[]): T {
  return values[Math.floor(seededUnit(...parts) * values.length)];
}

/**
 * The opening sweep: the design's SWEEP list, shifted by a seeded offset of -1, 0 or +1 lessons.
 * It still spreads the first 10 questions across the whole module (one every 3 lessons), but the
 * guaranteed opening load falls on all 30 lessons instead of always the same 10, which is what
 * keeps any one item's exposure under the target with a 5-item-per-lesson pool.
 */
export function sweepLesson(seed: string, step: number): number {
  const shift = Math.floor(seededUnit("exams2-sweep", seed) * 3) - 1;
  return SWEEP[step] + shift;
}

export interface NextItem {
  step: number;
  itemId: string;
  lesson: number;
}

/**
 * The item to serve at `responses.length`, or null when the diagnostic is finished.
 * Deterministic in (bank, seed, responses).
 */
export function nextDiagnosticItem(
  pool: DiagnosticPool,
  seed: string,
  responses: readonly DiagnosticResponse[],
): NextItem | null {
  const step = responses.length;
  if (step >= DIAGNOSTIC_LENGTH) return null;
  const est = estimate(pool, responses);
  const used = new Set(responses.map((r) => r.itemId));
  if (used.size !== responses.length) throw new Error("An item was answered twice.");
  const unused = (lesson: number) =>
    (pool.byLesson.get(lesson) ?? []).filter((item) => !used.has(item.id));
  const servedItems = responses.map((r) => pool.byId.get(r.itemId)!);
  const typedCount = servedItems.filter((item) => item.type === "typed").length;
  const remaining = DIAGNOSTIC_LENGTH - step;
  const typedNeeded = Math.max(0, MIN_TYPED - typedCount);
  const typedUrgent = typedNeeded > 0 && typedNeeded >= remaining;

  let lesson: number;
  let target: number;
  if (step < SWEEP.length) {
    lesson = sweepLesson(seed, step);
    target = est.global.mu;
  } else {
    // Questions still owed: every uncovered lesson, and MIN_PER_PHASE per phase. One question
    // can pay both. When what is owed fills the remaining steps, only paying picks are allowed.
    const open = (l: LessonEstimate) => l.seen < lessonCap(l.lesson) && unused(l.lesson).length > 0;
    const owed = est.phases.map((phase) => {
      const uncoveredIn = phase.lessons.filter(
        (lesson) => est.lessons[lesson - 1].seen === 0,
      ).length;
      return { uncoveredIn, short: Math.max(0, MIN_PER_PHASE - phase.seen) };
    });
    const required = owed.reduce((sum, o) => sum + Math.max(o.uncoveredIn, o.short), 0);
    let candidates =
      required >= remaining
        ? est.lessons.filter((l) => {
            if (!open(l)) return false;
            const o = owed[pool.phaseOf.get(l.lesson)!];
            return l.seen === 0 || o.short > o.uncoveredIn;
          })
        : est.lessons.filter(open);
    if (typedUrgent) {
      const withTyped = candidates.filter((l) =>
        unused(l.lesson).some((item) => item.type === "typed"),
      );
      if (withTyped.length) candidates = withTyped;
    }
    if (!candidates.length) throw new Error("The diagnostic pool cannot fill 50 questions.");
    const scored = candidates
      .map((l) => ({ l, score: lessonScore(l) }))
      .sort((a, b) => b.score - a.score || a.l.lesson - b.l.lesson);
    const best = scored[0].score;
    const top = scored
      .filter((entry) => entry.score >= best * LESSON_SCORE_BAND)
      .slice(0, LESSON_CHOICES);
    const chosen = seededPick(top, "exams2-lesson", seed, step).l;
    lesson = chosen.lesson;
    target = chosen.mu;
  }

  let items = unused(lesson);
  if (!items.length) throw new Error("No unused items remain in the chosen lesson.");
  const lastTwo = servedItems.slice(-2).map((item) => item.type);
  const runType = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : null;
  const typed = items.filter((item) => item.type === "typed");
  if (typedUrgent && typed.length) items = typed;
  else if (step >= TYPED_FROM_STEP && typedCount < MIN_TYPED && typed.length && runType !== "typed")
    items = typed;
  else if (runType && items.some((item) => item.type !== runType))
    items = items.filter((item) => item.type !== runType);

  // Closest difficulty first; equal distances are ordered by a seeded hash so no single item is
  // always the first choice. A seeded pick among the items within ITEM_TOLERANCE of the closest
  // (at least two) spreads item exposure across the pool.
  const ranked = items
    .map((item) => ({
      item,
      distance: Math.abs(itemB(item) - target),
      tie: seededUnit("exams2-tie", seed, item.id),
    }))
    .sort((a, b) => a.distance - b.distance || a.tie - b.tie);
  const near = ranked.filter((entry) => entry.distance <= ranked[0].distance + ITEM_TOLERANCE);
  const chosen = seededPick(
    near.length >= 2 ? near : ranked.slice(0, 2),
    "exams2-item",
    seed,
    step,
  ).item;
  return { step, itemId: chosen.id, lesson: chosen.lesson };
}

/**
 * Recompute what the engine served at every step and check the stored responses follow it.
 * Returns the served ids, or throws on the first response that was not the served item.
 */
export function replayDiagnostic(
  pool: DiagnosticPool,
  seed: string,
  responses: readonly DiagnosticResponse[],
): string[] {
  // Every stored response must be valid on its own (known item, score in range, "I don't know"
  // scored 0), including the last one, which no later step would re-check.
  for (const response of responses) responseItem(pool, response);
  const served: string[] = [];
  for (let step = 0; step < responses.length; step++) {
    const next = nextDiagnosticItem(pool, seed, responses.slice(0, step));
    if (!next || next.itemId !== responses[step].itemId)
      throw new Error(`Response ${step} does not match the served item.`);
    served.push(next.itemId);
  }
  return served;
}

export interface DiagnosticLessonResult {
  lesson: number;
  title: string;
  /** Index into `phases` of the phase this lesson belongs to. */
  phase: number;
  /** The lesson-level call is shown as "likely": 50 questions leave one to three per lesson. */
  likely: LessonStatus;
  mastery: number;
  confidence: Confidence;
  seen: number;
  correct: number;
  href: string;
}
export interface DiagnosticPhaseResult {
  id: string;
  title: string;
  lessons: number[];
  status: LessonStatus;
  mastery: number;
  confidence: Confidence;
  seen: number;
  correct: number;
}
export interface DiagnosticResult {
  /** round(mean lesson mastery x 100): "You already know about N% of <Trade> Spanish". */
  overallPct: number;
  /** The headline result: one strong/shaky/new call per phase, with confidence. */
  phases: DiagnosticPhaseResult[];
  /** Lesson detail under each phase, labelled "likely". */
  lessons: DiagnosticLessonResult[];
  /** First lesson in course order that is not likely strong; null when every lesson is. */
  startHere: number | null;
  /** Likely-shaky lessons in order, then likely-new lessons in order. */
  studyOrder: number[];
  strong: number[];
}

export function buildDiagnosticResult(
  pool: DiagnosticPool,
  responses: readonly DiagnosticResponse[],
  link: { target: string; native: string },
): DiagnosticResult {
  const est = estimate(pool, responses);
  const phases = est.phases.map((phase) => {
    const { status, confidence } = classifyPhase(phase);
    return {
      id: phase.id,
      title: phase.title,
      lessons: phase.lessons,
      status,
      mastery: Math.round(phase.mastery * 1000) / 1000,
      confidence,
      seen: phase.seen,
      correct: phase.correct,
    };
  });
  const lessons = est.lessons.map((belief) => {
    const { status, confidence, mastery: m } = classify(belief);
    return {
      lesson: belief.lesson,
      title: lessonTitle(pool.bank, belief.lesson),
      phase: pool.phaseOf.get(belief.lesson)!,
      likely: status,
      mastery: Math.round(m * 1000) / 1000,
      confidence,
      seen: belief.seen,
      correct: belief.correct,
      href: moduleLessonUrl({
        moduleId: pool.bank.moduleId,
        target: link.target,
        native: link.native,
        lesson: belief.lesson,
        way: status === "new" ? "see" : "recall",
      }),
    };
  });
  const meanMastery =
    est.lessons.reduce((sum, belief) => sum + mastery(belief), 0) / est.lessons.length;
  const ofStatus = (status: LessonStatus) =>
    lessons.filter((l) => l.likely === status).map((l) => l.lesson);
  return {
    overallPct: Math.round(meanMastery * 100),
    phases,
    lessons,
    startHere: lessons.find((l) => l.likely !== "strong")?.lesson ?? null,
    studyOrder: [...ofStatus("shaky"), ...ofStatus("new")],
    strong: ofStatus("strong"),
  };
}
