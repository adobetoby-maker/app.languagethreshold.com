import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DAILY_LIVING_TOPICS } from "../src/data/core-speaking.ts";
import { MODULES, moduleSupportsLearningPair } from "../src/data/modules.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// First-impression copy a visitor sees before choosing anything: the landing card, the
// onboarding summary, the guided tour and the Speak intro. The relationships missions stay in
// the catalog; they are just not advertised up front.
const FIRST_RUN_FILES = [
  "src/components/onboarding/FirstRunEntry.tsx",
  "src/components/onboarding/OnboardingWizard.tsx",
  "src/data/tour-scripts.ts",
];

test("first-run copy never advertises relationships or intimacy conversations", () => {
  for (const path of FIRST_RUN_FILES) {
    assert.doesNotMatch(read(path), /intimacy/i, path);
  }
  const speak = read("src/components/speak/SpeakingMissionsPreview.tsx");
  const intro = speak.slice(speak.indexOf('id="mission-preview-heading"'));
  assert.doesNotMatch(intro.slice(0, 1200), /intimacy/i);
});

test("first-run daily-life count matches the Core Speaking catalog", () => {
  for (const path of FIRST_RUN_FILES) {
    for (const [, count] of read(path).matchAll(/(\d+) daily-life situations/g)) {
      assert.equal(Number(count), DAILY_LIVING_TOPICS.length, path);
    }
  }
});

test("Speak entry has no internal UX preview label", () => {
  const speak = read("src/components/speak/SpeakingMissionsPreview.tsx");
  assert.doesNotMatch(speak, /UX preview/);
});

test("module library filter chips skip empty categories", () => {
  const page = read("src/components/modules/ModulesPage.tsx");
  assert.match(page, /\.filter\(\(\{ count \}\) => count > 0\)/);
  // English for Work is for speakers of other languages learning English: a Spanish learner has none.
  const spanish = MODULES.filter((m) => moduleSupportsLearningPair(m, "Spanish", "English"));
  assert.equal(spanish.filter((m) => m.category === "English for Work").length, 0);
  const english = MODULES.filter((m) => moduleSupportsLearningPair(m, "English", "Spanish"));
  const englishForWork = english.filter((m) => m.category === "English for Work").map((m) => m.id);
  assert.ok(englishForWork.includes("fmg") && englishForWork.includes("or-evs"), englishForWork.join());
});
