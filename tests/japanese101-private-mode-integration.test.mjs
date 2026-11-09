import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MODULES } from '../src/data/modules.ts';
import { getCurriculum } from '../src/data/curriculum.ts';
import { offlineLessonPackId } from '../src/lib/offline-lesson-tracks.ts';
import {
  JAPANESE_101_MODES_RELEASE_ENABLED,
  JAPANESE_101_MODE_STAGE_IDS,
  inspectPrivateJapanese101Modes,
  releasedJapanese101Modes,
} from '../src/data/private-japanese101-six-mode-candidate.ts';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const inputs = {
  foundation: load('content/japanese-basics/private-foundation-six-mode-runtime-preview-ja-en.json'),
  core: load('content/japanese-basics/private-core-30-six-mode-runtime-preview-ja-en.json'),
  master: load('content/japanese-basics/private-master-20-six-mode-runtime-preview-ja-en.json'),
};
const pair = { target: 'Japanese', native: 'English' };
const modes = ['see', 'recall', 'hear', 'type', 'say', 'write'];

test('private Japanese modes join all 60 existing lessons without changing the live registry', () => {
  const catalogBefore = MODULES.map(module => module.id);
  const spanishBefore = getCurriculum('spanish-basics');
  const japaneseBefore = JAPANESE_101_MODE_STAGE_IDS.map(id => getCurriculum(id, 'Japanese', 'English'));
  const candidate = inspectPrivateJapanese101Modes(inputs);
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(JAPANESE_101_MODES_RELEASE_ENABLED, false);
  assert.equal(releasedJapanese101Modes(), null);
  assert.equal(candidate.candidateActivityCount, 360);
  assert.equal(candidate.supportsPair(pair), true);
  assert.equal(candidate.supportsPair({ target: 'Japanese', native: 'Spanish' }), false);
  assert.equal(candidate.supportsPair({ target: 'Spanish', native: 'English' }), false);
  assert.deepEqual(JAPANESE_101_MODE_STAGE_IDS.map(id => candidate.stage(id, pair)?.lessons.length), [10, 30, 20]);
  for (const [index, id] of JAPANESE_101_MODE_STAGE_IDS.entries()) {
    for (let n = 1; n <= [10, 30, 20][index]; n++) {
      for (const mode of modes) {
        const activity = candidate.activity(id, n, mode, pair);
        assert.ok(activity?.prompt && activity.targetText && activity.nativeText, `${id}:${n}:${mode}`);
        assert.equal(candidate.activity(id, n, mode, { target: 'Japanese', native: 'Spanish' }), null);
      }
    }
    assert.equal(candidate.stage(id, { target: 'Japanese', native: 'Spanish' }), null);
    assert.equal(candidate.activity(id, 0, 'see', pair), null);
    assert.equal(candidate.activity(id, [10, 30, 20][index] + 1, 'see', pair), null);
    assert.equal(getCurriculum(id, 'Japanese', 'English'), japaneseBefore[index]);
    assert.equal(offlineLessonPackId(id, 'Japanese', 'English'), `${id}-ja-en`);
  }
  assert.deepEqual(MODULES.map(module => module.id), catalogBefore);
  assert.equal(getCurriculum('spanish-basics'), spanishBefore);
});

test('private Japanese mode adapter rejects changed pair, progress identity, and missing source pair', () => {
  const wrongPair = structuredClone(inputs);
  wrongPair.core.pairKey = 'Japanese:Spanish';
  assert.throws(() => inspectPrivateJapanese101Modes(wrongPair), /wrong pair/);
  const wrongLesson = structuredClone(inputs);
  wrongLesson.master.lessons[19].stableLessonKey = 'master-spanish-basics:20';
  assert.throws(() => inspectPrivateJapanese101Modes(wrongLesson), /unstable lesson identity/);
  const missingLine = structuredClone(inputs);
  missingLine.foundation.lessons[0].modes.hear.targetText = '別の文。';
  assert.throws(() => inspectPrivateJapanese101Modes(missingLine), /not an exact Reader pair/);
  const released = structuredClone(inputs);
  released.core.registered = true;
  assert.throws(() => inspectPrivateJapanese101Modes(released), /private review gate/);
});
