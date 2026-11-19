import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { inspectPrivateFrenchPronunciationDictionary } from "../src/data/private-french-pronunciation-dictionary.ts";

const directory = new URL("../content/french-pronunciation/", import.meta.url);
const candidate = JSON.parse(await readFile(new URL("private-dictionary-candidate-fr-en.json", directory), "utf8"));
const names = (await readdir(directory)).filter(name => /^(foundation|core|master)-.*-draft\.json$/.test(name));
const batches = await Promise.all(names.map(async name => JSON.parse(await readFile(new URL(name, directory), "utf8"))));
const pair = { target: "French", native: "English" };

test("private FR-001 dictionary links every authored card to its exact source gloss", () => {
  const dictionary = inspectPrivateFrenchPronunciationDictionary(candidate);
  assert.equal(dictionary.releaseEnabled, false);
  assert.equal(candidate.entriesWithMultipleSourceGlosses, 15);
  for (const batch of batches) for (const lesson of batch.lessons) {
    lesson.words.forEach((word, index) => {
      assert.deepEqual(dictionary.card(lesson.id, index + 1, pair), {
        french: word.fr, english: word.en, kind: word.kind,
      });
      const entry = dictionary.lookup(word.fr, pair);
      assert.equal(entry.qualifiedFrenchReviewRequired, true);
      assert.ok(entry.senses.some(sense => sense.englishGlossFromSource === word.en));
    });
  }
  assert.equal(dictionary.lookup("nom", { target: "Spanish", native: "English" }), null);
  assert.equal(dictionary.card(batches[0].lessons[0].id, 1, { target: "French", native: "Spanish" }), null);
});

test("private FR-001 dictionary rejects missing card refs and premature registration", () => {
  const missing = structuredClone(candidate);
  missing.entries[0].senses[0].occurrences.pop();
  assert.throws(() => inspectPrivateFrenchPronunciationDictionary(missing));
  const registered = structuredClone(candidate);
  registered.runtimeRegistered = true;
  assert.throws(() => inspectPrivateFrenchPronunciationDictionary(registered));
});
