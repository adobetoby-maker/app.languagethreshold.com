import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CORE30_DEFAULT_PACE,
  CORE30_FOUNDATION_PACE,
  CORE30_MASTER_PACE,
  addDays,
  core30PaceFor,
  daysBetween,
  isMasterModule,
  lessonDueDate,
  lessonDueOffset,
  planCalendar,
  planToday,
  reviewDates,
  summarizeCore30,
} from "../src/lib/core30-plan.ts";
import { describeCore30, describeCore30Tracks } from "../src/lib/team-core30.ts";

const START = "2026-03-02";
const MASTER = core30PaceFor("master-roofing");
const mastered = (...nums) => {
  const lessons = {};
  for (const n of nums) lessons[String(n)] = { visits: {}, masteredAt: "2026-03-02T12:00:00.000Z" };
  return lessons;
};
const dayOf = (date) => daysBetween(START, date) + 1;

test("core30PaceFor: master-* runs 3.5 / 4 / 70; default and Foundation are unchanged", () => {
  assert.deepEqual(MASTER, { newLessonEveryDays: 3.5, reviewEveryDays: 4, planDays: 70 });
  assert.equal(MASTER, CORE30_MASTER_PACE);
  assert.equal(core30PaceFor("master-plumber"), CORE30_MASTER_PACE);
  assert.equal(isMasterModule("master-roofing"), true);
  assert.equal(isMasterModule("roofing-master"), false);
  assert.deepEqual(core30PaceFor("foundation-roofing"), CORE30_FOUNDATION_PACE);
  assert.deepEqual(CORE30_FOUNDATION_PACE, { newLessonEveryDays: 1, reviewEveryDays: 4, planDays: 14 });
  assert.deepEqual(CORE30_DEFAULT_PACE, { newLessonEveryDays: 3, reviewEveryDays: 4, planDays: 90 });
  for (const id of ["roofing", "plumber", "", null, undefined]) {
    assert.equal(core30PaceFor(id), CORE30_DEFAULT_PACE, String(id));
  }
});

test("master pace: lesson n is due on start + floor((n - 1) * 3.5) days", () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => lessonDueOffset(i + 1, MASTER)),
    [0, 3, 7, 10, 14, 17],
  );
  assert.equal(lessonDueDate(START, 1, MASTER), START);
  assert.equal(lessonDueDate(START, 2, MASTER), addDays(START, 3));
  assert.equal(lessonDueDate(START, 3, MASTER), addDays(START, 7));
  // Lesson 20 is due on day floor(19 * 3.5) + 1 = 67.
  assert.equal(dayOf(lessonDueDate(START, 20, MASTER)), 67);
  assert.equal(lessonDueOffset(20, MASTER), 66);
});

test("master pace: reviews on days 5, 9, ... 69 and nothing after day 70", () => {
  const reviews = reviewDates(START, MASTER.reviewEveryDays, MASTER.planDays).map(dayOf);
  assert.deepEqual(reviews.slice(0, 3), [5, 9, 13]);
  assert.equal(reviews.at(-1), 69);

  const calendar = planCalendar(START, 20, MASTER.reviewEveryDays, MASTER);
  assert.deepEqual(
    calendar.filter((e) => e.newLesson !== undefined).map((e) => [e.day, e.newLesson]),
    Array.from({ length: 20 }, (_, i) => [lessonDueOffset(i + 1, MASTER) + 1, i + 1]),
  );
  assert.equal(calendar.find((e) => e.newLesson === 20).day, 67);
  assert.deepEqual(
    calendar.filter((e) => e.review).map((e) => e.day),
    reviews,
  );
  assert.ok(calendar.every((e) => e.day <= 70), "nothing is scheduled after day 70");
  assert.equal(calendar.at(-1).day, 69);
  // Lesson 3 is due at offset 7, which is day 8.
  assert.equal(calendar.find((e) => e.day === 8)?.newLesson, 3);
});

test("master pace: planToday expects lessons on the 3.5-day cadence", () => {
  const log = { startDate: START, lessons: {} };
  const expectedOn = (day) => planToday(log, 20, addDays(START, day - 1), 4, MASTER).expectedMastered;
  assert.equal(expectedOn(1), 1);
  assert.equal(expectedOn(3), 1);
  assert.equal(expectedOn(4), 2);
  assert.equal(expectedOn(7), 2);
  assert.equal(expectedOn(8), 3);
  assert.equal(expectedOn(67), 20);
  assert.equal(expectedOn(200), 20);

  const behind = planToday({ startDate: START, lessons: mastered(1) }, 20, addDays(START, 7), 4, MASTER);
  assert.equal(behind.dayNumber, 8);
  assert.equal(behind.status, "behind");
  assert.equal(behind.behindBy, 2);
  assert.equal(behind.nextLesson.n, 2);
  assert.equal(behind.nextLesson.dueDate, addDays(START, 3));
  assert.equal(behind.nextReviewDate, addDays(START, 8));
});

test("default and Foundation schedules are unchanged by the fractional support", () => {
  assert.equal(lessonDueDate(START, 30), addDays(START, 87));
  assert.equal(planCalendar(START, 30).at(-1).day, 89);
  assert.equal(planToday({ startDate: START, lessons: {} }, 30, addDays(START, 3)).expectedMastered, 2);
  assert.equal(lessonDueDate(START, 10, CORE30_FOUNDATION_PACE), addDays(START, 9));
  assert.equal(
    planToday({ startDate: START, lessons: {} }, 10, addDays(START, 4), 4, CORE30_FOUNDATION_PACE)
      .expectedMastered,
    5,
  );
});

test("team stats use the master pace through the module id, including for scoped tracks", () => {
  const log = { startDate: START, lessons: mastered(1) };
  const today = addDays(START, 7);
  const direct = summarizeCore30(log, 20, today, MASTER);
  assert.equal(direct.status, "behind");
  assert.equal(direct.behindBy, 2);
  const display = describeCore30({ u1: { "master-roofing": log } }, "u1", "master-roofing", 20, today);
  assert.equal(display.status, "behind");
  assert.equal(display.statusLabel, "Behind by 2");

  // describeCore30Tracks files the log under a scope key; the pace still follows module_id.
  const scopeKey = JSON.stringify(["core30", 1, "master-roofing", "Spanish", "English", "plan-1"]);
  const [track] = describeCore30Tracks({ core30Log: { [scopeKey]: log } }, [
    {
      id: "plan-1",
      module_id: "master-roofing",
      target_language: "Spanish",
      instruction_language: "English",
      lessonCount: 20,
      studyStartDate: START,
      timezone: "UTC",
      status: "paused",
      paused_on: today,
    },
  ]);
  assert.equal(track.total, 20);
  assert.equal(track.status, "behind");
  assert.match(track.statusLabel, /Behind by 2/);
});
