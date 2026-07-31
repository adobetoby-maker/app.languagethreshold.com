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

describe("legacy recovery — pre-fix production state", () => {
  // The original defect: ADD_VOCAB_ITEMS appended words to userVocab without
  // ever setting vocabLang. Affected learners therefore have a POPULATED
  // userVocab and a NULL vocabLang. Guarding migration on vocabLang alone
  // discards exactly those learners' words. Synthesis corrections 1 and 2.
  test("recovers orphaned words when vocabLang is null", () => {
    const recovered = includeLegacyVocab({}, null, [word("hidalgo"), word("rocín")], "Spanish");

    assert.deepEqual(
      recovered.Spanish.map((item) => item.word),
      ["hidalgo", "rocín"],
      "words saved before the fix must survive migration, not be silently dropped",
    );
  });

  test("prefers a known vocabLang over the fallback", () => {
    const recovered = includeLegacyVocab({}, "French", [word("bonjour")], "Spanish");

    assert.deepEqual(Object.keys(recovered), ["French"]);
    assert.equal(recovered.Spanish, undefined);
  });

  test("drops nothing and invents nothing when there is no language at all", () => {
    const recovered = includeLegacyVocab({ German: [word("Haus")] }, null, [word("orphan")], null);

    // No target language can be determined, so the map is returned untouched
    // rather than guessing — but existing per-language data is preserved.
    assert.deepEqual(Object.keys(recovered), ["German"]);
  });

  test("merges legacy words into an existing list without losing SRS progress", () => {
    const recovered = includeLegacyVocab(
      { Spanish: [word("casa", 5)] },
      null,
      [word("Casa", 2), word("puerta", 1)],
      "Spanish",
    );

    assert.deepEqual(
      recovered.Spanish.map((item) => [item.word, item.correctCount]),
      [["Casa", 5], ["puerta", 1]],
      "re-merging must not reset correctCount",
    );
  });
});

describe("deterministic normalization", () => {
  // toLocaleLowerCase() folds with the ambient locale; Turkish dotted I would
  // otherwise key the same word twice. Synthesis correction 3.
  test("normalizes independently of locale", () => {
    assert.equal(vocabWordKey("  İstanbul "), "i̇stanbul");
    assert.equal(vocabWordKey("CASA"), vocabWordKey("casa"));
  });
});
