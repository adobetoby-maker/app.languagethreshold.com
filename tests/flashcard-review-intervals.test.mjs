import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REVIEW_INTERVALS,
  flashcardReviewLabel,
  newSrsFields,
  normalizeReviewIntervals,
  scheduleFlashcard,
} from "../src/lib/srs.ts";

test("new flashcard ratings use Again, 1, 2 and 4 days without changing the input", () => {
  const now = 1_000_000;
  const old = { ...newSrsFields(now - 100), interval: 30, dueDate: now + 30 * 86_400_000, repetitions: 8 };
  const snapshot = structuredClone(old);
  for (const [grade, days] of [["again", 0], ["hard", 1], ["good", 2], ["easy", 4]]) {
    const next = scheduleFlashcard(old, grade, DEFAULT_REVIEW_INTERVALS, now);
    assert.equal(next.interval, days);
    assert.equal(next.dueDate, now + days * 86_400_000);
    assert.equal(next.repetitions, grade === "again" ? 0 : 9);
  }
  assert.deepEqual(old, snapshot);
  assert.deepEqual(["again", "hard", "good", "easy"].map((grade) => flashcardReviewLabel(grade, DEFAULT_REVIEW_INTERVALS)), ["Again", "1 day", "2 days", "4 days"]);
});

test("saved interval choices are validated; changes apply to future reviews only", () => {
  assert.deepEqual(normalizeReviewIntervals({ hard: 3, good: 7, easy: 14 }), { hard: 3, good: 7, easy: 14 });
  assert.deepEqual(normalizeReviewIntervals({ hard: -1, good: "7", easy: 500 }), DEFAULT_REVIEW_INTERVALS);
  const old = newSrsFields(123);
  const next = scheduleFlashcard(old, "good", { hard: 3, good: 7, easy: 14 }, 500);
  assert.equal(next.dueDate, 500 + 7 * 86_400_000);
  assert.equal(old.dueDate, 123);
});
