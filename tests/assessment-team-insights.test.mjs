import test from "node:test";
import assert from "node:assert/strict";
import { aggregateTeamInsights } from "../src/lib/assessments/team-insights.ts";
const expected = [1, 2, 3].map((n) => ({
  id: `item${n}`,
  objectiveId: `roofing.lesson.${n}`,
  skill: "recall",
  maximum: 2,
}));
const scored = expected.map((item) => ({
  ...item,
  itemId: item.id,
  state: "scored",
  source: "human",
  points: 2,
}));
const learners = (n, evidence = scored) =>
  Array.from({ length: n }, (_, i) => ({
    learnerId: `private-learner-${i}`,
    attemptState: "completed",
    evidence,
  }));
const skill = (report) => report.items.find((row) => row.id === "skill:recall");
test("small teams reveal no size, identity or ratings", () => {
  for (let n = 0; n < 5; n++) {
    const report = aggregateTeamInsights(expected, learners(n));
    assert.equal(report.status, "small_group");
    assert.equal(report.learnerCount, null);
    assert.deepEqual(report.items, []);
  }
});
test("five final learners yield six skills plus objective cells without identifiers or keys", () => {
  const report = aggregateTeamInsights(expected, learners(5));
  assert.equal(report.learnerCount, 5);
  assert.equal(report.items.filter((row) => row.kind === "skill").length, 6);
  assert.equal(skill(report).meanScore, 100);
  assert.equal(skill(report).counts.scored, 5);
  assert.equal(report.items.find((row) => row.id === "skill:listening").meanScore, null);
  assert.equal(report.items.find((row) => row.id === "skill:listening").counts.not_assessed, 5);
  assert.equal(JSON.stringify(report).includes("private-learner"), false);
  assert.equal(JSON.stringify(report).includes("item1"), false);
});
test("missing evidence does not become zero or lower the scored subgroup mean", () => {
  const rows = [
    ...learners(5),
    ...learners(5, []).map((row, i) => ({ ...row, learnerId: `missing-${i}` })),
  ];
  const cell = skill(aggregateTeamInsights(expected, rows));
  assert.equal(cell.meanScore, 100);
  assert.equal(cell.scoredLearners, 5);
  assert.equal(cell.counts.not_assessed, 5);
});
test("a small complementary category suppresses the entire cell", () => {
  const rows = [...learners(5), { learnerId: "missing", attemptState: "completed", evidence: [] }];
  for (const cell of aggregateTeamInsights(expected, rows).items.filter(
    (row) => row.skill === "recall",
  )) {
    assert.equal(cell.visibility, "suppressed");
    assert.equal(cell.meanScore, null);
    assert.equal(cell.scoredLearners, null);
    assert.equal(cell.counts, null);
  }
});
test("AI proposals, missing grading, invalid ratings and mismatched maxima cannot become final", () => {
  for (const [evidence, attemptState, state] of [
    [scored.map((row) => ({ ...row, source: "ai_proposal" })), "completed", "pending"],
    [[], "scoring", "pending"],
    [[], "needs_review", "needs_review"],
    [scored.map((row) => ({ ...row, points: 99 })), "completed", "needs_review"],
    [scored.map((row) => ({ ...row, maximum: 4 })), "completed", "needs_review"],
  ]) {
    const report = aggregateTeamInsights(
      expected,
      learners(5, evidence).map((row) => ({ ...row, attemptState })),
    );
    assert.equal(skill(report).meanScore, null);
    assert.equal(skill(report).counts[state], 5);
  }
});
test("objective credit is distinct from the three-objective skill coverage rule", () => {
  const report = aggregateTeamInsights(expected, learners(5, [scored[0]]));
  assert.equal(skill(report).meanScore, null);
  assert.equal(skill(report).counts.insufficient_coverage, 5);
  assert.equal(report.items.find((row) => row.objectiveId === "roofing.lesson.1").meanScore, 100);
  assert.equal(
    report.items.find((row) => row.objectiveId === "roofing.lesson.2").counts.not_assessed,
    5,
  );
});
test("duplicated learner or response identities cannot inflate a cohort", () => {
  const rows = learners(5);
  rows[1].learnerId = rows[0].learnerId;
  assert.throws(() => aggregateTeamInsights(expected, rows), /Duplicate learner/);
  assert.throws(
    () => aggregateTeamInsights(expected, learners(5, [...scored, scored[0]])),
    /Duplicate evidence/,
  );
});
