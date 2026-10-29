import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointBoundaries,
  pendingCheckpoint,
  reviewPair,
  selectReviewCards,
  startReviewRound,
  rateReviewRound,
  readReviewRecord,
} from "../src/lib/lesson-review-rounds.ts";
import { newSrsFields, schedule, nextReviewLabel } from "../src/lib/srs.ts";
import { createLearnerDeviceStore } from "../src/lib/learner-device-store.ts";

test("60 authored lessons retain 20 additional checkpoints, including stage crossings and lesson 60", () => {
  assert.deepEqual(
    checkpointBoundaries(60),
    Array.from({ length: 20 }, (_, i) => (i + 1) * 3),
  );
  assert.deepEqual(checkpointBoundaries(10), [3, 6, 9, 10]);
  const complete = Array(60).fill(false);
  complete.fill(true, 0, 12);
  assert.equal(pendingCheckpoint(complete, { 3: 1, 6: 1, 9: 1 }), 12);
  assert.equal(pendingCheckpoint(complete, { 3: 1, 6: 1, 9: 1, 12: 1 }), null);
  complete[11] = false;
  assert.equal(pendingCheckpoint(complete, { 3: 1, 6: 1, 9: 1 }), null);
  assert.equal(
    pendingCheckpoint(
      Array(60).fill(true),
      Object.fromEntries(checkpointBoundaries(57).map((n) => [n, 1])),
    ),
    60,
  );
});
const card = (id, due, grade) => ({
  id,
  srs: { ...newSrsFields(0), dueDate: due },
  reviewHistory: grade ? [{ grade, at: 1 }] : [],
});
test("due selection prioritizes weak encountered candidates and bounds the session", () => {
  const cards = [
    card("future", 500, "again"),
    card("overdue", 1),
    card("hard", 80, "hard"),
    card("again", 90, "again"),
    ...Array.from({ length: 30 }, (_, i) => card(`other${i}`, 2)),
  ];
  const chosen = selectReviewCards(cards, 100, true);
  assert.equal(chosen.length, 12);
  assert.deepEqual(
    chosen.slice(0, 2).map((c) => c.id),
    ["again", "hard"],
  );
  assert.ok(!chosen.some((c) => c.id === "future"));
  assert.equal(cards[0].srs.dueDate, 500);
});
test("lapses recur after intervening cards, persist and terminate even on repeated failure", () => {
  let round = startReviewRound(
    Array.from({ length: 12 }, (_, i) => card(String(i), 0)),
    3,
    100,
  );
  const failed = round.queue[0];
  round = rateReviewRound(round, "again");
  assert.equal(round.queue.indexOf(failed), 3);
  assert.deepEqual(
    readReviewRecord(JSON.parse(JSON.stringify({ completed: {}, round }))).round,
    round,
  );
  let count = 1;
  while (round.queue.length) {
    round = rateReviewRound(round, "again");
    count++;
    assert.ok(count <= 18);
  }
  assert.equal(rateReviewRound(startReviewRound([card("lone", 0)], 3, 1), "again").queue.length, 0);
});
test("actual scheduler intervals are honest; Again resets repetitions without resetting history", () => {
  const established = { ...newSrsFields(0), interval: 30, repetitions: 8, easeFactor: 2.5 };
  const lapse = schedule(established, "again", 100);
  assert.equal(lapse.repetitions, 0);
  assert.equal(lapse.dueDate, 100 + 86400000);
  for (const grade of ["again", "hard", "good", "easy"]) {
    const days = schedule(established, grade, 100).interval;
    assert.equal(nextReviewLabel(established, grade, 100), days === 1 ? "1 day" : `${days} days`);
  }
  assert.notEqual(reviewPair("año", "year"), reviewPair("ano", "year"));
  assert.equal(reviewPair("an\u0303o", "year"), reviewPair("año", "year"));
});
test("resumable checkpoint state remains account/pair/plan scoped and rejects malformed rounds", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const make = (actor, kind) =>
    createLearnerDeviceStore({ actor, kind, storage, isCurrent: () => true });
  const a = make("one", "review:roofing:Spanish:English:planA");
  const value = { completed: { 3: 123 }, round: startReviewRound([card("existing-id", 0)], 6, 1) };
  assert.equal(a.write(value), true);
  assert.deepEqual(readReviewRecord(a.read()), value);
  assert.equal(make("two", a.kind).read(), null);
  assert.equal(make("one", "review:roofing:French:English:planA").read(), null);
  assert.equal(make("one", "review:roofing:Spanish:English:planB").read(), null);
  assert.equal(readReviewRecord({ round: { queue: [1] } }).round, null);
});
