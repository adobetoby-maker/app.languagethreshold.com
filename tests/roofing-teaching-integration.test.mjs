import assert from "node:assert/strict";
import test from "node:test";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
import { lessonObjectiveId } from "../src/lib/learning-identity.ts";
test("Roofing speaking support progresses while keeping stable lesson objective links", () => {
  const all = getSpeakingMissions("Spanish");
  const first = all.find((m) => m.id === "scenario_version_roofing_lesson_1_es_v1");
  const last = all.find((m) => m.id === "scenario_version_roofing_lesson_30_es_v1");
  assert.equal(first.sourceObjectiveId, lessonObjectiveId("roofing", 1));
  assert.equal(last.sourceObjectiveId, lessonObjectiveId("roofing", 30));
  assert.equal(first.lessonTeaching.stage, "supported");
  assert.equal(first.lessonTeaching.speaking.wordBank, "visible");
  assert.equal(last.lessonTeaching.stage, "independent");
  assert.equal(last.lessonTeaching.speaking.wordBank, "on-request");
  assert.notEqual(first.lessonTeaching.speaking.context, last.lessonTeaching.speaking.context);
  const other = all.find((m) => m.id === "scenario_version_orthopedics_lesson_1_es_v1");
  assert.equal(other.lessonTeaching, undefined);
});
