import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import {
  buildPrivateFrenchRoofingOffline,
  verifyPrivateFrenchRoofingOffline,
} from '../src/data/private-french-roofing-offline.ts';

const directory = new URL('../content/french-roofing/', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, directory), 'utf8'));
const fixture = load('private-runtime-candidate.json');
const batches = readdirSync(directory)
  .filter(name => /^private-mode-activities-.*\.json$/.test(name))
  .sort()
  .map(load);
const inputs = [fixture, batches];
const pair = { target: 'French', native: 'English' };

test('private French Roofing offline text is exact-pair, complete and deterministic', async () => {
  const manifest = await buildPrivateFrenchRoofingOffline(...inputs);
  assert.equal(manifest.releaseEnabled, false);
  assert.equal(manifest.registered, false);
  assert.equal(manifest.reviewed, false);
  assert.equal(manifest.recordedAudio, false);
  assert.equal(manifest.files.length, 60);
  assert.deepEqual(manifest.files.reduce((counts, file) => {
    counts[file.stageId] = (counts[file.stageId] ?? 0) + 1;
    return counts;
  }, {}), { 'foundation-roofing': 10, roofing: 30, 'master-roofing': 20 });
  assert.deepEqual(manifest, await buildPrivateFrenchRoofingOffline(...inputs));
  assert.equal(await verifyPrivateFrenchRoofingOffline(manifest, inputs, pair), true);
  for (const file of manifest.files) {
    const body = JSON.parse(file.body);
    assert.equal(body.stableLessonKey, file.stableLessonKey);
    assert.equal(body.target, 'French');
    assert.equal(body.native, 'English');
    assert.ok(body.words.length && body.reader.length && body.speakingOpeningFrench);
    assert.deepEqual(Object.keys(body.activities).sort(), ['hear', 'recall', 'say', 'see', 'type', 'write']);
    assert.equal(body.recordedAudio, false);
  }
});

test('private offline verifier rejects wrong pair, tampering, changed source and release flags', async () => {
  const original = await buildPrivateFrenchRoofingOffline(...inputs);
  for (const wrong of [
    { target: 'French', native: 'Spanish' },
    { target: 'Spanish', native: 'English' },
    { target: 'Japanese', native: 'English' },
  ]) assert.equal(await verifyPrivateFrenchRoofingOffline(original, inputs, wrong), false);
  const scenarios = [
    manifest => { manifest.files[0].body += ' '; },
    manifest => { manifest.files[0].path = manifest.files[1].path; },
    manifest => { manifest.files[0].cacheNamespace = 'private-review://spanish-roofing/es-en/v1'; },
    manifest => { manifest.cacheNamespace = 'private-review://french-roofing/fr-es/v1'; },
    manifest => { manifest.files[0].stableLessonKey = 'foundation:99'; },
    manifest => { manifest.files[0].bytes += 1; },
    manifest => { manifest.files.pop(); },
    manifest => { manifest.registered = true; },
    manifest => { manifest.reviewed = true; },
    manifest => { manifest.recordedAudio = true; },
  ];
  for (const mutate of scenarios) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.equal(await verifyPrivateFrenchRoofingOffline(changed, inputs, pair), false);
  }
  const rehashed = structuredClone(original);
  rehashed.files[0].body = rehashed.files[0].body.replace('French', 'Spanish');
  rehashed.files[0].sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rehashed.files[0].body))).toString('hex');
  rehashed.files[0].bytes = new TextEncoder().encode(rehashed.files[0].body).byteLength;
  assert.equal(await verifyPrivateFrenchRoofingOffline(rehashed, inputs, pair), false);
  const changedInputs = structuredClone(inputs);
  changedInputs[0].lessons[0].words[0].targetFrench += ' modifié';
  assert.equal(await verifyPrivateFrenchRoofingOffline(original, changedInputs, pair), false);
});
