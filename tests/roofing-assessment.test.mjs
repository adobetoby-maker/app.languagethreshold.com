import assert from "node:assert/strict";
import test from "node:test";
import {
  ROOFING_QUESTION_BANK,
  drawRoofingQuestions,
  publicRoofingQuestion,
  roofingQuestion,
  scoreRoofingAnswers,
} from "../src/lib/roofing-assessment.ts";

test("Roofing assessment covers the guide and added field language", () => {
  assert.equal(ROOFING_QUESTION_BANK.length, 70);
  assert.equal(new Set(ROOFING_QUESTION_BANK.map((q) => q.id)).size, 70);
  const questions = drawRoofingQuestions();
  assert.equal(questions.length, 25);
  assert.equal(new Set(questions).size, 25);
  const areas = questions.map((id) => roofingQuestion(id).area);
  assert.deepEqual(
    Object.fromEntries([...new Set(areas)].map((area) => [area, areas.filter((a) => a === area).length])),
    { materials: 5, tearOff: 5, installation: 7, safety: 5, closeout: 3 },
  );
});

test("learner questions hide answer keys and 20 of 25 is the passing boundary", () => {
  const ids = drawRoofingQuestions();
  for (const id of ids) {
    const visible = publicRoofingQuestion(id, "attempt-1");
    assert.equal(Object.hasOwn(visible, "answer"), false);
    assert.equal(visible.options.length, 4);
    assert.equal(new Set(visible.options).size, 4);
    assert.ok(visible.options.includes(roofingQuestion(id).answer));
    assert.deepEqual(visible.options, publicRoofingQuestion(id, "attempt-1").options);
  }
  const nineteen = Object.fromEntries(ids.slice(0, 19).map((id) => [id, roofingQuestion(id).answer]));
  const twenty = Object.fromEntries(ids.slice(0, 20).map((id) => [id, roofingQuestion(id).answer]));
  assert.equal(scoreRoofingAnswers(ids, nineteen).correct, 19);
  assert.equal(scoreRoofingAnswers(ids, twenty).correct, 20);
});
