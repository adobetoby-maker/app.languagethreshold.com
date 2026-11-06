#!/usr/bin/env node
// Source-alignment check for draft translations. This does not assess Japanese quality.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const sourcePath = new URL('../src/data/construction-foreman-lesson-content.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const js = await transform(source, { loader: 'ts', format: 'esm' });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(js.code).toString('base64')}`;
const { FOREMAN_LESSON_CONTENT } = await import(moduleUrl);
const courseMap = JSON.parse(await readFile(new URL('../content/japanese-construction-foreman/course-map.json', import.meta.url), 'utf8'));
const coreObjectives = Array.from({ length: 30 }, (_, index) => FOREMAN_LESSON_CONTENT[index + 1].objective);
assert.equal(courseMap.coreEnglishSource, 'src/data/construction-foreman-lesson-content.ts');
assert.equal(
  courseMap.coreEnglishObjectivesSHA256,
  createHash('sha256').update(JSON.stringify(coreObjectives)).digest('hex'),
  'Core source objective hash changed',
);
assert.deepEqual(courseMap.core, coreObjectives, 'Core topic map differs from the English lesson source');
assert.equal(courseMap.coreLegacyJapaneseTopics.length, 30, 'Legacy Japanese topic ideas must remain a separate backlog');
const batches = [
  ['core-translation-draft.json', 1, 3],
  ['core-translation-4-6-draft.json', 4, 6],
  ['core-translation-7-9-draft.json', 7, 9],
  ['core-translation-10-12-draft.json', 10, 12],
  ['core-translation-13-15-draft.json', 13, 15],
  ['core-translation-16-18-draft.json', 16, 18],
  ['core-translation-19-21-draft.json', 19, 21],
  ['core-translation-22-24-draft.json', 22, 24],
  ['core-translation-25-27-draft.json', 25, 27],
  ['core-translation-28-30-draft.json', 28, 30],
];

let count = 0;
for (const [filename, first, last] of batches) {
  const path = new URL(`../content/japanese-construction-foreman/${filename}`, import.meta.url);
  const draft = JSON.parse(await readFile(path, 'utf8'));
  const originals = Array.from({ length: last - first + 1 }, (_, index) => FOREMAN_LESSON_CONTENT[first + index]);
  const sourceHash = createHash('sha256').update(JSON.stringify(originals)).digest('hex');
  assert.equal(draft.englishSubsetSHA256, sourceHash, `${filename}: English source changed`);
  assert.equal(draft.moduleId, 'construction-foreman');
  assert.equal(draft.target, 'Japanese');
  assert.equal(draft.native, 'English');
  assert.equal(draft.stage, 'core');
  assert.equal(draft.state, 'translation-draft');
  assert.equal(draft.reviewed, false);
  assert.deepEqual(draft.lessons.map((lesson) => lesson.n), [first, first + 1, last]);
  for (const [index, lesson] of draft.lessons.entries()) {
    const original = originals[index];
    assert.equal(lesson.objectiveEnglish, original.objective, `Core ${lesson.n}: objective drift`);
    assert.deepEqual(
      lesson.terms.map(({ en, kind }) => ({ en, kind })),
      original.words.map(({ en, kind }) => ({ en, kind })),
      `Core ${lesson.n}: word/phrase drift`,
    );
    assert.deepEqual(lesson.reading.map(({ en }) => en), original.reading.en, `Core ${lesson.n}: reading drift`);
    assert(lesson.terms.every(({ ja }) => typeof ja === 'string' && ja.trim()), `Core ${lesson.n}: empty Japanese term`);
    assert(lesson.reading.every(({ ja }) => typeof ja === 'string' && ja.trim()), `Core ${lesson.n}: empty Japanese line`);
    assert.deepEqual(
      lesson.reading.slice(-5).map(({ ja }) => ja),
      lesson.terms.slice(-5).map(({ ja }) => ja),
      `Core ${lesson.n}: phrase differs between deck and reading`,
    );
    if (lesson.teachingNotesEnglish !== undefined)
      assert(lesson.teachingNotesEnglish.every((note) => typeof note === 'string' && note.trim()));
    count += 1;
  }
}
console.log(`Japanese Foreman: ${count} Core translation drafts match the existing English lessons; linguistic review remains separate.`);
