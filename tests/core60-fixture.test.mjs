// Built by TAC — 2026-10-19
// A synthetic trade wired end to end through the data-driven Core 60 path, from the fixture in
// tests/fixtures/core60 (never shipped: it loads only with CORE60_FIXTURE=1 under Node, or when
// e2e/core60-path.spec.ts injects it into a dev-server page). "test" lists a Foundation and a Master; "test-partial"
// lists only a Master, so its Foundation is "Coming soon". Node runs each test file in its own
// process, so the flag set here reaches no other test file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.CORE60_FIXTURE = "1";
const { MODULES, getModule } = await import("../src/data/modules.ts");
const { getCurriculum } = await import("../src/data/curriculum.ts");
const { core60Manifest, core60FixtureModules, stageCurriculumStatus, loadStageCurriculum } =
  await import("../src/data/core60-stages.ts");
const {
  core60PathOf,
  core60PathComplete,
  core60Eyebrow,
  core30PathBannerText,
  CORE30_MASTER_ONLY_TEXT,
  CORE60_PATHS,
} = await import(
  "../src/lib/core60-path.ts"
);
const { core30PaceFor, CORE30_FOUNDATION_PACE, CORE30_MASTER_PACE } = await import(
  "../src/lib/core30-plan.ts"
);
const { findSpeakingMission, getSpeakingMissions, getSpeakingModules } = await import(
  "../src/data/speaking-missions.ts"
);
const { validateManifest, validateStageFile } = await import("../src/lib/core60-validate.ts");
// The shipped manifest grows as the generator publishes trades; the fixture adds its two on top.
const { CORE60_MANIFEST } = await import("../src/data/core60/manifest.ts");
const FIXTURE_BASES = new Set(["test", "test-partial"]);
const fixtureManifest = () => core60Manifest().filter((entry) => FIXTURE_BASES.has(entry.base));

const fixtureFile = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/core60/es/${name}.json`, import.meta.url), "utf8"));

test("fixture stages register as modules right after their base", () => {
  const ids = MODULES.map((m) => m.id);
  assert.deepEqual(
    ids.slice(ids.indexOf("test"), ids.indexOf("test") + 3),
    ["test", "foundation-test", "master-test"],
  );
  assert.equal(ids[ids.indexOf("test-partial") + 1], "master-test-partial");
  assert.equal(ids.includes("foundation-test-partial"), false);
  assert.equal(getModule("foundation-test").name, "Test Trade Foundation");
  assert.equal(getModule("foundation-test").priceCents, 0);
  assert.equal(getModule("master-test").name, "Test Trade Master");
  assert.equal(getModule("master-test").priceCents, getModule("test").priceCents);
  assert.match(getModule("master-test").aiPersona, /ONE realistic complication/);
  assert.equal(core60Manifest().length, CORE60_MANIFEST.length + 2);
  assert.deepEqual(fixtureManifest().map((entry) => entry.base), ["test", "test-partial"]);
  assert.equal(core60FixtureModules().length, 2);
  // Roofing's hand-written row is untouched; fixture trades come from the manifest.
  assert.deepEqual(Object.keys(CORE60_PATHS), ["roofing"]);
});

test("fixture stage files pass the validator, and the fixture manifest is well formed", () => {
  for (const [name, stage] of [
    ["foundation-test", "foundation"],
    ["master-test", "master"],
    ["master-test-partial", "master"],
  ]) {
    assert.deepEqual(validateStageFile(fixtureFile(name), { moduleId: name, stage, language: "Spanish" }), [], name);
  }
  // The synthetic bases have no Core 30 curriculum of their own, so that check is waived here.
  assert.deepEqual(validateManifest(fixtureManifest(), core60FixtureModules(), () => true), []);
});

test("getCurriculum reads a stage file synchronously under Node", async () => {
  assert.equal(stageCurriculumStatus("master-test"), "ready");
  const master = getCurriculum("master-test");
  assert.equal(master.headline, "The Test Trade Master 20");
  assert.equal(master.lessons.length, 20);
  assert.deepEqual(master.lessons[0].grammar, fixtureFile("master-test").lessons[0].grammar);
  assert.equal(master.lessons[0].lessonType, "Teach-back");
  assert.equal(master.lessons[0].block, "A");
  assert.deepEqual(
    master.lessons[0].steps.map((s) => [s.tab, s.durationMin]),
    [["reader", 12], ["wordMatch", 8], ["speak", 12]],
  );
  const foundation = getCurriculum("foundation-test");
  assert.equal(foundation.lessons.length, 10);
  assert.equal(foundation.lessons[2].grammar, undefined);
  assert.equal(await loadStageCurriculum("foundation-test"), foundation);
  assert.equal(stageCurriculumStatus("test"), "none");
});

test("the fixture trade's path: three stages, Foundation Coming soon where it is not listed", () => {
  const full = core60PathOf("master-test");
  assert.equal(full.current, "master");
  assert.equal(core60Eyebrow(full), "Core 60 · Test Trade · Step 3 of 3");
  assert.deepEqual(full.steps.map((s) => s.available), [true, true, true]);
  assert.equal(core60PathComplete("test"), true);
  const partial = core60PathOf("master-test-partial");
  assert.deepEqual(
    partial.steps.map((s) => [s.stage, s.moduleId, s.available]),
    [
      ["foundation", "foundation-test-partial", false],
      ["core", "test-partial", true],
      ["master", "master-test-partial", true],
    ],
  );
  assert.equal(core60PathComplete("test-partial"), false);
  // The banner says the Master is ready (not that both stages are coming soon).
  assert.equal(core30PathBannerText("test-partial"), CORE30_MASTER_ONLY_TEXT);
  assert.equal(core30PathBannerText("test"), null);
  assert.equal(core60PathOf("foundation-test-partial"), null);
});

test("derived stages get the Foundation and Master paces", () => {
  assert.equal(core30PaceFor("foundation-test"), CORE30_FOUNDATION_PACE);
  assert.equal(core30PaceFor("master-test"), CORE30_MASTER_PACE);
});

test("every fixture lesson has its own Say it mission, Master missions with the surprise complication", () => {
  const missions = getSpeakingMissions("Spanish");
  for (const moduleId of ["foundation-test", "master-test"]) {
    for (const lesson of getCurriculum(moduleId).lessons) {
      const id = `scenario_version_${moduleId}_lesson_${lesson.n}_es_v1`;
      const mission = missions.find((m) => m.id === id);
      assert.ok(mission, id);
      assert.equal(mission.title, `Lesson ${lesson.n}: ${lesson.title}`);
      assert.equal(Boolean(mission.surpriseComplication), moduleId.startsWith("master-"));
      assert.equal(mission.level, moduleId.startsWith("master-") ? "B1" : "A2");
      // The server-side lookup (/api/speak) finds the same mission.
      assert.equal(findSpeakingMission(id)?.id, id);
    }
  }
  // Stage missions are listed under the base module, not as a module card of their own.
  assert.ok(!getSpeakingModules("Spanish").some((m) => m.id === "master-test"));
  assert.ok(getSpeakingModules("Spanish").some((m) => m.id === "test"));
  assert.equal(getSpeakingMissions("Italian").filter((m) => m.moduleId === "master-test").length, 0);
});
