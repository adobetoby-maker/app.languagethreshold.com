import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { getLessonDefinition, lessonObjectiveId } = await loadModule("src/lib/lesson-definition.ts");
const input = {
  moduleId: "roofing",
  targetLanguage: "Spanish",
  instructionLanguage: "English",
  contentVersion: "qa-unreleased",
};
test("Roofing definitions cover30 stable objectives and preserve source lesson content", () => {
  const ids = new Set();
  for (let n = 1; n <= 30; n++) {
    const d = getLessonDefinition({ ...input, lessonNumber: n });
    assert.ok(d.objective && d.words.length >= 12);
    assert.equal(d.objectiveId, `roofing.lesson.${n}`);
    assert.equal(d.contentVersion, "qa-unreleased");
    assert.equal(d.modes.length, 6);
    assert.deepEqual(d.prerequisites, n > 1 ? [`roofing.lesson.${n - 1}`] : []);
    assert.equal(d.readiness, "draft");
    ids.add(d.id);
  }
  assert.equal(ids.size, 30);
  assert.equal(getLessonDefinition({ ...input, lessonNumber: 31 }), null);
});
test("introductory and final lessons request different production and listening complexity", () => {
  const first = getLessonDefinition({ ...input, lessonNumber: 1 }).teaching;
  const last = getLessonDefinition({ ...input, lessonNumber: 30 }).teaching;
  assert.equal(first.stage, "supported");
  assert.equal(last.stage, "independent");
  assert.ok(last.response.suggestedSentences > first.response.suggestedSentences);
  assert.notEqual(last.listening.kind, first.listening.kind);
  assert.notEqual(last.speaking.wordBank, first.speaking.wordBank);
  assert.match(last.writing.prompt, /end-of-day handoff/);
  assert.notEqual(first.writing.prompt, last.writing.prompt);
});
test("a new language track cannot inherit Spanish content or verified readiness", () => {
  const d = getLessonDefinition({ ...input, targetLanguage: "French", lessonNumber: 1 });
  assert.deepEqual(d.words, []);
  assert.equal(d.teaching, null);
  assert.equal(d.readiness, "draft");
  assert.ok(d.gaps.length);
  assert.notEqual(d.id, getLessonDefinition({ ...input, lessonNumber: 1 }).id);
  assert.equal(d.objectiveId, lessonObjectiveId("roofing", 1));
  assert.throws(() => lessonObjectiveId("../private", 1));
});

test("English-for-work definitions use only their English/Spanish authored pair", () => {
  const args = {
    moduleId: "foundation-fmg",
    lessonNumber: 1,
    targetLanguage: "English",
    instructionLanguage: "Spanish",
    contentVersion: "qa-unreleased",
  };
  const english = getLessonDefinition(args);
  assert.ok(english.words.length >= 12);
  assert.equal(english.words[0].es, "the doctor");
  assert.equal(english.words[0].en, "el médico");
  assert.deepEqual(getLessonDefinition({ ...args, instructionLanguage: "French" }).words, []);
  assert.deepEqual(getLessonDefinition({ ...args, targetLanguage: "Spanish" }).words, []);
});

test("listening grows from the word list to aligned connected passage messages", () => {
  const first = getLessonDefinition({ ...input, lessonNumber: 1 });
  const middle = getLessonDefinition({ ...input, lessonNumber: 15 });
  const last = getLessonDefinition({ ...input, lessonNumber: 30 });
  assert.equal(first.listeningItems.length, first.words.length);
  assert.equal(middle.listeningItems.length, middle.reading.sentences.length);
  assert.ok(last.listeningItems.length < last.reading.sentences.length);
  assert.equal(
    last.listeningItems[0].es,
    last.reading.sentences
      .slice(0, 2)
      .map((s) => s.target)
      .join(" "),
  );
  assert.equal(
    last.listeningItems[0].en,
    last.reading.sentences
      .slice(0, 2)
      .map((s) => s.native)
      .join(" "),
  );
  for (const lesson of [first, middle, last])
    assert.ok(lesson.listeningItems.every((item) => item.en && item.es));
});
