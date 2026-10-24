// Built by TAC — 2026-10-23
// Exams v2 adaptive diagnostic, learners with contiguous knowledge (progress, even, phase):
// lesson- and phase-level agreement, structural guarantees, determinism, resume and the result.
// The non-contiguous kinds run in tests/exams2-adaptive-scattered.test.mjs (in parallel).
// All figures come from simulated learners: they describe the engine on these learner models
// only, not real learners. Synthetic content only.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagnosticResult,
  classify,
  classifyPhase,
  evidenceCeiling,
  DIAGNOSTIC_LENGTH,
  diagnosticPool,
  estimate,
  lessonCap,
  MIN_PER_PHASE,
  MIN_TYPED,
  nextDiagnosticItem,
  replayDiagnostic,
  update,
} from "../src/lib/exams2/adaptive.ts";
import { buildSyntheticBank, clone } from "./fixtures/exams2-synthetic-bank.mjs";
import { CONTIGUOUS_KINDS, pct, simulate } from "./fixtures/exams2-simulation.mjs";

const PER_KIND = 400;
const BANK = buildSyntheticBank();
const SIM = simulate(BANK, { kinds: CONTIGUOUS_KINDS, perKind: PER_KIND });
const pooled = (level) => {
  const pairs = CONTIGUOUS_KINDS.map((kind) => SIM.stats[kind][level]);
  return pairs.reduce((a, p) => a + p[0], 0) / pairs.reduce((a, p) => a + p[1], 0);
};

test("agreement table (contiguous kinds): lesson-level and phase-level, per kind", (t) => {
  for (const kind of CONTIGUOUS_KINDS) {
    const s = SIM.stats[kind];
    t.diagnostic(
      `${kind}: lesson ${pct(SIM.rate(s.lesson))}, phase ${pct(SIM.rate(s.phase))}; phase by confidence ` +
        Object.entries(s.phaseConfidence)
          .map(([c, v]) => `${c} ${pct(v[0] / v[1])} (n=${v[1]})`)
          .join(", "),
    );
  }
  // Regression floors measured on these simulated kinds (3 x 400 learners), not product claims.
  assert.ok(pooled("lesson") >= 0.85, `lesson-level ${pct(pooled("lesson"))} < 85%`);
  assert.ok(pooled("phase") >= 0.85, `phase-level ${pct(pooled("phase"))} < 85%`);
});

test("every session: 50 questions, 30/30 lessons, >= 6 per phase, lesson caps, >= 8 typed", (t) => {
  let minTyped = Infinity;
  let minPhase = Infinity;
  for (const { responses } of SIM.sessions) {
    assert.equal(responses.length, DIAGNOSTIC_LENGTH);
    assert.equal(new Set(responses.map((r) => r.itemId)).size, DIAGNOSTIC_LENGTH);
    const perLesson = new Map();
    const perPhase = new Map();
    let typed = 0;
    for (const r of responses) {
      const item = SIM.pool.byId.get(r.itemId);
      perLesson.set(item.lesson, (perLesson.get(item.lesson) ?? 0) + 1);
      const phase = SIM.pool.phaseOf.get(item.lesson);
      perPhase.set(phase, (perPhase.get(phase) ?? 0) + 1);
      typed += item.type === "typed";
    }
    assert.equal(perLesson.size, 30, "30/30 lesson coverage");
    for (const [lesson, n] of perLesson) assert.ok(n <= lessonCap(lesson) && n <= 4);
    assert.equal(perPhase.size, BANK.phases.length);
    for (const n of perPhase.values()) assert.ok(n >= MIN_PER_PHASE, `phase got ${n}`);
    assert.ok(typed >= MIN_TYPED, `only ${typed} typed`);
    minTyped = Math.min(minTyped, typed);
    minPhase = Math.min(minPhase, ...perPhase.values());
  }
  t.diagnostic(
    `${SIM.sessions.length} sessions; min typed ${minTyped}; min items per phase ${minPhase}`,
  );
});

test("max item exposure <= 45% over the 1200 contiguous-kind sessions", (t) => {
  t.diagnostic(`max exposure ${pct(SIM.maxExposure)}`);
  assert.ok(SIM.maxExposure <= 0.45, `max exposure ${pct(SIM.maxExposure)}`);
});

