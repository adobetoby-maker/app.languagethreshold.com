import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const source = load('content/japanese-basics/foundation.json');
const practice = load('src/data/japanese-basics-practice.json')['foundation-japanese-basics'];
const candidate = load('content/japanese-basics/private-foundation-practice-speaking-ja-en.json');

test('private Japanese Foundation speaking candidate pins ten exact source lessons and preserves practice data', () => {
  assert.equal(candidate.pairKey, 'Japanese:English');
  assert.equal(candidate.registered, false);
  assert.equal(candidate.reviewed, false);
  for (const [path, hash] of [[candidate.sourceFile, candidate.sourceSha256], [candidate.practiceFile, candidate.practiceSha256], [candidate.missionsFile, candidate.missionsSha256]]) {
    assert.equal(sha(path), hash);
  }
  assert.deepEqual(Object.keys(candidate.support).map(Number), Array.from({ length: 10 }, (_, i) => i + 1));
  const roles = new Set();
  for (let n = 1; n <= 10; n++) {
    const authored = source.lessons[n - 1];
    const prior = practice[n];
    const lesson = candidate.support[n];
    const mission = lesson.authoredSpeakingMission;
    assert.equal(mission.stableLessonKey, `foundation-japanese-basics:${n}`);
    assert.equal(mission.opening, authored.dialogue[0].split('|', 1)[0]);
    assert.equal(lesson.openingLine, prior.openingLine);
    assert.deepEqual(lesson.reading, prior.reading);
    assert.deepEqual(lesson.grammar, prior.grammar);
    assert.deepEqual(lesson.checks, prior.checks);
    assert.equal(lesson.partnerRole, mission.role);
    assert.ok(lesson.speaking.includes(mission.complication) && lesson.speaking.includes(mission.closure));
    assert.ok(mission.objectives.length >= 3);
    roles.add(mission.role);
  }
  assert.equal(roles.size, 10);
});
