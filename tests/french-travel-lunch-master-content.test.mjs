import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MASTER_CONTENT_LIMITS, validateLessonContent } from "../src/lib/lesson-content-core.ts";

const sourcePath = "content/french-travel-lunch/master-1-5-draft.json";
const sourceBytes = readFileSync(sourcePath);
const sources = JSON.parse(sourceBytes).lessons;
const candidate = JSON.parse(readFileSync("content/french-travel-lunch/master-lesson-content-candidate.json"));

test("private French Lunch Master 1–5 pin their source and keep review gates closed", () => {
  assert.deepEqual(Object.keys(candidate.lessons), ["1", "2", "3", "4", "5"]);
  assert.equal(candidate.sourceDraftSha256["master-1-5-draft.json"], createHash("sha256").update(sourceBytes).digest("hex"));
  assert.equal(candidate.module, "master-travel-lunch");
  assert.equal(candidate.reviewed, false);
  assert.equal(candidate.registered, false);
});

for (const [number, item] of Object.entries(candidate.lessons)) {
  test(`private French Lunch Master ${number} meets Master density and preserves source Reader and vocabulary`, () => {
    const source = sources[Number(number) - 1];
    assert.equal(item.stableId, source.stableId);
    assert.deepEqual(item.sourceCardIndices, source.cards.map((_, index) => index + 1));
    assert.ok(Object.values(source.modes).every((mode) => item.sourceCardIndices.includes(mode.sourceCard)));
    const words = [
      ...source.cards.map(({ fr, en, kind }) => ({ es: fr, en, kind })),
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
