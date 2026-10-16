import assert from "node:assert/strict";
import test from "node:test";
import {
  LESSON_RETURN_KEY,
  LESSON_RETURN_TTL_MS,
  clearLessonReturn,
  lessonMissionPrefix,
  parseLessonReturn,
  readLessonReturn,
  shouldClearMarker,
  writeLessonReturn,
} from "../src/lib/lesson-return.ts";

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
  };
}

const NOW = 1_800_000_000_000;
const marker = { moduleId: "roofing", lesson: 1, section: "say", at: NOW - 1000 };

test("a fresh marker round-trips through storage", () => {
  const storage = fakeStorage();
  writeLessonReturn(storage, marker);
  assert.deepEqual(readLessonReturn(storage, NOW), marker);
  // Reading does not consume: the lesson view clears it when it has used it.
  assert.deepEqual(readLessonReturn(storage, NOW), marker);
  clearLessonReturn(storage);
  assert.equal(readLessonReturn(storage, NOW), null);
});

test("the see marker keeps the passage reference", () => {
  const see = { ...marker, section: "see", ref: "seed-es-roofing-materials" };
  const storage = fakeStorage();
  writeLessonReturn(storage, see);
  assert.deepEqual(readLessonReturn(storage, NOW), see);
});

test("a marker older than two hours is dropped and removed", () => {
  const stale = { ...marker, at: NOW - LESSON_RETURN_TTL_MS - 1 };
  const storage = fakeStorage({ [LESSON_RETURN_KEY]: JSON.stringify(stale) });
  assert.equal(readLessonReturn(storage, NOW), null);
  assert.equal(storage.data.has(LESSON_RETURN_KEY), false);
});

test("a marker exactly at the limit is still active", () => {
  const edge = { ...marker, at: NOW - LESSON_RETURN_TTL_MS };
  assert.deepEqual(parseLessonReturn(JSON.stringify(edge), NOW), edge);
});

test("a marker from the future is rejected", () => {
  const future = { ...marker, at: NOW + 10 * 60_000 };
  assert.equal(parseLessonReturn(JSON.stringify(future), NOW), null);
});

test("malformed markers are rejected", () => {
  for (const raw of [
    null,
    "",
    "not json",
    "null",
    "42",
    JSON.stringify({ ...marker, moduleId: "" }),
    JSON.stringify({ ...marker, lesson: 0 }),
    JSON.stringify({ ...marker, lesson: 1.5 }),
    JSON.stringify({ ...marker, lesson: "1" }),
    JSON.stringify({ ...marker, section: "write" }),
    JSON.stringify({ ...marker, at: "now" }),
  ]) {
    assert.equal(parseLessonReturn(raw, NOW), null, String(raw));
  }
});

test("a malformed stored value is cleared on read", () => {
  const storage = fakeStorage({ [LESSON_RETURN_KEY]: "garbage" });
  assert.equal(readLessonReturn(storage, NOW), null);
  assert.equal(storage.data.has(LESSON_RETURN_KEY), false);
});

test("blocked or missing storage never throws", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => writeLessonReturn(blocked, marker));
  assert.doesNotThrow(() => clearLessonReturn(blocked));
  assert.equal(readLessonReturn(blocked, NOW), null);
  assert.equal(readLessonReturn(null, NOW), null);
  assert.doesNotThrow(() => writeLessonReturn(null, marker));
});

test("the mission prefix matches the ids the speaking catalog uses", () => {
  assert.equal(lessonMissionPrefix("roofing", 1), "scenario_version_roofing_lesson_1_");
  assert.equal(lessonMissionPrefix("roofing", 12), "scenario_version_roofing_lesson_12_");
});

test("shouldClearMarker keeps a marker on its target tab and on Core 30", () => {
  const say = { section: "say" };
  const see = { section: "see" };
  // The lesson sends the learner to the target tab: not stale.
  assert.equal(shouldClearMarker(say, "speak", "core30"), false);
  assert.equal(shouldClearMarker(see, "reader", "core30"), false);
  // Back on Core 30 (pill, auto-return, tab bar): the Core 30 tab clears it itself.
  assert.equal(shouldClearMarker(say, "core30", "speak"), false);
  assert.equal(shouldClearMarker(see, "core30", "reader"), false);
  // First look (app mount) on the target tab keeps it.
  assert.equal(shouldClearMarker(see, "reader", undefined), false);
});

test("shouldClearMarker clears a marker once the learner leaves its target tab", () => {
  // Lesson -> Reader -> Dictionary: the see marker is stale.
  assert.equal(shouldClearMarker({ section: "see" }, "dictionary", "reader"), true);
  assert.equal(shouldClearMarker({ section: "see" }, "speak", "reader"), true);
  assert.equal(shouldClearMarker({ section: "say" }, "reader", "speak"), true);
  assert.equal(shouldClearMarker({ section: "say" }, "guide", "speak"), true);
  // A marker met on some unrelated tab at first look is stale too.
  assert.equal(shouldClearMarker({ section: "say" }, "dashboard", undefined), true);
  assert.equal(shouldClearMarker({ section: "say" }, "dashboard", null), true);
});

test("shouldClearMarker does nothing without a marker or without a tab change", () => {
  assert.equal(shouldClearMarker(null, "dictionary", "reader"), false);
  assert.equal(shouldClearMarker({ section: "see" }, "dictionary", "dictionary"), false);
  // StrictMode runs the effect twice with the same tab: the second pass is a no-op.
  assert.equal(shouldClearMarker({ section: "say" }, "speak", "speak"), false);
});
