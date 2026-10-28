import assert from "node:assert/strict";
import { test } from "node:test";
import { core60FocusModes, core60LessonWindow } from "../src/lib/core60-focus.ts";
import { lessonFocusLocation } from "../src/lib/learning-link.ts";

const term = (es, en) => ({ es, en, kind: "term" });
const phrase = (es, en) => ({ es, en, kind: "phrase" });

test("focus flow keeps one objective game at a time and skips impossible matching", () => {
  assert.deepEqual(core60FocusModes([term("techo", "roof"), term("clavo", "nail")]), [
    "flashcards",
    "match",
    "listen",
    "type",
  ]);
  assert.deepEqual(core60FocusModes([phrase("buen trabajo", "good work")]), [
    "flashcards",
    "listen",
    "type",
  ]);
});

test("focus road map stays centered and respects the beginning and end", () => {
  assert.deepEqual(core60LessonWindow(1, 30), [1, 2, 3, 4, 5]);
  assert.deepEqual(core60LessonWindow(16, 30), [14, 15, 16, 17, 18]);
  assert.deepEqual(core60LessonWindow(30, 30), [26, 27, 28, 29, 30]);
  assert.deepEqual(core60LessonWindow(1, 3), [1, 2, 3]);
});

test("focus lesson links round-trip without leaking focus onto the overview", () => {
  const lesson = "/?tab=core30&module=roofing&target=Spanish&native=English&lesson=4&way=recall";
  const focused = lessonFocusLocation(lesson, true);
  assert.equal(new URL(focused, "https://example.invalid").searchParams.get("focus"), "1");
  const standard = lessonFocusLocation(focused, false);
  assert.equal(new URL(standard, "https://example.invalid").searchParams.get("focus"), null);
  assert.equal(lessonFocusLocation("/?tab=core30&module=roofing", true), null);
});
