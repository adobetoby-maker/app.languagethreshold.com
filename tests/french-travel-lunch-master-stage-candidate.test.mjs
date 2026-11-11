import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";

const root = "content/french-travel-lunch/";
const stage = JSON.parse(readFileSync("src/data/core60/fr/master-travel-lunch-fr.json"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceFiles = ["master-1-5-draft.json", "master-6-10-draft.json", "master-11-15-draft.json", "master-16-20-draft.json"];
const sources = Object.fromEntries(sourceFiles.flatMap((name) => {
  const bytes = readFileSync(root + name);
  assert.equal(stage.sourceHashes[root + name], hash(bytes));
  return JSON.parse(bytes).lessons.map((lesson) => [lesson.n, lesson]);
}));

test("private French Lunch Master stage meets stage structure without registering it", () => {
  assert.deepEqual(validateStageFile(stage, {
    moduleId: "master-travel-lunch-fr", stage: "master",
    language: "French", nativeLanguage: "English",
  }), []);
  assert.equal(stage.reviewed, false);
  assert.equal(stage.registered, false);
  assert.equal(stage.lessons.length, 20);
  const french = CORE60_MANIFEST.find((item) => item.base === "travel-lunch" && item.language === "French");
  assert.ok(french);
  assert.equal(french.master, undefined);
  assert.equal(stage.contentCandidateSha256, hash(readFileSync(root + "master-lesson-content-candidate.json")));
  assert.equal(stage.spanishStructureSha256, hash(readFileSync("src/data/core60/es/master-travel-lunch.json")));
});

test("each Master grammar contrast uses exact authored French phrase cards", () => {
  for (const lesson of stage.lessons) {
    const source = sources[lesson.n];
    assert.equal(lesson.stableId, `master-travel-lunch:${lesson.n}:fr-en`);
    assert.equal(lesson.focus, source.focus);
    assert.equal(lesson.speaking, source.speaking.goal);
    assert.deepEqual(lesson.reader, source.reader);
    assert.deepEqual(lesson.modes, source.modes);
    assert.equal(lesson.grammar.focus, source.focus);
    assert.equal(lesson.grammar.examples.length, 2);
    assert.equal(new Set(lesson.sourceGrammarExampleCardIndices).size, 2);
    for (const [index, cardIndex] of lesson.sourceGrammarExampleCardIndices.entries()) {
      const card = source.cards[cardIndex - 1];
      assert.equal(card.kind, "phrase");
      assert.deepEqual(lesson.grammar.examples[index], { es: card.fr, en: card.en });
    }
  }
  const clinical = stage.lessons.slice(12, 16).flatMap((lesson) => lesson.words.map((word) => word.es)).join(" ");
  assert.match(clinical, /brûlure/);
  assert.match(clinical, /allergie aux cacahuètes/);
  assert.match(clinical, /nausées/);
});
