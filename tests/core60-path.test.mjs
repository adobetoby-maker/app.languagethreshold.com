import assert from "node:assert/strict";
import { test } from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getModule } from "../src/data/modules.ts";
import { FOUNDATION_ROOFING_LESSONS } from "../src/data/foundation-roofing-curriculum.ts";
import { MASTER_ROOFING_LESSONS, MASTER_ROOFING_MODULE_ID } from "../src/data/master-roofing-curriculum.ts";
import {
  CORE30_WITHOUT_PATH_TEXT,
  CORE60_PATHS,
  core60Eyebrow,
  core60PathOf,
  core60StageName,
  hasCore30Checkpoints,
  showFoundationNudge,
  stageLessonLabel,
  stageLessonShort,
} from "../src/lib/core60-path.ts";
import { getSpeakingMissions, getSpeakingModules } from "../src/data/speaking-missions.ts";
import { foundationAccess } from "../src/lib/core30-plan.ts";

test("roofing has one Core 60 path of three stages in order", () => {
  assert.deepEqual(Object.keys(CORE60_PATHS), ["roofing"]);
  for (const id of ["foundation-roofing", "roofing", "master-roofing"]) {
    const path = core60PathOf(id);
    assert.ok(path, id);
    assert.equal(path.tradeModuleId, "roofing");
    assert.deepEqual(
      path.steps.map((s) => [s.stage, s.moduleId, s.label, s.lessons]),
      [
        ["foundation", "foundation-roofing", "Foundation · 10 lessons · free", 10],
        ["core", "roofing", "Core 30 · 30 lessons", 30],
        ["master", "master-roofing", "Master 20 · 20 lessons", 20],
      ],
    );
  }
  assert.equal(core60PathOf("foundation-roofing").current, "foundation");
  assert.equal(core60PathOf("roofing").current, "core");
  assert.equal(core60PathOf("master-roofing").current, "master");
  for (const id of ["plumber", "framer", "", null, undefined, "foundation-plumber"]) {
    assert.equal(core60PathOf(id), null, String(id));
  }
});

test("path lesson counts match the curricula (Master once its content has landed)", () => {
  const { lessons } = CORE60_PATHS.roofing;
  assert.equal(FOUNDATION_ROOFING_LESSONS.length, lessons.foundation);
  assert.equal(getCurriculum("roofing").lessons.length, lessons.core);
  if (MASTER_ROOFING_LESSONS.length === 0) {
    return; // Master content not written yet: the config count (20) is the promise.
  }
  assert.equal(MASTER_ROOFING_LESSONS.length, lessons.master);
});

test("every stage of the path is a registered module", () => {
  for (const step of core60PathOf("roofing").steps) {
    assert.ok(getModule(step.moduleId), step.moduleId);
  }
});

test("the beginner nudge shows on the Core 30 page only, until the Foundation is mastered", () => {
  const core = core60PathOf("roofing");
  assert.equal(showFoundationNudge(core, 0), true);
  assert.equal(showFoundationNudge(core, 9), true);
  assert.equal(showFoundationNudge(core, 10), false);
  assert.equal(showFoundationNudge(core60PathOf("foundation-roofing"), 0), false);
  assert.equal(showFoundationNudge(core60PathOf("master-roofing"), 0), false);
});

test("stage names, labels and checkpoints", () => {
  assert.equal(core60StageName("foundation-roofing"), "Foundation");
  assert.equal(core60StageName("master-roofing"), "Master");
  assert.equal(core60StageName("roofing"), null);
  assert.equal(hasCore30Checkpoints("roofing"), true);
  assert.equal(hasCore30Checkpoints("foundation-roofing"), false);
  assert.equal(hasCore30Checkpoints("master-roofing"), false);
});

