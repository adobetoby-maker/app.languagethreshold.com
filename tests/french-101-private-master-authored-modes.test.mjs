import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const base = load('content/french-basics/private-runtime-master-1-20.json');
const candidate = load('content/french-basics/private-runtime-master-1-20-authored-modes.json');

test('Master authored-mode candidate keeps stable identities and review gates closed', () => {
  assert.equal(candidate.registered, false);
  assert.equal(candidate.reviewed, false);
  assert.deepEqual(candidate.masterStageFragment, base.masterStageFragment);
  assert.deepEqual(candidate.support.map(x => x.stableLessonKey), base.support.map(x => x.stableLessonKey));
  assert.deepEqual(candidate.authoredModeCoverage, [1, 2, 3]);
  assert.equal(candidate.authoredModeSources.length, 1);
  for (const source of candidate.authoredModeSources) {
    assert.equal(source.sha256, sha(source.path));
    assert.equal(source.baseSha256, sha(source.basePath));
  }
  for (const [index, lesson] of candidate.support.entries()) {
    for (const mode of ['see', 'recall', 'hear', 'type', 'say', 'write']) {
      const activity = lesson.modes[mode].authoredPrompt;
      if (index >= 3) { assert.equal(activity, undefined); continue; }
      assert.ok(activity.prompt.length >= 35);
      const source = mode === 'see' ? lesson.reader.target : [...lesson.cards.map(x => x.target), ...Object.values(lesson.grammarNotes.model ?? {})];
      assert.ok(source.includes(activity.targetText), `${index + 1} ${mode}`);
    }
    assert.equal(lesson.modes.hear.recordedAudio, false);
  }
});
