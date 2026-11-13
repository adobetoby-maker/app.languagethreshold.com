import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getSpeakingMissions } from '../src/data/speaking-missions.ts';

const preview = JSON.parse(readFileSync(new URL('../content/japanese-basics/private-speaking-runtime-preview-ja-en.json', import.meta.url)));
const stages = new Map([
  ['foundation-japanese-basics', 10],
  ['japanese-basics', 30],
  ['master-japanese-basics', 20],
]);
const live = getSpeakingMissions('Japanese').filter(mission =>
  mission.sourceObjectiveId && stages.has(mission.moduleId));

test('private Japanese 101 speaking preview covers the live 60 lessons without changing their identities or prompts outside speaking', () => {
  assert.equal(preview.pairKey, 'Japanese:English');
  assert.equal(preview.registered, false);
  assert.equal(preview.reviewed, false);
  assert.equal(preview.missionCount, 60);
  assert.equal(preview.missions.length, 60);
  assert.equal(live.length, 60);
  const originals = new Map(live.map(mission => [mission.sourceObjectiveId, mission]));
  assert.equal(originals.size, 60);
  const seen = new Set();
  for (const mission of preview.missions) {
    const original = originals.get(mission.sourceObjectiveId);
    assert.ok(original, mission.sourceObjectiveId);
    assert.equal(seen.has(mission.sourceObjectiveId), false);
    seen.add(mission.sourceObjectiveId);
    for (const key of ['id', 'scenarioId', 'version', 'moduleId', 'sourceObjectiveId', 'openingLine', 'locale', 'language'])
      assert.deepEqual(mission[key], original[key]);
    assert.deepEqual(mission.vocabulary, original.vocabulary);
    assert.deepEqual(mission.safetyRules, original.safetyRules);
    assert.deepEqual(mission.sourcePrompts.slice(0, 2), original.sourcePrompts.slice(0, 2));
    assert.deepEqual(mission.objectives.map(objective => objective.id), original.objectives.map(objective => objective.id));
    assert.notEqual(mission.partnerRole, original.partnerRole);
    assert.notEqual(mission.sourcePrompts[2], original.sourcePrompts[2]);
    assert.equal(mission.sourcePrompts[2], mission.lessonTeaching.speaking.context);
  }
  for (const [moduleId, count] of stages)
    assert.equal(preview.missions.filter(mission => mission.moduleId === moduleId).length, count);
});
