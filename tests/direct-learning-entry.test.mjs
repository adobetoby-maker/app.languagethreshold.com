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
