import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { KATAKANA_GROUPS, PRACTICE_WORDS } from "../src/components/kana/writing/curriculum.ts";
import { setFittedWritingFont } from "../src/components/kana/writing/scoring.ts";

const supplemental = new Map([
  ["スタッフ", "staff"],
  ["テスト", "test"],
  ["ニュース", "news"],
  ["ホテル", "hotel"],
  ["ハム", "ham"],
  ["ヨガ", "yoga"],
  ["ユーロ", "euro"],
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

test("each basic katakana row progresses from characters to contextual word writing", () => {
  assert.equal(KATAKANA_GROUPS.length, 10);
  for (const group of KATAKANA_GROUPS) {
    const words = PRACTICE_WORDS[group.id];
    assert.equal(words?.length, 2, `${group.id} should have two words`);
    for (const word of words) {
      assert.ok([...word.kana].some((char) => group.chars.includes(char)), `${group.id}: ${word.kana}`);
      assert.ok(word.romaji && word.meaning);
      assert.equal(sourcePairs.get(word.kana) ?? supplemental.get(word.kana), word.meaning, word.kana);
    }
  }
  for (const word of supplemental.keys()) assert.ok(!sourcePairs.has(word), `${word} is already in Japanese 101`);
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
