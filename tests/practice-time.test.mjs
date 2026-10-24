// Built by TAC — 2026-10-22
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PRACTICE_DATA,
  IDLE_CUTOFF_MS,
  applyTick,
  clampGoalLessons,
  clampGoalMinutes,
  clampGoalType,
  goalProgress,
  lessonProgress,
  lessonsCompletedOn,
  crossedGoal,
  mergeDays,
  isCounting,
  localDateKey,
  parsePracticeData,
  practiceProgress,
  pruneDays,
  secondsToday,
  serializePracticeData,
  shouldSave,
} from "../src/lib/practice-time.ts";
import { core30SetMastered, core30StepOpened } from "../src/lib/core30-state.ts";

const fresh = () => ({ ...DEFAULT_PRACTICE_DATA, days: {} });
const at = (y, m, d, h = 12, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s).getTime();

test("a visible, recently active second adds exactly one second", () => {
  const now = at(2026, 10, 22);
  const next = applyTick(fresh(), { now, visible: true, lastInteractionAt: now - 5_000 });
  assert.equal(next.days["2026-10-22"], 1);
  const again = applyTick(next, { now: now + 1000, visible: true, lastInteractionAt: now - 5_000 });
  assert.equal(again.days["2026-10-22"], 2);
});

test("idle cutoff: counts up to 59.999s of idle, stops at 60s", () => {
  const now = at(2026, 10, 22);
  assert.equal(isCounting({ visible: true, now, lastInteractionAt: now - (IDLE_CUTOFF_MS - 1) }), true);
  assert.equal(isCounting({ visible: true, now, lastInteractionAt: now - IDLE_CUTOFF_MS }), false);
  const data = fresh();
  assert.equal(applyTick(data, { now, visible: true, lastInteractionAt: now - 120_000 }), data);
});

test("a hidden tab never counts, however recent the last interaction", () => {
  const now = at(2026, 10, 22);
  const data = fresh();
  const next = applyTick(data, { now, visible: false, lastInteractionAt: now });
  assert.equal(next, data);
  assert.deepEqual(next.days, {});
});

test("an interaction in the future (clock moved back) does not count", () => {
  const now = at(2026, 10, 22);
  assert.equal(isCounting({ visible: true, now, lastInteractionAt: now + 5000 }), false);
});

test("day rollover: the first second after local midnight starts a new day at 1", () => {
  const before = at(2026, 10, 22, 23, 59, 59);
  const after = at(2026, 10, 23, 0, 0, 0);
  let data = { ...fresh(), days: { "2026-10-22": 590 } };
  data = applyTick(data, { now: before, visible: true, lastInteractionAt: before });
  assert.equal(data.days["2026-10-22"], 591);
  data = applyTick(data, { now: after, visible: true, lastInteractionAt: after });
  assert.equal(data.days["2026-10-22"], 591);
  assert.equal(data.days["2026-10-23"], 1);
  assert.equal(secondsToday(data, after), 1);
  assert.equal(secondsToday(data, before), 591);
});

test("localDateKey uses the local calendar date and zero-pads", () => {
  assert.equal(localDateKey(new Date(2026, 0, 5, 23, 59, 59)), "2026-01-05");
  assert.equal(localDateKey(new Date(2026, 11, 31, 0, 0, 0)), "2026-12-31");
});

test("prune keeps the last 14 calendar days, today included", () => {
  const now = new Date(2026, 9, 22, 12);
  const days = {
    "2026-10-22": 5, // today
    "2026-10-09": 7, // 13 days back: the oldest kept
    "2026-10-08": 9, // 14 days back: dropped
    "2025-01-01": 11,
  };
  assert.deepEqual(pruneDays(days, now), { "2026-10-22": 5, "2026-10-09": 7 });
});

test("prune crosses month and year boundaries", () => {
  const now = new Date(2027, 0, 3, 12);
  const kept = pruneDays({ "2026-12-21": 1, "2026-12-20": 1, "2027-01-03": 1 }, now);
  assert.deepEqual(Object.keys(kept).sort(), ["2026-12-21", "2027-01-03"]);
});

