// Built by TAC — 2026-10-23
// Exams v2 adaptive diagnostic, learners whose knowledge is NOT contiguous (independent lessons,
// a random half, everything mid-level). 50 questions over 30 lessons cannot pin these down lesson
// by lesson; the phase layer is what stays usable. Figures are from simulated learners only.
import assert from "node:assert/strict";
import test from "node:test";
import { MIN_PER_PHASE } from "../src/lib/exams2/adaptive.ts";
import { buildSyntheticBank } from "./fixtures/exams2-synthetic-bank.mjs";
import { pct, SCATTERED_KINDS, simulate } from "./fixtures/exams2-simulation.mjs";

const PER_KIND = 250;
const SIM = simulate(buildSyntheticBank(), {
  kinds: SCATTERED_KINDS,
  perKind: PER_KIND,
  baseSeed: 4242,
});

test("agreement table (scattered kinds): lesson-level and phase-level, per kind", (t) => {
  for (const kind of SCATTERED_KINDS) {
    const s = SIM.stats[kind];
    t.diagnostic(
      `${kind}: lesson ${pct(SIM.rate(s.lesson))}, phase ${pct(SIM.rate(s.phase))}; phase by confidence ` +
        Object.entries(s.phaseConfidence)
          .map(([c, v]) => `${c} ${pct(v[0] / v[1])} (n=${v[1]})`)
          .join(", "),
    );
  }
  // Regression floors from measurement (3 x 250 learners). Lesson-level calls for these kinds
  // are weak by construction and carry no floor; the result labels them "likely".
  for (const kind of SCATTERED_KINDS) {
    const phase = SIM.rate(SIM.stats[kind].phase);
    assert.ok(phase >= 0.68, `${kind} phase-level ${pct(phase)} < 68%`);
  }
});

test("in simulation, high-confidence phase calls are right >= 90% of the time (simulated truth)", (t) => {
  let right = 0;
  let total = 0;
  for (const kind of SCATTERED_KINDS) {
    const high = SIM.stats[kind].phaseConfidence.high ?? [0, 0];
    right += high[0];
    total += high[1];
  }
  t.diagnostic(`high-confidence phase calls ${pct(right / total)} right (n=${total})`);
  assert.ok(total > 0 && right / total >= 0.9);
});

test("scattered sessions keep the guarantees: >= 6 per phase, exposure <= 45%", (t) => {
  for (const { responses } of SIM.sessions) {
    const perPhase = new Map();
    for (const r of responses) {
      const phase = SIM.pool.phaseOf.get(SIM.pool.byId.get(r.itemId).lesson);
      perPhase.set(phase, (perPhase.get(phase) ?? 0) + 1);
    }
    for (const n of perPhase.values()) assert.ok(n >= MIN_PER_PHASE);
  }
  t.diagnostic(`max exposure ${pct(SIM.maxExposure)}`);
  assert.ok(SIM.maxExposure <= 0.45);
});
