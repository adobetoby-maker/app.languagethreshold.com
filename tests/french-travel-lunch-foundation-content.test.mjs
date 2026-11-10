import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const stageBytes = readFileSync("src/data/core60/fr/foundation-travel-lunch-fr.json");
const stage = JSON.parse(stageBytes);
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/foundation-lesson-content-candidate.json"));

test("private French Lunch Foundation content is source-pinned and remains unregistered", () => {
  assert.equal(candidate.sourceStageSha256, createHash("sha256").update(stageBytes).digest("hex"));
  assert.equal(candidate.module, stage.module);
  assert.equal(candidate.language, stage.language);
  assert.equal(candidate.nativeLanguage, stage.nativeLanguage);
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.registered, false);
  assert.deepEqual(Object.keys(candidate.lessons), Array.from({ length: 10 }, (_, index) => String(index + 1)));
});

for (const [number, candidateLesson] of Object.entries(candidate.lessons)) {
  test(`French Lunch Foundation ${number} has aligned teaching, stage words, and six verb forms`, () => {
    const stageLesson = stage.lessons.find((lesson) => lesson.n === Number(number));
    assert.equal(candidateLesson.stableId, stageLesson.stableId);
    assert.deepEqual(
      validateLessonContent({ passage: candidateLesson.passage, words: stageLesson.words, verbs: candidateLesson.verbs }, {
        language: "French",
        nativeLanguage: "English",
        parts: { passage: true, words: true, verbs: true },
        limits: CONTENT_LIMITS,
      }),
      [],
    );
  });
}