test("determinism: same bank, seed and responses give the same next item", () => {
  const { seed, responses } = SIM.sessions[7];
  const otherPool = diagnosticPool(clone(BANK)); // a different process / device
  for (const step of [0, 1, 9, 10, 29, 30, 49]) {
    const prefix = responses.slice(0, step);
    const a = nextDiagnosticItem(SIM.pool, seed, prefix);
    assert.deepEqual(a, nextDiagnosticItem(SIM.pool, seed, prefix));
    assert.deepEqual(
      a,
      nextDiagnosticItem(
        otherPool,
        seed,
        prefix.map((r) => ({ ...r })),
      ),
    );
    assert.equal(a.itemId, responses[step].itemId);
  }
  assert.equal(nextDiagnosticItem(SIM.pool, seed, responses), null, "finished after 50");
  const openers = new Set(SIM.sessions.slice(0, 60).map((s) => s.responses[0].itemId));
  assert.ok(openers.size >= 6, `only ${openers.size} distinct opening items`);
});

test("resume equivalence and rejected histories", () => {
  for (const { seed, responses } of SIM.sessions.slice(0, 5)) {
    // Interrupt at step 23, "resume" on another device from the stored responses only.
    const stored = JSON.parse(JSON.stringify(responses.slice(0, 23)));
    const resumedPool = diagnosticPool(clone(BANK));
    assert.deepEqual(
      replayDiagnostic(resumedPool, seed, stored),
      stored.map((r) => r.itemId),
    );
    assert.equal(nextDiagnosticItem(resumedPool, seed, stored).itemId, responses[23].itemId);
    assert.deepEqual(
      replayDiagnostic(resumedPool, seed, responses),
      responses.map((r) => r.itemId),
    );
    const tampered = stored.slice();
    tampered[5] = { ...tampered[5], itemId: responses[30].itemId };
    assert.throws(() => replayDiagnostic(resumedPool, seed, tampered));
  }
  const { seed, responses } = SIM.sessions[0];
  const first = responses[0].itemId;
  assert.throws(() => nextDiagnosticItem(SIM.pool, seed, [...responses.slice(0, 3), responses[0]]));
  assert.throws(() => nextDiagnosticItem(SIM.pool, seed, [{ itemId: BANK.forms.A[0], y: 1 }]));
  assert.throws(() => nextDiagnosticItem(SIM.pool, seed, [{ itemId: first, y: 2 }]));
  // "I don't know" can only score 0.
  assert.throws(() => estimate(SIM.pool, [{ itemId: first, y: 1, dontKnow: true }]), /don't know/);
  assert.throws(() =>
    replayDiagnostic(SIM.pool, seed, [{ itemId: first, y: 0.25, dontKnow: true }]),
  );
  assert.doesNotThrow(() => estimate(SIM.pool, [{ itemId: first, y: 0, dontKnow: true }]));
});

test("result: leads with phases (status + confidence), lessons below as 'likely'", () => {
  const link = { target: "Spanish", native: "English" };
  const { responses } = SIM.sessions[3];
  const result = buildDiagnosticResult(SIM.pool, responses, link);
  assert.deepEqual(Object.keys(result).slice(0, 2), ["overallPct", "phases"]);
  assert.equal(result.phases.length, 6);
  for (const [i, phase] of result.phases.entries()) {
    assert.equal(phase.id, BANK.phases[i].id);
    assert.deepEqual(phase.lessons, BANK.phases[i].lessons);
    assert.ok(["strong", "shaky", "new"].includes(phase.status));
    assert.ok(["high", "medium", "low"].includes(phase.confidence));
    assert.ok(phase.seen >= MIN_PER_PHASE);
  }
  assert.equal(result.lessons.length, 30);
  const mean = result.lessons.reduce((sum, l) => sum + l.mastery, 0) / 30;
  assert.ok(Math.abs(result.overallPct - Math.round(mean * 100)) <= 1);
  for (const lesson of result.lessons) {
    assert.equal(result.phases[lesson.phase].lessons.includes(lesson.lesson), true);
    assert.ok(!("status" in lesson), "lesson calls are labelled likely");
    const way = lesson.likely === "new" ? "see" : "recall";
    assert.equal(
      lesson.href,
      `/?module=roofing&tab=core30&target=Spanish&native=English&lesson=${lesson.lesson}&way=${way}`,
    );
  }
  const of = (status) => result.lessons.filter((l) => l.likely === status).map((l) => l.lesson);
  assert.deepEqual(result.studyOrder, [...of("shaky"), ...of("new")]);
  assert.deepEqual(result.strong, of("strong"));
  assert.equal(result.startHere, result.lessons.find((l) => l.likely !== "strong")?.lesson ?? null);

  const play = (y, dontKnow) => {
    const rs = [];
    for (let next; (next = nextDiagnosticItem(SIM.pool, "edge", rs));)
      rs.push({ itemId: next.itemId, y, dontKnow });
    return buildDiagnosticResult(SIM.pool, rs, link);
  };
  const top = play(1, false);
  assert.ok(
    top.phases.every((p) => p.status === "strong"),
    JSON.stringify(top.phases.map((p) => p.status)),
  );
  assert.ok(top.overallPct >= 85);
  const bottom = play(0, true);
  assert.ok(bottom.phases.every((p) => p.status === "new" && p.confidence === "high"));
  assert.ok(bottom.lessons.every((l) => l.likely === "new"));
  assert.equal(bottom.startHere, 1);
  assert.ok(bottom.overallPct <= 15);
});

test("model pieces: the Laplace update and the guessing floor behave as designed", () => {
  const prior = { mu: 0, v: 1.5 };
  const right = update(prior, 0, 0, 1);
  const wrong = update(prior, 0, 0, 0);
  assert.ok(right.mu > 0 && wrong.mu < 0 && right.v < prior.v);
  // A right multiple-choice answer (guess floor 0.2) is weaker evidence than a right typed one.
  assert.ok(update(prior, 0, 0.2, 1).mu < right.mu);
  assert.ok(Math.abs(update(prior, 0, 0, 0.5).mu) < 1e-12);
});

test("a bank without phases covering all 30 lessons cannot run the diagnostic", () => {
  const bank = clone(BANK);
  bank.phases = bank.phases.slice(1);
  assert.throws(() => diagnosticPool(bank), /phases/);
});

test("confidence is capped by evidence: phases < 3 answers low, < 6 at most medium", () => {
  // Direct: a posterior that looks certain still cannot claim more than its answers support.
  const sure = { mastery: 0.03, sd: 0.01 };
  assert.equal(classifyPhase({ ...sure, seen: 0 }).confidence, "low");
  assert.equal(classifyPhase({ ...sure, seen: 2 }).confidence, "low");
  assert.equal(classifyPhase({ ...sure, seen: 3 }).confidence, "medium");
  assert.equal(classifyPhase({ ...sure, seen: 5 }).confidence, "medium");
  assert.equal(classifyPhase({ ...sure, seen: 6 }).confidence, "high");
  assert.equal(classify({ mu: -5, v: 0.01, seen: 0 }).confidence, "low");
  assert.equal(classify({ mu: -5, v: 0.01, seen: 1 }).confidence, "medium");
  assert.equal(classify({ mu: -5, v: 0.01, seen: 2 }).confidence, "high");
  assert.equal(evidenceCeiling(5, "phase"), "medium");

  // A partial session: 5 answers in phase 1, 1 in phase 2, none elsewhere, all "I don't know".
  const inLesson = (lesson, n) => SIM.pool.byLesson.get(lesson).slice(0, n);
  const items = [...inLesson(1, 2), ...inLesson(2, 2), ...inLesson(3, 1), ...inLesson(7, 1)];
  const responses = items.map((item) => ({ itemId: item.id, y: 0, dontKnow: true }));
  const result = buildDiagnosticResult(SIM.pool, responses, {
    target: "Spanish",
    native: "English",
  });
  const [first, second, ...rest] = result.phases;
  assert.equal(first.seen, 5);
  assert.notEqual(first.confidence, "high");
  assert.equal(second.seen, 1);
  assert.equal(second.confidence, "low");
  for (const phase of rest) {
    assert.equal(phase.seen, 0);
    assert.equal(phase.confidence, "low");
  }
  for (const lesson of result.lessons.filter((l) => l.seen === 0))
    assert.equal(lesson.confidence, "low");
  for (const lesson of result.lessons.filter((l) => l.seen === 1))
    assert.notEqual(lesson.confidence, "high");
});