test("prune drops junk keys and non-positive or non-finite values", () => {
  const now = new Date(2026, 9, 22, 12);
  assert.deepEqual(
    pruneDays({ today: 5, "2026-10-22": NaN, "2026-10-21": -3, "2026-10-20": 0, "2026-10-19": 12.9 }, now),
    { "2026-10-19": 12 },
  );
});

test("a tick prunes old days as it counts", () => {
  const now = at(2026, 10, 22);
  const data = { ...fresh(), days: { "2026-09-01": 600, "2026-10-21": 60 } };
  const next = applyTick(data, { now, visible: true, lastInteractionAt: now });
  assert.deepEqual(next.days, { "2026-10-21": 60, "2026-10-22": 1 });
});

test("goal clamp snaps to 5/10/15/20, ties go lower, junk becomes 10", () => {
  assert.equal(clampGoalMinutes(5), 5);
  assert.equal(clampGoalMinutes(20), 20);
  assert.equal(clampGoalMinutes(0), 5);
  assert.equal(clampGoalMinutes(-30), 5);
  assert.equal(clampGoalMinutes(999), 20);
  assert.equal(clampGoalMinutes(12), 10);
  assert.equal(clampGoalMinutes(12.5), 10);
  assert.equal(clampGoalMinutes(13), 15);
  assert.equal(clampGoalMinutes("15"), 15);
  assert.equal(clampGoalMinutes(""), 10);
  assert.equal(clampGoalMinutes("abc"), 10);
  assert.equal(clampGoalMinutes(NaN), 10);
  assert.equal(clampGoalMinutes(null), 10);
  assert.equal(clampGoalMinutes(undefined), 10);
});

test("progress: fraction, aria values, label and the reached flag", () => {
  const half = practiceProgress(300, 10);
  assert.equal(half.fraction, 0.5);
  assert.equal(half.goalSeconds, 600);
  assert.equal(half.valueNow, 300);
  assert.equal(half.reached, false);
  assert.equal(practiceProgress(360, 10).label, "Today's practice: 6 of 10 minutes");
  const over = practiceProgress(5000, 10);
  assert.equal(over.fraction, 1);
  assert.equal(over.valueNow, 600);
  assert.equal(over.reached, true);
  assert.equal(over.label, "Today's practice: 10 of 10 minutes");
  assert.equal(practiceProgress(-4, 10).valueNow, 0);
  assert.equal(practiceProgress(NaN, 10).fraction, 0);
  assert.equal(practiceProgress(100, 7).goalSeconds, 300); // 7 is nearer 5 than 10
});

test("save throttle: nothing when clean, every 10s when dirty, immediately on force", () => {
  assert.equal(shouldSave({ dirty: false, now: 99_999, lastSaveAt: 0, force: true }), false);
  assert.equal(shouldSave({ dirty: true, now: 9_999, lastSaveAt: 0 }), false);
  assert.equal(shouldSave({ dirty: true, now: 10_000, lastSaveAt: 0 }), true);
  assert.equal(shouldSave({ dirty: true, now: 4_000, lastSaveAt: 1_000, force: true }), true);
});

test("parse: missing, malformed and partial storage fall back field by field", () => {
  const now = new Date(2026, 9, 22, 12);
  assert.deepEqual(parsePracticeData(null, now), { enabled: true, goalType: "minutes", goalMinutes: 10, goalLessons: 1, days: {} });
  assert.deepEqual(parsePracticeData("{not json", now), { enabled: true, goalType: "minutes", goalMinutes: 10, goalLessons: 1, days: {} });
  assert.deepEqual(parsePracticeData("[]", now).days, {});
  const partial = parsePracticeData(
    JSON.stringify({ enabled: "yes", goalMinutes: 18, days: { "2026-10-22": 42, "2020-01-01": 9, bad: "x" } }),
    now,
  );
  assert.equal(partial.enabled, true);
  assert.equal(partial.goalMinutes, 20);
  assert.deepEqual(partial.days, { "2026-10-22": 42 });
  assert.equal(parsePracticeData(JSON.stringify({ enabled: false }), now).enabled, false);
});

