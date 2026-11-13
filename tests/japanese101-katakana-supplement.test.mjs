import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const pack = JSON.parse(read('content/japanese-basics/private-katakana-supplement-ja-en.json'));

test('private katakana supplement covers 46 basic signs with exact Japanese source examples', () => {
  assert.equal(pack.pairKey, 'Japanese:English');
  assert.equal(pack.registered, false);
  assert.equal(pack.reviewed, false);
  assert.equal(pack.unitCount, 5);
  const sources = Object.fromEntries(Object.entries(pack.sourceFiles).map(([stage, ref]) => {
    const raw = read(ref.path);
    assert.equal(createHash('sha256').update(raw).digest('hex'), ref.sha256);
    return [stage, JSON.parse(raw)];
  }));
  const cards = pack.units.flatMap(unit => unit.cards);
  assert.equal(pack.basicSignCount, 46);
  assert.equal(cards.length, 46);
  assert.equal(new Set(cards.map(card => card.katakana)).size, 46);
  assert.equal(new Set(cards.map(card => card.hiragana)).size, 46);
  for (const [index, unit] of pack.units.entries()) {
    assert.equal(unit.id, `ja101-katakana-unit:${index + 1}`);
    assert.equal(unit.reviewed, false);
    assert.equal(unit.sourceExamples.length, 2);
    assert.ok(unit.readingTask.trim());
    for (const [cardIndex, card] of unit.cards.entries()) {
      assert.equal(card.id, `ja101-katakana:${index + 1}:${cardIndex}`);
      assert.equal(card.katakana.codePointAt(0) - card.hiragana.codePointAt(0), 0x60);
      assert.ok(card.readPrompt.includes(card.katakana));
      assert.ok(card.writePrompt.includes(card.hiragana));
    }
    for (const example of unit.sourceExamples) {
      const [, stagePrefix, lessonText] = example.sourceLessonKey.match(/^(foundation-|master-)?japanese-basics:(\d+)$/) ?? [];
      assert.ok(lessonText);
      const stage = stagePrefix ? stagePrefix.slice(0, -1) : 'core';
      const source = sources[stage].lessons[Number(lessonText) - 1].terms[example.sourceTermIndex];
      const [kana, english] = source.split('|', 2);
      assert.equal(example.kana, kana);
      assert.equal(example.english, english);
    }
  }
});
