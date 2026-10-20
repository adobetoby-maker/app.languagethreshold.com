// Built by TAC — 2026-10-20
// The Core 60 stage generator's pure core (src/lib/core60-generator-core.ts): its checks accept the
// hand-written Roofing Foundation and Master 20 (the reference), reject what the generator must
// never ship (repeated terms, Core 30 titles, a revealed complication, unattributed doses, terms
// missing from a passage), its requests carry the stage's limits, and the pair / price rules hold.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CURRICULA, getCurriculum } from "../src/data/curriculum.ts";
import { getModule } from "../src/data/modules.ts";
import { FOUNDATION_ROOFING_FOCUS } from "../src/data/foundation-roofing-curriculum.ts";
import {
  BLOCK_TOOL,
  CONTENT_TOOL,
  FOUNDATION_UNITS,
  MASTER_BLOCKS,
  MASTER_GRAMMAR_SPINE,
  blockErrors,
  blockFromReply,
  core60PairFor,
  costUsd,
  estimateCost,
  estimateStage,
  foundationCurriculumRequest,
  foundationFromReply,
  masterBlockRequest,
  masterOutlineRequest,
  outlineErrors,
  resolveModel,
  stageContentErrors,
  stageContentRequest,
  stageFileErrors,
  stageGeneratorErrors,
  termHead,
  termHeadUsed,
  unattributedSpecs,
} from "../src/lib/core60-generator-core.ts";
import { wordsOf } from "../src/lib/lesson-content-core.ts";

const clone = (value) => JSON.parse(JSON.stringify(value));

const roofing = getModule("roofing");
const core30 = {
  titles: getCurriculum("roofing").lessons.map((l) => l.title),
  objectives: getCurriculum("roofing").lessons.map((l) => l.objective),
  terms: ["teja", "clavo"],
};
const ctx = (stage) => ({ module: roofing, stage, pair: { language: "Spanish", nativeLanguage: "English" }, core30 });

/** Roofing's hand-written stage in the stage file format (as tests/core60-stage-data.test.mjs). */
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
      ...(stage === "master" ? { grammar: lesson.grammar, lessonType: lesson.lessonType, block: lesson.block } : {}),
    })),
  };
}

const roofingContent = (stage) =>
  JSON.parse(readFileSync(`public/lesson-content/es/${stage}-roofing.json`, "utf8")).lessons;

test("the Roofing Foundation and Master 20 pass every generator stage check", () => {
  for (const stage of ["foundation", "master"]) {
    const file = roofingStageFile(stage);
    // Roofing's Core 30 titles are not repeated by its Master.
    assert.deepEqual(stageFileErrors(file, ctx(stage)), [], `${stage}-roofing`);
  }
});

test("the Roofing passages pass the strict content checks (every term's head word, attributed specs)", () => {
  for (const stage of ["foundation", "master"]) {
    const file = roofingStageFile(stage);
    const content = roofingContent(stage);
    for (const lesson of file.lessons) {
      assert.deepEqual(stageContentErrors(content[String(lesson.n)], lesson, ctx(stage)), [], `${stage} lesson ${lesson.n}`);
    }
  }
});

