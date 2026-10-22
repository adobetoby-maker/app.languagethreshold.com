import assert from "node:assert/strict";
import test from "node:test";
import { englishForm, primaryGloss } from "../src/lib/verb-games/english.ts";

test("conjugates head verbs and keeps phrase tails", () => {
  assert.equal(englishForm("to have", "yo"), "I have");
  assert.equal(englishForm("to have", "él_ella_usted"), "he/she has");
  assert.equal(englishForm("to do, to make", "él_ella_usted"), "he/she does");
  assert.equal(englishForm("to be worth", "yo"), "I am worth");
  assert.equal(englishForm("to be worth", "tú"), "you are worth");
  assert.equal(englishForm("to be worth", "él_ella_usted"), "he/she is worth");
  assert.equal(englishForm("to go up (to the next level)", "él_ella_usted"), "he/she goes up");
  assert.equal(englishForm("to watch, to observe", "él_ella_usted"), "he/she watches");
  assert.equal(englishForm("to carry", "él_ella_usted"), "he/she carries");
  assert.equal(englishForm("to play", "él_ella_usted"), "he/she plays");
  assert.equal(englishForm("to fail / to miss", "nosotros"), "we fail");
  assert.equal(englishForm("to look for", "ellos_ustedes"), "they look for");
  assert.equal(englishForm("to be (essence)", "yo"), "I am");
  assert.equal(primaryGloss("to kick, to punt"), "to kick");
});
