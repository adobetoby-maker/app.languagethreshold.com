// Built by TAC — 2026-10-19
import assert from "node:assert/strict";
import test from "node:test";
import { contentLimitsFor } from "../src/lib/lesson-content-core.ts";
import { FOUNDATION_ROOFING_LESSONS } from "../src/data/foundation-roofing-curriculum.ts";
import { MASTER_ROOFING_LESSONS } from "../src/data/master-roofing-curriculum.ts";

// The word list of every Foundation and Master lesson must stay inside its profile's limits
// (Foundation: the Core 30 limits, 8-12 terms / 4-6 phrases; Master: 12-16 terms / 6-8 phrases),
// so an edit to a curriculum cannot silently break what the content validator enforces.
function assertWordLimits(moduleId, lessons, expected) {
  const limits = contentLimitsFor(moduleId);
  assert.equal(limits.minTerms, expected.minTerms);
  assert.equal(limits.maxTerms, expected.maxTerms);
  assert.equal(limits.minPhrases, expected.minPhrases);
  assert.equal(limits.maxPhrases, expected.maxPhrases);
  assert.ok(lessons.length > 0, `${moduleId} has lessons`);
  for (const lesson of lessons) {
    const terms = (lesson.words ?? []).filter((word) => word.kind === "term").length;
    const phrases = (lesson.words ?? []).filter((word) => word.kind === "phrase").length;
    assert.ok(
      terms >= limits.minTerms && terms <= limits.maxTerms,
      `${moduleId} lesson ${lesson.n}: ${terms} terms, needs ${limits.minTerms}-${limits.maxTerms}`,
    );
    assert.ok(
      phrases >= limits.minPhrases && phrases <= limits.maxPhrases,
      `${moduleId} lesson ${lesson.n}: ${phrases} phrases, needs ${limits.minPhrases}-${limits.maxPhrases}`,
    );
  }
}

test("every Master curriculum lesson has 12-16 terms and 6-8 phrases", () => {
  assert.equal(MASTER_ROOFING_LESSONS.length, 20);
  assertWordLimits("master-roofing", MASTER_ROOFING_LESSONS, {
    minTerms: 12,
    maxTerms: 16,
    minPhrases: 6,
    maxPhrases: 8,
  });
});

test("every Foundation curriculum lesson has 8-12 terms and 4-6 phrases", () => {
  assert.equal(FOUNDATION_ROOFING_LESSONS.length, 10);
  assertWordLimits("foundation-roofing", FOUNDATION_ROOFING_LESSONS, {
    minTerms: 8,
    maxTerms: 12,
    minPhrases: 4,
    maxPhrases: 6,
  });
});
