import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  JAPANESE_TRAVEL_LUNCH_RELEASED,
  inspectPrivateJapaneseTravelLunch,
  releasedJapaneseTravelLunch,
} from '../src/lib/private-japanese-travel-lunch-runtime.ts';

const candidate = JSON.parse(readFileSync(new URL(
  '../content/japanese-travel-lunch/private-runtime-candidate.json', import.meta.url,
), 'utf8'));
const stages = [['foundation-travel-lunch', 10], ['travel-lunch', 30], ['master-travel-lunch', 20]];

test('private Japanese Lunch joins all 60 authored lessons and keeps release disabled', () => {
  const runtime = inspectPrivateJapaneseTravelLunch(candidate);
  assert.equal(JAPANESE_TRAVEL_LUNCH_RELEASED, false);
  assert.equal(releasedJapaneseTravelLunch(), null);
  assert.equal(runtime.releaseEnabled, false);
  assert.equal(runtime.lessonCount, 60);
  let cards = 0;
  let lines = 0;
  for (const [moduleId, count] of stages) {
    for (let n = 1; n <= count; n++) {
      const lesson = runtime.getLesson(moduleId, n, 'Japanese', 'English');
      assert.equal(lesson?.stableId, `${moduleId}:${n}:ja-en`);
      assert.equal(lesson.reviewed, false);
      assert.ok(runtime.cacheNamespace(moduleId, n, 'Japanese', 'English').includes(':Japanese:English:'));
      assert.equal(runtime.cacheNamespace(moduleId, n, 'Spanish', 'English'), null);
      assert.equal(runtime.getLesson(moduleId, n, 'Japanese', 'Spanish'), null);
      assert.equal(runtime.getLesson(moduleId, n, 'Spanish', 'English'), null);
      cards += lesson.cards.length;
      lines += lesson.reader.length;
    }
    assert.equal(runtime.getLesson(moduleId, 0, 'Japanese', 'English'), null);
    assert.equal(runtime.getLesson(moduleId, count + 1, 'Japanese', 'English'), null);
  }
  assert.equal(cards, 1099);
  assert.equal(lines, 760);
});

test('private Japanese Lunch fails closed on changed pair, review gate, activity, or Reader', () => {
  const wrongPair = structuredClone(candidate);
  wrongPair.pairKey = 'Japanese:Spanish';
  assert.throws(() => inspectPrivateJapaneseTravelLunch(wrongPair), /Wrong Japanese Lunch pair/);
  const released = structuredClone(candidate);
  released.registration = 'enabled';
  assert.throws(() => inspectPrivateJapaneseTravelLunch(released), /private release gate/);
  const wrongMode = structuredClone(candidate);
  wrongMode.lessons[0].modes.hear.modelJapanese = '違う言葉';
  assert.throws(() => inspectPrivateJapaneseTravelLunch(wrongMode), /authored source card/);
  const wrongReader = structuredClone(candidate);
  wrongReader.lessons[0].reader[0].ja = '';
  assert.throws(() => inspectPrivateJapaneseTravelLunch(wrongReader), /Reader/);
  const wrongId = structuredClone(candidate);
  wrongId.lessons[0].stableId = 'foundation-travel-lunch:1:es-en';
  assert.throws(() => inspectPrivateJapaneseTravelLunch(wrongId), /changed lesson identity/);
});
