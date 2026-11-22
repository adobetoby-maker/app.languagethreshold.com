// Built by TAC — 2026-11-21
// Owner decisions 2 and 4 (2026-11-21): Spanish learners and learners of languages that are not
// packs yet keep the base (df664f7c9) copy, prompts and ids. These pins guard the spots the round-2
// verifier found changed (core60-languages/audit/pwa-round2-verification.md S-2, S-5, S-8, O-2).
import assert from "node:assert/strict";
import test from "node:test";
import { getModule, moduleBlurbFor } from "../src/data/modules.ts";
import { lessonWordsSystemPrompt } from "../src/lib/lesson-words-prompt.ts";
import { foundationBeginnerRule } from "../src/lib/core60-stage-core.ts";
import { lessonObjectiveId } from "../src/lib/learning-identity.ts";

test("shared module blurbs keep their base text; only a catalog-pack learner reads them projected", () => {
  const pt = getModule("physical-therapy");
  assert.match(pt.blurb, /with patients in English or Spanish\.$/);
  assert.equal(moduleBlurbFor(pt, "Spanish"), pt.blurb);
  assert.equal(moduleBlurbFor(pt, "German"), pt.blurb);
  assert.match(getModule("roofing").blurb, /crew closeout in English or Spanish\.$/);
  assert.match(moduleBlurbFor(pt, "French"), /with patients in French\.$/);
  assert.match(moduleBlurbFor(pt, "Italian"), /with patients in Italian\.$/);
});

test("the lesson-word prompt keeps its base units example for Spanish and non-pack targets", () => {
  for (const [target, native] of [["Spanish", "English"], ["English", "Spanish"], ["German", "English"]])
    assert.match(lessonWordsSystemPrompt(target, native), /\(90 centímetros is 90 centimeters, not 36 inches\)/);
});

test("the Foundation beginner rule offers English help, as at base", () => {
  assert.match(foundationBeginnerRule("Spanish"), /Offer English help only when the learner is stuck/);
  assert.match(foundationBeginnerRule("English"), /Offer English help only when the learner is stuck/);
});

test("objective ids stay unscoped for Spanish, Japanese and the legacy-adapter languages", () => {
  for (const target of ["Spanish", "Japanese", "Chinese", "German", "Korean", "Pashto", "Portuguese"])
    assert.equal(lessonObjectiveId("roofing", 3, target, "English"), "roofing.lesson.3");
  assert.equal(lessonObjectiveId("roofing", 3, "English", "Spanish"), "roofing.lesson.3");
});
