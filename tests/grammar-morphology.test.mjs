import assert from "node:assert/strict";
import test from "node:test";
import { hasConsistentGrammarMorphology } from "../src/lib/grammar-morphology.ts";
const regular = {
  base: { word: "hablar", root: "habl", ending: "ar" },
  table: [
    { root: "habl", ending: "o", full: "hablo" },
    { root: "habl", ending: "as", full: "hablas" },
  ],
};
test("fixed-stem splits must reconstruct the base and every complete form", () => {
  assert.equal(hasConsistentGrammarMorphology(regular), true);
  assert.equal(
    hasConsistentGrammarMorphology({
      ...regular,
      table: [...regular.table, { root: "habl", ending: "a", full: "hablan" }],
    }),
    false,
  );
});
test("the actually observed ser lesson cannot claim an unchanging s stem", () => {
  assert.equal(
    hasConsistentGrammarMorphology({
      base: { word: "ser", root: "s", ending: "er" },
      table: [
        { root: "s", ending: "oy", full: "soy" },
        { root: "s", ending: "eres", full: "eres" },
        { root: "s", ending: "es", full: "es" },
      ],
    }),
    false,
  );
});
test("changing stems, notation pretending to be letters and empty/malformed tables are withheld", () => {
  for (const bad of [
    null,
    {},
    { ...regular, table: [] },
    { ...regular, table: [null] },
    { ...regular, table: [{ root: "habl", ending: "-o", full: "hablo" }] },
    { ...regular, table: [{ root: "different", ending: "a", full: "differenta" }] },
  ])
    assert.equal(hasConsistentGrammarMorphology(bad), false);
});
test("target script is reconstructed without substituting romanization; canonical Unicode is accepted", () => {
  assert.equal(
    hasConsistentGrammarMorphology({
      base: { word: "行く", root: "行", ending: "く", romanization: "iku" },
      table: [
        { root: "行", ending: "きます", full: "行きます", romanization: "ikimasu" },
        { root: "行", ending: "かない", full: "行かない" },
      ],
    }),
    true,
  );
  assert.equal(
    hasConsistentGrammarMorphology({
      base: { word: "été", root: "e\u0301t", ending: "é" },
      table: [{ root: "ét", ending: "é", full: "été" }],
    }),
    true,
  );
});
