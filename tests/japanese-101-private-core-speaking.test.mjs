import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const source = load('content/japanese-basics/core.json');
const practice = load('src/data/japanese-basics-practice.json')['japanese-basics'];
const candidate = load('content/japanese-basics/private-core-practice-speaking-ja-en.json');

test('private Japanese Core speaking candidate keeps exact-pair identities and existing lesson work', () => {
  assert.equal(candidate.pairKey, 'Japanese:English');
  assert.equal(candidate.registered, false);
  assert.equal(candidate.reviewed, false);
  assert.equal(sha(candidate.sourceFile), candidate.sourceSha256);
  assert.equal(sha(candidate.practiceFile), candidate.practiceSha256);
  assert.deepEqual(candidate.authoredSpeakingCoverage, Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(candidate.authoredSpeakingSources.length, 3);
  for (const item of candidate.authoredSpeakingSources) assert.equal(sha(item.path), item.sha256);
  assert.deepEqual(Object.keys(candidate.support).map(Number), Array.from({ length: 30 }, (_, i) => i + 1));
  const roles = new Set();
  for (let n = 1; n <= 30; n++) {
    const prior = practice[n];
    const lesson = candidate.support[n];
    assert.deepEqual(lesson.reading, prior.reading);
    assert.deepEqual(lesson.grammar, prior.grammar);
    assert.deepEqual(lesson.checks, prior.checks);
    assert.equal(lesson.openingLine, prior.openingLine);
    const mission = lesson.authoredSpeakingMission;
    assert.equal(mission.stableLessonKey, `japanese-basics:${n}`);
    assert.equal(mission.opening, source.lessons[n - 1].dialogue[0].split('|', 1)[0]);
    assert.equal(lesson.partnerRole, mission.role);
    assert.ok(mission.objectives.length >= 3 && lesson.speaking.includes(mission.complication) && lesson.speaking.includes(mission.closure));
    roles.add(mission.role);
  }
  assert.equal(roles.size, 30);
});
