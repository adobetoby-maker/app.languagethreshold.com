import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const pack = JSON.parse(read('content/japanese-basics/private-katakana-contrasts-ja-en.json'));

test('katakana contrasts retain exact lesson terms and private review gates', () => {
  assert.equal(pack.pairKey, 'Japanese:English');
  assert.equal(pack.registered, false);
  assert.equal(pack.reviewed, false);
  assert.equal(pack.unitCount, 3);
  assert.equal(pack.activityCount, 7);
  const sources = Object.fromEntries(Object.entries(pack.sourceFiles).map(([stage, ref]) => {
    const raw = read(ref.path);
    assert.equal(createHash('sha256').update(raw).digest('hex'), ref.sha256);
    return [stage, JSON.parse(raw)];
  }));
  const activityIds = new Set();
  for (const [index, unit] of pack.units.entries()) {
    assert.equal(unit.id, `ja101-katakana-contrast-unit:${index + 1}`);
    assert.equal(unit.reviewed, false);
    assert.ok(unit.focus);
    const examples = new Map(unit.sourceExamples.map(example => [example.id, example]));
    for (const example of unit.sourceExamples) {
      const match = /^(foundation-|master-)?japanese-basics:(\d+)$/.exec(example.sourceLessonKey);
      assert.ok(match);
      const stage = match[1] ? match[1].slice(0, -1) : 'core';
      const term = sources[stage].lessons[Number(match[2]) - 1].terms[example.sourceTermIndex];
      assert.equal(term, `${example.kana}|${example.english}`);
    }
    assert.ok(unit.activities.some(activity => activity.mode === 'recognize'));
    assert.ok(unit.activities.some(activity => activity.mode === 'write'));
    for (const activity of unit.activities) {
      assert.ok(!activityIds.has(activity.id));
      activityIds.add(activity.id);
      assert.ok(examples.has(activity.sourceExampleId));
      assert.ok(activity.prompt && activity.answer && activity.explanation);
      if (activity.mode === 'write') assert.equal(activity.answer, examples.get(activity.sourceExampleId).kana);
    }
  }
  assert.equal(activityIds.size, 7);
  assert.equal(pack.units[0].activities[0].answer, 'ド');
  assert.equal(pack.units[0].activities[1].answer, 'ペ');
  assert.equal(pack.units[1].activities[0].answer, 'ュ');
  assert.equal(pack.units[2].activities[0].answer, 'ー');
});
