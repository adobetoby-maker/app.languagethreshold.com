#!/usr/bin/env node
// Assemble exact-pair Japanese form activities without registering unreviewed prompts.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JAPANESE_BASICS_VERSION } from '../src/data/japanese-basics.ts';
import { getLessonDefinition } from '../src/lib/lesson-definition.ts';

const root = resolve(import.meta.dirname, '..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const fixtures = [
  'foundation-1-10', 'core-1-10', 'core-11-20', 'core-21-30', 'master-1-10', 'master-11-20',
].map(part => `content/japanese-basics/private-form-practice-${part}-ja-en.json`);
const lessons = [];
const sourceHashes = [];
const promptIds = new Set();
for (const path of fixtures) {
  const fixture = read(path);
  if (fixture.pairKey !== 'Japanese:English' || fixture.registered !== false ||
      fixture.reviewed !== false || fixture.lessons.length !== 10 ||
      fixture.counts.lessons !== 10 || sha(fixture.sourceFile) !== fixture.sourceSha256)
    throw new Error(`${path}: pair, review, count, or source hash changed`);
  sourceHashes.push({ path, sha256: sha(path) });
  for (const item of fixture.lessons) {
    const definition = getLessonDefinition({
      moduleId: item.moduleId, lessonNumber: item.lesson,
      targetLanguage: 'Japanese', instructionLanguage: 'English',
      contentVersion: JAPANESE_BASICS_VERSION,
    });
    if (!definition || !definition.reading || definition.targetLanguage !== 'Japanese' ||
        definition.instructionLanguage !== 'English' || item.reviewed !== false ||
        item.prompts.length < 3 || item.prompts.length > 6)
      throw new Error(`${path}: ${item.moduleId}/${item.lesson} lesson shape changed`);
    const activities = [];
    for (const prompt of item.prompts) {
      const line = definition.reading.sentences[prompt.sourceDialogueTurn - 1];
      if (promptIds.has(prompt.id) || prompt.pairKey !== 'Japanese:English' ||
          prompt.reviewed !== false || prompt.source !== 'aligned-dialogue' ||
          line?.target !== prompt.japaneseAnswer || line?.native !== prompt.englishPrompt ||
          !prompt.knownJapaneseVariants.includes(prompt.japaneseAnswer) ||
          JSON.stringify(prompt.practice) !== JSON.stringify(['recognize-meaning', 'produce-target']))
        throw new Error(`${path}: ${item.moduleId}/${item.lesson}/${prompt.id} source mismatch`);
      promptIds.add(prompt.id);
      activities.push({
        id: `${prompt.id}:recognize`, sourcePromptId: prompt.id, mode: 'recognize-meaning',
        cue: prompt.japaneseAnswer, answer: prompt.englishPrompt,
        focus: prompt.focus, sourceDialogueTurn: prompt.sourceDialogueTurn,
      });
      activities.push({
        id: `${prompt.id}:produce`, sourcePromptId: prompt.id, mode: 'produce-target',
        cue: prompt.englishPrompt, answer: prompt.japaneseAnswer,
        knownJapaneseVariants: prompt.knownJapaneseVariants,
        focus: prompt.focus, sourceDialogueTurn: prompt.sourceDialogueTurn,
      });
    }
    lessons.push({
      lessonDefinitionId: definition.id, sourceObjectiveId: definition.objectiveId,
      moduleId: item.moduleId, lessonNumber: item.lesson,
      contentVersion: definition.contentVersion, targetLanguage: 'Japanese',
      instructionLanguage: 'English', focus: item.focus,
      readingId: `${item.moduleId}-lesson-${item.lesson}`,
      activities, reviewed: false,
    });
  }
}
if (lessons.length !== 60 || promptIds.size !== 235 ||
    lessons.reduce((sum, item) => sum + item.activities.length, 0) !== 470 ||
    new Set(lessons.map(item => item.lessonDefinitionId)).size !== 60)
  throw new Error('Japanese 101 form preview is not a complete 60-lesson, 235-prompt set');
const out = {
  pairKey: 'Japanese:English', registered: false, reviewed: false,
  sourceHashes, lessonCount: lessons.length, promptCount: promptIds.size,
  activityCount: 470, lessons,
};
const serialized = JSON.stringify(out, null, 2) + '\n';
const target = resolve(root, 'content/japanese-basics/private-form-runtime-preview-ja-en.json');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== serialized) throw new Error('Japanese form preview needs regeneration');
} else writeFileSync(target, serialized);
console.log('Japanese 101: 235 private prompts, 470 activities, 60 stable lesson identities');
