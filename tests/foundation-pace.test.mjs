import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CORE30_DEFAULT_PACE,
  addDays,
  core30PaceFor,
  daysBetween,
  foundationAccess,
  isFoundationModule,
  lessonDueDate,
  planCalendar,
  planToday,
  reviewDates,
} from "../src/lib/core30-plan.ts";

const START = "2026-03-02";
const FOUNDATION = core30PaceFor("foundation-roofing");
const mastered = (...nums) => {
  const lessons = {};
  for (const n of nums) lessons[String(n)] = { visits: {}, masteredAt: "2026-03-02T12:00:00.000Z" };
  return lessons;
};

test("core30PaceFor: Foundations run 1 / 4 / 14, every other module keeps 3 / 4 / 90", () => {
  assert.deepEqual(FOUNDATION, { newLessonEveryDays: 1, reviewEveryDays: 4, planDays: 14 });
  assert.deepEqual(CORE30_DEFAULT_PACE, { newLessonEveryDays: 3, reviewEveryDays: 4, planDays: 90 });
  for (const id of ["roofing", "plumber", "framer", "lds-missionary", "", null, undefined]) {
    assert.deepEqual(core30PaceFor(id), CORE30_DEFAULT_PACE, String(id));
  }
  assert.equal(isFoundationModule("foundation-plumber"), true);
  assert.equal(isFoundationModule("roofing-foundation"), false);
});

test("foundation pace: lesson 10 is due on day 10 and the last review is before day 14", () => {
  assert.equal(lessonDueDate(START, 1, FOUNDATION), START);
  const last = lessonDueDate(START, 10, FOUNDATION);
  assert.equal(daysBetween(START, last) + 1, 10);

  const reviews = reviewDates(START, FOUNDATION.reviewEveryDays, FOUNDATION.planDays);
  assert.deepEqual(
    reviews.map((d) => daysBetween(START, d) + 1),
    [5, 9, 13],
  );

  const calendar = planCalendar(START, 10, FOUNDATION.reviewEveryDays, FOUNDATION);
  const lessonDays = calendar.filter((e) => e.newLesson !== undefined);
  assert.deepEqual(
    lessonDays.map((e) => [e.day, e.newLesson]),
    Array.from({ length: 10 }, (_, i) => [i + 1, i + 1]),
  );
  assert.equal(Math.max(...calendar.map((e) => e.day)), 13, "nothing is scheduled on or after day 14");
  assert.deepEqual(
    calendar.filter((e) => e.review).map((e) => e.day),
    [5, 9, 13],
  );
});

test("foundation pace: planToday expects one lesson a day", () => {
  const log = { startDate: START, lessons: {} };
  assert.equal(planToday(log, 10, START, 4, FOUNDATION).expectedMastered, 1);
  assert.equal(planToday(log, 10, addDays(START, 4), 4, FOUNDATION).expectedMastered, 5);
  assert.equal(planToday(log, 10, addDays(START, 20), 4, FOUNDATION).expectedMastered, 10);
  // Two days in with one lesson done: behind by one under the Foundation pace.
  const behind = planToday({ startDate: START, lessons: mastered(1) }, 10, addDays(START, 2), 4, FOUNDATION);
  assert.equal(behind.status, "behind");
  assert.equal(behind.behindBy, 2);
  assert.equal(behind.nextLesson.n, 2);
  assert.equal(behind.nextLesson.dueDate, addDays(START, 1));
});

test("default pace is unchanged: lesson 30 on day 88, reviews to day 89, 90-day calendar", () => {
  assert.equal(lessonDueDate(START, 30), addDays(START, 87));
  assert.equal(lessonDueDate(START, 30, CORE30_DEFAULT_PACE), addDays(START, 87));
  const dates = reviewDates(START);
  assert.equal(dates.length, 22);
  assert.equal(dates[0], addDays(START, 4));
  assert.equal(dates.at(-1), addDays(START, 88));
  assert.deepEqual(planCalendar(START, 30), planCalendar(START, 30, 4, CORE30_DEFAULT_PACE));
  assert.equal(planCalendar(START, 30).at(-1).day, 89);
  const p = planToday({ startDate: START, lessons: {} }, 30, addDays(START, 3));
  assert.equal(p.expectedMastered, 2);
});

test("foundationAccess: free for signed-in learners on lesson tabs only", () => {
  const guest = { loading: false, signedIn: false };
  const member = { loading: false, signedIn: true };
  for (const tab of ["core30", "speak", "reader"]) {
    assert.equal(foundationAccess("foundation-roofing", tab, member), "free", tab);
    assert.equal(foundationAccess("foundation-roofing", tab, guest), "sign-in", tab);
    // Auth still loading: render the page like the paid path does, never flash a prompt.
    assert.equal(foundationAccess("foundation-roofing", tab, { loading: true, signedIn: false }), "free");
  }
  // Other tabs of a Foundation, and every tab of any other module, keep today's rules.
  for (const tab of ["dashboard", "dictionary", "games", "flashcards"]) {
    assert.equal(foundationAccess("foundation-roofing", tab, member), "paid", tab);
  }
  for (const id of ["roofing", "plumber", null, undefined]) {
    for (const tab of ["core30", "speak", "reader"]) {
      assert.equal(foundationAccess(id, tab, member), "paid", `${id}/${tab}`);
    }
  }
});
