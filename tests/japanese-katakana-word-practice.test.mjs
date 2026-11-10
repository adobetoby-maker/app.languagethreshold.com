import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HIRAGANA_GROUPS, KATAKANA_GROUPS, PRACTICE_WORDS, KATAKANA_PRACTICE_SENTENCES, practiceSentenceForGroup, sentenceWritingCharacters } from "../src/components/kana/writing/curriculum.ts";
import { setFittedWritingFont } from "../src/components/kana/writing/scoring.ts";

const supplemental = new Map([
  ["スタッフ", "staff"],
  ["テスト", "test"],
  ["ニュース", "news"],
  ["ホテル", "hotel"],
  ["ハム", "ham"],
  ["ヨガ", "yoga"],
  ["ユーロ", "euro"],
  ["メッセージ", "message"],
  ["デザート", "dessert"],
  ["デパート", "department store"],
  ["バス", "bus"],
  ["チケット", "ticket"],
  ["シャツ", "shirt"],
  ["ショッピング", "shopping"],
]);

const sourcePairs = new Map();
for (const moduleId of ["foundation-japanese-basics", "japanese-basics", "master-japanese-basics"]) {
  const source = JSON.parse(readFileSync(new URL(`../public/lesson-content/ja/${moduleId}.json`, import.meta.url)));
  assert.equal(source.language, "Japanese");
  assert.equal(source.nativeLanguage, "English");
  for (const lesson of Object.values(source.lessons)) {
    for (const word of lesson.words) sourcePairs.set(word.es, word.en);
  }
}

test("each basic, voiced, and small-sign katakana row progresses to contextual word writing", () => {
  assert.equal(KATAKANA_GROUPS.length, 18);
  for (const group of KATAKANA_GROUPS) {
    const words = PRACTICE_WORDS[group.id];
    assert.ok(words?.length >= 2, `${group.id} should have at least two words`);
    for (const word of words) {
      assert.ok([...word.kana].some((char) => group.chars.includes(char)), `${group.id}: ${word.kana}`);
      assert.ok(word.romaji && word.meaning);
      assert.equal(sourcePairs.get(word.kana) ?? supplemental.get(word.kana), word.meaning, word.kana);
    }
  }
  for (const word of supplemental.keys()) assert.ok(!sourcePairs.has(word), `${word} is already in Japanese 101`);
});

test("all hiragana rows advance from characters to exact Japanese 101 card pairs", () => {
  assert.equal(HIRAGANA_GROUPS.length, 18);
  for (const group of HIRAGANA_GROUPS) {
    const words = PRACTICE_WORDS[group.id];
    assert.ok(words?.length >= 2, `${group.id} should have at least two words`);
    for (const word of words) {
      assert.ok([...word.kana].some((char) => group.chars.includes(char)), `${group.id}: ${word.kana}`);
      assert.ok(word.romaji && word.meaning);
      assert.equal(sourcePairs.get(word.kana), word.meaning, `${group.id}: ${word.kana}`);
    }
  }
});

test("every katakana group advances to a sentence using one of its practice words", () => {
  assert.deepEqual(Object.keys(KATAKANA_PRACTICE_SENTENCES).sort(), KATAKANA_GROUPS.map(({ id }) => id).sort());
  for (const group of KATAKANA_GROUPS) {
    const sentence = KATAKANA_PRACTICE_SENTENCES[group.id];
    assert.equal(practiceSentenceForGroup(group, "katakana"), sentence, group.id);
    assert.ok(sentence.kana.endsWith("。"), group.id);
    assert.ok(sentence.romaji && sentence.meaning, group.id);
    assert.ok(PRACTICE_WORDS[group.id].some(({ kana }) => sentence.kana.includes(kana)), group.id);
    assert.ok([...sentence.kana].some((char) => group.chars.includes(char)), group.id);
    assert.ok(sentenceWritingCharacters(sentence.kana).length >= 3, group.id);
  }
  assert.deepEqual(sentenceWritingCharacters("ノートにかきます。"), ["ノ", "ー", "ト", "に", "か", "き", "ま", "す"]);
  assert.deepEqual(sentenceWritingCharacters("きっぷ。"), ["き", "っ", "ぷ"]);
});

test("handwriting guide and scorer can fit multi-character words inside the square canvas", () => {
  const context = {
    font: "",
    measureText(text) {
      return { width: Number.parseInt(this.font, 10) * [...text].length };
    },
  };
  assert.equal(setFittedWritingFont(context, "ア", 300), 216);
  const wordSize = setFittedWritingFont(context, "アメリカ", 300);
  assert.ok(wordSize < 216);
  assert.ok(context.measureText("アメリカ").width <= 300 * 0.88);
  assert.equal(setFittedWritingFont(context, "アメリカ", 600), wordSize * 2);
});
