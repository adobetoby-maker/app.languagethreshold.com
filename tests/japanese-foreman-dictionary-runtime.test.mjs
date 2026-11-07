import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPrivateForemanDictionary,
  privateForemanDictionaryLookup,
  JAPANESE_FOREMAN_DICTIONARY_RELEASED,
} from "../src/lib/private-japanese-foreman-dictionary.ts";

const inventory = JSON.parse(readFileSync(new URL(
  "../content/japanese-construction-foreman/private-dictionary-draft-ja-en.json", import.meta.url,
), "utf8"));
const lookup = buildPrivateForemanDictionary(inventory);

test("all 1,016 provisional senses retain their exact Japanese/English pair and source ID", () => {
  assert.equal(inventory.entries.length, 1016);
  for (const entry of inventory.entries) {
    const matches = lookup(entry.target, "Japanese", "Japanese", "English");
    assert.ok(matches.some((match) => match.id === entry.id && match.native === entry.native));
    assert.ok(lookup(entry.native, "English", "Japanese", "English")
      .some((match) => match.id === entry.id && match.target === entry.target));
  }
});

test("ambiguous Japanese headwords keep distinct senses and never invent a normalized gloss", () => {
  const ambiguous = new Set(inventory.entries.filter((entry) => entry.needsSenseReview)
    .map((entry) => entry.target));
  assert.equal(ambiguous.size, 11);
  for (const word of ambiguous) {
    const senses = lookup(word, "Japanese", "Japanese", "English");
    assert.ok(senses.length > 1);
    assert.equal(new Set(senses.map((sense) => sense.native)).size, senses.length);
    assert.ok(senses.every((sense) => sense.needsSenseReview));
  }
});

test("exact language pair and full headword prevent Spanish or substring leakage", () => {
  const first = inventory.entries[0];
  assert.equal(lookup(first.target, "Japanese", "Spanish", "English").length, 0);
  assert.equal(lookup(first.target, "Japanese", "Japanese", "Spanish").length, 0);
  assert.equal(lookup(first.target.slice(1), "Japanese", "Japanese", "English").length, 0);
  assert.equal(lookup(first.target, "English", "Japanese", "English").length, 0);
});

test("release lookup is disabled and cannot expose private drafts", () => {
  assert.equal(JAPANESE_FOREMAN_DICTIONARY_RELEASED, false);
  const first = inventory.entries[0];
  assert.equal(privateForemanDictionaryLookup(
    lookup, first.target, "Japanese", "Japanese", "English",
  ).length, 0);
});

test("rejects published flags, missing metadata and duplicate IDs", () => {
  for (const changed of [
    { ...inventory, registered: true },
    { ...inventory, reviewed: true },
    { ...inventory, pairKey: "Spanish:English" },
    { ...inventory, entries: [inventory.entries[0], inventory.entries[0]], counts: { ...inventory.counts, exactPairs: 2 } },
  ]) assert.throws(() => buildPrivateForemanDictionary(changed));
});
