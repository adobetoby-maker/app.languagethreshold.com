import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePracticeStreak,
  initialPracticeStreak,
  recordPracticeCompletion,
  recoveryLessonsRemaining,
  startTravelBreak,
} from "../src/lib/practice-streak.ts";

const at = (date) => `${date}T12:00:00.000Z`;

test("a streak begins only after completed practice and advances once per day", () => {
  let state = initialPracticeStreak();
  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.current, 1);
  assert.equal(state.today.lessonsCompleted, 1);

  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.current, 1);
  assert.equal(state.today.lessonsCompleted, 2);

  state = recordPracticeCompletion(state, "2026-08-15", at("2026-08-15"));
  assert.equal(state.current, 2);
  assert.equal(state.best, 2);
});

test("one missed day opens a two-lesson recovery and restores the streak", () => {
  let state = {
    ...initialPracticeStreak(),
    current: 12,
    best: 12,
    lastPracticeDate: "2026-08-12",
    practiceDates: ["2026-08-12"],
  };

  state = evaluatePracticeStreak(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.recovery?.missedDate, "2026-08-13");
  assert.equal(recoveryLessonsRemaining(state), 2);

  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.current, 12);
  assert.equal(recoveryLessonsRemaining(state), 1);
  assert.equal(state.lastPracticeDate, "2026-08-12");

  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.current, 13);
  assert.equal(state.recovery, null);
  assert.equal(state.lastPracticeDate, "2026-08-14");
});

test("an unfinished recovery expires the next day", () => {
  let state = {
    ...initialPracticeStreak(),
    current: 5,
    best: 5,
    lastPracticeDate: "2026-08-12",
  };
  state = evaluatePracticeStreak(state, "2026-08-14", at("2026-08-14"));
  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  state = evaluatePracticeStreak(state, "2026-08-15", at("2026-08-15"));
  assert.equal(state.current, 0);
  assert.equal(state.recovery, null);
});

test("one travel pass protects up to seven consecutive break days", () => {
  let state = {
    ...initialPracticeStreak(),
    current: 8,
    best: 8,
    lastPracticeDate: "2026-08-13",
  };
  state = startTravelBreak(state, "2026-08-14", 4, at("2026-08-14"));
  assert.equal(state.travelPasses, 0);
  assert.deepEqual(state.travelBreak, { startsOn: "2026-08-14", endsOn: "2026-08-17" });

  state = evaluatePracticeStreak(state, "2026-08-18", at("2026-08-18"));
  assert.equal(state.current, 8);
  assert.equal(state.recovery, null);

  state = recordPracticeCompletion(state, "2026-08-18", at("2026-08-18"));
  assert.equal(state.current, 9);
  assert.equal(state.travelBreak, null);
});

test("a new pass is earned at each seven-day milestone up to the cap", () => {
  let state = {
    ...initialPracticeStreak(),
    current: 6,
    best: 6,
    lastPracticeDate: "2026-08-13",
    travelPasses: 1,
  };
  state = recordPracticeCompletion(state, "2026-08-14", at("2026-08-14"));
  assert.equal(state.current, 7);
  assert.equal(state.travelPasses, 2);
});
