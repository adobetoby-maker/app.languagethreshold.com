import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const briefs = JSON.parse(read('content/french-basics/private-foundation-grammar-briefs-fr-en.json'));
const sourceRaw = read(briefs.sourceFixturePath);
const source = JSON.parse(sourceRaw);

test('ten private French Foundation grammar briefs cite exact lesson Reader pairs', () => {
  assert.equal(briefs.pairKey, 'French:English');
  assert.equal(briefs.moduleId, 'foundation-french-basics');
  assert.equal(briefs.registered, false);
  assert.equal(briefs.reviewed, false);
  assert.equal(briefs.sourceFixtureSha256, createHash('sha256').update(sourceRaw).digest('hex'));
  assert.equal(briefs.lessons.length, 10);
  assert.equal(new Set(briefs.lessons.map(lesson => lesson.grammarPoint)).size, 10);
  for (const [index, brief] of briefs.lessons.entries()) {
    const n = index + 1;
    const base = source.stageFile.lessons[index];
    const support = source.support[index];
    assert.equal(brief.n, n);
    assert.equal(brief.stableLessonKey, `foundation-french-basics:${n}`);
    assert.equal(brief.stableLessonKey, support.stableLessonKey);
    assert.equal(brief.sourceObjective, base.objective);
    assert.equal(brief.reviewed, false);
    assert.ok(brief.explanation.length > 45 && brief.contrast.length > 45, n);
    assert.ok(brief.examples.length >= 2, n);
    assert.equal(new Set(brief.examples.map(example => example.readerTurn)).size, brief.examples.length);
    for (const example of brief.examples) {
      assert.deepEqual(
        { target: example.target, native: example.native },
        support.reader.sentences[example.readerTurn - 1],
        `Foundation ${n} Reader turn ${example.readerTurn}`,
      );
    }
  }
});
