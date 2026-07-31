import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  applyMasteryIncrement,
  applyRegressionReset,
  deriveUserVocab,
  includeLegacyVocab,
  replaceLanguageVocab,
} from "../src/state/vocab-store.ts";

const THRESHOLD = 5;
const w = (word, correctCount = 0) => ({
  word, translation: `${word} definition`, category: "vocab", correctCount,
});

// Simulates the shipped HYDRATE / SET_LANGUAGE reconciliation.
const reconcile = (byLang, vocabLang, userVocab, selected) =>
  includeLegacyVocab(byLang, vocabLang, userVocab, selected);

describe("vocabulary write path survives reconciliation", () => {
  test("F1: regression reset is NOT reverted by the merge clamp", () => {
    let byLang = { Italian: [w("prenotazione", 5)] };
    byLang = applyRegressionReset(byLang, "Italian", THRESHOLD);
    assert.equal(byLang.Italian[0].correctCount, 3, "reset applied to durable map");

    const userVocab = deriveUserVocab(byLang, "Italian");
    // reload
    const afterHydrate = reconcile(byLang, "Italian", userVocab, "Italian");
    assert.equal(afterHydrate.Italian[0].correctCount, 3, "reset survives HYDRATE");
    // language switch away and back
    const afterSwitch = reconcile(afterHydrate, "Italian", deriveUserVocab(afterHydrate, "Italian"), "Italian");
    assert.equal(afterSwitch.Italian[0].correctCount, 3, "reset survives SET_LANGUAGE round-trip");
  });

  test("F1: mastery increment still persists", () => {
    let byLang = { Italian: [w("prenotazione", 2)] };
    byLang = applyMasteryIncrement(byLang, "Italian", "prenotazione");
    assert.equal(byLang.Italian[0].correctCount, 3);
    const after = reconcile(byLang, "Italian", deriveUserVocab(byLang, "Italian"), "Italian");
    assert.equal(after.Italian[0].correctCount, 3, "increment survives reload");
  });

  test("F1: mastery increment matches case/whitespace variants", () => {
    let byLang = { Italian: [w("Prenotazione", 1)] };
    byLang = applyMasteryIncrement(byLang, "Italian", " prenotazione ");
    assert.equal(byLang.Italian[0].correctCount, 2, "normalized key matched");
  });

  test("F1: Pen Pal replacement persists into the durable map", () => {
    let byLang = { Italian: [w("vecchio", 4)] };
    byLang = replaceLanguageVocab(byLang, "Italian", [w("nuovo", 0)]);
    const after = reconcile(byLang, "Italian", deriveUserVocab(byLang, "Italian"), "Italian");
    assert.deepEqual(after.Italian.map((i) => i.word), ["nuovo"], "replacement is durable");
  });

  test("legacy recovery (synthesis correction 1) still works", () => {
    const recovered = reconcile({}, null, [w("hidalgo", 3)], "Spanish");
    assert.equal(recovered.Spanish[0].correctCount, 3, "orphaned vocab recovered, SRS intact");
  });
});
