import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isCorrectJapaneseScriptAnswer } from '../src/lib/japanese-script-practice.ts';

const pack = JSON.parse(readFileSync(new URL(
  '../content/japanese-basics/private-katakana-supplement-ja-en.json', import.meta.url,
)));
const japanese = { target: 'Japanese', native: 'English' };

test('all 46 katakana signs accept only the requested script for the exact pair', () => {
  let checked = 0;
  for (const unit of pack.units) {
    for (const card of unit.cards) {
      assert.ok(isCorrectJapaneseScriptAnswer(card.hiragana, card, 'read', japanese), card.id);
      assert.ok(isCorrectJapaneseScriptAnswer(card.katakana, card, 'write', japanese), card.id);
      assert.equal(isCorrectJapaneseScriptAnswer(card.katakana, card, 'read', japanese), false, card.id);
      assert.equal(isCorrectJapaneseScriptAnswer(card.hiragana, card, 'write', japanese), false, card.id);
      assert.equal(isCorrectJapaneseScriptAnswer(card.hiragana, card, 'read', { target: 'Japanese', native: 'Spanish' }), false, card.id);
      assert.equal(isCorrectJapaneseScriptAnswer(card.katakana, card, 'write', { target: 'Spanish', native: 'English' }), false, card.id);
      checked++;
    }
  }
  assert.equal(checked, 46);
});

test('script answers do not accept romanization, extra signs, or empty input', () => {
  const card = pack.units[0].cards[0];
  for (const input of ['a', '', `${card.hiragana}い`, ` ${card.hiragana} `]) {
    assert.equal(isCorrectJapaneseScriptAnswer(input, card, 'write', japanese), false);
  }
  assert.ok(isCorrectJapaneseScriptAnswer(` ${card.katakana} `, card, 'write', japanese));
});
