import assert from "node:assert/strict";
import test from "node:test";
import {
  addReadingHints,
  readReadingHints,
  MAX_READING_HINT_ENTRIES,
} from "../src/lib/reading-hint-cache.ts";

test("reading caches require exact source text and format, discard malformed data, and bound eviction", () => {
  const source = [{ base: "私", hiragana: "わたし", romaji: "watashi" }];
  const cache = addReadingHints(null, "furigana", "私", source);
  assert.deepEqual(readReadingHints(cache, "furigana", "私"), source);
  assert.equal(readReadingHints(cache, "pinyin", "私"), null);
  assert.equal(readReadingHints(cache, "furigana", "他"), null);
  for (const value of [
    [],
    [{ base: "他" }],
    [{ base: "私", hiragana: 3 }],
    [{ base: "私", privateField: "no" }],
    [{ base: "私", hiragana: "x".repeat(121) }],
  ])
    assert.equal(addReadingHints(cache, "furigana", "私", value), null);
  assert.deepEqual(cache.entries[0].segments, source);
  let bounded = cache;
  for (let n = 0; n < MAX_READING_HINT_ENTRIES; n++)
    bounded = addReadingHints(bounded, "furigana", String(n), [{ base: String(n) }]);
  assert.equal(bounded.entries.length, MAX_READING_HINT_ENTRIES);
  assert.equal(readReadingHints(bounded, "furigana", "私"), null);
  assert.deepEqual(readReadingHints(bounded, "furigana", "79"), [{ base: "79" }]);
  assert.deepEqual(
    readReadingHints(
      {
        entries: [
          { text: "valid", segments: [{ base: "valid" }] },
          { text: "bad", segments: null },
        ],
      },
      "furigana",
      "valid",
    ),
    [{ base: "valid" }],
  );
});
