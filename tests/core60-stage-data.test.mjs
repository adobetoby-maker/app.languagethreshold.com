// Built by TAC — 2026-10-19
// Data-driven Core 60 stages (src/lib/core60-stage-core.ts, src/lib/core60-validate.ts,
// src/data/core60-stages.ts): the stage file format reproduces roofing's hand-written stages
// exactly, the validator enforces the generator contract, catalog entries and paths are derived
// from the manifest, and the shipped (empty) manifest leaves every current module unchanged.
import assert from "node:assert/strict";
import test from "node:test";
import { CURRICULA, getCurriculum } from "../src/data/curriculum.ts";
import { HANDWRITTEN_MODULES, MODULES, getModule } from "../src/data/modules.ts";
import { CORE60_MANIFEST } from "../src/data/core60/manifest.ts";
import { FOUNDATION_ROOFING_FOCUS } from "../src/data/foundation-roofing-curriculum.ts";
import { MASTER_ROOFING_FOCUS } from "../src/data/master-roofing-curriculum.ts";
import {
  deriveStageModule,
  findStageEntry,
  masterComplicationRule,
  parseStageFile,
  stageCurriculumFromFile,
  stageFileRelativePath,
  withDerivedStageModules,
} from "../src/lib/core60-stage-core.ts";
import { validateManifest, validateStageFile } from "../src/lib/core60-validate.ts";
import {
  CORE60_PATHS,
  core60PathOf,
  core60PathsFromManifest,
  hasCore30Checkpoints,
  showFoundationNudge,
  stageLessonLabel,
  stageLessonShort,
} from "../src/lib/core60-path.ts";
import {
  CORE30_FOUNDATION_PACE,
  CORE30_MASTER_PACE,
  core30PaceFor,
  foundationAccess,
} from "../src/lib/core30-plan.ts";
import { MASTER_CONTENT_LIMITS, CONTENT_LIMITS, contentLimitsFor } from "../src/lib/lesson-content-core.ts";
import {
  registerStageCurriculum,
  stageCurriculum,
  stageCurriculumStatus,
} from "../src/data/core60-stages.ts";

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Roofing's hand-written stage, written out in the generator's file format. */
function roofingStageFile(stage) {
  const moduleId = `${stage}-roofing`;
  const curriculum = CURRICULA[moduleId];
  return {
    version: 1,
    module: moduleId,
    baseModule: "roofing",
    stage,
    language: "Spanish",
    nativeLanguage: "English",
    headline: curriculum.headline,
    threshold: curriculum.threshold,
    reviewed: false,
    lessons: curriculum.lessons.map((lesson) => ({
      n: lesson.n,
      title: lesson.title,
      objective: lesson.objective,
      ...(stage === "foundation" ? { focus: FOUNDATION_ROOFING_FOCUS[lesson.n] } : {}),
      words: lesson.words,
      speaking: lesson.steps[2].instruction,
      ...(stage === "master"
        ? { grammar: lesson.grammar, lessonType: lesson.lessonType, block: lesson.block }
        : {}),
    })),
  };
}

for (const stage of ["foundation", "master"]) {
  test(`the stage file format reproduces the hand-written ${stage}-roofing curriculum exactly`, () => {
    const file = clone(roofingStageFile(stage));
    assert.deepEqual(validateStageFile(file, { moduleId: `${stage}-roofing`, stage, language: "Spanish" }), []);
    const parsed = parseStageFile(file, { moduleId: `${stage}-roofing`, stage, language: "Spanish" });
    assert.ok(parsed);
    assert.deepEqual(stageCurriculumFromFile(parsed), CURRICULA[`${stage}-roofing`]);
  });
}

test("Master focus defaults to the grammar focus, as in the hand-written Master", () => {
  for (const lesson of CURRICULA["master-roofing"].lessons) {
    assert.equal(MASTER_ROOFING_FOCUS[lesson.n], lesson.grammar.focus);
  }
});

