import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDWRITING_READ_LANGUAGES,
  checkHandwritten,
  editBudget,
  editDistance,
  isHandwritingReadLanguage,
} from "../src/lib/handwriting-check.ts";

test("editDistance counts insertions, deletions and substitutions", () => {
  assert.equal(editDistance("techo", "techo"), 0);
  assert.equal(editDistance("techo", "tecno"), 1);
  assert.equal(editDistance("techo", "tech"), 1);
  assert.equal(editDistance("techo", "techos"), 1);
  assert.equal(editDistance("", "abc"), 3);
  assert.equal(editDistance("abc", ""), 3);
  assert.equal(editDistance("kitten", "sitting"), 3);
});

test("editDistance counts a CJK character as one unit", () => {
  assert.equal(editDistance("屋根", "屋根"), 0);
  assert.equal(editDistance("屋根", "屋板"), 1);
});

test("editBudget: terms accept only exact, phrases scale with length", () => {
  assert.deepEqual(editBudget("term", 3), { accept: 0, close: 0 });
  assert.deepEqual(editBudget("term", 5), { accept: 0, close: 1 });
  assert.deepEqual(editBudget("phrase", 6), { accept: 0, close: 1 });
  assert.deepEqual(editBudget("phrase", 8), { accept: 1, close: 1 });
  assert.deepEqual(editBudget("phrase", 20), { accept: 2, close: 4 });
});

test("a term read exactly is correct, ignoring case, accents and punctuation", () => {
  assert.equal(checkHandwritten("Techo", "techo", "term").verdict, "correct");
  assert.equal(checkHandwritten("  TEJA asfaltica ", "Teja asfáltica", "term").verdict, "correct");
  assert.equal(checkHandwritten("cañon", "cañón", "term").accepted, true);
  assert.equal(checkHandwritten("techo.", "techo", "term").accepted, true);
});

test("a term accepts any side of a slash entry and the part before a parenthesis", () => {
  assert.equal(
    checkHandwritten("forro de techo", "Cubierta / Forro de techo", "term").accepted,
    true,
  );
  assert.equal(checkHandwritten("teja", "Teja (de barro/concreto)", "term").accepted, true);
});

test("a term one letter off is close, not correct", () => {
  const result = checkHandwritten("tecno", "techo", "term");
  assert.equal(result.verdict, "close");
  assert.equal(result.accepted, false);
  assert.equal(result.distance, 1);
});

test("a short term never gets a near-miss pass", () => {
  assert.equal(checkHandwritten("tua", "tub", "term").verdict, "wrong");
});

test("a term that is far off is wrong", () => {
  const result = checkHandwritten("martillo", "techo", "term");
  assert.equal(result.verdict, "wrong");
  assert.equal(result.accepted, false);
});

test("a long phrase with one misread letter is accepted", () => {
  assert.equal(
    checkHandwritten("¿Dónde está el tejado?", "¿Dónde está el tejado?", "phrase").verdict,
    "correct",
  );
  const result = checkHandwritten("Donde esta el tejads", "¿Dónde está el tejado?", "phrase");
  assert.equal(result.verdict, "correct");
  assert.equal(result.accepted, true);
  assert.equal(result.distance, 1);
});

test("a phrase with several misread letters is close, with many it is wrong", () => {
  const close = checkHandwritten("Donde esta el tjdadi", "¿Dónde está el tejado?", "phrase");
  assert.equal(close.verdict, "close");
  assert.equal(close.accepted, false);
  assert.equal(
    checkHandwritten("necesito más tejas", "¿Dónde está el tejado?", "phrase").verdict,
    "wrong",
  );
});

test("a short phrase is held to an exact match", () => {
  assert.equal(checkHandwritten("Cuidado!", "¡Cuidado!", "phrase").accepted, true);
  assert.equal(checkHandwritten("Cuidada", "¡Cuidado!", "phrase").accepted, false);
  assert.equal(checkHandwritten("Hola", "Hola", "phrase").accepted, true);
});

test("empty or blank ink reads as empty", () => {
  assert.equal(checkHandwritten("", "techo", "term").verdict, "empty");
  assert.equal(checkHandwritten("  ?! ", "techo", "term").verdict, "empty");
  assert.equal(checkHandwritten("", "techo", "term").accepted, false);
});

test("non-Latin scripts are compared exactly, not accent-stripped", () => {
  assert.equal(checkHandwritten("屋根", "屋根", "term").accepted, true);
  assert.equal(checkHandwritten("屋 根", "屋根", "term").accepted, true);
  assert.equal(checkHandwritten("屋板", "屋根", "term").accepted, false);
  assert.equal(checkHandwritten("やね", "屋根", "term").accepted, false);
});

test("the supported language list matches the reader and rejects others", () => {
  assert.equal(HANDWRITING_READ_LANGUAGES.length, 10);
  assert.equal(isHandwritingReadLanguage("Spanish"), true);
  assert.equal(isHandwritingReadLanguage("Pashto"), true);
  assert.equal(isHandwritingReadLanguage("Klingon"), false);
});
