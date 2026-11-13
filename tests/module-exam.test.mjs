import assert from "node:assert/strict";
import { test } from "node:test";
import { placementBlocks } from "../src/lib/module-placement.ts";
import {
  moduleExamScore,
  nextModuleExamBlock,
  placementAttemptSummary,
  moduleAnswerReview,
} from "../src/lib/module-exam.ts";

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

test("placement explains a weak block without counting untested questions as wrong", () => {
  const responses = Object.fromEntries(blocks[0].questions.map((q) => [q.id, q.answer]));
  responses[blocks[0].questions[1].id] = "wrong";
  responses[blocks[0].questions[3].id] = "";
  const summary = placementAttemptSummary(blocks, responses);
  assert.equal(summary.answered, 10);
  assert.equal(summary.correct, 8);
  assert.equal(summary.missed.length, 2);
  assert.equal(summary.blocks.length, 1);
  assert.equal(summary.blocks[0].typedCorrect, 3);
  assert.equal(summary.blocks[0].passed, false);
});

test("a fully correct placement has no rejected answers and passes every block", () => {
  const responses = Object.fromEntries(
    blocks.flatMap((b) => b.questions.map((q) => [q.id, q.answer])),
  );
  const summary = placementAttemptSummary(blocks, responses);
  assert.equal(summary.correct, 60);
  assert.equal(summary.missed.length, 0);
  assert.ok(summary.blocks.every((b) => b.passed));
  assert.equal(nextModuleExamBlock(blocks, responses, "placement"), undefined);
});

test("answer review preserves submissions and correct keys, excludes untested items, and follows question order", () => {
  const [meaning, typed, skipped] = blocks[0].questions;
  const completed = typed.prompt.replace("____", typed.answer);
  const responses = { [skipped.id]: "", [typed.id]: completed, [meaning.id]: "my wrong answer" };
  const review = moduleAnswerReview(blocks, responses);
  assert.deepEqual(
    review.map((entry) => entry.question.id),
    [meaning.id, typed.id, skipped.id],
  );
  assert.equal(review[0].response, "my wrong answer");
  assert.equal(review[0].question.answer, meaning.answer);
  assert.equal(review[0].correct, false);
  assert.equal(review[1].response, completed);
  assert.equal(review[1].question.answer, typed.answer);
  assert.equal(review[1].correct, true);
  assert.equal(review[2].response, "");
  assert.equal(review[2].correct, false);
  assert.equal(review[1].lesson.n, 1);
});
