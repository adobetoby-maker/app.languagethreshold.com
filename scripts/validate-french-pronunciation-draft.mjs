import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../src/data/core60/es/foundation-sound-like-a-native.json', import.meta.url)));
const draft = JSON.parse(readFileSync(new URL('../content/french-pronunciation/foundation-1-3-draft.json', import.meta.url)));
const modes = ['see', 'recall', 'hear', 'type', 'say', 'write'];

assert.equal(source.lessons.length, 10);
assert.equal(draft.targetLanguage, 'French');
assert.equal(draft.nativeLanguage, 'English');
assert.equal(draft.status, 'partial-authored-draft');
for (const gate of ['reviewed', 'runtimeRegistered', 'audioPublished']) assert.equal(draft[gate], false);
assert.equal(draft.lessons.length, 3);

const ids = new Set();
for (const [index, lesson] of draft.lessons.entries()) {
  const n = index + 1;
  assert.equal(lesson.n, n);
  assert.equal(lesson.sourceSpanishLesson, n);
  assert.equal(lesson.id, `foundation-french-sound-like-a-native:${n}:fr-en`);
  assert(!ids.has(lesson.id));
  ids.add(lesson.id);
  assert(lesson.title && lesson.objective && lesson.focus);
  assert.equal(lesson.words.length, 10);
  assert.equal(lesson.words.filter(word => word.kind === 'term').length, 6);
  assert.equal(lesson.words.filter(word => word.kind === 'phrase').length, 4);
  const french = new Set();
  for (const word of lesson.words) {
    assert(word.fr && word.en && !word.es);
    assert(!french.has(word.fr), `duplicate word in ${lesson.id}: ${word.fr}`);
    french.add(word.fr);
  }
  assert.equal(lesson.reader.length, 4);
  for (const line of lesson.reader) assert(line.fr && line.en && !line.es);
  assert(lesson.speaking.scene && lesson.speaking.opening && lesson.speaking.closure);
  assert.equal(lesson.speaking.roles.length, 2);
  assert(lesson.speaking.goals.length >= 3);
  assert.deepEqual(Object.keys(lesson.practice).sort(), modes.slice().sort());
  const prompts = new Set();
  for (const mode of modes) {
    const activity = lesson.practice[mode];
    assert(activity.prompt && !prompts.has(activity.prompt), `${lesson.id} ${mode} prompt missing or repeated`);
    prompts.add(activity.prompt);
    for (const ref of [...(activity.wordRefs ?? []), ...(activity.requiredRefs ?? []), ...(activity.choices ?? [])]) {
      assert(french.has(ref), `${lesson.id} ${mode} unknown card reference: ${ref}`);
    }
  }
  assert.equal(lesson.practice.hear.audioRequired, true);
  for (const mode of ['recall', 'type', 'say']) {
    const ref = lesson.practice[mode].answerRef;
    assert(french.has(ref), `${lesson.id} ${mode} unknown answer reference: ${ref}`);
  }
}
console.log('French pronunciation F1–3 private draft: 3 source-mapped IDs, 30 cards, 12 Reader lines, 3 speaking scenes, 18 practice prompts; all release gates closed.');
