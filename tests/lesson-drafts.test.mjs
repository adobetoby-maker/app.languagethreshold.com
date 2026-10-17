import assert from "node:assert/strict";
import test from "node:test";
import {
  lessonDraftKey,
  readLessonDraft,
  saveLessonDraft,
  clearLessonDraftsForUser,
  lessonPositionKey,
  readLessonPosition,
  saveLessonPosition,
} from "../src/lib/lesson-drafts.ts";
const store = () => {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const draft = {
  version: "old-version",
  text: "Una respuesta.",
  ink: null,
  transcript: "",
  checks: [true, false, false],
  savedAt: "2026-10-16T06:00:00Z",
};
test("practice drafts survive refresh and retain their original lesson version", () => {
  const storage = store(),
    key = lessonDraftKey("a", "roofing.Spanish.English.lesson.1", "type");
  assert.equal(saveLessonDraft(storage, key, draft), true);
  assert.deepEqual(readLessonDraft(storage, key), draft);
  assert.equal(
    readLessonDraft(storage, lessonDraftKey("b", "roofing.Spanish.English.lesson.1", "type")),
    null,
  );
  assert.equal(
    readLessonDraft(storage, lessonDraftKey("a", "roofing.French.English.lesson.1", "type")),
    null,
  );
});
test("sign-out cleanup removes only this account’s private practice drafts", () => {
  const storage = store(),
    a = lessonDraftKey("a", "lesson1", "type"),
    b = lessonDraftKey("b", "lesson1", "type");
  saveLessonDraft(storage, a, draft);
  saveLessonDraft(storage, b, draft);
  storage.setItem("official-exam-unsynced", "keep");
  clearLessonDraftsForUser(storage, "a");
  assert.equal(storage.getItem(a), null);
  assert.ok(storage.getItem(b));
  assert.equal(storage.getItem("official-exam-unsynced"), "keep");
});
test("blocked storage and oversized responses cannot be labeled saved", () => {
  const storage = store(),
    key = lessonDraftKey("a", "lesson1", "write");
  assert.equal(saveLessonDraft(null, key, draft), false);
  assert.equal(saveLessonDraft(storage, key, { ...draft, ink: "A".repeat(500001) }), false);
  assert.equal(readLessonDraft(storage, key), null);
  assert.doesNotThrow(() =>
    clearLessonDraftsForUser(
      {
        get length() {
          throw new Error("blocked");
        },
      },
      "a",
    ),
  );
  storage.setItem(key, "invalid");
  assert.equal(readLessonDraft(storage, key), null);
});

test("resume position is private to the account, module and language pair", () => {
  const storage = store();
  const key = lessonPositionKey("a", "roofing", "Spanish", "English");
  const position = { lesson: 12, way: "write", at: "2026-10-16T06:00:00Z" };
  saveLessonPosition(storage, key, position);
  assert.deepEqual(readLessonPosition(storage, key), position);
  for (const args of [
    ["b", "roofing", "Spanish", "English"],
    ["a", "roofing", "French", "English"],
    ["a", "plumbing", "Spanish", "English"],
  ]) {
    assert.equal(readLessonPosition(storage, lessonPositionKey(...args)), null);
  }
  storage.setItem(key, JSON.stringify({ ...position, way: "fake" }));
  assert.equal(readLessonPosition(storage, key), null);
  saveLessonPosition(storage, key, position);
  clearLessonDraftsForUser(storage, "a");
  assert.equal(readLessonPosition(storage, key), null);
});
