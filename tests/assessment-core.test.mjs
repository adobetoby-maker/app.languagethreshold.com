import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointSchedule,
  addCalendarDays,
  localNoonTimestamp,
  skillResults,
  compareSkillEvidence,
  scoreFixedAnswer,
} from "../src/lib/assessments/core.ts";
const row = (objective, points = 1, patch = {}) => ({
  itemId: `item-${objective}`,
  objectiveId: objective,
  skill: "listening",
  state: "scored",
  points,
  maximum: 1,
  source: "deterministic",
  comparisonGroup: `anchor-${objective}`,
  ...patch,
});
test("45/90 schedules use calendar days across DST, including leap years", () => {
  const schedule = checkpointSchedule("2026-10-15", "America/Denver");
  assert.deepEqual(
    schedule.map((s) => s.date),
    ["2026-10-15", "2026-11-28", "2027-01-12"],
  );
  assert.equal(schedule[0].dueAt, "2026-10-15T18:00:00.000Z");
  assert.equal(schedule[1].dueAt, "2026-11-28T19:00:00.000Z");
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.throws(() => addCalendarDays("2026-02-30", 1));
  assert.throws(() => localNoonTimestamp("2026-10-15", "imaginary/zone"));
  assert.throws(() => localNoonTimestamp("2011-12-30", "Pacific/Apia"));
});
test("missing and uncertain evidence never become zero or final AI scores", () => {
  const result = skillResults([
    row("a"),
    row("b"),
    row("c", null, { state: "pending" }),
    row("d", 0, { state: "scored", source: "ai_proposal" }),
  ]);
  const listening = result.find((s) => s.skill === "listening");
  assert.equal(listening.state, "pending");
  assert.equal(listening.score, null);
  assert.equal(listening.pendingCount, 2);
  assert.equal(result.find((s) => s.skill === "speaking").state, "not_assessed");
  const underReview = skillResults([row("a"), row("b"), row("c", null, { state: "needs_review" })]);
  assert.equal(underReview.find((s) => s.skill === "listening").state, "needs_review");
});
test("reported skills require three distinct objectives and retain provisional status", () => {
  assert.equal(
    skillResults([row("a"), row("a"), row("b")]).find((s) => s.skill === "listening").score,
    null,
  );
  const result = skillResults([row("a"), row("b"), row("c", 0)]).find(
    (s) => s.skill === "listening",
  );
  assert.equal(result.score, 67);
  assert.equal(result.provisional, true);
});
test("growth requires approved equivalent groups and excludes expanded coverage", () => {
  const before = [row("a", 0), row("b", 0), row("c", 1)];
  const after = [row("a"), row("b"), row("c"), row("extra", 0), row("extra2", 0)];
  assert.equal(compareSkillEvidence(before, after, "listening").change, null);
  assert.deepEqual(compareSkillEvidence(before, after, "listening", true), {
    objectives: ["a", "b", "c"],
    before: 33,
    after: 100,
    change: 67,
  });
  assert.equal(
    compareSkillEvidence(
      before,
      after.map((r) => ({ ...r, comparisonGroup: "unrelated" })),
      "listening",
      true,
    ).change,
    null,
  );
});
test("accepted variants respect item-specific accents and preserve meaningful marks", () => {
  const strict = { caseSensitive: false, accents: "required", punctuation: "ignore" };
  assert.equal(scoreFixedAnswer(" LÁMINA metálica! ", ["lámina metálica"], strict), true);
  assert.equal(scoreFixedAnswer("lamina metalica", ["lámina metálica"], strict), false);
  assert.equal(
    scoreFixedAnswer("lamina metalica", ["lámina metálica"], { ...strict, accents: "ignore" }),
    true,
  );
  assert.equal(scoreFixedAnswer("", [""], strict), false);
});
