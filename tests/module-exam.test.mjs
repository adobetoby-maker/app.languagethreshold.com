import assert from "node:assert/strict";
import { test } from "node:test";
import { placementBlocks } from "../src/lib/module-placement.ts";
import { moduleExamScore, nextModuleExamBlock } from "../src/lib/module-exam.ts";

const lessons = Array.from({ length: 30 }, (_, index) => ({
  moduleId: "demo",
  n: index + 1,
  title: `Lesson ${index + 1}`,
  stage: "core",
  words: ["one", "two", "three", "four"].map((word, j) => ({
    es: `frase ${index} ${j}`,
    en: `${word} ${index}`,
    kind: "phrase",
  })),
  checks: [{ prompt: "Yo ____.", hint: "I speak.", answer: "hablo" }],
}));
const blocks = placementBlocks(lessons, "exam");
test("post-Core continues beyond a failed block, placement stops there", () => {
  const responses = Object.fromEntries(blocks[0].questions.map((q) => [q.id, "wrong"]));
  assert.equal(nextModuleExamBlock(blocks, responses, "placement"), blocks[0]);
  assert.equal(nextModuleExamBlock(blocks, responses, "post-core"), blocks[1]);
});
test("post-Core covers all 30 lessons and cannot finish on unanswered questions", () => {
  assert.equal(moduleExamScore(blocks, {}).total, 60);
  assert.equal(moduleExamScore(blocks, {}).complete, false);
  const responses = Object.fromEntries(
    blocks.flatMap((b) => b.questions.map((q) => [q.id, q.answer])),
  );
  assert.deepEqual(moduleExamScore(blocks, responses), {
    correct: 60,
    total: 60,
    percent: 100,
    complete: true,
    review: [],
  });
  responses[blocks[2].questions[3].id] = "";
  const score = moduleExamScore(blocks, responses);
  assert.equal(score.correct, 59);
  assert.equal(score.review.length, 1);
  assert.equal(score.review[0].n, 12);
  assert.equal(nextModuleExamBlock(blocks, responses, "post-core"), undefined);
});
test("a fresh draw has a fresh attempt and no prior answers", () => {
  const retry = placementBlocks(lessons, "retry");
  assert.equal(nextModuleExamBlock(retry, {}, "post-core"), retry[0]);
  assert.equal(moduleExamScore(retry, {}).correct, 0);
});
