import assert from "node:assert/strict";
import test from "node:test";

import { HIRAGANA_GROUPS, KATAKANA_GROUPS, kanaPatternNote } from "../src/components/kana/writing/curriculum.ts";

test("writing practice covers the 46 basic characters in both scripts", () => {
  const expectedIds = ["vowels", "k", "s", "t", "n", "h", "m", "y", "r", "w"];
  const expectedKatakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

  for (const [prefix, groups] of [["h", HIRAGANA_GROUPS], ["k", KATAKANA_GROUPS]]) {
    assert.deepEqual(groups.slice(0, 10).map(({ id }) => id), expectedIds.map((id) => `${prefix}-${id}`));
    assert.equal(groups.slice(0, 10).flatMap(({ chars }) => chars).length, 46);
    for (const group of groups) assert.equal(group.chars.length, group.romaji.length, group.id);
  }

  assert.deepEqual(HIRAGANA_GROUPS.slice(10, 15).map(({ id }) => id), ["h-g", "h-z", "h-d", "h-b", "h-p"]);
  assert.equal(HIRAGANA_GROUPS.slice(10, 15).flatMap(({ chars }) => chars).length, 25);
  assert.equal(KATAKANA_GROUPS.slice(0, 10).flatMap(({ chars }) => chars).join(""), expectedKatakana);
  assert.deepEqual(KATAKANA_GROUPS.slice(10, 15).map(({ id }) => id), ["k-g", "k-z", "k-d", "k-b", "k-p"]);
  assert.equal(KATAKANA_GROUPS.slice(10, 15).flatMap(({ chars }) => chars).length, 25);
  assert.deepEqual(HIRAGANA_GROUPS.slice(15).map(({ id }) => id), ["h-small-tsu", "h-contracted"]);
  assert.deepEqual(KATAKANA_GROUPS.slice(15).map(({ id }) => id), ["k-small-tsu", "k-contracted"]);
  assert.deepEqual(HIRAGANA_GROUPS.slice(15).flatMap(({ chars }) => chars), ["っ", "ゃ", "ゅ", "ょ"]);
  assert.deepEqual(KATAKANA_GROUPS.slice(15).flatMap(({ chars }) => chars), ["ッ", "ャ", "ュ", "ョ"]);
  assert.deepEqual(KATAKANA_GROUPS.map(({ romaji }) => romaji), HIRAGANA_GROUPS.map(({ romaji }) => romaji));
});

test("small kana are explained in contextual words", () => {
  assert.match(kanaPatternNote("きっぷ"), /doubles the next consonant/);
  assert.match(kanaPatternNote("でんしゃ"), /joins the preceding sound/);
  assert.match(kanaPatternNote("チケット"), /doubles the next consonant/);
  assert.match(kanaPatternNote("シャツ"), /joins the preceding sound/);
  assert.match(kanaPatternNote("ショッピング"), /doubles the next consonant.*joins the preceding sound/);
  assert.equal(kanaPatternNote("みず"), null);
});
