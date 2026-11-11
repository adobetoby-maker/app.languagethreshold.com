import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const coreBytes = readFileSync("src/data/french-travel-lunch-core.json");
const core = JSON.parse(coreBytes);
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/core-lesson-content-candidate.json"));

test("private French Lunch Core content pins the exact source and closed release gates", () => {
  assert.equal(candidate.sourceCoreSha256, createHash("sha256").update(coreBytes).digest("hex"));
  assert.equal(candidate.module, core.module);
  assert.equal(candidate.language, "French");
  assert.equal(candidate.nativeLanguage, "English");
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.registered, false);
  assert.deepEqual(Object.keys(candidate.lessons), Array.from({ length: 10 }, (_, index) => String(index + 1)));
});

for (const [number, item] of Object.entries(candidate.lessons)) {
  test(`French Lunch Core ${number} keeps mode cards and validates passage, words, and verbs`, () => {
    const source = core.lessons[Number(number) - 1];
    assert.equal(item.stableId, source.stableId);
    assert.equal(new Set(item.sourceCardIndices).size, item.sourceCardIndices.length);
    assert.ok(item.sourceCardIndices.every((index) => Number.isInteger(index) && index >= 1 && index <= source.words.length));
    const referenced = Object.values(source.modes).map((activity) => activity.sourceCard);
    assert.ok(referenced.every((index) => item.sourceCardIndices.includes(index)));
    const words = item.sourceCardIndices.map((index) => source.words[index - 1]);
    assert.deepEqual(validateLessonContent({ passage: item.passage, words, verbs: item.verbs }, {
      language: "French", nativeLanguage: "English",
      parts: { passage: true, words: true, verbs: true }, limits: CONTENT_LIMITS,
    }), []);
    for (const turn of source.reader) {
      const index = item.passage.target.indexOf(turn.fr);
      assert.notEqual(index, -1);
      assert.equal(item.passage.native[index], turn.en);
    }
    for (const verb of item.verbs) {
      const index = item.passage.target.findIndex((line) => line.includes(verb.example.target));
      assert.notEqual(index, -1);
      assert.ok(item.passage.native[index].includes(verb.example.native));
    }
  });
}
