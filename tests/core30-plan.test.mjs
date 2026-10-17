import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  daysBetween,
  lessonDueDate,
  masteredLessons,
  previouslyMasteredLessons,
  mergeCore30Log,
  planCalendar,
  planToday,
  reviewDates,
  summarizeCore30,
  toDateKey,
} from "../src/lib/core30-plan.ts";

const START = "2026-01-01";
const iso = (key, hour = 12) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};
const mastered = (...nums) => {
  const lessons = {};
  for (const n of nums) lessons[String(n)] = { visits: {}, masteredAt: iso(START) };
  return lessons;
};

test("toDateKey formats local calendar dates", () => {
  assert.equal(toDateKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(toDateKey(new Date(2026, 11, 31, 0, 1)), "2026-12-31");
});

test("lessonDueDate: lesson 1 is the start date, lesson 30 is start+87", () => {
  assert.equal(lessonDueDate(START, 1), START);
  assert.equal(lessonDueDate(START, 2), "2026-01-04");
  assert.equal(lessonDueDate(START, 30), addDays(START, 87));
  assert.equal(daysBetween(START, lessonDueDate(START, 30)), 87);
});

test("reviewDates: first start+4, last <= start+90, 22 entries", () => {
  const dates = reviewDates(START);
  assert.equal(dates.length, 22);
  assert.equal(dates[0], addDays(START, 4));
  assert.equal(dates[1], addDays(START, 8));
  assert.ok(daysBetween(START, dates[dates.length - 1]) <= 90);
  assert.equal(daysBetween(START, dates[dates.length - 1]), 88);
});

test("addDays and daysBetween across month end and DST changes", () => {
  assert.equal(addDays("2026-01-30", 3), "2026-02-02");
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(addDays("2026-03-03", -3), "2026-02-28");
  assert.equal(daysBetween("2026-01-31", "2026-03-01"), 29);
  // US DST: spring forward 2026-03-08, fall back 2026-11-01
  assert.equal(addDays("2026-03-07", 2), "2026-03-09");
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(addDays("2026-10-31", 2), "2026-11-02");
  assert.equal(daysBetween("2026-10-31", "2026-11-02"), 2);
  assert.equal(daysBetween("2026-03-01", "2026-12-01"), 275);
  assert.equal(daysBetween("2026-05-05", "2026-05-01"), -4);
});

test("masteredLessons returns sorted lesson numbers", () => {
  assert.deepEqual(masteredLessons(undefined), []);
  assert.deepEqual(masteredLessons({ lessons: mastered(10, 2, 7) }), [2, 7, 10]);
  assert.deepEqual(masteredLessons({ lessons: { 3: { visits: {} } } }), []);
});

test("planToday: not started", () => {
  const p = planToday(undefined, 30, "2026-01-01");
  assert.equal(p.started, false);
  assert.equal(p.status, "not-started");
  assert.equal(p.dayNumber, 0);
  assert.equal(p.nextLesson, null);
  assert.equal(p.reviewDue, false);
  assert.deepEqual(p.reviewLessons, []);
  const noDate = planToday({ lessons: mastered(1) }, 30, "2026-01-01");
  assert.equal(noDate.started, false);
  assert.equal(noDate.masteredCount, 1);
});

test("planToday: start in the future gives day 0", () => {
  const p = planToday({ startDate: "2026-02-01", lessons: {} }, 30, "2026-01-20");
  assert.equal(p.started, true);
  assert.equal(p.dayNumber, 0);
  assert.equal(p.expectedMastered, 0);
  assert.equal(p.nextLesson.n, 1);
  assert.equal(p.nextLesson.overdue, false);
  assert.equal(p.reviewDue, false);
});

test("planToday: day 1 with nothing mastered is on-track", () => {
  const p = planToday({ startDate: START, lessons: {} }, 30, START);
  assert.equal(p.dayNumber, 1);
  assert.equal(p.expectedMastered, 1);
  assert.equal(p.masteredCount, 0);
  assert.equal(p.status, "on-track");
  assert.equal(p.behindBy, 0);
  assert.deepEqual(p.nextLesson, { n: 1, dueDate: START, overdue: false });
  // one day later lesson 1 is overdue and the learner is behind
  const next = planToday({ startDate: START, lessons: {} }, 30, addDays(START, 1));
  assert.equal(next.status, "behind");
  assert.equal(next.behindBy, 1);
});

test("planToday: day 1 with lesson 1 mastered is on-track", () => {
  const p = planToday({ startDate: START, lessons: mastered(1) }, 30, START);
  assert.equal(p.status, "on-track");
  assert.equal(p.behindBy, 0);
  assert.equal(p.nextLesson.n, 2);
  assert.equal(p.nextLesson.overdue, false);
});

test("planToday: day 10 with 2 mastered is behind by 2 with overdue next lesson", () => {
  const today = addDays(START, 9);
  const p = planToday({ startDate: START, lessons: mastered(1, 2) }, 30, today);
  assert.equal(p.dayNumber, 10);
  assert.equal(p.expectedMastered, 4);
  assert.equal(p.status, "behind");
  assert.equal(p.behindBy, 2);
  assert.deepEqual(p.nextLesson, { n: 3, dueDate: addDays(START, 6), overdue: true });
});

test("planToday: ahead of schedule and capped expectation", () => {
  const ahead = planToday({ startDate: START, lessons: mastered(1, 2, 3) }, 30, START);
  assert.equal(ahead.status, "ahead");
  assert.equal(ahead.behindBy, 0);
  const late = planToday({ startDate: START, lessons: {} }, 30, addDays(START, 200));
  assert.equal(late.expectedMastered, 30);
});

test("planToday: nextLesson null when all lessons mastered", () => {
  const all = Array.from({ length: 30 }, (_, i) => i + 1);
  const p = planToday({ startDate: START, lessons: mastered(...all) }, 30, addDays(START, 40));
  assert.equal(p.nextLesson, null);
  assert.equal(p.masteredCount, 30);
});

test("planToday: review due on day 5 with mastered lessons and no lastReviewAt", () => {
  const today = addDays(START, 4);
  const p = planToday({ startDate: START, lessons: mastered(1, 2) }, 30, today);
  assert.equal(p.dayNumber, 5);
  assert.equal(p.reviewDue, true);
  assert.deepEqual(p.reviewLessons, [1, 2]);
  assert.equal(p.lastReviewDate, today);
  assert.equal(p.nextReviewDate, addDays(START, 8));
});

test("planToday: review not due once done on or after the review date", () => {
  const today = addDays(START, 4);
  const log = { startDate: START, lessons: mastered(1, 2), lastReviewAt: iso(today, 9) };
  const p = planToday(log, 30, today);
  assert.equal(p.reviewDue, false);
  assert.deepEqual(p.reviewLessons, []);
  assert.equal(p.nextReviewDate, addDays(START, 8));
  // and due again on the next review date
  const next = planToday(log, 30, addDays(START, 8));
  assert.equal(next.reviewDue, true);
});

test("planToday: a missed review stays due on later days", () => {
  const p = planToday({ startDate: START, lessons: mastered(1) }, 30, addDays(START, 6));
  assert.equal(p.reviewDue, true);
  assert.equal(p.lastReviewDate, addDays(START, 4));
});

test("planToday: no review due when nothing is mastered or before day 5", () => {
  const none = planToday({ startDate: START, lessons: {} }, 30, addDays(START, 4));
  assert.equal(none.reviewDue, false);
  const early = planToday({ startDate: START, lessons: mastered(1) }, 30, addDays(START, 3));
  assert.equal(early.reviewDue, false);
  assert.equal(early.lastReviewDate, undefined);
  assert.equal(early.nextReviewDate, addDays(START, 4));
});

test("planToday: no next review after the plan ends", () => {
  const p = planToday({ startDate: START, lessons: mastered(1) }, 30, addDays(START, 95));
  assert.equal(p.nextReviewDate, undefined);
  assert.equal(p.lastReviewDate, addDays(START, 88));
});

test("planToday: needsPractice lists flagged lessons", () => {
  const lessons = {
    ...mastered(1, 2, 3),
    2: { visits: {}, masteredAt: iso(START), needsPractice: true },
    3: { visits: {}, masteredAt: iso(START), needsPractice: true },
  };
  const p = planToday({ startDate: START, lessons }, 30, addDays(START, 1));
  assert.deepEqual(p.needsPractice, [2, 3]);
});

test("planCalendar: lesson 30 on day 88, review on start+4, 1-based days", () => {
  const cal = planCalendar(START, 30);
  const d88 = cal.find((c) => c.day === 88);
  assert.equal(d88.newLesson, 30);
  assert.equal(d88.date, addDays(START, 87));
  const first = cal[0];
  assert.equal(first.day, 1);
  assert.equal(first.newLesson, 1);
  assert.equal(first.review, false);
  const rev = cal.find((c) => c.date === addDays(START, 4));
  assert.equal(rev.review, true);
  assert.equal(rev.day, 5);
  assert.equal(rev.newLesson, undefined);
  // day 13 = offset 12: both a new lesson (5) and a review
  const both = cal.find((c) => c.date === addDays(START, 12));
  assert.equal(both.newLesson, 5);
  assert.equal(both.review, true);
  assert.equal(cal.filter((c) => c.review).length, 22);
  assert.equal(cal.filter((c) => c.newLesson !== undefined).length, 30);
  assert.ok(cal.every((c) => c.day <= 90));
});

test("planCalendar extends past day 90 when lessons need more days", () => {
  const cal = planCalendar(START, 40);
  assert.equal(cal[cal.length - 1].newLesson, 40);
  assert.equal(cal[cal.length - 1].day, 118);
});

test("mergeCore30Log keeps earliest visit and unions reviews", () => {
  const local = {
    m1: {
      startDate: "2026-01-01",
      lastReviewAt: "2026-01-09T10:00:00.000Z",
      lessons: {
        1: {
          visits: { 0: "2026-01-02T10:00:00.000Z", 1: "2026-01-03T10:00:00.000Z" },
          masteredAt: "2026-01-05T10:00:00.000Z",
          needsPractice: true,
          reviews: [
            { at: "2026-01-05T10:00:00.000Z", ok: true },
            { at: "2026-01-09T10:00:00.000Z", ok: false },
          ],
        },
      },
    },
  };
  const remote = {
    m1: {
      startDate: "2026-01-02",
      lastReviewAt: "2026-01-05T10:00:00.000Z",
      lessons: {
        1: {
          visits: { 0: "2026-01-01T10:00:00.000Z", 2: "2026-01-04T10:00:00.000Z" },
          masteredAt: "2026-01-04T10:00:00.000Z",
          needsPractice: false,
          reviews: [{ at: "2026-01-05T10:00:00.000Z", ok: true }],
        },
        2: { visits: { 0: "2026-01-06T10:00:00.000Z" } },
      },
    },
    m2: { lessons: {} },
  };
  const merged = mergeCore30Log(local, remote);
  const l1 = merged.m1.lessons[1];
  assert.deepEqual(l1.visits, {
    0: "2026-01-01T10:00:00.000Z",
    1: "2026-01-03T10:00:00.000Z",
    2: "2026-01-04T10:00:00.000Z",
  });
  assert.equal(l1.masteredAt, "2026-01-04T10:00:00.000Z");
  assert.deepEqual(l1.reviews, [
    { at: "2026-01-05T10:00:00.000Z", ok: true },
    { at: "2026-01-09T10:00:00.000Z", ok: false },
  ]);
  assert.equal(l1.needsPractice, true); // local has the later review
  assert.equal(merged.m1.startDate, "2026-01-01"); // local preferred
  assert.equal(merged.m1.lastReviewAt, "2026-01-09T10:00:00.000Z");
  assert.deepEqual(merged.m1.lessons[2].visits, { 0: "2026-01-06T10:00:00.000Z" });
  assert.ok(merged.m2);
});

test("mergeCore30Log: remote wins needsPractice with the later review; undefined sides", () => {
  const local = {
    m: {
      lessons: {
        1: {
          visits: {},
          reviews: [{ at: "2026-01-05T10:00:00.000Z", ok: false }],
          needsPractice: true,
        },
      },
    },
  };
  const remote = {
    m: {
      lessons: {
        1: {
          visits: {},
          reviews: [{ at: "2026-01-09T10:00:00.000Z", ok: true }],
          needsPractice: false,
        },
      },
    },
  };
  assert.equal(mergeCore30Log(local, remote).m.lessons[1].needsPractice, false);
  assert.deepEqual(mergeCore30Log(undefined, undefined), {});
  assert.deepEqual(mergeCore30Log(local, undefined).m.lessons[1].reviews.length, 1);
  assert.deepEqual(mergeCore30Log(undefined, remote).m.lessons[1].needsPractice, false);
});

test("summarizeCore30 counts opened, mastered and needs-practice lessons", () => {
  const log = {
    startDate: START,
    lastReviewAt: iso(addDays(START, 4)),
    lessons: {
      1: { visits: { 0: iso(START) }, masteredAt: iso(START) },
      2: { visits: { 0: iso(START), 1: iso(START) }, masteredAt: iso(START), needsPractice: true },
      3: { visits: {} },
      4: { visits: { 2: iso(START) } },
    },
  };
  const s = summarizeCore30(log, 30, addDays(START, 9));
  assert.equal(s.started, true);
  assert.equal(s.startDate, START);
  assert.equal(s.lessonsOpened, 3);
  assert.equal(s.mastered, 1);
  assert.equal(s.needsPractice, 1);
  assert.equal(s.lastReviewAt, log.lastReviewAt);
  assert.equal(s.status, "behind");
  assert.equal(s.behindBy, 3);
  assert.equal(s.totalLessons, 30);
  const empty = summarizeCore30(undefined, 30, START);
  assert.equal(empty.started, false);
  assert.equal(empty.status, "not-started");
  assert.equal(empty.lessonsOpened, 0);
});

const startLog = (startDate, startDateSetAt) => ({
  m1: {
    lessons: {},
    ...(startDate ? { startDate } : {}),
    ...(startDateSetAt ? { startDateSetAt } : {}),
  },
});

test("mergeCore30Log startDate: both stamped, the later edit wins either way", () => {
  const older = startLog("2026-01-01", "2026-01-02T10:00:00.000Z");
  const newer = startLog("2026-02-01", "2026-01-03T10:00:00.000Z");
  for (const [a, b] of [
    [older, newer],
    [newer, older],
  ]) {
    const m = mergeCore30Log(a, b).m1;
    assert.equal(m.startDate, "2026-02-01");
    assert.equal(m.startDateSetAt, "2026-01-03T10:00:00.000Z");
  }
});

test("mergeCore30Log startDate: only one side stamped, the stamped side wins", () => {
  const stamped = startLog("2026-02-01", "2026-01-03T10:00:00.000Z");
  const plain = startLog("2026-01-01");
  for (const [a, b] of [
    [stamped, plain],
    [plain, stamped],
  ]) {
    const m = mergeCore30Log(a, b).m1;
    assert.equal(m.startDate, "2026-02-01");
    assert.equal(m.startDateSetAt, "2026-01-03T10:00:00.000Z");
  }
});

test("mergeCore30Log startDate: neither stamped keeps local, falls back to remote", () => {
  const local = startLog("2026-01-01");
  const remote = startLog("2026-01-05");
  const m = mergeCore30Log(local, remote).m1;
  assert.equal(m.startDate, "2026-01-01");
  assert.equal("startDateSetAt" in m, false);
  assert.equal(mergeCore30Log(startLog(undefined), remote).m1.startDate, "2026-01-05");
  assert.equal(mergeCore30Log(undefined, remote).m1.startDate, "2026-01-05");
});

test("all lessons needing practice remain reviewable and due without losing original mastery history", () => {
  const lessons = { 1: { visits: {}, masteredAt: iso(START), needsPractice: true } };
  const plan = planToday({ startDate: START, lessons }, 30, addDays(START, 4));
  assert.equal(plan.masteredCount, 0);
  assert.equal(plan.previouslyMasteredCount, 1);
  assert.deepEqual(previouslyMasteredLessons({ lessons }), [1]);
  assert.deepEqual(masteredLessons({ lessons }), []);
  assert.equal(plan.reviewDue, true);
  assert.deepEqual(plan.reviewLessons, [1]);
  assert.equal(plan.nextLesson.n, 1);
  assert.equal(plan.status, "behind");
  assert.equal(lessons[1].masteredAt, iso(START));
});
