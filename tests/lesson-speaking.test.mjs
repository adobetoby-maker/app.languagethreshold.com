import test from "node:test";
import assert from "node:assert/strict";
import { parseSpeakingLesson } from "../src/lib/lesson-speaking.ts";
import { lessonSpeakingContext } from "../src/lib/lesson-speaking-context.ts";

test("saved lesson bindings reject incomplete or invalid identities", () => {
  const lesson = {
    moduleId: "rock-climbing",
    lessonNumber: 1,
    title: "Gear Names & What They Do",
    nativeLanguage: "English",
  };
  assert.deepEqual(parseSpeakingLesson(lesson), lesson);
  for (const value of [
    null,
    {},
    { ...lesson, lessonNumber: 0 },
    { ...lesson, lessonNumber: 1.5 },
    { ...lesson, nativeLanguage: "" },
    { ...lesson, title: "" },
  ]) {
    assert.equal(parseSpeakingLesson(value), null);
  }
});

test("the screenshot's climbing lesson supplies its real task and Spanish word bank", () => {
  const context = lessonSpeakingContext("rock-climbing", 1, "Spanish", "English");
  assert.match(context, /Gear Names & What They Do/);
  assert.match(context, /Lesson goal:/);
  assert.match(context, /Speaking task:.*rack/);
  assert.match(context, /arnés/);
  assert.match(context, /mosquetón/);
  assert.match(context, /one question at a time/);
  assert.match(context, /Do not claim the app has recorded completion or mastery/);
  assert.equal(lessonSpeakingContext("rock-climbing", 999, "Spanish", "English"), null);
});
