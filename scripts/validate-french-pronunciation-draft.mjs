import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sourceBytes = readFileSync(new URL('../src/data/core60/es/foundation-sound-like-a-native.json', import.meta.url));
const source = JSON.parse(sourceBytes);
const drafts = [
  '../content/french-pronunciation/foundation-1-3-draft.json',
  '../content/french-pronunciation/foundation-4-5-draft.json',
  '../content/french-pronunciation/foundation-6-8-draft.json',
  '../content/french-pronunciation/foundation-9-10-draft.json',
].map(path => JSON.parse(readFileSync(new URL(path, import.meta.url))));
const modes = ['see', 'recall', 'hear', 'type', 'say', 'write'];

assert.equal(source.lessons.length, 10);
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), '7de3481c760a2c6c2a3bc96b88466f48d3b04d49ad219907358071e51567efba');
for (const [path, expected] of [
  ['../src/data/sound-like-a-native-core.json', '91220adbf69e5116c41c8837715793a7d92769b0d8550d00a11cad00f4681dd2'],
  ['../src/data/core60/es/master-sound-like-a-native.json', 'e9f32a50e70c1570e7e97242426817d98449774020c0f0b1f6f1bdbfe458babb'],
]) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `source changed: ${path}`);
}
for (const draft of drafts) {
  assert.equal(draft.targetLanguage, 'French');
  assert.equal(draft.nativeLanguage, 'English');
  assert.equal(draft.status, 'partial-authored-draft');
  for (const gate of ['reviewed', 'runtimeRegistered', 'audioPublished']) assert.equal(draft[gate], false);
}
assert.equal(drafts[0].lessons.length, 3);
assert.equal(drafts[1].lessons.length, 2);
assert.equal(drafts[2].lessons.length, 3);
assert.equal(drafts[3].lessons.length, 2);
const lessons = drafts.flatMap(draft => draft.lessons);

const ids = new Set();
for (const [index, lesson] of lessons.entries()) {
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
console.log('French pronunciation F1–10 private draft: 10 source-mapped IDs, 100 cards, 40 Reader lines, 10 speaking scenes, 60 practice prompts; all release gates closed.');
