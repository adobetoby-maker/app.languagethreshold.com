import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = path => readFileSync(new URL(`../${path}`, import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = load('content/japanese-basics/foundation.json');
const authoredBytes = load('content/japanese-basics/private-foundation-six-mode-prompts-ja-en.json');
const source = JSON.parse(sourceBytes);
const authored = JSON.parse(authoredBytes);
const preview = JSON.parse(load('content/japanese-basics/private-foundation-six-mode-runtime-preview-ja-en.json'));
const modes = ['hear', 'recall', 'say', 'see', 'type', 'write'];

test('each Foundation lesson has six distinct, exact-source Japanese activities', () => {
  assert.equal(authored.pairKey, 'Japanese:English');
  assert.equal(authored.sourceSha256, hash(sourceBytes));
  assert.equal(preview.sourceSha256, hash(sourceBytes));
  assert.equal(preview.authoredSha256, hash(authoredBytes));
  assert.equal(preview.registered, false);
  assert.equal(preview.reviewed, false);
  assert.equal(preview.lessonCount, 10);
  assert.equal(preview.activityCount, 60);
  const ids = new Set();
  for (const [index, lesson] of preview.lessons.entries()) {
    assert.equal(lesson.moduleId, 'foundation-japanese-basics');
    assert.equal(lesson.lessonNumber, index + 1);
    assert.equal(lesson.stableLessonKey, `foundation-japanese-basics:${index + 1}`);
    assert.equal(lesson.reviewed, false);
    assert.deepEqual(Object.keys(lesson.modes).sort(), modes);
    const turns = source.lessons[index].dialogue;
    for (const [mode, activity] of Object.entries(lesson.modes)) {
      const [target, native] = turns[activity.sourceDialogueTurn - 1].split('|', 2);
      assert.equal(activity.targetText, target, `${index + 1}/${mode}`);
      assert.equal(activity.nativeText, native, `${index + 1}/${mode}`);
      assert.ok(activity.prompt.length >= 35, `${index + 1}/${mode}`);
      assert.equal(ids.has(activity.id), false, activity.id);
      ids.add(activity.id);
    }
  }
  assert.equal(ids.size, 60);
});