test("serialize then parse round-trips and prunes", () => {
  const now = new Date(2026, 9, 22, 12);
  const data = {
    enabled: false,
    goalType: "lessons",
    goalMinutes: 15,
    goalLessons: 2,
    days: { "2026-10-22": 100, "2026-01-01": 50 },
  };
  const back = parsePracticeData(serializePracticeData(data, now), now);
  assert.deepEqual(back, {
    enabled: false,
    goalType: "lessons",
    goalMinutes: 15,
    goalLessons: 2,
    days: { "2026-10-22": 100 },
  });
});

test("mount with no interaction counts 0: a null interaction clock never counts", () => {
  const now = at(2026, 10, 22);
  assert.equal(isCounting({ visible: true, now, lastInteractionAt: null }), false);
  const data = fresh();
  for (let i = 0; i < 90; i++) {
    assert.equal(applyTick(data, { now: now + i * 1000, visible: true, lastInteractionAt: null }), data);
  }
  // The first real interaction starts the clock.
  assert.equal(applyTick(data, { now, visible: true, lastInteractionAt: now }).days["2026-10-22"], 1);
});

test("mergeDays takes the per-day maximum and keeps days only one side has", () => {
  assert.deepEqual(
    mergeDays({ "2026-10-22": 100, "2026-10-21": 50 }, { "2026-10-22": 90, "2026-10-20": 7 }),
    { "2026-10-22": 100, "2026-10-21": 50, "2026-10-20": 7 },
  );
  assert.deepEqual(mergeDays({ "2026-10-22": 10 }, { "2026-10-22": 40 }), { "2026-10-22": 40 });
  assert.deepEqual(mergeDays({}, {}), {});
});

test("crossedGoal fires only for a one-second beat across an unchanged goal", () => {
  const g = 600;
  assert.equal(crossedGoal({ seconds: 599, goalSeconds: g }, { seconds: 600, goalSeconds: g }), true);
  // first client value (hydration jump from the server's 0), reload, merge: not a pulse
  assert.equal(crossedGoal(null, { seconds: 700, goalSeconds: g }), false);
  assert.equal(crossedGoal({ seconds: 0, goalSeconds: g }, { seconds: 700, goalSeconds: g }), false);
  assert.equal(crossedGoal({ seconds: 598, goalSeconds: g }, { seconds: 600, goalSeconds: g }), false);
  // already past the goal, or goal lowered
  assert.equal(crossedGoal({ seconds: 650, goalSeconds: g }, { seconds: 651, goalSeconds: g }), false);
  assert.equal(crossedGoal({ seconds: 599, goalSeconds: 900 }, { seconds: 600, goalSeconds: 600 }), false);
  assert.equal(crossedGoal({ seconds: 300, goalSeconds: g }, { seconds: 301, goalSeconds: g }), false);
});

// ---- lesson goal ----

const MASTERED = (iso) => ({ visits: {}, masteredAt: iso });
const scopedKey = (moduleId, target = "Spanish", native = "English", enrollment = null) =>
  JSON.stringify(["core30", 1, moduleId, target, native, enrollment]);
const localIso = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

test("migration: stored data from before lesson goals reads as a minutes goal with 1 lesson", () => {
  const now = new Date(2026, 9, 22, 12);
  const old = JSON.stringify({ v: 1, enabled: false, goalMinutes: 15, days: { "2026-10-22": 42 } });
  assert.deepEqual(parsePracticeData(old, now), {
    enabled: false,
    goalType: "minutes",
    goalMinutes: 15,
    goalLessons: 1,
    days: { "2026-10-22": 42 },
  });
});

