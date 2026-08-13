import assert from "node:assert/strict";
import test from "node:test";
import {
  isMissionTtsSpeed,
  MISSION_TTS_SPEEDS,
  MISSION_TTS_VOICES,
} from "../src/data/mission-tts.ts";
import {
  findSpeakingMission,
  SPANISH_SPEAKING_MODULES,
  SPEAKING_MISSIONS,
} from "../src/data/speaking-missions.ts";

const APPROVED_SCENARIO_VERSION_IDS = [
  "scenario_version_construction_safety_briefing_es_v1",
  "scenario_version_construction_materials_measurement_es_v1",
  "scenario_version_construction_hazard_report_es_v1",
  "scenario_version_missionary_return_appointment_es_v1",
  "scenario_version_missionary_restoration_question_es_v1",
  "scenario_version_missionary_church_ride_es_v1",
];

test("speaking preview preserves the six reviewed immutable scenarios", () => {
  assert.deepEqual(
    SPEAKING_MISSIONS.slice(0, APPROVED_SCENARIO_VERSION_IDS.length).map((mission) => mission.id),
    APPROVED_SCENARIO_VERSION_IDS,
  );
});

test("speaking preview covers every existing Spanish specialty challenge", () => {
  assert.equal(SPANISH_SPEAKING_MODULES.length, 40);
  const challengeCount = SPANISH_SPEAKING_MODULES.reduce(
    (total, module) => total + module.challengePrompts.length,
    0,
  );
  assert.equal(challengeCount, 233);
  assert.equal(SPEAKING_MISSIONS.length, APPROVED_SCENARIO_VERSION_IDS.length + challengeCount);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.id)).size, 239);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.scenarioId)).size, 239);

  for (const module of SPANISH_SPEAKING_MODULES) {
    const generated = SPEAKING_MISSIONS.filter(
      (mission) =>
        mission.moduleId === module.id &&
        mission.id.includes(`scenario_version_${module.id}_challenge_`),
    );
    assert.equal(generated.length, module.challengePrompts.length, module.id);
  }
  assert.ok(!SPEAKING_MISSIONS.some((mission) => ["or-evs", "fmg"].includes(mission.moduleId)));
});

test("each speaking mission has complete UX-preview metadata", () => {
  for (const mission of SPEAKING_MISSIONS) {
    assert.equal(mission.version, 1);
    assert.equal(mission.locale, "es-419");
    assert.ok(mission.title.length > 0);
    assert.ok(mission.moduleId.length > 0);
    assert.ok(mission.moduleName.length > 0);
    assert.ok(mission.moduleEmoji.length > 0);
    assert.ok(mission.openingLine.length > 0);
    assert.ok(mission.vocabulary.length > 0);
    assert.equal(mission.objectives.length, 3);
    assert.ok(mission.objectives.some((objective) => objective.critical));
    assert.equal(
      new Set(mission.objectives.map((objective) => objective.id)).size,
      mission.objectives.length,
    );
  }
});

test("mission lookup fails closed for unknown versions", () => {
  const approved = SPEAKING_MISSIONS[0];
  assert.equal(findSpeakingMission(approved.id), approved);
  assert.equal(findSpeakingMission("scenario_version_unknown_es_v1"), null);
});

test("mission TTS uses a fixed Google Neural2 woman/man pair", () => {
  assert.deepEqual(MISSION_TTS_VOICES.woman, {
    name: "es-US-Neural2-A",
    languageCode: "es-US",
    label: "Google Neural2 · woman",
  });
  assert.deepEqual(MISSION_TTS_VOICES.man, {
    name: "es-US-Neural2-B",
    languageCode: "es-US",
    label: "Google Neural2 · man",
  });
  assert.notEqual(MISSION_TTS_VOICES.woman.name, MISSION_TTS_VOICES.man.name);
});

test("mission TTS accepts only the published ear-training speeds", () => {
  assert.deepEqual(MISSION_TTS_SPEEDS, [0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5]);
  for (const speed of MISSION_TTS_SPEEDS) assert.equal(isMissionTtsSpeed(speed), true);
  for (const unsupported of [0.25, 0.7, 0.9, 2]) {
    assert.equal(isMissionTtsSpeed(unsupported), false);
  }
});