test("the validator enforces lesson counts, word limits and Master fields", () => {
  const master = clone(roofingStageFile("master"));
  master.lessons.pop();
  assert.ok(validateStageFile(master).includes("a master has 20 lessons, found 19"));

  const noGrammar = clone(roofingStageFile("master"));
  delete noGrammar.lessons[0].grammar;
  delete noGrammar.lessons[1].lessonType;
  noGrammar.lessons[2].block = "F";
  const errors = validateStageFile(noGrammar);
  assert.ok(errors.includes("lesson 1: grammar is missing"), errors.join("\n"));
  assert.ok(errors.some((e) => e.startsWith("lesson 2: lessonType must be one of")));
  assert.ok(errors.some((e) => e.startsWith("lesson 3: block must be one of")));

  const oneExample = clone(roofingStageFile("master"));
  oneExample.lessons[4].grammar.examples.pop();
  assert.ok(validateStageFile(oneExample).includes("lesson 5: grammar.examples must hold exactly two examples"));

  // Word limits come from contentLimitsFor: Master 12-16 terms, Foundation 8-12.
  const thin = clone(roofingStageFile("master"));
  thin.lessons[0].words = thin.lessons[0].words.filter((w) => w.kind === "phrase");
  assert.ok(validateStageFile(thin).some((e) => e.startsWith("lesson 1: 0 terms, needs 12-16")));
  const foundation = clone(roofingStageFile("foundation"));
  foundation.lessons[3].words.push(...foundation.lessons[3].words.filter((w) => w.kind === "phrase").map((w) => ({ ...w, es: `${w.es} (2)` })));
  assert.ok(validateStageFile(foundation).some((e) => /^lesson 4: \d+ phrases, needs 4-6$/.test(e)));

  const grammarInFoundation = clone(roofingStageFile("foundation"));
  grammarInFoundation.lessons[0].grammar = { focus: "x", examples: [] };
  delete grammarInFoundation.lessons[1].focus;
  const fErrors = validateStageFile(grammarInFoundation);
  assert.ok(fErrors.includes("lesson 1: grammar belongs to Master lessons only"));
  assert.ok(fErrors.includes("lesson 2: focus is missing"));
});

test("the validator checks identity, required fields and duplicates", () => {
  const file = clone(roofingStageFile("foundation"));
  file.module = "foundation-plumber";
  file.nativeLanguage = "Spanish";
  delete file.headline;
  file.reviewed = "no";
  file.lessons[0].n = 7;
  file.lessons[1].words[1] = { ...file.lessons[1].words[0] };
  file.lessons[2].speaking = "";
  const errors = validateStageFile(file, { language: "English" });
  for (const expected of [
    'module must be "foundation-roofing"',
    'language must be "English" (from the manifest)',
    "nativeLanguage must differ from language",
    "headline is missing",
    "reviewed must be true or false",
    "lesson 1: n must be 1",
    "lesson 3: speaking (the Say it brief) is missing",
  ]) {
    assert.ok(errors.includes(expected), `${expected}\n---\n${errors.join("\n")}`);
  }
  assert.ok(errors.some((e) => e.startsWith("lesson 2 word 2:") && e.endsWith("appears twice in this lesson")));
  assert.deepEqual(validateStageFile(null), ["file is not a JSON object"]);
});

test("parseStageFile rejects a file for another module, stage or language", () => {
  const file = roofingStageFile("master");
  const expected = { moduleId: "master-roofing", stage: "master", language: "Spanish" };
  assert.ok(parseStageFile(file, expected));
  assert.equal(parseStageFile(file, { ...expected, moduleId: "master-plumber" }), null);
  assert.equal(parseStageFile(file, { ...expected, stage: "foundation" }), null);
  assert.equal(parseStageFile(file, { ...expected, language: "English" }), null);
  assert.equal(parseStageFile({ ...file, version: 2 }, expected), null);
  assert.equal(parseStageFile({ ...file, lessons: [{ n: 1 }] }, expected), null);
});

test("a derived Foundation is free, A1-patient and offered only in its language", () => {
  const electrician = getModule("electrician");
  const entry = { base: "electrician", language: "Spanish", foundation: {}, master: {} };
  const foundation = deriveStageModule(electrician, entry, "foundation");
  assert.equal(foundation.id, "foundation-electrician");
  assert.equal(foundation.name, `${electrician.name} Foundation`);
  assert.equal(foundation.category, electrician.category);
  assert.equal(foundation.emoji, electrician.emoji);
  assert.equal(foundation.priceCents, 0);
  assert.deepEqual(foundation.languages, ["Spanish"]);
  assert.ok(foundation.aiPersona.startsWith(electrician.aiPersona));
  assert.match(foundation.aiPersona, /true beginner: be patient and speak simple, slow A1 Spanish/);
  assert.deepEqual(foundation.challengePrompts, electrician.challengePrompts);
  assert.deepEqual(foundation.vocabFocus, electrician.vocabFocus);
});

