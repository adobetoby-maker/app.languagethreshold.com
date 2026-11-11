import assert from "node:assert/strict";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { frenchLunchCoreLesson } from "../src/data/french-travel-lunch.ts";
import { frenchLunchFoundationLesson } from "../src/data/french-travel-lunch.ts";
import { getLessonDefinition } from "../src/lib/lesson-definition.ts";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { core60PathOfPair } from "../src/lib/core60-path.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import foundationFile from "../src/data/core60/fr/foundation-travel-lunch-fr.json" with { type: "json" };

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

test("French Lunch Foundation has its own stage ID and keeps Spanish path IDs", () => {
  const id = "foundation-travel-lunch-fr";
  assert.deepEqual(validateStageFile(foundationFile, {
    moduleId: id, stage: "foundation", language: "French", nativeLanguage: "English",
  }), []);
  const module = getModule(id);
  assert.ok(moduleSupportsLearningPair(module, "French", "English"));
  assert.equal(moduleSupportsLearningPair(module, "Spanish", "English"), false);
  assert.equal(getCurriculum(id, "French", "English")?.lessons.length, 10);
  assert.equal(getCurriculum(id, "Spanish", "English"), null);
  assert.equal(core60PathOfPair("travel-lunch", "French", "English")?.steps[0].moduleId, id);
  assert.equal(core60PathOfPair("travel-lunch", "Spanish", "English")?.steps[0].moduleId,
    "foundation-travel-lunch");
  assert.equal(core60PathOfPair("travel-lunch", "French", "English")?.steps[2].available, false);
});

test("French Foundation keeps authored mode cards and aligned text at first and last lessons", () => {
  for (const n of [1, 7, 10]) {
    const draft = frenchLunchFoundationLesson(n);
    const definition = getLessonDefinition({
      moduleId: "foundation-travel-lunch-fr", lessonNumber: n,
      targetLanguage: "French", instructionLanguage: "English",
      contentVersion: "french-travel-lunch-foundation-fr-en-v1-draft",
    });
    assert.equal(definition?.title, draft.title);
    assert.deepEqual(definition?.reading?.sentences.map(({ target, native }) => [target, native]),
      draft.reader.map(({ fr, en }) => [fr, en]));
    assert.equal(definition?.teaching?.writing.prompt, draft.modes.write.cueEnglish);
    assert.ok(draft.sourceCardIndices.includes(draft.modes.hear.sourceCard));
    assert.ok(definition?.words.some((word) => word.es === draft.words[0].es));
    assert.equal(definition?.readiness, "draft");
  }
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
