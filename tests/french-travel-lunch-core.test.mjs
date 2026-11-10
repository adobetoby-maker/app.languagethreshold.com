import assert from "node:assert/strict";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { frenchLunchCoreLesson } from "../src/data/french-travel-lunch.ts";
import { getLessonDefinition } from "../src/lib/lesson-definition.ts";

test("French Lunch Core selects only its exact authored pair", () => {
  const french = getCurriculum("travel-lunch", "French", "English");
  const spanish = getCurriculum("travel-lunch", "Spanish", "English");
  assert.equal(french?.lessons.length, 30);
  assert.equal(spanish?.lessons.length, 30);
  assert.notEqual(french?.lessons[0].title, spanish?.lessons[0].title);
  assert.equal(french?.lessons[0].title, frenchLunchCoreLesson(1)?.title);
  assert.equal(getCurriculum("travel-lunch", "French", "Spanish"), null);
  assert.equal(frenchLunchCoreLesson(1, "Spanish", "English"), null);
  assert.equal(getCurriculum("travel-lunch"), spanish);
});

test("French Lunch Core definitions use French cards and aligned reading", () => {
  for (const n of [1, 15, 30]) {
    const draft = frenchLunchCoreLesson(n);
    const definition = getLessonDefinition({
      moduleId: "travel-lunch", lessonNumber: n,
      targetLanguage: "French", instructionLanguage: "English",
      contentVersion: "french-travel-lunch-core-fr-en-v1-draft",
    });
    assert.equal(definition?.title, draft.title);
    assert.equal(definition?.words.length, draft.words.length);
    assert.deepEqual(definition?.reading?.sentences.map(({ target, native }) => [target, native]),
      draft.reader.map(({ fr, en }) => [fr, en]));
    assert.equal(definition?.readiness, "draft");
  }
  const unsupported = getLessonDefinition({
    moduleId: "travel-lunch", lessonNumber: 1,
    targetLanguage: "French", instructionLanguage: "Spanish",
    contentVersion: "unversioned-app-draft",
  });
  assert.equal(unsupported, null);
});
