import assert from "node:assert/strict";
import test from "node:test";
import { findSpeakingMission, SPEAKING_MISSIONS } from "../src/data/speaking-missions.ts";

const APPROVED_SCENARIO_VERSION_IDS = [
  "scenario_version_construction_safety_briefing_es_v1",
  "scenario_version_construction_materials_measurement_es_v1",
  "scenario_version_construction_hazard_report_es_v1",
  "scenario_version_missionary_return_appointment_es_v1",
  "scenario_version_missionary_restoration_question_es_v1",
  "scenario_version_missionary_church_ride_es_v1",
];

test("speaking preview exposes only the six approved immutable scenarios", () => {
  assert.deepEqual(
    SPEAKING_MISSIONS.map((mission) => mission.id),
    APPROVED_SCENARIO_VERSION_IDS,
  );
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.id)).size, 6);
  assert.equal(new Set(SPEAKING_MISSIONS.map((mission) => mission.scenarioId)).size, 6);
});

test("each speaking mission has complete UX-preview metadata", () => {
  for (const mission of SPEAKING_MISSIONS) {
    assert.equal(mission.version, 1);
    assert.equal(mission.locale, "es-419");
    assert.ok(mission.title.length > 0);
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
