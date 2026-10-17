import assert from "node:assert/strict";
import test from "node:test";
import {
  currentTutorLesson,
  tutorLessonThread,
  resolveTutorLesson,
  lessonTutorInstructions,
} from "../src/lib/lesson-tutor-context.ts";
const selection = {
  currentTab: "core30",
  activeModuleId: "roofing",
  selectedLanguage: "Spanish",
  nativeLanguage: "English",
};
test("inline lesson and Tutor select the same lesson/pair/version thread without changing Reader selection", () => {
  const ref = currentTutorLesson(
    "?module=roofing&lesson=1&target=Spanish&native=English",
    selection,
  );
  assert.ok(ref);
  assert.equal(
    tutorLessonThread(ref),
    tutorLessonThread(currentTutorLesson("?lesson=1", selection)),
  );
  assert.notEqual(tutorLessonThread(ref), "unrelated-reader-book");
  assert.notEqual(tutorLessonThread(ref), tutorLessonThread({ ...ref, lessonNumber: 2 }));
  assert.notEqual(
    tutorLessonThread(ref),
    tutorLessonThread({ ...ref, instructionLanguage: "French" }),
  );
  assert.equal(selection.currentTab, "core30");
  assert.equal(resolveTutorLesson(ref).title, "Name the Roof System");
});
test("lesson support advances across early/middle/final Roofing without claiming learner CEFR", () => {
  for (const [n, stage, sentences] of [
    [1, "supported", 1],
    [15, "connected", 2],
    [30, "independent", 3],
  ]) {
    const ref = currentTutorLesson(`?lesson=${n}`, selection),
      instructions = lessonTutorInstructions(ref);
    assert.match(instructions, new RegExp(`Teaching stage: ${stage}`));
    assert.match(instructions, new RegExp(`about ${sentences} sentence`));
    assert.match(instructions, /not assessed proficiency or CEFR/);
    assert.match(instructions, /Do not grant mastery, scores or certificates/);
    assert.match(instructions, new RegExp(`lesson ${n}:`));
  }
  const landscaping = currentTutorLesson("?lesson=30", {
    ...selection,
    activeModuleId: "landscaper",
  });
  assert.equal(resolveTutorLesson(landscaping).moduleId, "landscaper");
  assert.match(lessonTutorInstructions(landscaping), /Teaching stage: independent/);
});
test("stale versions, wrong navigation/pairs and missing lessons cannot masquerade as current context", () => {
  for (const search of [
    "?lesson=0",
    "?lesson=31",
    "?lesson=1x",
    "?lesson=1&module=landscaper",
    "?lesson=1&target=French",
    "?lesson=1&native=Spanish",
  ])
    assert.equal(currentTutorLesson(search, selection), null);
  assert.equal(currentTutorLesson("?lesson=1", { ...selection, currentTab: "reader" }), null);
  const ref = currentTutorLesson("?lesson=1", selection);
  assert.equal(resolveTutorLesson({ ...ref, contentVersion: "old-client-version" }), null);
  assert.equal(resolveTutorLesson({ ...ref, moduleId: "unknown-module" }), null);
});
