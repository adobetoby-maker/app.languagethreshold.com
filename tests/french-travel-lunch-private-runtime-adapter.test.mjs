import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FRENCH_TRAVEL_LUNCH_RELEASED,
  inspectPrivateFrenchTravelLunch,
  releasedFrenchTravelLunch,
} from "../src/lib/private-french-travel-lunch-runtime.ts";

const candidate = JSON.parse(readFileSync(new URL(
  "../content/french-travel-lunch/private-runtime-candidate.json", import.meta.url,
), "utf8"));
const stages = [["foundation-travel-lunch-fr", 10], ["travel-lunch", 30],
  ["master-travel-lunch-fr", 20]];

test("private French Lunch adapter joins 60 exact-pair lessons without release", () => {
  const runtime = inspectPrivateFrenchTravelLunch(candidate);
  assert.equal(FRENCH_TRAVEL_LUNCH_RELEASED, false);
  assert.equal(releasedFrenchTravelLunch(), null);
  assert.equal(runtime.releaseEnabled, false);
  assert.equal(runtime.lessonCount, 60);
  let cards = 0, turns = 0, passages = 0;
  for (const [moduleId, count] of stages) {
    for (let n = 1; n <= count; n++) {
      const lesson = runtime.getLesson(moduleId, n, "French", "English");
      assert.ok(lesson);
      assert.equal(lesson.reviewed, false);
      assert.equal(lesson.readyForLearner, false);
      assert.ok(runtime.cacheNamespace(moduleId, n, "French", "English")
        .includes(":French:English:"));
      assert.equal(runtime.getLesson(moduleId, n, "Spanish", "English"), null);
      assert.equal(runtime.getLesson(moduleId, n, "French", "Spanish"), null);
      assert.equal(runtime.cacheNamespace(moduleId, n, "French", "Spanish"), null);
      cards += lesson.cards.length;
      turns += lesson.reader.length;
      passages += lesson.passage.target.length;
    }
    assert.equal(runtime.getLesson(moduleId, 0, "French", "English"), null);
    assert.equal(runtime.getLesson(moduleId, count + 1, "French", "English"), null);
  }
  assert.deepEqual([cards, turns, passages], [948, 556, 587]);
});

test("private French Lunch adapter fails closed on pair, gate and content changes", () => {
  const wrongPair = structuredClone(candidate);
  wrongPair.pairKey = "French:Spanish";
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongPair), /Wrong French Lunch pair/);
  const released = structuredClone(candidate);
  released.registration = "enabled";
  assert.throws(() => inspectPrivateFrenchTravelLunch(released), /private release gate/);
  const wrongId = structuredClone(candidate);
  wrongId.lessons[0].stableId = "foundation-travel-lunch:1:es-en";
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongId), /changed lesson identity/);
  const wrongMode = structuredClone(candidate);
  wrongMode.lessons[0].modes.hear.modelFrench = "autre mot";
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongMode), /authored source card/);
  const wrongDictionary = structuredClone(candidate);
  wrongDictionary.lessons[0].cards[0].dictionaryId = "Spanish:other";
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongDictionary), /dictionary links/);
  const wrongReader = structuredClone(candidate);
  wrongReader.lessons[0].reader[0].fr = "";
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongReader), /Reader/);
  const wrongPassage = structuredClone(candidate);
  wrongPassage.lessons[0].passage.native.pop();
  assert.throws(() => inspectPrivateFrenchTravelLunch(wrongPassage), /aligned passage/);
});
