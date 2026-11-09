import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getLessonDefinition } from '../src/lib/lesson-definition.ts';

const candidate = JSON.parse(readFileSync(new URL(
  '../content/japanese-basics/private-form-runtime-preview-ja-en.json', import.meta.url,
)));

test('private Japanese form activities retain every live lesson identity and exact dialogue pair', () => {
  assert.equal(candidate.pairKey, 'Japanese:English');
  assert.equal(candidate.registered, false);
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.lessonCount, 60);
  assert.equal(candidate.promptCount, 235);
  assert.equal(candidate.activityCount, 470);
  const actual = new Map(candidate.lessons.map((lesson) => [`${lesson.moduleId}:${lesson.lessonNumber}`, lesson]));
  assert.equal(actual.size, 60);

  for (const [moduleId, count] of [
    ['foundation-japanese-basics', 10], ['japanese-basics', 30], ['master-japanese-basics', 20],
  ]) {
    for (let lessonNumber = 1; lessonNumber <= count; lessonNumber++) {
      const item = actual.get(`${moduleId}:${lessonNumber}`);
      assert.ok(item, `${moduleId}/${lessonNumber}`);
      const definition = getLessonDefinition({
        moduleId, lessonNumber, targetLanguage: 'Japanese', instructionLanguage: 'English',
        contentVersion: item.contentVersion,
      });
      assert.equal(item.lessonDefinitionId, definition.id);
      assert.equal(item.sourceObjectiveId, definition.objectiveId);
      assert.equal(item.readingId, `${moduleId}-lesson-${lessonNumber}`);
      assert.equal(item.reviewed, false);
      assert.ok(item.activities.length >= 6);
      for (let index = 0; index < item.activities.length; index += 2) {
        const recognize = item.activities[index];
        const produce = item.activities[index + 1];
        const line = definition.reading.sentences[recognize.sourceDialogueTurn - 1];
        assert.equal(recognize.mode, 'recognize-meaning');
        assert.equal(produce.mode, 'produce-target');
        assert.equal(recognize.sourcePromptId, produce.sourcePromptId);
        assert.equal(recognize.cue, line.target);
        assert.equal(recognize.answer, line.native);
        assert.equal(produce.cue, line.native);
        assert.equal(produce.answer, line.target);
      }
    }
  }
});
