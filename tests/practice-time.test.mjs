// Built by TAC — 2026-10-22
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PRACTICE_DATA,
  IDLE_CUTOFF_MS,
  applyTick,
  clampGoalMinutes,
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
  assert.deepEqual(parsePracticeData(null, now), { enabled: true, goalMinutes: 10, days: {} });
  assert.deepEqual(parsePracticeData("{not json", now), { enabled: true, goalMinutes: 10, days: {} });
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
  const data = { enabled: false, goalMinutes: 15, days: { "2026-10-22": 100, "2026-01-01": 50 } };
  const back = parsePracticeData(serializePracticeData(data, now), now);
  assert.deepEqual(back, { enabled: false, goalMinutes: 15, days: { "2026-10-22": 100 } });
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
