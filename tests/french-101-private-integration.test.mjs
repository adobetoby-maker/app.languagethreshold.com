import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MODULES } from '../src/data/modules.ts';
import { getCurriculum } from '../src/data/curriculum.ts';
import { offlineLessonPackId } from '../src/lib/offline-lesson-tracks.ts';
import {
  FRENCH_101_RELEASE_ENABLED,
  FRENCH_101_STAGE_IDS,
  inspectPrivateFrench101,
  releasedFrench101,
} from '../src/data/private-french-101-candidate.ts';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const inputs = {
  foundation: load('content/french-basics/private-runtime-foundation-1-10-authored-modes.json'),
  core: load('content/french-basics/private-runtime-core-1-30-authored-modes.json'),
  master: load('content/french-basics/private-runtime-master-1-20-authored-modes.json'),
};
const pair = { target: 'French', native: 'English' };

test('private catalog and cache serve only the exact French-to-English pair', () => {
  const priorCatalog = MODULES.map(module => module.id);
  const priorSpanish = getCurriculum('spanish-basics');
  const priorJapanese = getCurriculum('foundation-japanese-basics');
  const candidate = inspectPrivateFrench101(inputs);
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(FRENCH_101_RELEASE_ENABLED, false);
  assert.equal(releasedFrench101(), null);
  assert.equal(candidate.supportsPair(pair), true);
  assert.equal(candidate.supportsPair({ target: 'French', native: 'Spanish' }), false);
  assert.equal(candidate.supportsPair({ target: 'Spanish', native: 'English' }), false);
  assert.deepEqual(candidate.catalog.map(module => module.id), FRENCH_101_STAGE_IDS);
  assert.ok(candidate.catalog.every(module => module.authoredPair?.target === 'French' && module.authoredPair?.native === 'English'));
  assert.deepEqual(FRENCH_101_STAGE_IDS.map(id => candidate.stage(id, pair)?.lessons.length), [10, 30, 20]);
  assert.equal(candidate.stage('foundation-french-basics', pair), candidate.stage('foundation-french-basics', pair));
  for (const id of FRENCH_101_STAGE_IDS) {
    assert.equal(candidate.stage(id, { target: 'Spanish', native: 'English' }), null);
    assert.equal(candidate.stage(id, { target: 'French', native: 'Spanish' }), null);
    assert.equal(candidate.activity(id, 1, { target: 'French', native: 'Spanish' }), null);
    assert.equal(getCurriculum(id), null, 'private candidate must not enter the live registry');
    assert.equal(offlineLessonPackId(id, 'French', 'English'), null, 'private candidate must not enter the shipped offline allowlist');
  }
  assert.deepEqual(MODULES.map(module => module.id), priorCatalog);
  assert.equal(getCurriculum('spanish-basics'), priorSpanish);
  assert.equal(getCurriculum('foundation-japanese-basics'), priorJapanese);
});

test('all six-mode sidecars, Reader, cards, dictionary and speaking remain lesson-scoped', () => {
  const candidate = inspectPrivateFrench101(inputs);
  for (const [stageIndex, id] of FRENCH_101_STAGE_IDS.entries()) {
    const count = [10, 30, 20][stageIndex];
    for (let n = 1; n <= count; n++) {
      const sidecar = candidate.activity(id, n, pair);
      assert.equal(sidecar?.stableLessonKey, `${id}:${n}`);
      assert.deepEqual(Object.keys(sidecar.modes).sort(), ['hear', 'recall', 'say', 'see', 'type', 'write']);
      for (const mode of ['hear', 'recall', 'say', 'see', 'type', 'write']) {
        assert.ok(sidecar.modes[mode].authoredPrompt.prompt.trim(), `${id}/${n} ${mode}`);
        assert.ok(sidecar.modes[mode].authoredPrompt.targetText.trim(), `${id}/${n} ${mode}`);
      }
      assert.ok(sidecar.reader && sidecar.cards.length && sidecar.dictionaryEntries.length && sidecar.speaking);
    }
    assert.equal(candidate.activity(id, 0, pair), null);
    assert.equal(candidate.activity(id, count + 1, pair), null);
  }
});

test('the private adapter rejects a wrong pair or altered progress identity', () => {
  const badPair = structuredClone(inputs);
  badPair.core.native = 'Spanish';
  assert.throws(() => inspectPrivateFrench101(badPair), /pair mismatch/);
  const badKey = structuredClone(inputs);
  badKey.master.support[19].stableLessonKey = 'master-spanish-basics:20';
  assert.throws(() => inspectPrivateFrench101(badKey), /unstable lesson key/);
  const accidentallyReleased = structuredClone(inputs);
  accidentallyReleased.foundation.registered = true;
  assert.throws(() => inspectPrivateFrench101(accidentallyReleased), /private, unreviewed/);
  const countOnly = structuredClone(inputs);
  delete countOnly.core.support[24].modes.write.authoredPrompt;
  assert.throws(() => inspectPrivateFrench101(countOnly), /missing an authored write activity at 25/);
});
