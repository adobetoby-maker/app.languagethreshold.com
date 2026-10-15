import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeCore30Log } from "../src/lib/core30-plan.ts";
import {
  core30RecordReview,
  core30SetMastered,
  core30SetStartDate,
  core30StepOpened,
} from "../src/lib/core30-state.ts";

const M = "spanish-core30";
const T1 = "2026-01-01T10:00:00.000Z";
const T2 = "2026-01-05T10:00:00.000Z";
const T3 = "2026-01-09T10:00:00.000Z";
const T4 = "2026-01-10T10:00:00.000Z";

test("step opened records the first visit time", () => {
  const log = core30StepOpened({}, { moduleId: M, lesson: 3, step: 2, at: T1 });
  assert.deepEqual(log[M].lessons["3"].visits, { 2: T1 });
});

test("repeat visit keeps the first time and returns the same log reference", () => {
  const first = core30StepOpened({}, { moduleId: M, lesson: 3, step: 2, at: T1 });
  const again = core30StepOpened(first, { moduleId: M, lesson: 3, step: 2, at: T2 });
  assert.equal(again, first);
  assert.equal(again[M].lessons["3"].visits["2"], T1);
  const other = core30StepOpened(first, { moduleId: M, lesson: 3, step: 4, at: T2 });
  assert.deepEqual(other[M].lessons["3"].visits, { 2: T1, 4: T2 });
});

test("mastered sets masteredAt and keeps the earliest", () => {
  const a = core30SetMastered({}, { moduleId: M, lesson: 1, at: T1 });
  assert.equal(a[M].lessons["1"].masteredAt, T1);
  assert.equal(a[M].lessons["1"].reviews, undefined);
  const b = core30SetMastered(a, { moduleId: M, lesson: 1, at: T2 });
  assert.equal(b[M].lessons["1"].masteredAt, T1);
});

test("re-master on needsPractice clears it and appends an ok review without touching lastReviewAt", () => {
  let log = core30SetMastered({}, { moduleId: M, lesson: 1, at: T1 });
  log = core30RecordReview(log, { moduleId: M, at: T2, results: [{ lesson: 1, ok: false }] });
  assert.equal(log[M].lessons["1"].needsPractice, true);
  assert.equal(log[M].lastReviewAt, T2);
  const re = core30SetMastered(log, { moduleId: M, lesson: 1, at: T3 });
  const lesson = re[M].lessons["1"];
  assert.equal(lesson.needsPractice, false);
  assert.equal(lesson.masteredAt, T1);
  assert.deepEqual(lesson.reviews, [
    { at: T2, ok: false },
    { at: T3, ok: true },
  ]);
  assert.equal(re[M].lastReviewAt, T2);
});

test("start date sets startDate and startDateSetAt (stamp optional)", () => {
  const a = core30SetStartDate({}, { moduleId: M, date: "2026-01-01", at: T1 });
  assert.equal(a[M].startDate, "2026-01-01");
  assert.equal(a[M].startDateSetAt, T1);
  assert.deepEqual(a[M].lessons, {});
  const b = core30SetStartDate(a, { moduleId: M, date: "2026-02-01" });
  assert.equal(b[M].startDate, "2026-02-01");
  assert.equal(b[M].startDateSetAt, T1);
});

test("review sets lastReviewAt, per-lesson reviews and needsPractice", () => {
  const log = core30RecordReview(
    {},
    {
      moduleId: M,
      at: T2,
      results: [
        { lesson: 1, ok: true },
        { lesson: 2, ok: false },
      ],
    },
  );
  assert.equal(log[M].lastReviewAt, T2);
  assert.equal(log[M].lessons["1"].needsPractice, false);
  assert.deepEqual(log[M].lessons["1"].reviews, [{ at: T2, ok: true }]);
  assert.equal(log[M].lessons["2"].needsPractice, true);
  assert.deepEqual(log[M].lessons["2"].reviews, [{ at: T2, ok: false }]);
});

test("transitions do not mutate their input", () => {
  const base = core30SetMastered({}, { moduleId: M, lesson: 1, at: T1 });
  const snapshot = JSON.stringify(base);
  core30StepOpened(base, { moduleId: M, lesson: 1, step: 1, at: T2 });
  core30SetMastered(base, { moduleId: M, lesson: 1, at: T2 });
  core30SetStartDate(base, { moduleId: M, date: "2026-01-01", at: T2 });
  core30RecordReview(base, { moduleId: M, at: T2, results: [{ lesson: 1, ok: false }] });
  assert.equal(JSON.stringify(base), snapshot);
});

test("re-master survives cloud merge in both directions", () => {
  // Device A: mastered, failed review, then re-mastered. Device B (remote): only the failed review.
  let a = core30SetMastered({}, { moduleId: M, lesson: 1, at: T1 });
  a = core30RecordReview(a, { moduleId: M, at: T2, results: [{ lesson: 1, ok: false }] });
  const stale = a; // what the cloud / other device still holds
  a = core30SetMastered(a, { moduleId: M, lesson: 1, at: T3 });

  const localWins = mergeCore30Log(a, stale);
  const remoteWins = mergeCore30Log(stale, a);
  for (const merged of [localWins, remoteWins]) {
    const l = merged[M].lessons["1"];
    assert.equal(l.needsPractice, false, "re-master must not be reverted by the stale copy");
    assert.equal(l.masteredAt, T1);
    assert.deepEqual(l.reviews, [
      { at: T2, ok: false },
      { at: T3, ok: true },
    ]);
  }
  assert.deepEqual(localWins, remoteWins);

  // A later failed review on the other device still wins over the older re-master.
  const failedLater = core30RecordReview(stale, {
    moduleId: M,
    at: T4,
    results: [{ lesson: 1, ok: false }],
  });
  assert.equal(mergeCore30Log(a, failedLater)[M].lessons["1"].needsPractice, true);
  assert.equal(mergeCore30Log(failedLater, a)[M].lessons["1"].needsPractice, true);
});
