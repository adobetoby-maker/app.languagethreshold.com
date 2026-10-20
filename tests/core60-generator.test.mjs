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
  FOUNDATION_TOOL,
  OUTLINE_TOOL,
  FOUNDATION_UNITS,
  MASTER_BLOCKS,
  MASTER_GRAMMAR_SPINE,
  bareTermSeries,
  blockErrors,
  blockFromReply,
  blocksToRedo,
  catalogErrors,
  catalogManifestStage,
  classifyCliFailure,
  cliJsonSchema,
  cliPrompt,
  cliSystemPrompt,
  core60PairFor,
  costUsd,
  estimateCost,
  estimateStage,
  foundationCurriculumRequest,
  foundationFromReply,
  masterBlockRequest,
  masterOutlineRequest,
  outlineErrors,
  outlineFromReply,
  parseCliOutput,
  resolveModel,
  stageContentErrors,
  stageContentRequest,
  stageFileErrors,
  stageGeneratorErrors,
  termHead,
  termHeadUsed,
  unattributedSpecs,
} from "../src/lib/core60-generator-core.ts";
import { invisibleCharIssue, validateLessonContent, wordsOf } from "../src/lib/lesson-content-core.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";

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
  // The source must be named in the SAME sentence, as a whole word.
  assert.equal(unattributedSpecs(["La orden dice esto.", "Le doy 5 mg ahora."], ctx("foundation")).length, 1);
  assert.deepEqual(unattributedSpecs(["Según la etiqueta, la dosis es 250 miligramos dos veces al día."], ctx("foundation")), []);
  assert.deepEqual(unattributedSpecs(["Per the label, give 5 mg now."], ctx("foundation")), []);
  assert.equal(unattributedSpecs(["Un circuito de cocina necesita 20 amperios."], ctx("foundation")).length, 1);
  // "per" inside "super", "lee" inside "leer" and "orden" inside "ordenado" are not attributions.
  assert.equal(unattributedSpecs(["El super necesita 20 amperios."], ctx("foundation")).length, 1);
  assert.equal(unattributedSpecs(["Hay que leer: el cable es calibre 12."], ctx("foundation")).length, 1);
  assert.equal(unattributedSpecs(["Todo está ordenado y el cable es calibre 12."], ctx("foundation")).length, 1);
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
  outline.catalog = {
    blurb: getModule("master-roofing").blurb,
    userRole: getModule("master-roofing").userRole,
    challengePrompts: getModule("master-roofing").challengePrompts.slice(0, 6),
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

// ─── T4b: catalog text, invisible characters, word stuffing, block redo, the cli provider ─────

const roofingCatalog = (stage) => {
  const m = getModule(`${stage}-roofing`);
  return { blurb: m.blurb, userRole: m.userRole, challengePrompts: m.challengePrompts.slice(0, stage === "foundation" ? 5 : 6) };
};

test("stage catalog: requested in step 1, parsed, checked and written as manifest overrides", () => {
  const f = foundationCurriculumRequest(ctx("foundation"), "claude-opus-5-5");
  const fSchema = f.tools[0].input_schema;
  assert.ok(fSchema.required.includes("catalog"));
  assert.deepEqual([fSchema.properties.catalog.properties.challengePrompts.minItems, fSchema.properties.catalog.properties.challengePrompts.maxItems], [4, 5]);
  assert.match(f.system, /challengePrompts: 4 to 5 A1 Say it challenges/);
  const o = masterOutlineRequest(ctx("master"), "claude-opus-5-5");
  const oSchema = o.tools[0].input_schema;
  assert.ok(oSchema.required.includes("catalog"));
  assert.deepEqual([oSchema.properties.catalog.properties.challengePrompts.minItems, oSchema.properties.catalog.properties.challengePrompts.maxItems], [4, 6]);
  // Roofing's hand-written stage catalog passes.
  assert.deepEqual(catalogErrors(roofingCatalog("foundation"), ctx("foundation")), []);
  assert.deepEqual(catalogErrors(roofingCatalog("master"), ctx("master")), []);
  const parsed = foundationFromReply({ threshold: "x", catalog: roofingCatalog("foundation"), lessons: [] }, ctx("foundation"));
  assert.deepEqual(parsed.catalog, roofingCatalog("foundation"));
  assert.deepEqual(outlineFromReply({ threshold: "x", lessons: [] }).catalog, { blurb: "", userRole: "", challengePrompts: [] });
  // Copying the Core 30 challenges (the D1 bug), too few, a revealed twist, a wrong blurb.
  const copied = { ...roofingCatalog("master"), challengePrompts: [...roofing.challengePrompts.slice(0, 4)] };
  assert.match(catalogErrors(copied, ctx("master")).join("\n"), /copies a Core 30 challenge/);
  const bad = { blurb: "Lessons.", userRole: "x".repeat(80), challengePrompts: ["Handle the surprise complication on site.", "ask"] };
  const text = catalogErrors(bad, ctx("master")).join("\n");
  assert.match(text, /blurb must start "Twenty advanced lessons/);
  assert.match(text, /userRole is longer than/);
  assert.match(text, /2 challengePrompts; it needs 4 to 6/);
  assert.match(text, /must not mention a complication/);
  assert.match(text, /one English sentence starting with a verb/);
  assert.deepEqual(catalogManifestStage(roofingCatalog("foundation")), roofingCatalog("foundation"));
  assert.deepEqual(catalogManifestStage(undefined), {});
});

test("invisible characters are rejected in stage files and lesson content", () => {
  assert.equal(invisibleCharIssue("Pínchate el dedo."), null);
  assert.equal(invisibleCharIssue("10 pies"), null, "a normal space");
  assert.equal(invisibleCharIssue("10\u00A0pies"), null, "a non-breaking space between a number and a unit is fine");
  for (const bad of ["Píncha\u00ADte", "pa\u200Bnel", "ca\u200Cble", "ca\u200Dble", "\uFEFFHola", "la\u00A0caja", "uno\tdos", "fin\u0007"]) {
    assert.match(invisibleCharIssue(bad) ?? "", /invisible character U\+/, JSON.stringify(bad));
  }
  const file = roofingStageFile("master");
  const broken = clone(file);
  broken.lessons[6].words[0].es = "la cu\u00ADbierta";
  assert.ok(validateStageFile(broken).some((e) => /^lesson 7\.words\[0\]\.es: invisible character U\+00AD/.test(e)));
  assert.deepEqual(validateStageFile(file), []);
  const content = clone(roofingContent("foundation")["1"]);
  content.passage.target[0] = content.passage.target[0].replace(" ", "\u200B ");
  const errors = validateLessonContent(content, {
    language: "Spanish",
    nativeLanguage: "English",
    parts: { passage: true, words: false, verbs: true },
    words: roofingStageFile("foundation").lessons[0].words,
  });
  assert.ok(errors.some((e) => /^passage\.target\[0\]: invisible character U\+200B/.test(e)), errors.join("\n"));
});

test("word stuffing: a bare list of lesson terms is rejected; terms spread over sentences pass", () => {
  const words = ["la protección", "la capacidad", "la cantidad", "el breaker"].map((es) => ({ es, en: es, kind: "term" }));
  const stuffed = "Marta revisa la protección, la capacidad y la cantidad.";
  // One list of exactly three terms per passage is allowed (people do name three things at once).
  assert.deepEqual(bareTermSeries([stuffed], words, "Spanish"), []);
  assert.equal(bareTermSeries([stuffed, "Luis anota la capacidad, la cantidad y el breaker."], words, "Spanish").length, 1);
  assert.equal(bareTermSeries(["Revisa la protección, la capacidad, la cantidad y el breaker."], words, "Spanish").length, 1);
  assert.deepEqual(
    bareTermSeries(
      [
        "Marta revisa la protección del panel antes de abrir la caja.",
        "Luis calcula la capacidad del circuito con el cliente en la cocina.",
        "Hoy pedimos la cantidad exacta de cable y un breaker nuevo para el garaje.",
      ],
      words,
      "Spanish",
    ),
    [],
  );
  const c = stageContentRequest(ctx("foundation"), "claude-opus-5-5", roofingStageFile("foundation").lessons[0], {});
  assert.match(c.system, /Never pack three or more terms into a bare list/);
});

test("a failing stage-wide check redoes the named blocks; a redone block is checked against later blocks", () => {
  assert.deepEqual(blocksToRedo(["lesson 14 (x): term \"y\" is already a term of lesson 3; use a different term"]), ["D"]);
  assert.deepEqual(blocksToRedo(["lesson 2: a", "lesson 19: b"]), ["A", "E"]);
  assert.deepEqual(blocksToRedo(["threshold must start \"By Lesson 20, you can \""]), ["E"]);
  const file = roofingStageFile("master");
  const blockB = file.lessons.slice(4, 8);
  const others = [...file.lessons.slice(0, 4), ...file.lessons.slice(8)];
  assert.deepEqual(blockErrors(blockB, others, ctx("master"), file.threshold), []);
  // Redoing block B with a term that a LATER lesson (9) already uses: reported on lesson 5.
  const redo = clone(blockB);
  redo[0].words[0] = { ...file.lessons[8].words.find((w) => w.kind === "term") };
  const text = blockErrors(redo, others, ctx("master"), file.threshold).join("\n");
  assert.match(text, /^lesson 5: clashes with a later lesson \(lesson 9 .*\); change lesson 5/m);
});

test("cli provider: same prompt content, structured output instead of a tool, counts left to our checks", () => {
  assert.equal(resolveModel(undefined, "cli"), "claude-opus-5-5", "the subscription build defaults to Opus");
  assert.equal(resolveModel("sonnet", "cli"), "claude-sonnet-5-5");
  assert.equal(resolveModel(undefined, "api"), "claude-sonnet-5-5");
  const file = roofingStageFile("master");
  const outline = { threshold: file.threshold, lessons: file.lessons.map((l) => ({ n: l.n, title: l.title, objective: l.objective, grammarFocus: l.grammar.focus, lessonType: l.lessonType, block: l.block, scene: "s", safetySensitive: false })) };
  const requests = [
    [foundationCurriculumRequest(ctx("foundation"), "m"), FOUNDATION_TOOL],
    [masterOutlineRequest(ctx("master"), "m"), OUTLINE_TOOL],
    [masterBlockRequest(ctx("master"), "m", outline, MASTER_BLOCKS[0], []), BLOCK_TOOL],
    [stageContentRequest(ctx("master"), "m", file.lessons[0], { scene: "s" }), CONTENT_TOOL],
  ];
  for (const [request, tool] of requests) {
    const system = cliSystemPrompt(request.system, tool);
    assert.ok(!system.includes(tool), `${tool}: the tool is not named`);
    assert.match(system, /ONE JSON object that matches the given JSON schema/);
    assert.equal(system.length - request.system.length < 120, true, "only the delivery sentence changes");
    const schema = JSON.stringify(cliJsonSchema(request.tools[0].input_schema));
    assert.ok(!/minItems|maxItems/.test(schema));
    assert.ok(schema.includes('"required"'));
    assert.equal(cliPrompt(request), request.messages[0].content);
  }
  const retry = cliPrompt(requests[0][0], { reply: { lessons: [] }, errors: ["lesson 1: 3 terms, needs 8-12"] });
  assert.match(retry, /YOUR PREVIOUS ANSWER \(rejected\):\n\{"lessons":\[\]\}/);
  assert.match(retry, /- lesson 1: 3 terms, needs 8-12$/);
});

test("cli provider: parses the CLI's JSON result, its usage, and classifies limits and login failures", () => {
  const ok = parseCliOutput(
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "{}",
      structured_output: { lessons: [1] },
      total_cost_usd: 0.42,
      num_turns: 2,
      duration_ms: 61000,
      usage: { input_tokens: 10, cache_creation_input_tokens: 5000, cache_read_input_tokens: 300, output_tokens: 9000 },
      modelUsage: { "claude-opus-5-5": {} },
    }),
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, { lessons: [1] });
  assert.deepEqual(ok.usage, { inputTokens: 10, cacheCreationInputTokens: 5000, cacheReadInputTokens: 300, outputTokens: 9000, costUsd: 0.42, numTurns: 2, durationMs: 61000, model: "claude-opus-5-5" });
  const fenced = parseCliOutput(JSON.stringify({ subtype: "success", is_error: false, result: "Here:\n```json\n{\"a\": 1}\n```" }));
  assert.deepEqual(fenced.value, { a: 1 });
  const limit = parseCliOutput(JSON.stringify({ subtype: "success", is_error: true, result: "Claude AI usage limit reached|1760000000" }));
  assert.equal(limit.kind, "rate_limit");
  assert.equal(limit.resetAt, 1_760_000_000_000);
  assert.equal(parseCliOutput(JSON.stringify({ subtype: "success", is_error: false, result: "You've hit your limit · resets 4pm" })).kind, "rate_limit");
  assert.equal(parseCliOutput(JSON.stringify({ subtype: "error_during_execution", is_error: true, api_error_status: 529, result: "Overloaded" })).kind, "rate_limit");
  assert.equal(parseCliOutput("", "Invalid API key · Please run /login", 1).kind, "auth");
  assert.equal(parseCliOutput("", "spawn claude ENOENT", null).kind, "other");
  assert.equal(classifyCliFailure("API Error: 429 rate_limit_error"), "rate_limit");
  assert.equal(classifyCliFailure("OAuth token has expired"), "auth");
});
