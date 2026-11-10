import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { MODULES } from '../src/data/modules.ts';
import { getCurriculum } from '../src/data/curriculum.ts';
import { HIRAGANA_GROUPS, KATAKANA_GROUPS } from '../src/components/kana/writing/curriculum.ts';
import {
  JAPANESE_101_FORMS_RELEASE_ENABLED,
  inspectPrivateJapanese101Forms,
  releasedJapanese101Forms,
} from '../src/data/private-japanese101-form-candidate.ts';

const preview = JSON.parse(readFileSync(new URL(
  '../content/japanese-basics/private-form-runtime-preview-ja-en.json', import.meta.url,
), 'utf8'));
const pair = { target: 'Japanese', native: 'English' };
const stages = [['foundation-japanese-basics', 10], ['japanese-basics', 30], ['master-japanese-basics', 20]];

test('private Japanese form prompts join every current lesson and its Kana Pad groups without release', () => {
  const catalog = MODULES.map(module => module.id);
  const spanish = getCurriculum('spanish-basics');
  const current = stages.map(([id]) => getCurriculum(id, 'Japanese', 'English'));
  const candidate = inspectPrivateJapanese101Forms(preview);
  const knownGroups = new Map([...HIRAGANA_GROUPS, ...KATAKANA_GROUPS].map(group => [group.id, group]));
  const knownKana = new Set([...knownGroups.values()].flatMap(group => group.chars));
  assert.equal(candidate.releaseEnabled, false);
  assert.equal(JAPANESE_101_FORMS_RELEASE_ENABLED, false);
  assert.equal(releasedJapanese101Forms(), null);
  assert.equal(candidate.lessonCount, 60);
  assert.equal(candidate.promptCount, 235);
  for (const [id, count] of stages) {
    for (let n = 1; n <= count; n++) {
      const prompts = candidate.forLesson(id, n, pair);
      assert.ok(prompts?.length >= 3, `${id}:${n}`);
      for (const prompt of prompts) {
        assert.equal(prompt.pairKey, 'Japanese:English');
        assert.ok(prompt.englishPrompt && prompt.japaneseAnswer);
        assert.ok(prompt.kanaGroupIds.length, `${id}:${n}:${prompt.id} has Kana Pad support`);
        assert.ok(!prompt.kanaGroupIds.includes('h-long-vowels'), 'ordinary う/い is not labeled a long vowel');
        for (const groupId of prompt.kanaGroupIds) {
          const group = knownGroups.get(groupId);
          assert.ok(group?.chars.some(char => prompt.japaneseAnswer.includes(char)));
        }
        for (const char of prompt.japaneseAnswer) {
          if (/[\u3040-\u30ff]/u.test(char) && !/[・、。]/u.test(char))
            assert.ok(knownKana.has(char), `${id}:${n}:${prompt.id} missing ${char} in Kana Pad`);
        }
      }
      assert.equal(candidate.forLesson(id, n, { target: 'Japanese', native: 'Spanish' }), null);
    }
  }
  assert.equal(candidate.forLesson('japanese-basics', 0, pair), null);
  assert.equal(candidate.forLesson('spanish-basics', 1, pair), null);
  assert.deepEqual(MODULES.map(module => module.id), catalog);
  assert.equal(getCurriculum('spanish-basics'), spanish);
  assert.deepEqual(stages.map(([id]) => getCurriculum(id, 'Japanese', 'English')), current);
});

test('private form connection fails closed when text, lesson identity, or review state changes', () => {
  const wrongText = structuredClone(preview);
  wrongText.lessons[0].activities[0].cue = '別の文。';
  assert.throws(() => inspectPrivateJapanese101Forms(wrongText), /Reader turn/);
  const wrongLesson = structuredClone(preview);
  wrongLesson.lessons[0].moduleId = 'foundation-spanish-basics';
  assert.throws(() => inspectPrivateJapanese101Forms(wrongLesson), /unstable lesson/);
  const reviewed = structuredClone(preview);
  reviewed.registered = true;
  assert.throws(() => inspectPrivateJapanese101Forms(reviewed), /private review gate/);
});
