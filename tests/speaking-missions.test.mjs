import assert from "node:assert/strict";
import test from "node:test";
import {
  isMissionTtsSpeed,
  MISSION_TTS_SPEEDS,
  MISSION_TTS_VOICES,
} from "../src/data/mission-tts.ts";
import {
  findSpeakingMission,
  getSpeakingMissions,
  getSpeakingModules,
  SPEAKING_LANGUAGES,
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

test("speaking preview covers every authored topic in Spanish, Italian, and Japanese", () => {
  const expected = {
    Spanish: { modules: 40, challenges: 233, lessons: 1180, curated: 6, total: 1419 },
    Italian: { modules: 39, challenges: 226, lessons: 1170, curated: 0, total: 1396 },
    Japanese: { modules: 39, challenges: 226, lessons: 1170, curated: 0, total: 1396 },
  };

  assert.deepEqual(
    SPEAKING_LANGUAGES.map((entry) => entry.language),
    ["Spanish", "Italian", "Japanese"],
  );
  for (const { language, locale } of SPEAKING_LANGUAGES) {
    const modules = getSpeakingModules(language);
    const missions = getSpeakingMissions(language);
    const challenges = missions.filter((mission) => mission.id.includes("_challenge_"));
    const lessons = missions.filter((mission) => mission.id.includes("_lesson_"));
    const curated = missions.filter(
      (mission) => !mission.id.includes("_challenge_") && !mission.id.includes("_lesson_"),
    );
    assert.equal(modules.length, expected[language].modules, `${language} modules`);
    assert.equal(challenges.length, expected[language].challenges, `${language} challenges`);
    assert.equal(lessons.length, expected[language].lessons, `${language} lessons`);
    assert.equal(curated.length, expected[language].curated, `${language} curated`);
    assert.equal(missions.length, expected[language].total, `${language} total`);
    assert.ok(
      missions.every((mission) => mission.locale === locale),
      `${language} locale`,
    );

    for (const module of modules) {
      assert.equal(
        challenges.filter((mission) => mission.moduleId === module.id).length,
        module.challengePrompts.length,
        `${language}/${module.id} challenges`,
      );
      assert.ok(
        lessons.some((mission) => mission.moduleId === module.id),
        `${language}/${module.id} lessons`,
      );
    }
  }

  assert.equal(SPEAKING_MISSIONS.length, 4211);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.id)).size, 4211);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.scenarioId)).size, 4211);
  assert.ok(!SPEAKING_MISSIONS.some((mission) => ["or-evs", "fmg"].includes(mission.moduleId)));
});

test("each speaking mission has complete UX-preview metadata", () => {
  for (const mission of SPEAKING_MISSIONS) {
    assert.equal(mission.version, 1);
    assert.ok(["Spanish", "Italian", "Japanese"].includes(mission.language));
    assert.ok(["es-419", "it-IT", "ja-JP"].includes(mission.locale));
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
