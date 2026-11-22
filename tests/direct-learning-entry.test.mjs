import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
const { directLearningEntry } = await loadModule("src/lib/direct-learning-entry.ts");
test("a module lesson-plan link bypasses the generic Reader detour", () => {
  assert.deepEqual(directLearningEntry("?module=roofing&tab=core30", "English"), {
    moduleId: "roofing",
    tab: "core30",
  });
  assert.deepEqual(directLearningEntry("?module=roofing&tab=flashcards", "English"), {
    moduleId: "roofing",
    tab: "flashcards",
  });
});
test("unknown modules, arbitrary destinations and an absent context cannot bypass onboarding", () => {
  assert.equal(directLearningEntry("?module=unknown&tab=core30", "English"), null);
  assert.equal(directLearningEntry("?module=roofing&tab=https://example.invalid", "English"), null);
  assert.equal(directLearningEntry("", "English"), null);
});
test("English-for-work links keep the instruction-language safeguard", () => {
  assert.equal(directLearningEntry("?module=or-evs&tab=core30", "English"), null);
  assert.deepEqual(directLearningEntry("?module=or-evs&tab=core30", "Spanish"), {
    moduleId: "or-evs",
    tab: "core30",
  });
});
test("a French or Italian course link opens that course, never the bilingual first-run picker", () => {
  assert.deepEqual(directLearningEntry("?module=roofing&target=French", "English"), {
    moduleId: "roofing-fr",
    tab: "core30",
  });
  assert.deepEqual(directLearningEntry("?module=roofing&target=Italian&tab=core30", "English"), {
    moduleId: "roofing-it",
    tab: "core30",
  });
  // A Spanish-only module has no French course: the link opens nothing and the picker stays.
  assert.equal(directLearningEntry("?module=soccer&target=French", "English"), null);
  // Spanish and the languages that are not packs keep base behaviour (a tab is still needed).
  assert.equal(directLearningEntry("?module=roofing&target=Spanish&native=English", "English"), null);
  assert.equal(directLearningEntry("?module=roofing&target=German", "English"), null);
  assert.deepEqual(directLearningEntry("?module=roofing&target=Spanish&native=English&tab=core30", "English"), {
    moduleId: "roofing",
    tab: "core30",
  });
});
