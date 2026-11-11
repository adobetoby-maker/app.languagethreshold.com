import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MASTER_CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const sourcePaths = ["master-1-5-draft.json", "master-6-10-draft.json"];
const sourceFiles = Object.fromEntries(sourcePaths.map((name) => [name, readFileSync(`content/french-travel-lunch/${name}`)]));
const sources = Object.fromEntries(sourcePaths.flatMap((name) => JSON.parse(sourceFiles[name]).lessons.map((lesson) => [String(lesson.n), lesson])));
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/master-lesson-content-candidate.json"));

test("private French Lunch Master 1–10 pin their sources and keep review gates closed", () => {
  assert.deepEqual(Object.keys(candidate.lessons), Array.from({ length: 10 }, (_, index) => String(index + 1)));
  for (const name of sourcePaths) {
    assert.equal(candidate.sourceDraftSha256[name], createHash("sha256").update(sourceFiles[name]).digest("hex"));
  }
  assert.equal(candidate.module, "master-travel-lunch");
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.registered, false);
});

for (const [number, item] of Object.entries(candidate.lessons)) {
  test(`private French Lunch Master ${number} meets Master density and preserves source Reader and vocabulary`, () => {
    const source = sources[number];
    assert.equal(item.stableId, source.stableId);
    assert.equal(new Set(item.sourceCardIndices).size, item.sourceCardIndices.length);
    assert.ok(item.sourceCardIndices.every((index) => Number.isInteger(index) && index >= 1 && index <= source.cards.length));
    assert.ok(Object.values(source.modes).every((mode) => item.sourceCardIndices.includes(mode.sourceCard)));
    const words = [
      ...item.sourceCardIndices.map((index) => source.cards[index - 1]).map(({ fr, en, kind }) => ({ es: fr, en, kind })),
      ...(item.supplementalWords ?? []),
    ];
    for (const word of item.supplementalWords ?? []) {
      assert.equal(word.kind, "term");
      if (word.sourceReaderIndex) {
        assert.ok(Number.isInteger(word.sourceReaderIndex));
        assert.ok(source.reader[word.sourceReaderIndex - 1]?.fr.includes(word.sourceReaderText ?? word.es));
      } else {
        assert.ok(Number.isInteger(word.sourceCardIndex));
        assert.ok(source.cards[word.sourceCardIndex - 1]?.fr.includes(word.sourceCardText ?? word.es));
      }
    }
    assert.deepEqual(validateLessonContent({ passage: item.passage, words, verbs: item.verbs }, {
      language: "French", nativeLanguage: "English",
      parts: { passage: true, words: true, verbs: true }, limits: MASTER_CONTENT_LIMITS,
    }), []);
    for (const turn of source.reader) {
      const index = item.passage.target.indexOf(turn.fr);
      assert.notEqual(index, -1);
      assert.equal(item.passage.native[index], turn.en);
    }
    for (const { example } of item.verbs) {
      const index = item.passage.target.indexOf(example.target);
      assert.notEqual(index, -1);
      assert.equal(item.passage.native[index], example.native);
    }
  });
}

test("Master allergen and vegetarian-soup lessons retain their exact clinical and dietary terms", () => {
  const allergen = candidate.lessons["4"].passage.target.join(" ");
  assert.match(allergen, /fruits à coque/);
  assert.match(allergen, /traces de noisettes/);
  assert.match(allergen, /amandes/);
  assert.match(allergen, /pistaches/);
  const soup = candidate.lessons["5"].passage.target.join(" ");
  assert.match(soup, /soupe végétarienne/);
  assert.match(soup, /bouillon de légumes/);
  assert.match(soup, /bouillon de poulet/);
});

test("Master 7 and 8 retain the exact bill and food-poisoning language", () => {
  const bill = candidate.lessons["7"].passage.target.join(" ");
  assert.match(bill, /quatre-vingt-quatre euros/);
  assert.match(bill, /cent deux euros/);
  assert.match(bill, /dix-huit euros de différence/);
  const food = candidate.lessons["8"].passage.target.join(" ");
  assert.match(food, /poisson cru/);
  assert.match(food, /sans réfrigération/);
  assert.match(food, /intoxication alimentaire/);
});
