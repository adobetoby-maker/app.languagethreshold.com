import assert from "node:assert/strict";
import { test } from "node:test";
import { CURRICULA, getCurriculum } from "../src/data/curriculum.ts";
import {
  FOUNDATION_ROOFING_FOCUS,
  FOUNDATION_ROOFING_LESSONS,
  FOUNDATION_ROOFING_MODULE_ID,
} from "../src/data/foundation-roofing-curriculum.ts";
import { MODULES, getModule } from "../src/data/modules.ts";
import {
  getSpeakingMissions,
  getSpeakingModules,
  speakingCatalogModuleId,
} from "../src/data/speaking-missions.ts";

const ID = "foundation-roofing";

test("Roofing Foundation: ten lessons, each with 8+ terms and 4-6 phrases", () => {
  assert.equal(FOUNDATION_ROOFING_MODULE_ID, ID);
  assert.equal(FOUNDATION_ROOFING_LESSONS.length, 10);
  FOUNDATION_ROOFING_LESSONS.forEach((lesson, index) => {
    assert.equal(lesson.n, index + 1);
    assert.ok(lesson.title && lesson.objective, `lesson ${lesson.n} has a title and objective`);
    const terms = lesson.words.filter((w) => w.kind === "term");
    const phrases = lesson.words.filter((w) => w.kind === "phrase");
    assert.ok(terms.length >= 8, `lesson ${lesson.n} has ${terms.length} terms`);
    assert.ok(phrases.length >= 4 && phrases.length <= 6, `lesson ${lesson.n} has ${phrases.length} phrases`);
    assert.ok(lesson.words.every((w) => w.es.trim() && w.en.trim()));
    assert.deepEqual(
      lesson.steps.map((s) => s.tab),
      ["reader", "wordMatch", "speak"],
    );
    assert.ok(FOUNDATION_ROOFING_FOCUS[lesson.n], `lesson ${lesson.n} has a focus`);
  });
});

test("Roofing Foundation is registered as a free Spanish module with its own curriculum", () => {
  const module = getModule(ID);
  assert.ok(module, "module is in MODULES");
  assert.equal(MODULES.filter((m) => m.id === ID).length, 1);
  assert.equal(module.name, "Roofing Foundation");
  assert.equal(module.priceCents, 0);
  assert.deepEqual(module.languages, ["Spanish"]);
  assert.equal(module.userRole, "Beginner roofer learning Spanish");
  assert.ok(module.challengePrompts.length > 0);
  const headwords = FOUNDATION_ROOFING_LESSONS.flatMap((l) => l.words.map((w) => w.en.toLowerCase()));
  for (const word of module.vocabFocus) {
    assert.ok(
      headwords.some((en) => en.includes(word)),
      `vocabFocus "${word}" is taught in the Foundation`,
    );
  }
  const curriculum = getCurriculum(ID);
  assert.equal(curriculum, CURRICULA[ID]);
  assert.equal(curriculum.headline, "The Roofing Foundation");
  assert.match(curriculum.threshold, /^By Lesson 10, /);
  assert.equal(curriculum.lessons, FOUNDATION_ROOFING_LESSONS);
  // The Roofing Core 30 itself is untouched.
  assert.equal(getCurriculum("roofing").lessons.length, 30);
});

test("Roofing Foundation: every lesson has its own Say it mission, in Spanish only", () => {
  const missions = getSpeakingMissions("Spanish").filter((m) => m.moduleId === ID);
  for (const lesson of FOUNDATION_ROOFING_LESSONS) {
    const mission = missions.find((m) => m.title === `Lesson ${lesson.n}: ${lesson.title}`);
    assert.ok(mission, `Say it mission for lesson ${lesson.n}`);
    assert.equal(mission.language, "Spanish");
    assert.ok(mission.id.includes(`${ID}_lesson_${lesson.n}_`));
  }
  // Listed under Roofing, not as a module card of its own; Spanish only.
  assert.ok(!getSpeakingModules("Spanish").some((m) => m.id === ID));
  assert.equal(speakingCatalogModuleId(ID), "roofing");
  assert.ok(getSpeakingModules("Spanish").some((m) => m.id === speakingCatalogModuleId(ID)));
  assert.equal(getSpeakingMissions("Italian").filter((m) => m.moduleId === ID).length, 0);
});