test("Foundation titles are the fixed F1-F10 units; Master blocks are fixed A-E with Lesson 20 the Capstone", () => {
  assert.deepEqual(
    FOUNDATION_UNITS.Spanish.map((u) => u.title),
    CURRICULA["foundation-roofing"].lessons.map((l) => l.title),
  );
  assert.equal(FOUNDATION_UNITS.English.length, 10);
  assert.deepEqual(MASTER_BLOCKS.flatMap((b) => b.lessons), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(
    MASTER_BLOCKS.flatMap((b) => b.lessons.map(() => b.block)),
    CURRICULA["master-roofing"].lessons.map((l) => l.block),
  );
  assert.equal(MASTER_GRAMMAR_SPINE.Spanish.length, 20);
  assert.equal(MASTER_GRAMMAR_SPINE.English.length, 20);
  assert.equal(new Set(MASTER_GRAMMAR_SPINE.Spanish).size, 20);
});

test("stage checks catch repeated terms and phrases, Core 30 titles and a revealed complication", () => {
  const file = roofingStageFile("master");
  const bad = clone(file);
  bad.lessons[5].words[0] = { ...file.lessons[0].words[1] };
  bad.lessons[6].words.push({ ...file.lessons[1].words.find((w) => w.kind === "phrase") });
  bad.lessons[2].title = core30.titles[4];
  bad.lessons[3].speaking = "Explain the sheet; partway through, a surprise complication appears.";
  bad.lessons[7].lessonType = "Capstone";
  bad.lessons[8].block = "A";
  bad.lessons[9].grammar.focus = file.lessons[0].grammar.focus;
  const text = stageGeneratorErrors(bad.lessons, ctx("master")).join("\n");
  assert.match(text, /lesson 6 .*term "la cubierta" is already a term of lesson 1/);
  assert.match(text, /lesson 7 .*phrase .* is already a phrase of lesson 2/);
  assert.match(text, /lesson 3 .*repeats a Core 30 lesson title/);
  assert.match(text, /lesson 4 .*speaking brief must not mention a complication/);
  assert.match(text, /lesson 8 .*only Lesson 20 is a Capstone/);
  assert.match(text, /lesson 9 .*block must be "C"/);
  assert.match(text, /lesson 10 .*same grammar focus as lesson 1/);
});

test("the same target with a different meaning is not a duplicate term (mañana / la mañana)", () => {
  const file = roofingStageFile("foundation");
  assert.ok(file.lessons[4].words.some((w) => w.es === "mañana"));
  assert.ok(file.lessons[5].words.some((w) => w.es === "la mañana"));
  assert.deepEqual(stageGeneratorErrors(file.lessons, ctx("foundation")), []);
});

test("word checks: inverted marks, digits, note language and attributed doses", () => {
  const file = roofingStageFile("foundation");
  const bad = clone(file);
  bad.lessons[0].words[8] = { es: "Cómo estás?", en: "How are you?", kind: "phrase" };
  bad.lessons[1].words[0] = { es: "el número 5", en: "the number five", kind: "term" };
  bad.lessons[2].words[0] = { es: "listo", en: "ready", kind: "term", note: "se usa con estar para la condición" };
  bad.lessons[3].words[8] = { es: "Le doy 5 mg ahora.", en: "I give you 5 mg now.", kind: "phrase" };
  const text = stageGeneratorErrors(bad.lessons, ctx("foundation")).join("\n");
  assert.match(text, /missing ¿/);
  assert.match(text, /numbers differ/);
  assert.match(text, /note must be written in English/);
  assert.match(text, /states a dose or specification as a universal fact/);
  assert.deepEqual(unattributedSpecs(["Según la orden del médico, le doy 5 mg ahora."], ctx("foundation")), []);
  assert.deepEqual(unattributedSpecs(["La orden dice esto.", "Le doy 5 mg ahora."], ctx("foundation")), []);
  assert.equal(unattributedSpecs(["Un circuito de cocina necesita 20 amperios."], ctx("foundation")).length, 1);
});

test("head words: Spanish leads, English ends; a term missing from the passage is reported", () => {
  assert.equal(termHead("la pistola de clavos", "Spanish"), "pistola");
  assert.equal(termHead("the nail gun", "English"), "gun");
  assert.equal(termHead("the bottle of water", "English"), "bottle");
  assert.ok(termHeadUsed("el clavo", wordsOf("Saca los clavos."), "Spanish"));
  assert.ok(termHeadUsed("listo", wordsOf("La cuadrilla está lista."), "Spanish"));
  assert.ok(termHeadUsed("escalonar", wordsOf("Escalonamos las juntas."), "Spanish"));
  assert.ok(!termHeadUsed("la cubierta", wordsOf("El techo cubre la casa."), "Spanish"));
  const file = roofingStageFile("master");
  const content = clone(roofingContent("master")["1"]);
  content.passage.target = content.passage.target.map((s) => s.replaceAll("cumbrera", "parte alta"));
  const errors = stageContentErrors(content, file.lessons[0], ctx("master")).join("\n");
  assert.match(errors, /these terms do not appear in the passage .*la cumbrera/);
});

test("a Master block is checked against the lessons written before it", () => {
  const file = roofingStageFile("master");
  const outline = {
    threshold: file.threshold,
    lessons: file.lessons.map((l) => ({
      n: l.n,
      title: l.title,
      objective: l.objective,
      grammarFocus: l.grammar.focus,
      lessonType: l.lessonType,
      block: l.block,
      scene: "scene",
      safetySensitive: false,
    })),
  };
  assert.deepEqual(outlineErrors(outline, ctx("master")), []);
  const blockB = MASTER_BLOCKS[1];
  const reply = {
    lessons: file.lessons.slice(4, 8).map((l) => ({
      n: l.n,
      terms: l.words.filter((w) => w.kind === "term").map((w) => ({ target: w.es, native: w.en, note: w.note })),
      phrases: l.words.filter((w) => w.kind === "phrase").map((w) => ({ target: w.es, native: w.en, note: w.note })),
      grammarExamples: l.grammar.examples.map((e) => ({ target: e.es, native: e.en })),
      speaking: l.speaking,
    })),
  };
  const lessons = blockFromReply(reply, outline, blockB);
  assert.deepEqual(lessons.map((l) => l.title), file.lessons.slice(4, 8).map((l) => l.title));
  assert.deepEqual(blockErrors(lessons, file.lessons.slice(0, 4), ctx("master"), file.threshold), []);
  // A block repeating a term of block A fails, naming the earlier lesson.
  reply.lessons[0].terms[0] = { target: "la cubierta", native: "the roof deck" };
  const repeated = blockFromReply(reply, outline, blockB);
  assert.match(blockErrors(repeated, file.lessons.slice(0, 4), ctx("master"), file.threshold).join("\n"), /already a term of lesson 1/);
});

test("requests: tool_choice auto, the stage's limits in the schemas, and Foundation titles fixed", () => {
  const f = foundationCurriculumRequest(ctx("foundation"), "claude-sonnet-5-5");
  assert.deepEqual(f.tool_choice, { type: "auto" });
  const fl = f.tools[0].input_schema.properties.lessons.items.properties;
  assert.deepEqual([fl.terms.minItems, fl.terms.maxItems, fl.phrases.minItems, fl.phrases.maxItems], [8, 12, 4, 6]);
  assert.match(f.messages[0].content, /Ser and Estar/);
  const o = masterOutlineRequest(ctx("master"), "claude-opus-5-5");
  assert.equal(o.model, "claude-opus-5-5");
  assert.match(o.system, /Lesson 20 is the Capstone/);
  const file = roofingStageFile("master");
  const outline = { threshold: file.threshold, lessons: file.lessons.map((l) => ({ n: l.n, title: l.title, objective: l.objective, grammarFocus: l.grammar.focus, lessonType: l.lessonType, block: l.block, scene: "s", safetySensitive: false })) };
  const b = masterBlockRequest(ctx("master"), "claude-sonnet-5-5", outline, MASTER_BLOCKS[0], []);
  assert.equal(b.tools[0].name, BLOCK_TOOL);
  const bl = b.tools[0].input_schema.properties.lessons.items.properties;
  assert.deepEqual([bl.terms.minItems, bl.terms.maxItems, bl.phrases.minItems, bl.phrases.maxItems], [12, 16, 6, 8]);
  assert.match(b.system, /Never reveal or hint at a problem/);
  const c = stageContentRequest(ctx("master"), "claude-sonnet-5-5", file.lessons[0], { scene: "s" });
  assert.equal(c.tools[0].name, CONTENT_TOOL);
  const passage = c.tools[0].input_schema.properties.passage.properties.target;
  assert.deepEqual([passage.minItems, passage.maxItems], [12, 18]);
  assert.deepEqual([c.tools[0].input_schema.properties.verbs.minItems, c.tools[0].input_schema.properties.verbs.maxItems], [5, 5]);
  const parsed = foundationFromReply({ threshold: "x", lessons: [] }, ctx("foundation"));
  assert.deepEqual(parsed.lessons.map((l) => l.title), FOUNDATION_UNITS.Spanish.map((u) => u.title));
});

test("pairs, models and prices", () => {
  assert.deepEqual(core60PairFor(getModule("electrician"), true), { language: "Spanish", nativeLanguage: "English" });
  assert.deepEqual(core60PairFor(getModule("or-evs"), false), { language: "English", nativeLanguage: "Spanish" });
  assert.equal(core60PairFor({ ...getModule("electrician") }, false), null);
  assert.equal(resolveModel(undefined), "claude-sonnet-5-5");
  assert.equal(resolveModel("opus"), "claude-opus-5-5");
  assert.equal(costUsd("claude-sonnet-5-5", 1_000_000, 1_000_000), 12);
  assert.equal(costUsd("claude-opus-5-5", 1_000_000, 1_000_000), 24);
  assert.equal(costUsd("unknown", 1, 1), null);
  const master = estimateStage("master");
  assert.equal(master.calls, 36);
  // The pilot's measured Sonnet cost per Master stage is about $2.4; Opus about $4.4.
  assert.ok(Math.abs(estimateCost("claude-sonnet-5-5", master) - 2.4) < 0.1);
  assert.ok(Math.abs(estimateCost("claude-opus-5-5", master) - 4.4) < 0.1);
  assert.ok(estimateStage("master", 20, true).inputTokens < master.inputTokens);
});