test("goal type and lessons goal: junk falls back, values snap to 1/2/3", () => {
  assert.equal(clampGoalType("lessons"), "lessons");
  assert.equal(clampGoalType("minutes"), "minutes");
  assert.equal(clampGoalType("hours"), "minutes");
  assert.equal(clampGoalType(undefined), "minutes");
  assert.equal(clampGoalType(null), "minutes");
  assert.equal(clampGoalLessons(1), 1);
  assert.equal(clampGoalLessons(3), 3);
  assert.equal(clampGoalLessons("2"), 2);
  assert.equal(clampGoalLessons(0), 1);
  assert.equal(clampGoalLessons(9), 3);
  assert.equal(clampGoalLessons(1.5), 1);
  assert.equal(clampGoalLessons("x"), 1);
  assert.equal(clampGoalLessons(NaN), 1);
  assert.equal(clampGoalLessons(undefined), 1);
});

test("parse: a stored lessons goal round-trips; junk type or count falls back field by field", () => {
  const now = new Date(2026, 9, 22, 12);
  const lessons = parsePracticeData(JSON.stringify({ goalType: "lessons", goalLessons: 2 }), now);
  assert.equal(lessons.goalType, "lessons");
  assert.equal(lessons.goalLessons, 2);
  assert.equal(lessons.goalMinutes, 10);
  const junk = parsePracticeData(JSON.stringify({ goalType: 7, goalLessons: "many" }), now);
  assert.equal(junk.goalType, "minutes");
  assert.equal(junk.goalLessons, 1);
});

test("lessons today: distinct lessons mastered on the local day, any module", () => {
  const log = {
    [scopedKey("roofing")]: {
      lessons: {
        1: MASTERED(localIso(2026, 10, 22, 9)),
        2: MASTERED(localIso(2026, 10, 22, 21)),
        3: MASTERED(localIso(2026, 10, 21, 23, 59)), // yesterday
        4: { visits: { 1: localIso(2026, 10, 22) } }, // opened, never mastered
      },
    },
    [scopedKey("foundation-medical")]: { lessons: { 1: MASTERED(localIso(2026, 10, 22, 13)) } },
    [scopedKey("roofing", "French")]: { lessons: { 1: MASTERED(localIso(2026, 10, 22, 8)) } },
  };
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 4);
  assert.equal(lessonsCompletedOn(log, "2026-10-21"), 1);
  assert.equal(lessonsCompletedOn(log, "2026-10-20"), 0);
});

test("lessons today: opening a lesson or visiting steps counts nothing", () => {
  const log = {
    [scopedKey("roofing")]: {
      lessons: {
        1: { visits: { 0: localIso(2026, 10, 22), "way:see": localIso(2026, 10, 22) }, wayVisits: { see: localIso(2026, 10, 22) } },
      },
    },
  };
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 0);
});

test("lessons today: the real mastery reducer counts a lesson once, however often it is mastered", () => {
  const moduleId = scopedKey("roofing");
  const morning = localIso(2026, 10, 22, 9);
  const evening = localIso(2026, 10, 22, 20);
  let log = core30StepOpened({}, { moduleId, lesson: 1, step: 0, at: morning });
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 0); // opened is not completed
  log = core30SetMastered(log, { moduleId, lesson: 1, at: morning });
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 1);
  log = core30SetMastered(log, { moduleId, lesson: 1, at: evening }); // pressed again later the same day
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 1);
  log = core30SetMastered(log, { moduleId, lesson: 2, at: evening });
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 2);
  // The earliest stamp is kept, so lesson 1 is not a new lesson tomorrow.
  assert.equal(lessonsCompletedOn(log, "2026-10-23"), 0);
});

test("lessons today: a legacy bare record and its claimed scoped copy count a lesson once", () => {
  const stamp = localIso(2026, 10, 22, 9);
  const bareOnly = { roofing: { lessons: { 1: MASTERED(stamp) } } };
  assert.equal(lessonsCompletedOn(bareOnly, "2026-10-22"), 1);
  const claimed = {
    roofing: { lessons: { 1: MASTERED(stamp), 2: MASTERED(stamp) } },
    [scopedKey("roofing")]: { lessons: { 1: MASTERED(stamp) } },
  };
  assert.equal(lessonsCompletedOn(claimed, "2026-10-22"), 2);
});

