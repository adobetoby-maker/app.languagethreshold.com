import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import test from 'node:test';

const source = JSON.parse(readFileSync(new URL('../content/japanese-basics/master.json', import.meta.url)));
const authored = JSON.parse(readFileSync(new URL('../content/japanese-basics/private-master-20-six-mode-prompts-ja-en.json', import.meta.url)));
const preview = JSON.parse(readFileSync(new URL('../content/japanese-basics/private-master-20-six-mode-runtime-preview-ja-en.json', import.meta.url)));
const modes = ['see', 'recall', 'hear', 'type', 'say', 'write'];

test('Master 1–20 have distinct source-linked Japanese activities in every mode', () => {
  assert.equal(preview.pairKey, 'Japanese:English');
  assert.equal(preview.registered, false);
  assert.equal(preview.reviewed, false);
  assert.equal(preview.lessonCount, 20);
  assert.equal(preview.activityCount, 120);
  assert.equal(preview.sourceSha256, authored.sourceSha256);
  const ids = new Set();
  for (const [index, lesson] of preview.lessons.entries()) {
    assert.equal(lesson.lessonNumber, index + 1);
    assert.equal(lesson.stableLessonKey, `master-japanese-basics:${index + 1}`);
    assert.equal(lesson.reviewed, false);
    assert.deepEqual(Object.keys(lesson.modes), modes);
    assert.equal(new Set(modes.map(mode => lesson.modes[mode].prompt)).size, 6);
    for (const mode of modes) {
      const activity = lesson.modes[mode];
      assert.equal(activity.id, `ja101:master:${index + 1}:${mode}`);
      assert.equal(activity.prompt, authored.lessons[index].modes[mode].prompt);
      assert.equal(activity.sourceDialogueTurn, authored.lessons[index].modes[mode].turn);
      const [targetText, nativeText] = source.lessons[index].dialogue[activity.sourceDialogueTurn - 1].split('|', 2);
      assert.equal(activity.targetText, targetText);
      assert.equal(activity.nativeText, nativeText);
      assert.equal(ids.has(activity.id), false);
      ids.add(activity.id);
    }
  }
  assert.equal(ids.size, 120);
});