test("the eyebrow names the trade and the step of each Roofing stage page", () => {
  assert.equal(core60Eyebrow(core60PathOf("foundation-roofing")), "Core 60 · Roofing · Step 1 of 3");
  assert.equal(core60Eyebrow(core60PathOf("roofing")), "Core 60 · Roofing · Step 2 of 3");
  assert.equal(core60Eyebrow(core60PathOf("master-roofing")), "Core 60 · Roofing · Step 3 of 3");
  assert.equal(core60PathOf("electrician"), null);
});

test("Foundation and Master lessons carry the stage on their buttons; the Core 30 keeps its labels", () => {
  assert.equal(stageLessonLabel("master-roofing", 1), "Master Lesson 1");
  assert.equal(stageLessonLabel("foundation-roofing", 4), "Foundation Lesson 4");
  assert.equal(stageLessonLabel("roofing", 7), "Lesson 7");
  assert.equal(stageLessonLabel("electrician", 7), "Lesson 7");
  assert.equal(stageLessonShort("master-roofing", 2), "Master 2");
  assert.equal(stageLessonShort("foundation-roofing", 3), "Foundation 3");
  assert.equal(stageLessonShort("roofing", 2), "Lesson 2");
});

test("the banner for a Core 30 without a path says the Core 30 is ready", () => {
  assert.equal(
    CORE30_WITHOUT_PATH_TEXT,
    "Core 30 is ready for this module. The free Foundation and Master 20 are coming soon.",
  );
});

test("Roofing Master is registered like the Core 30: Spanish, paid tabs, same price", () => {
  assert.equal(MASTER_ROOFING_MODULE_ID, "master-roofing");
  const master = getModule("master-roofing");
  const roofing = getModule("roofing");
  assert.ok(master);
  assert.equal(master.name, "Roofing Master");
  assert.equal(master.category, "Trades");
  assert.deepEqual(master.languages, ["Spanish"]);
  assert.equal(master.priceCents, roofing.priceCents);
  assert.equal(master.userRole, "Roofing foreman leading a crew in Spanish");
  assert.match(master.aiPersona, /ONE realistic complication/);
  assert.ok(master.challengePrompts.length > 0 && master.vocabFocus.length > 0);
  const curriculum = getCurriculum("master-roofing");
  assert.equal(curriculum.headline, "The Roofing Master 20");
  assert.match(curriculum.threshold, /^By Lesson 20, you can train a new roofer/);
  assert.equal(curriculum.lessons, MASTER_ROOFING_LESSONS);
  // Not free-with-sign-in: every tab follows the paid rules.
  for (const tab of ["core30", "speak", "reader"]) {
    assert.equal(foundationAccess("master-roofing", tab, { loading: false, signedIn: true }), "paid");
    assert.equal(foundationAccess("master-roofing", tab, { loading: false, signedIn: false }), "paid");
  }
});

test(
  "Roofing Master: every lesson has its own Say it mission, in Spanish only",
  { skip: MASTER_ROOFING_LESSONS.length === 0 && "Master content has not landed yet (0 lessons)" },
  () => {
    const missions = getSpeakingMissions("Spanish").filter((m) => m.moduleId === "master-roofing");
    for (const lesson of MASTER_ROOFING_LESSONS) {
      const mission = missions.find((m) => m.title === `Lesson ${lesson.n}: ${lesson.title}`);
      assert.ok(mission, `Say it mission for lesson ${lesson.n}`);
      assert.ok(mission.id.includes(`master-roofing_lesson_${lesson.n}_`));
    }
    assert.ok(getSpeakingModules("Spanish").some((m) => m.id === "master-roofing"));
    assert.ok(!getSpeakingModules("Italian").some((m) => m.id === "master-roofing"));
  },
);

test("Roofing Master: six challenge missions from its challenge prompts", () => {
  const challenges = getSpeakingMissions("Spanish").filter(
    (m) => m.moduleId === "master-roofing" && m.id.includes("_challenge_"),
  );
  assert.equal(challenges.length, getModule("master-roofing").challengePrompts.length);
});