test("lessons today: day rollover at local midnight and bad data is ignored", () => {
  const log = {
    [scopedKey("roofing")]: {
      lessons: {
        1: MASTERED(localIso(2026, 10, 22, 23, 59)),
        2: MASTERED(localIso(2026, 10, 23, 0, 0)),
        3: MASTERED("not a date"),
        4: { visits: {}, masteredAt: 12 },
      },
    },
  };
  assert.equal(lessonsCompletedOn(log, "2026-10-22"), 1);
  assert.equal(lessonsCompletedOn(log, "2026-10-23"), 1);
  assert.equal(lessonsCompletedOn(null, "2026-10-22"), 0);
  assert.equal(lessonsCompletedOn(undefined, "2026-10-22"), 0);
  assert.equal(lessonsCompletedOn({ [scopedKey("x")]: {} }, "2026-10-22"), 0);
});

test("lesson progress: fraction is min(lessons / goal, 1) with plural-aware labels", () => {
  const none = lessonProgress(0, 1);
  assert.equal(none.fraction, 0);
  assert.equal(none.valueMax, 1);
  assert.equal(none.reached, false);
  assert.equal(none.label, "Today's practice: 0 of 1 lesson");
  assert.equal(none.status, "0 of 1 lesson");
  const one = lessonProgress(1, 1);
  assert.equal(one.fraction, 1);
  assert.equal(one.reached, true);
  const half = lessonProgress(1, 2);
  assert.equal(half.fraction, 0.5);
  assert.equal(half.valueNow, 1);
  assert.equal(half.valueMax, 2);
  assert.equal(half.valueText, "1 of 2 lessons today");
  assert.equal(half.status, "1 of 2 lessons");
  const over = lessonProgress(5, 3);
  assert.equal(over.fraction, 1);
  assert.equal(over.valueNow, 3);
  assert.equal(over.reached, true);
  assert.equal(lessonProgress(-1, 2).valueNow, 0);
  assert.equal(lessonProgress(NaN, 2).fraction, 0);
  assert.equal(lessonProgress(1, 9).valueMax, 3); // goal snaps to 3
});

test("goalProgress picks the chosen unit; minutes keep their own text", () => {
  const base = { seconds: 360, goalMinutes: 10, lessons: 1, goalLessons: 2 };
  const minutes = goalProgress({ ...base, goalType: "minutes" });
  assert.equal(minutes.fraction, 0.6);
  assert.equal(minutes.valueMax, 600);
  assert.equal(minutes.status, "6 of 10 min");
  assert.equal(minutes.valueText, "6 of 10 minutes today");
  const lessons = goalProgress({ ...base, goalType: "lessons" });
  assert.equal(lessons.fraction, 0.5);
  assert.equal(lessons.valueMax, 2);
  assert.equal(lessons.status, "1 of 2 lessons");
});

test("goal-reached pulse works for lessons: only a one-lesson step across an unchanged goal", () => {
  assert.equal(crossedGoal({ seconds: 0, goalSeconds: 1 }, { seconds: 1, goalSeconds: 1 }), true);
  assert.equal(crossedGoal({ seconds: 1, goalSeconds: 2 }, { seconds: 2, goalSeconds: 2 }), true);
  assert.equal(crossedGoal({ seconds: 2, goalSeconds: 3 }, { seconds: 3, goalSeconds: 3 }), true);
  assert.equal(crossedGoal({ seconds: 1, goalSeconds: 1 }, { seconds: 2, goalSeconds: 1 }), false);
  assert.equal(crossedGoal({ seconds: 0, goalSeconds: 3 }, { seconds: 2, goalSeconds: 3 }), false);
  assert.equal(crossedGoal(null, { seconds: 1, goalSeconds: 1 }), false);
});
