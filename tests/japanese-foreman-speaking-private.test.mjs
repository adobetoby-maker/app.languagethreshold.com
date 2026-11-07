import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPrivateForemanSpeaking,
  privateForemanSpeakingMission,
  JAPANESE_FOREMAN_SPEAKING_RELEASED,
} from "../src/lib/private-japanese-foreman-speaking.ts";

const inventory = JSON.parse(readFileSync(new URL(
  "../content/japanese-construction-foreman/private-speaking-missions-ja-en.json", import.meta.url,
), "utf8"));
const lookup = buildPrivateForemanSpeaking(inventory);

test("60 stable missions and every word bank come from the exact authored lesson", () => {
  assert.equal(inventory.missions.length, 60);
  assert.equal(new Set(inventory.missions.map((mission) => mission.id)).size, 60);
  assert.equal(inventory.counts.wordPlacements,
    inventory.missions.reduce((sum, mission) => sum + mission.wordBank.length, 0));
  for (const mission of inventory.missions) {
    const source = JSON.parse(readFileSync(new URL(
      `../content/japanese-construction-foreman/${mission.sourceFile}`, import.meta.url,
    ), "utf8"));
    assert.equal(source.pairKey, "Japanese:English");
    assert.equal(source.courseId, mission.courseId);
    const lesson = source.lessons.find((item) => item.n === mission.lesson);
    assert.equal(mission.sourceLessonId, lesson.id);
    assert.equal(mission.id, lesson.speaking.id);
    assert.equal(mission.openingLineJapanese, lesson.speaking.openingLine);
    assert.equal(mission.briefEnglish, lesson.speaking.summary);
    assert.equal(mission.partnerRoleEnglish, lesson.speaking.partnerRole);
    const dictionary = new Map(source.dictionary.map((entry) =>
      [`${entry.target}\0${entry.native}`, entry.id]));
    assert.deepEqual(mission.wordBank.map((word) => [word.target, word.english, word.cardId]),
      lesson.words.map((word) => [word.es, word.en, word.cardId]));
    assert.ok(mission.wordBank.every((word) =>
      dictionary.get(`${word.target}\0${word.english}`) === word.dictionaryId));
    assert.deepEqual(lookup(mission.stage, mission.lesson, "Japanese", "English"), mission);
  }
});

test("pair and lesson isolation reject Spanish and another lesson's word bank", () => {
  assert.equal(lookup("core", 1, "Spanish", "English"), undefined);
  assert.equal(lookup("core", 1, "Japanese", "Spanish"), undefined);
  assert.equal(lookup("core", 31, "Japanese", "English"), undefined);
  assert.notDeepEqual(lookup("core", 1, "Japanese", "English")?.wordBank,
    lookup("core", 2, "Japanese", "English")?.wordBank);
  assert.ok(inventory.missions.every((mission) => mission.locale === "ja-JP" &&
    !mission.id.includes("es-en") && mission.reviewed === false));
});

test("release gate blocks speaking mission despite valid source", () => {
  assert.equal(JAPANESE_FOREMAN_SPEAKING_RELEASED, false);
  assert.equal(privateForemanSpeakingMission(lookup, "core", 1, "Japanese", "English"), undefined);
});

test("rejects registration, false pair and malformed source card IDs", () => {
  assert.throws(() => buildPrivateForemanSpeaking({ ...inventory, registered: true }));
  assert.throws(() => buildPrivateForemanSpeaking({ ...inventory, pairKey: "Spanish:English" }));
  const mission = { ...inventory.missions[0], wordBank: [
    { ...inventory.missions[0].wordBank[0], cardId: "card-es-en-evil" },
    ...inventory.missions[0].wordBank.slice(1),
  ] };
  assert.throws(() => buildPrivateForemanSpeaking({ ...inventory,
    missions: [mission, ...inventory.missions.slice(1)] }));
});
