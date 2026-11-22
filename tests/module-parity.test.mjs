import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadModule } from "./helpers/bundle.mjs";

const languages = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Chinese",
  "Korean",
  "Portuguese",
  "Pashto",
];

test("every published module has a lesson plan and field material for cards", async () => {
  const [{ MODULES }, { getCurriculum }, { MODULE_DECKS }, lessons, catalog] = await Promise.all([
    loadModule("src/data/modules.ts"),
    loadModule("src/data/curriculum.ts"),
    loadModule("src/data/deck-modules.ts"),
    import("../src/data/language-packs/catalog-lessons.ts"),
    import("../src/data/language-packs/catalog.ts"),
  ]);
  // French and Italian modules read their lesson plan from the pack catalog (fetched on demand in
  // the app); read the same file from disk here.
  const catalogPlan = (module) => {
    const pack = lessons.catalogLessonPack(module.languages?.[0]);
    const where = pack && lessons.catalogStageOf(module.id, pack);
    if (!where) return null;
    const raw = JSON.parse(
      readFileSync(new URL(`../content/language-packs/${pack.code}/${where.base}.json`, import.meta.url), "utf8"),
    );
    const file = catalog.parseCatalogModuleFile(raw, pack, where.base);
    return file && lessons.catalogCurriculum(file, where.stage, module.id);
  };
  for (const module of MODULES) {
    const curriculum = getCurriculum(module.id) ?? catalogPlan(module);
    assert.ok(curriculum?.lessons.length, `${module.id} has no lesson plan`);
    assert.ok(module.vocabFocus.length, `${module.id} has no field vocabulary`);
    assert.ok(module.challengePrompts.length, `${module.id} has no field scenarios`);
  }
  assert.ok(MODULE_DECKS.roofing.length >= 64, "preserve the authored Roofing deck");
  assert.ok(MODULE_DECKS.orthopedics.length >= 5, "preserve the authored Orthopedics deck");
});

test("module Reader navigation exposes only loaded translated passages", async () => {
  const [{ MODULES }, { ALL_SEEDS }, { getAvailableModuleLessons }] = await Promise.all([
    loadModule("src/data/modules.ts"),
    loadModule("src/data/all-seeds.ts"),
    loadModule("src/data/module-starters.ts"),
  ]);
  const byId = new Map(ALL_SEEDS.map((entry) => [entry.id, entry]));
  for (const module of MODULES) {
    const supported =
      module.learnDirection === "en-target" ? ["English"] : (module.languages ?? languages);
    for (const language of supported) {
      const ids = getAvailableModuleLessons(module.id, language, ALL_SEEDS);
      for (const id of ids) {
        const entry = byId.get(id);
        assert.ok(entry?.available, `${module.id}/${language} links to an unavailable passage`);
        assert.equal(entry.language, language, `${module.id}/${language} links to wrong language`);
        assert.ok(entry.sentences.length, `${module.id}/${language} links to an empty passage`);
      }
    }
  }
  assert.equal(getAvailableModuleLessons("rock-climbing", "Spanish", ALL_SEEDS).length, 0);
  assert.equal(getAvailableModuleLessons("roofing", "Spanish", ALL_SEEDS).length, 5);
  assert.equal(getAvailableModuleLessons("travel-breakfast", "Spanish", ALL_SEEDS).length, 0);
  assert.equal(getAvailableModuleLessons("or-evs", "English", ALL_SEEDS).length, 30);
  assert.equal(getAvailableModuleLessons("or-cleaning", "Spanish", ALL_SEEDS).length, 30);
});

test("Spanish-native learners get English Reader lessons in the right direction", async () => {
  const [{ MODULES, moduleSupportsLearningPair }, { ALL_SEEDS }, { getAvailableModuleLessons }] =
    await Promise.all([
      loadModule("src/data/modules.ts"),
      loadModule("src/data/all-seeds.ts"),
      loadModule("src/data/module-starters.ts"),
    ]);
  const byId = new Map(ALL_SEEDS.map((entry) => [entry.id, entry]));
  let covered = 0;
  for (const module of MODULES) {
    const spanish = getAvailableModuleLessons(module.id, "Spanish", ALL_SEEDS);
    if (!spanish.length) continue;
    if (module.authoredPair) {
      assert.equal(moduleSupportsLearningPair(module, "English", "Spanish"), false, "Do not reverse an exact authored course into an unbuilt language pair");
      assert.deepEqual(getAvailableModuleLessons(module.id, "English", ALL_SEEDS), []);
      continue;
    }
    assert.ok(moduleSupportsLearningPair(module, "English", "Spanish"), module.id);
    const english = getAvailableModuleLessons(module.id, "English", ALL_SEEDS);
    assert.equal(english.length, spanish.length, `${module.id} English lessons`);
    for (let i = 0; i < english.length; i++) {
      const source = byId.get(spanish[i]);
      const reversed = byId.get(english[i]);
      assert.equal(reversed.language, "English");
      assert.equal(reversed.sentences[0].en, source.sentences[0].target);
      assert.equal(reversed.sentences[0].target, source.sentences[0].en);
    }
    covered++;
  }
  assert.ok(covered >= 35, `expected broad professional coverage, found ${covered}`);
  assert.equal(getAvailableModuleLessons("roofing", "English", ALL_SEEDS).length, 5);
  assert.ok(!moduleSupportsLearningPair(MODULES.find((module) => module.id === "roofing"), "English", "French"));
});

test("existing climbing and fishing translations feed field-only cards", async () => {
  const { getCuratedModulePairs } = await loadModule("src/data/curated-module-pairs.ts");
  for (const language of languages.filter((name) => name !== "Chinese" && name !== "Pashto")) {
    const climbing = await getCuratedModulePairs("rock-climbing", language);
    assert.equal(climbing.length, 51, `Rock Climbing in ${language}`);
    assert.ok(climbing.some((pair) => pair.kind === "term"));
    assert.ok(climbing.some((pair) => pair.kind === "phrase"));
  }
  assert.equal((await getCuratedModulePairs("sport-fishing", "Spanish")).length, 27);
  const englishClimbing = await getCuratedModulePairs("rock-climbing", "English");
  const spanishClimbing = await getCuratedModulePairs("rock-climbing", "Spanish");
  assert.equal(englishClimbing.length, spanishClimbing.length);
  assert.equal(englishClimbing[0].english, spanishClimbing[0].translation);
  assert.equal(englishClimbing[0].translation, spanishClimbing[0].english);
});
