import assert from "node:assert/strict";
import test from "node:test";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { authoredLessonReading } from "../src/lib/lesson-reading.ts";
import { moduleTeachingSettings } from "../src/data/module-teaching.ts";

test("Foreman Foundation pilot cannot expose Spanish content to Japanese learners", () => {
  const stage = getModule("foundation-construction-foreman");
  assert.ok(stage);
  assert.equal(moduleSupportsLearningPair(stage, "Spanish", "English"), true);
  assert.equal(moduleSupportsLearningPair(stage, "Japanese", "English"), false);
  for (let n = 1; n <= 3; n++) {
    assert.equal(authoredLessonReading(stage.id, n, "Japanese", "English"), null);
    assert.equal(moduleTeachingSettings(stage.id, n, "Japanese", "English"), null);
  }
});
