import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  includeLegacyVocab,
  mergeVocabByLanguage,
  mergeVocabItems,
  vocabWordKey,
} from "../src/state/vocab-store.ts";

const word = (value, correctCount = 0) => ({
  word: value,
  translation: `${value} definition`,
  category: "topic",
  correctCount,
});

describe("vocabulary language ownership", () => {
  test("deduplicates case and surrounding whitespace", () => {
    assert.equal(vocabWordKey(" Casa "), "casa");
    assert.deepEqual(mergeVocabItems([word("Casa", 2)], [word("casa", 1)]), [word("casa", 2)]);
  });

  test("keeps different languages in separate lists", () => {
    const merged = mergeVocabByLanguage({ Spanish: [word("casa")] }, { French: [word("maison")] });

    assert.deepEqual(merged.Spanish.map((item) => item.word), ["casa"]);
    assert.deepEqual(merged.French.map((item) => item.word), ["maison"]);
  });

  test("migrates a legacy list without relabelling it", () => {
    const migrated = includeLegacyVocab({ French: [word("maison")] }, "Spanish", [word("casa")]);

    assert.deepEqual(migrated.Spanish.map((item) => item.word), ["casa"]);
    assert.deepEqual(migrated.French.map((item) => item.word), ["maison"]);
  });

  test("remote merge preserves words and highest mastery per language", () => {
    const merged = mergeVocabByLanguage(
      { Spanish: [word("casa", 4)], French: [word("bonjour", 1)] },
      { Spanish: [word("Casa", 2), word("puerta", 1)], German: [word("Haus", 3)] },
    );

    assert.deepEqual(merged.Spanish.map((item) => [item.word, item.correctCount]), [
      ["Casa", 4],
      ["puerta", 1],
    ]);
    assert.deepEqual(merged.French.map((item) => item.word), ["bonjour"]);
    assert.deepEqual(merged.German.map((item) => item.word), ["Haus"]);
  });
});
