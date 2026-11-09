#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'content/japanese-basics/core.json');
const authoredPath = resolve(root, 'content/japanese-basics/private-core-1-8-six-mode-prompts-ja-en.json');
const outputPath = resolve(root, 'content/japanese-basics/private-core-1-8-six-mode-runtime-preview-ja-en.json');
const sourceBytes = readFileSync(sourcePath);
const authoredBytes = readFileSync(authoredPath);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = JSON.parse(sourceBytes);
const authored = JSON.parse(authoredBytes);
const modeNames = ['see', 'recall', 'hear', 'type', 'say', 'write'];
if (source.target !== 'Japanese' || source.native !== 'English' || source.reviewed !== false ||
    authored.pairKey !== 'Japanese:English' || authored.registered !== false || authored.reviewed !== false ||
    authored.sourceSha256 !== hash(sourceBytes) || authored.lessons.length !== 8 || source.lessons.length !== 30)
  throw new Error('Core source, pair, or private gate changed');

const lessons = authored.lessons.map((entry, index) => {
  if (entry.lesson !== index + 1 || JSON.stringify(Object.keys(entry.modes).sort()) !== JSON.stringify([...modeNames].sort()))
    throw new Error(`Core ${index + 1}: missing lesson or mode`);
  const dialogue = source.lessons[index].dialogue;
  const modes = Object.fromEntries(modeNames.map(mode => {
    const activity = entry.modes[mode];
    if (!Number.isInteger(activity.turn) || activity.turn < 1 || activity.turn > dialogue.length ||
        typeof activity.prompt !== 'string' || activity.prompt.trim().length < 35)
      throw new Error(`Core ${index + 1} ${mode}: invalid authored prompt`);
    const [targetText, nativeText] = dialogue[activity.turn - 1].split('|', 2);
    if (!targetText || !nativeText) throw new Error(`Core ${index + 1} ${mode}: invalid source pair`);
    return [mode, { id: `ja101:core:${index + 1}:${mode}`, prompt: activity.prompt,
      sourceDialogueTurn: activity.turn, targetText, nativeText }];
  }));
  return { moduleId: 'core-japanese-basics', lessonNumber: index + 1,
    stableLessonKey: `core-japanese-basics:${index + 1}`, reviewed: false, modes };
});
const preview = { schema: 1, pairKey: 'Japanese:English', registered: false, reviewed: false,
  sourceSha256: hash(sourceBytes), authoredSha256: hash(authoredBytes), lessonCount: 8,
  activityCount: lessons.length * modeNames.length, lessons };
const output = JSON.stringify(preview, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== output) throw new Error('Core six-mode preview is stale');
} else {
  writeFileSync(outputPath, output);
}
console.log(`${preview.lessonCount} Core lessons, ${preview.activityCount} authored Japanese mode activities`);
