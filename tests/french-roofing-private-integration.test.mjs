import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
  FRENCH_ROOFING_RELEASE_ENABLED,
  inspectPrivateFrenchRoofing,
  releasedFrenchRoofing,
} from '../src/data/private-french-roofing-candidate.ts';

const directory = new URL('../content/french-roofing/', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const fixture = load('private-runtime-candidate.json');
const batches = readdirSync(directory)
  .filter(name => /^private-mode-activities-.*\.json$/.test(name))
  .sort()
  .map(load);
const pair = { target: 'French', native: 'English' };

test('French Roofing inspection is exact-pair and never enables release', () => {
  const candidate = inspectPrivateFrenchRoofing(fixture, batches);
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(FRENCH_ROOFING_RELEASE_ENABLED, false);
  assert.equal(releasedFrenchRoofing(), null);
  assert.deepEqual(candidate.candidateStageIds, ['foundation-roofing', 'roofing', 'master-roofing']);
  assert.deepEqual(candidate.candidateStageIds.map(id => candidate.stage(id, pair).length), [10, 30, 20]);
  assert.deepEqual(candidate.stage('roofing', { target: 'Spanish', native: 'English' }), []);
  assert.deepEqual(candidate.stage('roofing', { target: 'French', native: 'Spanish' }), []);
  assert.equal(candidate.lesson('core', 1, { target: 'Spanish', native: 'English' }), null);
  assert.equal(candidate.activity('core', 1, 'see', { target: 'French', native: 'Spanish' }), null);
  assert.deepEqual(candidate.candidateOfflinePackIds, [
    'foundation-roofing-fr-en', 'roofing-fr-en', 'master-roofing-fr-en',
  ]);
});

test('all 60 private lessons expose source-matched six-mode models without release', () => {
  const candidate = inspectPrivateFrenchRoofing(fixture, batches);
  for (const [stage, count] of [['foundation', 10], ['core', 30], ['master', 20]]) {
    for (let n = 1; n <= count; n++) {
      assert.equal(candidate.lesson(stage, n, pair)?.draftLessonKey, `${stage}:${n}`);
      for (const mode of ['see', 'recall', 'hear', 'type', 'say', 'write']) {
        const item = candidate.activity(stage, n, mode, pair);
        assert.equal(item?.id, `${stage}:${n}:${mode}:pilot-1`);
        assert.equal(item?.readyForLearner, false);
      }
    }
    assert.equal(candidate.lesson(stage, count + 1, pair), null);
  }
});

test('inspection rejects a wrong pair, changed source model, or accidental release', () => {
  const wrongPair = structuredClone(fixture);
  wrongPair.nativeLanguage = 'Spanish';
  assert.throws(() => inspectPrivateFrenchRoofing(wrongPair, batches), /pair mismatch/);
  const wrongModel = structuredClone(batches);
  wrongModel[0].activities[0].modelEnglish = 'different meaning';
  assert.throws(() => inspectPrivateFrenchRoofing(fixture, wrongModel), /source pair mismatch/);
  const released = structuredClone(fixture);
  released.releaseGate.runtimeRegistered = true;
  assert.throws(() => inspectPrivateFrenchRoofing(released, batches), /release gate/);
});