test("a derived Master costs what its Core 30 costs and carries the unannounced-complication rule", () => {
  const electrician = getModule("electrician");
  const entry = {
    base: "electrician",
    language: "Spanish",
    master: { blurb: "Own blurb.", challengePrompts: ["One."], vocabFocus: ["panel"], userRole: "Lead electrician" },
  };
  const master = deriveStageModule(electrician, entry, "master");
  assert.equal(master.id, "master-electrician");
  assert.equal(master.name, `${electrician.name} Master`);
  assert.equal(master.priceCents, electrician.priceCents);
  assert.ok(master.aiPersona.startsWith(electrician.aiPersona));
  assert.ok(master.aiPersona.endsWith(masterComplicationRule("Spanish")));
  assert.match(master.aiPersona, /ONE realistic complication/);
  // Manifest catalog text wins over the derived defaults.
  assert.equal(master.blurb, "Own blurb.");
  assert.deepEqual(master.challengePrompts, ["One."]);
  assert.deepEqual(master.vocabFocus, ["panel"]);
  assert.equal(master.userRole, "Lead electrician");
});

test("an English-for-work base passes its direction and native languages to its stages", () => {
  const base = HANDWRITTEN_MODULES.find((m) => m.learnDirection === "en-target");
  assert.ok(base, "an en-target module exists");
  const stage = deriveStageModule(base, { base: base.id, language: "English", foundation: {} }, "foundation");
  assert.equal(stage.learnDirection, "en-target");
  assert.deepEqual(stage.nativeLanguages, base.nativeLanguages);
  assert.deepEqual(stage.languages, ["English"]);
});

test("derived stages follow their base in the catalog and never replace a hand-written module", () => {
  const manifest = [
    { base: "electrician", language: "Spanish", foundation: {}, master: {} },
    { base: "plumber", language: "Spanish", master: {} },
    { base: "roofing", language: "Spanish", foundation: {}, master: {} },
    { base: "no-such-module", language: "Spanish", foundation: {} },
  ];
  const out = withDerivedStageModules(HANDWRITTEN_MODULES, manifest);
  const ids = out.map((m) => m.id);
  const at = (id) => ids.indexOf(id);
  assert.equal(at("foundation-electrician"), at("electrician") + 1);
  assert.equal(at("master-electrician"), at("electrician") + 2);
  assert.equal(at("master-plumber"), at("plumber") + 1);
  assert.equal(at("foundation-plumber"), -1);
  assert.equal(at("foundation-no-such-module"), -1);
  // Roofing's hand-written stages are kept, not duplicated or replaced.
  assert.equal(ids.filter((id) => id === "master-roofing").length, 1);
  assert.equal(out.find((m) => m.id === "master-roofing"), getModule("master-roofing"));
  assert.equal(out.length, HANDWRITTEN_MODULES.length + 3);
  assert.deepEqual(findStageEntry(manifest, "master-plumber")?.stage, "master");
  assert.equal(findStageEntry(manifest, "foundation-plumber"), null);
});

test("the shipped manifest is valid and leaves every current module exactly as written", () => {
  assert.deepEqual(validateManifest(CORE60_MANIFEST, HANDWRITTEN_MODULES, (id) => Boolean(CURRICULA[id])), []);
  const listed = new Set(CORE60_MANIFEST.flatMap((e) => [`foundation-${e.base}`, `master-${e.base}`]));
  assert.deepEqual(
    MODULES.filter((m) => !listed.has(m.id)),
    [...HANDWRITTEN_MODULES],
  );
  // Roofing keeps its hand-written path row.
  assert.deepEqual(Object.keys(CORE60_PATHS), ["roofing"]);
});

