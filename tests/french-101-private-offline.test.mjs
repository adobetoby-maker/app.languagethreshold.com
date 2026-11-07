import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCurriculum } from '../src/data/curriculum.ts';
import { offlineLessonPackId } from '../src/lib/offline-lesson-tracks.ts';
import {
  buildPrivateFrench101Offline,
  verifyPrivateFrench101Offline,
} from '../src/data/private-french-101-offline.ts';

const read = file => JSON.parse(readFileSync(new URL(`../content/french-basics/${file}`, import.meta.url), 'utf8'));
const inputs = {
  foundation: read('private-runtime-foundation-1-10.json'),
  core: read('private-runtime-core-1-30.json'),
  master: read('private-runtime-master-1-20.json'),
};
const pair = { target: 'French', native: 'English' };

test('private offline candidate is exact-pair, complete and deterministic without public registration', async () => {
  const manifest = await buildPrivateFrench101Offline(inputs);
  assert.equal(manifest.releaseEnabled, false);
  assert.equal(manifest.registered, false);
  assert.equal(manifest.reviewed, false);
  assert.equal(manifest.recordedAudio, false);
  assert.equal(manifest.files.length, 60);
  assert.deepEqual(manifest.files.reduce((counts, file) => {
    counts[file.stageId] = (counts[file.stageId] ?? 0) + 1;
    return counts;
  }, {}), { 'foundation-french-basics': 10, 'french-basics': 30, 'master-french-basics': 20 });
  assert.deepEqual(manifest, await buildPrivateFrench101Offline(inputs));
  assert.equal(await verifyPrivateFrench101Offline(manifest, inputs, pair), true);
  for (const stageId of ['foundation-french-basics', 'french-basics', 'master-french-basics']) {
    assert.equal(getCurriculum(stageId), null);
    assert.equal(offlineLessonPackId(stageId, 'French', 'English'), null);
  }
  for (const file of manifest.files) {
    const body = JSON.parse(file.body);
    assert.equal(body.stableLessonKey, file.stableLessonKey);
    assert.equal(body.target, 'French');
    assert.equal(body.native, 'English');
    assert.ok(body.lesson && body.reader && body.cards.length && body.dictionaryEntries.length && body.speaking);
    assert.deepEqual(Object.keys(body.modes).sort(), ['hear', 'recall', 'say', 'see', 'type', 'write']);
    assert.equal(body.recordedAudio, false);
  }
});

test('verifier rejects changed bytes, rehashed content, wrong pair, route, namespace and source', async () => {
  const original = await buildPrivateFrench101Offline(inputs);
  for (const wrong of [
    { target: 'French', native: 'Spanish' },
    { target: 'Spanish', native: 'English' },
    { target: 'Japanese', native: 'English' },
  ]) assert.equal(await verifyPrivateFrench101Offline(original, inputs, wrong), false);
  const scenarios = [
    manifest => { manifest.files[0].body += ' '; },
    manifest => { manifest.files[0].path = manifest.files[1].path; },
    manifest => { manifest.files[0].cacheNamespace = 'private-review://spanish-101/es-en/v1'; },
    manifest => { manifest.cacheNamespace = 'private-review://french-101/fr-es/v1'; },
    manifest => { manifest.files[0].stableLessonKey = 'foundation-spanish-basics:1'; },
    manifest => { manifest.files[0].bytes += 1; },
    manifest => { manifest.files.pop(); },
    manifest => { manifest.registered = true; },
    manifest => { manifest.reviewed = true; },
    manifest => { manifest.recordedAudio = true; },
  ];
  for (const mutate of scenarios) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.equal(await verifyPrivateFrench101Offline(changed, inputs, pair), false);
  }
  const rehashed = structuredClone(original);
  rehashed.files[0].body = rehashed.files[0].body.replace('French', 'Spanish');
  rehashed.files[0].sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rehashed.files[0].body))).toString('hex');
  rehashed.files[0].bytes = new TextEncoder().encode(rehashed.files[0].body).byteLength;
  assert.equal(await verifyPrivateFrench101Offline(rehashed, inputs, pair), false);

  const changedSource = structuredClone(inputs);
  changedSource.foundation.support[0].cards[0].es += ' modifié';
  assert.equal(await verifyPrivateFrench101Offline(original, changedSource, pair), false);
});
