import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MASTER_CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const sourcePath = "content/french-travel-lunch/master-1-5-draft.json";
const sourceBytes = readFileSync(sourcePath);
const source = JSON.parse(sourceBytes).lessons[0];
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/master-lesson-content-candidate.json"));
const item = candidate.lessons["1"];

test("private French Lunch Master 1 pins its source and keeps review gates closed", () => {
  assert.deepEqual(Object.keys(candidate.lessons), ["1"]);
  assert.equal(candidate.sourceDraftSha256["master-1-5-draft.json"], createHash("sha256").update(sourceBytes).digest("hex"));
  assert.equal(candidate.module, "master-travel-lunch");
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.registered, false);
  assert.equal(item.stableId, source.stableId);
  assert.deepEqual(item.sourceCardIndices, source.cards.map((_, index) => index + 1));
  assert.ok(Object.values(source.modes).every((mode) => item.sourceCardIndices.includes(mode.sourceCard)));
});

test("private French Lunch Master 1 meets Master density and preserves source Reader and vocabulary", () => {
  const words = source.cards.map(({ fr, en, kind }) => ({ es: fr, en, kind }));
  assert.deepEqual(validateLessonContent({ passage: item.passage, words, verbs: item.verbs }, {
    language: "French", nativeLanguage: "English",
    parts: { passage: true, words: true, verbs: true }, limits: MASTER_CONTENT_LIMITS,
  }), []);
  for (const turn of source.reader) {
    const index = item.passage.target.indexOf(turn.fr);
    assert.notEqual(index, -1);
    assert.equal(item.passage.native[index], turn.en);
  }
  for (const { example } of item.verbs) {
    const index = item.passage.target.indexOf(example.target);
    assert.notEqual(index, -1);
    assert.equal(item.passage.native[index], example.native);
  }
  assert.match(item.passage.target.join(" "), /dessert.*supplément/);
});
