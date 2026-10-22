import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";

const { lessonReviewSnapshot, lessonReviewFingerprint } = await loadModule("src/lib/lesson-review.ts");
const short = await loadModule("tests/fixtures/short-curriculum.ts");
const roofing = () => lessonReviewSnapshot("roofing", "Spanish", "English");

test("review snapshot exposes all actual Roofing lesson materials while retaining draft status", () => {
  const snapshot = roofing();
  assert.equal(snapshot.status, "current-app-draft");
  assert.equal(snapshot.lessons.length, 30);
  assert.equal(new Set(snapshot.lessons.map((lesson) => lesson.objectiveId)).size, 30);
  for (const lesson of snapshot.lessons) {
    assert.ok(lesson.words.length >= 12);
    assert.ok(lesson.reading.sentences.length > 0);
    assert.ok(lesson.instructions.length > 0);
    assert.equal(lesson.modes.length, 6);
    assert.ok(lesson.listeningItems.length > 0);
    assert.ok(lesson.gaps.some((gap) => /approval.*pending/.test(gap)));
    assert.deepEqual(Object.keys(lesson).sort(), [
      "expectedMinutes", "gaps", "id", "instructions", "lessonNumber", "listeningItems",
      "modes", "objective", "objectiveId", "prerequisites", "reading", "speakingMissionReference",
      "teaching", "title", "words",
    ].sort());
  }
  assert.equal(snapshot.lessons[0].teaching.stage, "supported");
  assert.equal(snapshot.lessons[29].teaching.stage, "independent");
});

test("missing lessons and language materials stay visible as gaps rather than invented parity", () => {
  // No shipped module is short any more; a synthetic 15-lesson curriculum keeps the gap path covered.
  const shortDraft = short.lessonReviewSnapshot(short.SHORT_MODULE_ID, "Spanish", "English");
  assert.equal(shortDraft.lessons.length, short.SHORT_LESSON_COUNT);
  assert.ok(shortDraft.gaps.some((gap) => /15 lesson plans.*requires 30/.test(gap)));
  const travel = lessonReviewSnapshot("travel-breakfast", "Spanish", "English");
  assert.equal(travel.lessons.length, 30);
  assert.ok(!travel.gaps.some((gap) => /requires 30/.test(gap)));
  const french = lessonReviewSnapshot("roofing", "French", "English");
  assert.ok(french.lessons.every((lesson) => !lesson.words.length && !lesson.reading && !lesson.teaching));
  assert.equal(french.sourceVersion, "unversioned-app-draft");
  assert.equal(lessonReviewSnapshot("missing-module", "Spanish", "English"), null);
});

test("review data is detached from shared practice content", () => {
  const edited = roofing(), original = roofing();
  edited.lessons[0].words[0].es = "changed";
  edited.lessons[0].reading.sentences[0].target = "changed";
  edited.lessons[0].teaching.speaking.context = "changed";
  edited.lessons[0].instructions[0].instruction = "changed";
  edited.lessons[0].modes.pop();
  assert.deepEqual(roofing(), original);
});

test("snapshot identity ignores object key order but changes with actual instructional material", async () => {
  const original = roofing(), fingerprint = await lessonReviewFingerprint(original);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  const reversed = Object.fromEntries(Object.entries(original).reverse());
  assert.equal(await lessonReviewFingerprint(reversed), fingerprint);
  const mutations = [
    (s) => { s.lessons[0].words[0].es += " changed"; },
    (s) => { s.lessons[0].reading.sentences[0].target += " changed"; },
    (s) => { s.lessons[0].objective += " changed"; },
    (s) => { s.lessons[0].teaching.matchingBatchSize += 1; },
    (s) => { s.lessons[0].instructions[0].instruction += " changed"; },
  ];
  for (const mutate of mutations) {
    const changed = roofing();
    mutate(changed);
    assert.notEqual(await lessonReviewFingerprint(changed), fingerprint);
  }
});
