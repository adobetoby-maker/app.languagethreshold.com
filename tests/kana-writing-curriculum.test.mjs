import assert from "node:assert/strict";
import test from "node:test";

import { HIRAGANA_GROUPS, KATAKANA_GROUPS } from "../src/components/kana/writing/curriculum.ts";

test("writing practice covers the 46 basic characters in both scripts", () => {
  const expectedIds = ["vowels", "k", "s", "t", "n", "h", "m", "y", "r", "w"];
  const expectedKatakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

  for (const [prefix, groups] of [["h", HIRAGANA_GROUPS], ["k", KATAKANA_GROUPS]]) {
    assert.deepEqual(groups.map(({ id }) => id), expectedIds.map((id) => `${prefix}-${id}`));
    assert.equal(groups.flatMap(({ chars }) => chars).length, 46);
    for (const group of groups) assert.equal(group.chars.length, group.romaji.length, group.id);
  }

  assert.equal(KATAKANA_GROUPS.flatMap(({ chars }) => chars).join(""), expectedKatakana);
  assert.deepEqual(KATAKANA_GROUPS.map(({ romaji }) => romaji), HIRAGANA_GROUPS.map(({ romaji }) => romaji));
});