test("the manifest validator catches unknown bases, missing stages and hand-written collisions", () => {
  const errors = validateManifest(
    [
      { base: "no-such-module", language: "Spanish", foundation: {} },
      { base: "electrician", language: "Spanish" },
      { base: "roofing", language: "Spanish", master: {} },
      { base: "electrician", language: "Spanish", master: {} },
    ],
    HANDWRITTEN_MODULES,
    (id) => Boolean(CURRICULA[id]),
  );
  assert.ok(errors.includes('manifest entry "no-such-module": no module with that id'));
  assert.ok(errors.includes('manifest entry "electrician": lists no stage'));
  assert.ok(errors.includes('manifest entry "roofing": master-roofing is already a hand-written module'));
  assert.ok(errors.includes('manifest entry "electrician": listed twice'));
});

test("a manifest trade gets a path; a stage not listed yet is Coming soon, not a page", () => {
  const paths = core60PathsFromManifest([
    { base: "electrician", language: "Spanish", foundation: {}, master: {} },
    { base: "plumber", language: "Spanish", foundation: {} },
    { base: "roofing", language: "Spanish", foundation: {}, master: {} },
  ]);
  assert.deepEqual(Object.keys(paths), ["electrician", "plumber"]);
  const electrician = core60PathOf("master-electrician", paths);
  assert.equal(electrician.current, "master");
  assert.equal(electrician.tradeLabel, getModule("electrician").name);
  assert.deepEqual(
    electrician.steps.map((s) => [s.stage, s.moduleId, s.label, s.available]),
    [
      ["foundation", "foundation-electrician", "Foundation · 10 lessons · free", true],
      ["core", "electrician", `Core 30 · ${getCurriculum("electrician").lessons.length} lessons`, true],
      ["master", "master-electrician", "Master 20 · 20 lessons", true],
    ],
  );
  const plumber = core60PathOf("plumber", paths);
  assert.equal(plumber.current, "core");
  assert.deepEqual(plumber.steps.map((s) => s.available), [true, true, false]);
  assert.equal(core60PathOf("master-plumber", paths), null, "a missing stage is not a page");
  assert.equal(core60PathOf("foundation-plumber", paths).current, "foundation");
  assert.equal(showFoundationNudge(plumber, 0), true);
  const masterOnly = core60PathOf("electrician", {
    electrician: { ...paths.electrician, available: { foundation: false, master: true } },
  });
  assert.equal(showFoundationNudge(masterOnly, 0), false, "no nudge towards a Foundation that does not exist");
});

test("pace, gates, labels, exams and content limits key off the stage prefix for derived modules", () => {
  assert.equal(core30PaceFor("foundation-electrician"), CORE30_FOUNDATION_PACE);
  assert.equal(core30PaceFor("master-electrician"), CORE30_MASTER_PACE);
  assert.equal(foundationAccess("foundation-electrician", "core30", { loading: false, signedIn: false }), "sign-in");
  assert.equal(foundationAccess("foundation-electrician", "speak", { loading: false, signedIn: true }), "free");
  assert.equal(foundationAccess("master-electrician", "core30", { loading: false, signedIn: true }), "paid");
  assert.equal(stageLessonLabel("master-electrician", 3), "Master Lesson 3");
  assert.equal(stageLessonShort("foundation-electrician", 2), "Foundation 2");
  assert.equal(hasCore30Checkpoints("foundation-electrician"), false);
  assert.equal(hasCore30Checkpoints("master-electrician"), false);
  assert.equal(contentLimitsFor("master-electrician"), MASTER_CONTENT_LIMITS);
  assert.equal(contentLimitsFor("foundation-electrician"), CONTENT_LIMITS);
});

test("stage files live at <langCode>/<module>.json", () => {
  assert.equal(stageFileRelativePath("Spanish", "foundation-electrician"), "es/foundation-electrician.json");
  assert.equal(stageFileRelativePath("English", "master-or-evs"), "en/master-or-evs.json");
});

test("the registry answers getCurriculum for a registered stage, and nothing else changes", () => {
  assert.equal(stageCurriculumStatus("roofing"), "none");
  assert.equal(stageCurriculumStatus("master-roofing"), "none", "hand-written stages are not data-driven");
  assert.equal(stageCurriculum("electrician"), null);
  const curriculum = stageCurriculumFromFile({ ...roofingStageFile("master"), module: "master-registry-probe" });
  registerStageCurriculum(curriculum);
  assert.equal(getCurriculum("master-registry-probe"), curriculum);
  assert.equal(getCurriculum("roofing"), CURRICULA.roofing);
  assert.equal(getCurriculum("no-such-module"), null);
});
