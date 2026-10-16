import assert from "node:assert/strict";
import test from "node:test";
import { ROOFING_LESSON_PASSAGES } from "../src/data/roofing-lesson-passages.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";

const fold = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Words of a string, accents and punctuation removed.
const wordsOf = (text) => fold(text).match(/[a-z0-9ñ]+/g) ?? [];

// Prefix stem so inflections match: hundido/hundidos, reparación/reparar, escalonar/escalonen.
const stemOf = (word) => word.slice(0, Math.min(word.length, Math.max(4, Math.ceil(word.length * 0.6))));

const startsWithStem = (passageWord, word) => passageWord.startsWith(stemOf(word));

// A lesson term may list alternates ("Cubierta / Forro de techo", "Ventilación (de caballete / de caja)").
const termAlternates = (es) =>
  es
    .split(/[/()]/)
    .map((part) => part.trim())
    .filter(Boolean);

// An alternate matches when every content word (4+ letters) appears, by stem; short words are
// content only when the alternate has no longer word ("Arnés" is fine, "de" is skipped).
const alternateMatches = (alternate, passageWords) => {
  const words = wordsOf(alternate);
  const content = words.filter((w) => w.length >= 4);
  const needed = content.length > 0 ? content : words;
  return needed.every((w) => passageWords.some((pw) => startsWithStem(pw, w)));
};

const termMatches = (term, passageWords) =>
  termAlternates(term.es).some((alt) => alternateMatches(alt, passageWords));

// A phrase matches when any run of three consecutive phrase words (the whole phrase if shorter)
// appears in the passage in order, each word allowing inflection by stem.
const phraseMatches = (phrase, passageWords) => {
  const words = wordsOf(phrase);
  const size = Math.min(3, words.length);
  for (let start = 0; start + size <= words.length; start += 1) {
    const run = words.slice(start, start + size);
    for (let at = 0; at + size <= passageWords.length; at += 1) {
      if (run.every((w, i) => startsWithStem(passageWords[at + i], w))) return true;
    }
  }
  return false;
};

const digitsOf = (text) => text.match(/\d+/g) ?? [];

test("there is a passage for each of the 30 roofing lessons", () => {
  const keys = Object.keys(ROOFING_LESSON_PASSAGES).map(Number).sort((a, b) => a - b);
  assert.deepEqual(keys, Array.from({ length: 30 }, (_, i) => i + 1));
});

for (let n = 1; n <= 30; n += 1) {
  const passage = ROOFING_LESSON_PASSAGES[n];
  const words = ROOFING_LESSON_WORDS[n];

  test(`lesson ${n}: shape, punctuation and aligned translation`, () => {
    assert.ok(passage.title.trim().length > 0, "has a Spanish title");
    assert.equal(passage.es.length, passage.en.length, "es and en have the same sentence count");
    assert.ok(passage.es.length >= 5 && passage.es.length <= 9, `${passage.es.length} sentences`);
    for (const [i, es] of passage.es.entries()) {
      const en = passage.en[i];
      assert.ok(es.trim().length > 0 && en.trim().length > 0, `sentence ${i + 1} is not empty`);
      assert.match(es.trim(), /[.?!]$/, `es ${i + 1} ends with punctuation: ${es}`);
      assert.match(en.trim(), /[.?!]$/, `en ${i + 1} ends with punctuation: ${en}`);
      if (es.includes("?") && !es.includes("¿")) assert.fail(`missing ¿ in: ${es}`);
      if (es.includes("!") && !es.includes("¡")) assert.fail(`missing ¡ in: ${es}`);
      assert.deepEqual(digitsOf(es), digitsOf(en), `numbers match in sentence ${i + 1}`);
    }
  });

  test(`lesson ${n}: uses at least 5 lesson terms and 1 lesson phrase`, () => {
    const passageWords = passage.es.flatMap(wordsOf);
    const terms = words.filter((w) => w.kind === "term");
    const phrases = words.filter((w) => w.kind === "phrase");
    const usedTerms = terms.filter((t) => termMatches(t, passageWords));
    const usedPhrases = phrases.filter((p) => phraseMatches(p.es, passageWords));
    assert.ok(
      usedTerms.length >= 5,
      `only ${usedTerms.length} terms used: ${usedTerms.map((t) => t.es).join(", ")}`,
    );
    assert.ok(usedPhrases.length >= 1, "uses at least one lesson phrase");
  });
}
