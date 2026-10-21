import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { lessonSourceCoverage, summarizeLessonSourceCoverage } = await loadModule(
  "src/lib/lesson-source-coverage.ts",
);
const { getLessonDefinition } = await loadModule("src/lib/lesson-definition.ts");
const short = await loadModule("tests/fixtures/short-curriculum.ts");
const definitions = Array.from({ length: 30 }, (_, index) =>
  getLessonDefinition({
    moduleId: "roofing",
    lessonNumber: index + 1,
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    contentVersion: "qa-source-only",
  }),
);
test("Roofing actual source covers30 word lists, aligned passages and toolkit settings without implying review", () => {
  const coverage = lessonSourceCoverage("roofing", "Spanish", "English");
  assert.equal(coverage.lessonsWithWords, 30);
  assert.equal(coverage.lessonsWithinVocabularyBaseline, 30);
  assert.equal(coverage.lessonsWithPassages, 30);
  assert.equal(coverage.lessonsWithTeachingSettings, 30);
  assert.equal(coverage.structurallyComplete, true);
  assert.equal("verified" in coverage, false);
});
test("Landscaper covers all30 draft sources without implying qualified review", () => {
  const coverage = lessonSourceCoverage("landscaper", "Spanish", "English");
  assert.equal(coverage.lessonsWithWords, 30);
  assert.equal(coverage.lessonsWithPassages, 30);
  assert.equal(coverage.lessonsWithTeachingSettings, 30);
  assert.deepEqual(coverage.missingWordLists, []);
  assert.equal(coverage.structurallyComplete, true);
  assert.equal("verified" in coverage, false);
});
test("a different language pair cannot inherit the Roofing Spanish source coverage", () => {
  const coverage = lessonSourceCoverage("roofing", "French", "English");
  assert.equal(coverage.lessonsWithWords, 0);
  assert.equal(coverage.lessonsWithPassages, 0);
  assert.equal(coverage.lessonsWithTeachingSettings, 0);
  assert.equal(coverage.structurallyComplete, false);
});
test("short curricula expose the actual missing lesson numbers", () => {
  // No shipped module is short any more; a synthetic 15-lesson curriculum keeps the gap path covered.
  const coverage = short.lessonSourceCoverage(short.SHORT_MODULE_ID, "Spanish", "English");
  assert.deepEqual(
    coverage.missingLessonNumbers,
    Array.from({ length: 15 }, (_, i) => i + 16),
  );
  assert.equal(coverage.structurallyComplete, false);
});
test("expanded travel and fishing plans have all thirty lesson numbers, with content still pending", () => {
  for (const moduleId of ["travel-breakfast", "sport-fishing"]) {
    const coverage = lessonSourceCoverage(moduleId, "Spanish", "English");
    assert.deepEqual(coverage.missingLessonNumbers, [], moduleId);
    assert.deepEqual(coverage.duplicateLessonNumbers, [], moduleId);
    // Inline word lists and passages for these modules are not authored yet.
    assert.equal(coverage.structurallyComplete, false, moduleId);
  }
});
test("duplicate numbers, insufficient words and blank translations cannot pass source completeness", () => {
  const changed = structuredClone(definitions);
  changed[1].lessonNumber = 1;
  changed[0].words = changed[0].words.slice(0, 3);
  changed[2].reading.sentences[0].native = " ";
  const coverage = summarizeLessonSourceCoverage(changed);
  assert.deepEqual(coverage.missingLessonNumbers, [2]);
  assert.deepEqual(coverage.duplicateLessonNumbers, [1]);
  assert.ok(coverage.vocabularyQuantityGaps.includes(1));
  assert.ok(coverage.missingPassages.includes(3));
  assert.equal(coverage.structurallyComplete, false);
});
test("written recall-step gaps stay distinct from actual shared toolkit settings", () => {
  const changed = structuredClone(definitions);
  changed[0].source.steps = [];
  const coverage = summarizeLessonSourceCoverage(changed);
  assert.ok(coverage.lessonsWithoutExplicitRecallStep.includes(1));
  assert.equal(coverage.lessonsWithTeachingSettings, 30);
  assert.equal(coverage.structurallyComplete, true);
});
