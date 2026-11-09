import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const plan = JSON.parse(read('content/japanese-basics/private-foundation-script-ja-en.json'));
const raw = read(plan.sourceFile);
const source = JSON.parse(raw);

test('Foundation script units cite exact Japanese 101 source terms and keep course private', () => {
  assert.equal(plan.pairKey, 'Japanese:English');
  assert.equal(plan.registered, false);
  assert.equal(plan.reviewed, false);
  assert.equal(plan.sourceSha256, createHash('sha256').update(raw).digest('hex'));
  assert.equal(plan.lessonCount, 10);
  assert.equal(plan.lessons.length, 10);
  for (const [index, unit] of plan.lessons.entries()) {
    const lesson = index + 1;
    assert.equal(unit.id, `ja101-script:foundation:${lesson}`);
    assert.equal(unit.sourceLessonKey, `foundation-japanese-basics:${lesson}`);
    assert.equal(unit.reviewed, false);
    assert.ok(unit.focus.trim() && unit.readingTask.trim());
    assert.equal(unit.examples.length, 2);
    for (const example of unit.examples) {
      const sourceNumber = Number(example.sourceLessonKey.split(':')[1]);
      assert.ok(sourceNumber >= 1 && sourceNumber <= lesson);
      const [kana, english] = source.lessons[sourceNumber - 1].terms[example.sourceTermIndex].split('|', 2);
      assert.equal(example.kana, kana);
      assert.equal(example.english, english);
    }
  }
  const firstFive = plan.lessons.slice(0, 5).map(unit => unit.newHiragana).join('');
  assert.equal(new Set(firstFive).size, 46);
  assert.equal(firstFive.length, 46);
});
