import assert from "node:assert/strict";
import test from "node:test";
import { toHiragana, toKatakana } from "../src/lib/romaji-to-kana.ts";

test("double n keeps the next vowel or y syllable in kana preview", () => {
  assert.equal(toHiragana("konnichiha"), "こんにちは");
  assert.equal(toHiragana("onna"), "おんな");
  assert.equal(toHiragana("tennou"), "てんのう");
  assert.equal(toHiragana("shinnyuu"), "しんにゅう");
  assert.equal(toKatakana("konnichiha"), "コンニチハ");
});

test("existing nasal and doubled-consonant cases remain intact", () => {
  assert.equal(toHiragana("shinbun"), "しんぶん");
  assert.equal(toHiragana("gakkou"), "がっこう");
  assert.equal(toHiragana("san"), "さん");
  assert.equal(toHiragana("とうきょう"), "とうきょう");
});
