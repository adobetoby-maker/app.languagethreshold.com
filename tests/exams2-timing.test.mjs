// Built by TAC — 2026-10-23
// Exams v2 timing rules (ticket T8): the 45-second question clock and the A/B/C windows.
// Pure functions; nothing reads the clock and no bank content is involved.
import assert from "node:assert/strict";
import test from "node:test";
import {
  QUESTION_GRACE_MS,
  QUESTION_LIMIT_MS,
  classifyAnswer,
  clockTone,
  elapsedMs,
  examWindow,
  examWindows,
  formatDateKey,
  lockedMessage,
  pickCore30Log,
  questionTimer,
  remainingMs,
  secondsLeft,
  servedAtOf,
  utcDateKey,
  windowContext,
} from "../src/lib/exams2/timing.ts";
import { core30ScopeKey } from "../src/lib/core30-scope.ts";

const T0 = Date.parse("2026-10-23T15:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();

test("the limit is 45 s and the grace is 5 s", () => {
  assert.equal(QUESTION_LIMIT_MS, 45_000);
  assert.equal(QUESTION_GRACE_MS, 5_000);
});

test("classifyAnswer: on time to 45 s, grace to 50 s, late after", () => {
  const at = (ms) => classifyAnswer(T0, T0 + ms).timing;
  assert.equal(at(0), "on_time");
  assert.equal(at(44_999), "on_time");
  assert.equal(at(45_000), "on_time");
  assert.equal(at(45_001), "grace");
  assert.equal(at(50_000), "grace");
  assert.equal(at(50_001), "late");
  assert.equal(at(10 * 60_000), "late");
});

test("a served time in the future never yields negative elapsed time", () => {
  assert.equal(elapsedMs(T0 + 5000, T0), 0);
  assert.deepEqual(classifyAnswer(T0 + 5000, T0), { elapsedMs: 0, timing: "on_time" });
});

test("remainingMs and secondsLeft round up and floor at zero", () => {
  assert.equal(remainingMs(0), 45_000);
  assert.equal(remainingMs(44_001), 999);
  assert.equal(remainingMs(60_000), 0);
  assert.equal(secondsLeft(45_000), 45);
  assert.equal(secondsLeft(999), 1);
  assert.equal(secondsLeft(1), 1);
  assert.equal(secondsLeft(0), 0);
});

test("clockTone: calm above 10 s, amber at 10 s, red at 5 s, expired at 0", () => {
  const tone = (seconds) => clockTone(seconds * 1000);
  assert.equal(tone(45), "calm");
  assert.equal(tone(11), "calm");
  assert.equal(tone(10), "warn");
  assert.equal(tone(6), "warn");
  assert.equal(tone(5), "urgent");
  assert.equal(tone(1), "urgent");
  assert.equal(clockTone(500), "urgent");
  assert.equal(tone(0), "expired");
});

test("servedAtOf: session start for the first question, the last response time after that", () => {
  const started = iso(T0);
  assert.equal(servedAtOf({ started_at: started, responses: [] }, T0 + 99_000), T0);
  assert.equal(servedAtOf({ started_at: started }, T0 + 99_000), T0);
  const responses = [{ at: iso(T0 + 10_000) }, { at: iso(T0 + 31_000) }];
  assert.equal(servedAtOf({ started_at: started, responses }, T0 + 99_000), T0 + 31_000);
});

test("servedAtOf: untimed legacy responses and bad stamps are not timed; the future is clamped", () => {
  const started = iso(T0);
  assert.equal(servedAtOf({ started_at: started, responses: [{}] }, T0 + 60_000), T0 + 60_000);
  assert.equal(servedAtOf({ started_at: "nope", responses: [] }, T0 + 60_000), T0 + 60_000);
  assert.equal(
    servedAtOf({ started_at: started, responses: [{ at: iso(T0 + 90_000) }] }, T0 + 60_000),
    T0 + 60_000,
  );
});

test("questionTimer carries the limits and the server-measured elapsed time", () => {
  assert.deepEqual(questionTimer(T0, T0 + 12_345), {
    limitMs: 45_000,
    graceMs: 5_000,
    elapsedMs: 12_345,
  });
});

// ── Windows ──────────────────────────────────────────────────────────────────

const ctx = (extra = {}) => ({
  startDate: "2026-09-01",
  mastered: [],
  lessonCount: 30,
  today: "2026-09-01",
  ...extra,
});
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

test("A is open from day 0, with or without a start date", () => {
  assert.equal(examWindow("A", ctx()).open, true);
  assert.equal(examWindow("A", ctx({ startDate: undefined })).open, true);
  assert.equal(examWindow("A", ctx()).lateBaseline, undefined);
});

test("A turns into a late baseline after day 7 or once lesson 3 is done", () => {
  assert.equal(examWindow("A", ctx({ today: "2026-09-08" })).lateBaseline, undefined);
  assert.equal(examWindow("A", ctx({ today: "2026-09-09" })).lateBaseline, true);
  assert.equal(examWindow("A", ctx({ mastered: [1, 2] })).lateBaseline, undefined);
  assert.equal(examWindow("A", ctx({ mastered: [1, 2, 3] })).lateBaseline, true);
});

test("B opens on day 45", () => {
  const b = (today) => examWindow("B", ctx({ today }));
  assert.equal(b("2026-10-15").open, false); // day 44
  assert.equal(b("2026-10-16").open, true); // day 45
  assert.equal(b("2026-10-16").via, "day");
  assert.equal(b("2026-12-01").open, true);
  assert.equal(b("2026-09-01").opensOn, "2026-10-16");
});

test("B opens early once lessons 1-15 are mastered, even without a start date", () => {
  const early = examWindow("B", ctx({ mastered: range(15), startDate: undefined }));
  assert.equal(early.open, true);
  assert.equal(early.via, "lessons");
  const missing = examWindow("B", ctx({ mastered: range(14) }));
  assert.equal(missing.open, false);
  assert.deepEqual(missing.lessons, { from: 1, to: 15, done: 14 });
  // Lessons 16-30 do not count towards B.
  assert.equal(examWindow("B", ctx({ mastered: range(30).slice(1) })).open, false);
});

test("C opens on day 90 or when all 30 lessons are mastered", () => {
  const c = (today, mastered = []) => examWindow("C", ctx({ today, mastered }));
  assert.equal(c("2026-11-29").open, false); // day 89
  assert.equal(c("2026-11-30").open, true); // day 90
  assert.equal(c("2026-09-02", range(29)).open, false);
  assert.equal(c("2026-09-02", range(30)).open, true);
  assert.equal(c("2026-09-02", range(30)).via, "lessons");
  assert.equal(c("2026-09-02").opensOn, "2026-11-30");
});

test("a module with fewer lessons asks for all of them for C", () => {
  const w = examWindow("C", ctx({ lessonCount: 20, mastered: range(20) }));
  assert.equal(w.open, true);
  assert.deepEqual(w.lessons, { from: 1, to: 20, done: 20 });
});

test("without a start date B and C stay shut until the lessons are done", () => {
  const w = examWindows(ctx({ startDate: undefined, today: "2030-01-01" }));
  assert.equal(w.A.open, true);
  assert.equal(w.B.open, false);
  assert.equal(w.C.open, false);
  assert.equal(w.B.opensOn, undefined);
});

test("a malformed start date is treated as no start date", () => {
  assert.equal(examWindow("B", ctx({ startDate: "soon", today: "2030-01-01" })).open, false);
});

test("lockedMessage names the date and the early route", () => {
  const b = examWindow("B", ctx());
  assert.equal(lockedMessage(b), "Opens Oct 16, 2026, or when lessons 1–15 are done.");
  const noStart = examWindow("C", ctx({ startDate: undefined }));
  assert.equal(lockedMessage(noStart), "Opens when lessons 1–30 are done.");
  assert.equal(lockedMessage(examWindow("A", ctx())), "");
});

test("formatDateKey does not shift with the time zone", () => {
  assert.equal(formatDateKey("2026-12-07"), "Dec 7, 2026");
  assert.equal(formatDateKey("2026-01-01"), "Jan 1, 2026");
  assert.equal(formatDateKey("garbage"), "garbage");
  assert.equal(utcDateKey(Date.parse("2026-10-23T23:59:59.000Z")), "2026-10-23");
});

// ── Reading the Core 30 log ──────────────────────────────────────────────────

const log = (startDate, mastered = []) => ({
  startDate,
  lessons: Object.fromEntries(
    mastered.map((n) => [String(n), { visits: {}, masteredAt: iso(T0) }]),
  ),
});

test("pickCore30Log prefers independent practice, then the latest enrollment, then the old key", () => {
  const exactKey = core30ScopeKey("roofing", {
    targetLanguage: "Spanish",
    instructionLanguage: "English",
  });
  const enrolled = (id) =>
    core30ScopeKey("roofing", {
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      enrollmentId: id,
    });
  const logs = {
    roofing: log("2025-01-01"),
    [enrolled("e1")]: log("2026-03-01"),
    [enrolled("e2")]: log("2026-06-01"),
    [core30ScopeKey("roofing", { targetLanguage: "French", instructionLanguage: "English" })]:
      log("2024-01-01"),
    [core30ScopeKey("siding", { targetLanguage: "Spanish", instructionLanguage: "English" })]:
      log("2024-02-02"),
  };
  assert.equal(pickCore30Log(logs, "roofing", "Spanish", "English").startDate, "2026-06-01");
  logs[exactKey] = log("2026-09-01");
  assert.equal(pickCore30Log(logs, "roofing", "Spanish", "English").startDate, "2026-09-01");
  delete logs[exactKey];
  delete logs[enrolled("e1")];
  delete logs[enrolled("e2")];
  assert.equal(pickCore30Log(logs, "roofing", "Spanish", "English").startDate, "2025-01-01");
  assert.equal(pickCore30Log(logs, "gutters", "Spanish", "English"), undefined);
});

test("windowContext counts only mastered lessons that are not flagged for practice", () => {
  const value = log("2026-09-01", [1, 2, 3]);
  value.lessons["2"].needsPractice = true;
  const context = windowContext(value, 30, "2026-09-10");
  assert.deepEqual(context.mastered, [1, 3]);
  assert.equal(context.startDate, "2026-09-01");
  assert.deepEqual(windowContext(undefined, 30, "2026-09-10"), {
    mastered: [],
    lessonCount: 30,
    today: "2026-09-10",
  });
});
