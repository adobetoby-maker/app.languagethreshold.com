import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MASTER_CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const sourcePaths = ["master-1-5-draft.json", "master-6-10-draft.json", "master-11-15-draft.json", "master-16-20-draft.json"];
const sourceFiles = Object.fromEntries(sourcePaths.map((name) => [name, readFileSync(`content/french-travel-lunch/${name}`)]));
const sources = Object.fromEntries(sourcePaths.flatMap((name) => JSON.parse(sourceFiles[name]).lessons.map((lesson) => [String(lesson.n), lesson])));
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/master-lesson-content-candidate.json"));

test("private French Lunch Master 1–20 pin their sources and keep review gates closed", () => {
  assert.deepEqual(Object.keys(candidate.lessons), Array.from({ length: 20 }, (_, index) => String(index + 1)));
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
    for (const [index, kind] of Object.entries(item.sourceCardKindOverrides ?? {})) {
      assert.equal(source.cards[Number(index) - 1].kind, "term");
      assert.equal(kind, "phrase");
    }
    for (const index of Object.keys(item.sourceCardTextOverrides ?? {})) {
      assert.equal(source.cards[Number(index) - 1].kind, "phrase");
      assert.ok(source.reader.some((turn) => turn.fr.includes(source.cards[Number(index) - 1].fr)));
    }
    const words = [
      ...item.sourceCardIndices.map((index) => ({
        es: item.sourceCardTextOverrides?.[index]?.es ?? source.cards[index - 1].fr,
        en: item.sourceCardTextOverrides?.[index]?.en ?? source.cards[index - 1].en,
        kind: item.sourceCardKindOverrides?.[index] ?? source.cards[index - 1].kind,
      })),
      ...(item.supplementalWords ?? []),
    ];
    for (const word of item.supplementalWords ?? []) {
      assert.ok(["term", "phrase"].includes(word.kind));
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

test("Master 13–15 retain direct burn, peanut-allergy, epinephrine, and gas terms", () => {
  const burn = candidate.lessons["13"].passage.target.join(" ");
  assert.match(burn, /brûlure/);
  assert.match(burn, /cloque/);
  assert.match(burn, /centre médical/);
  const peanut = candidate.lessons["14"].passage.target.join(" ");
  assert.match(peanut, /allergie aux cacahuètes/);
  assert.match(peanut, /auto-injecteur d’adrénaline/);
  assert.match(peanut, /réaction grave/);
  const gas = candidate.lessons["15"].passage.target.join(" ");
  assert.match(gas, /odeur de gaz/);
  assert.match(gas, /fuite de gaz/);
  assert.match(gas, /les secours/);
});

test("Master 16 and 20 retain explicit symptoms, consent, and shellfish allergy language", () => {
  const inspector = candidate.lessons["16"].passage.target.join(" ");
  assert.match(inspector, /nausées/);
  assert.match(inspector, /vomissements/);
  assert.match(inspector, /légère fièvre/);
  assert.match(inspector, /consentement/);
  const lunch = candidate.lessons["20"].passage.target.join(" ");
  assert.match(lunch, /allergie aux crustacés et aux mollusques/);
  assert.match(lunch, /crevettes/);
  assert.match(lunch, /vérifiiez avec la cuisine/);
});
