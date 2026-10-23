import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONJUGATION_LEVEL_AXES,
  CONJUGATION_REVIEW_SYSTEM,
  checkConjugationQuestion,
  conjugationCefr,
  conjugationReviewAccepts,
  conjugationReviewInput,
  pickConjugationAxis,
} from "../src/lib/conjugation-core.ts";
import {
  checkSentenceBuildItem,
  checkSentenceBuildQuestion,
  scrambleSentenceTokens,
  sentenceBuildCefr,
  sentenceBuildTokenRange,
} from "../src/lib/sentence-build-core.ts";
import {
  TRADE_PACK_MODULE_RULES,
  conceptProblems,
  specProblems,
  validateConjugationSection,
  validateSentenceBuildSection,
  wordMatchConceptProblems,
} from "../src/lib/trade-pack-rules-core.ts";
import {
  CONJUGATION_PACK_RULES,
  SENTENCE_BUILD_PACK_RULES,
  loadTradePack,
  packConjugationFor,
  packSentenceFor,
  parseTradePack,
  pickPackConjugation,
  pickPackSentence,
  resetTradePacksForTests,
  tradePackPath,
  validateWordMatchSection,
} from "../src/lib/trade-packs.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FILLER = ["va", "aquí", "hoy", "bien", "ahora", "también", "luego", "después", "otra", "vez", "sin", "duda"];

/** A valid stored Sentence Builder question for a level; `tag` makes it unique. */
function sentence(level, tag, overrides = {}) {
  const { min } = sentenceBuildTokenRange(level);
  const tokens = [`Frase${tag}`, ...FILLER.slice(0, min - 1)];
  tokens[tokens.length - 1] += ".";
  return {
    level,
    targetSentence: tokens.join(" "),
    englishTranslation: `Sentence ${tag} goes here.`,
    tokens,
    topic: "crew talk",
    cefr: sentenceBuildCefr(level),
    explanation: "Synthetic explanation.",
    ...overrides,
  };
}

/** A valid stored Conjugation question; `tag` makes it unique. */
function question(level, axis, tag, overrides = {}) {
  return {
    level,
    phrase: `Hoy ___ ${tag} aquí.`,
    phraseTranslation: `Today we [verb] ${tag} here.`,
    infinitive: "revisar",
    infinitiveTranslation: "to check",
    correctConjugation: `revisamos${tag}`,
    wrongOptions: [`reviso${tag}`, `revisan${tag}`, `revisas${tag}`],
    explanation: "Nosotros is the subject.",
    axisTested: axis,
    cefr: conjugationCefr(level),
    ...overrides,
  };
}

function packFile(sections) {
  return { version: 1, module: "roofing", language: "Spanish", nativeLanguage: "English", reviewed: false, ...sections };
}

async function withFetch(handler, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
  resetTradePacksForTests();
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
    resetTradePacksForTests();
  }
}
const json = (value) => new Response(JSON.stringify(value), { status: 200 });

// ─── Shared validators: Sentence Builder ─────────────────────────────────────

const LIVE = {
  targetSentence: "Yo trabajo en casa.",
  englishTranslation: "I work at home.",
  tokens: ["Yo", "trabajo", "en", "casa."],
  scrambled: ["en", "casa.", "trabajo", "Yo"],
  topic: "work",
  cefr: "A2",
  explanation: "Subject first.",
};

test("sentence builder: levels set the token range and the CEFR label", () => {
  assert.deepEqual(sentenceBuildTokenRange(1), { min: 4, max: 6 });
  assert.deepEqual(sentenceBuildTokenRange(2), { min: 6, max: 9 });
  assert.deepEqual(sentenceBuildTokenRange(3), { min: 9, max: 13 });
  assert.deepEqual([1, 2, 3].map(sentenceBuildCefr), ["A2", "B1", "B2"]);
});

test("sentence builder: the live checks keep their order and their messages", () => {
  assert.equal(checkSentenceBuildQuestion(LIVE, 1, "Spanish").ok, true);
  const fail = (patch, level = 1) => checkSentenceBuildQuestion({ ...LIVE, ...patch }, level, "Spanish");
  assert.equal(fail({ cefr: "B1" }).error, "Sentence content came back incomplete.");
  assert.equal(fail({}, 2).error, "Sentence content came back incomplete.", "4 tokens is not a level 2 sentence");
  assert.equal(fail({ targetSentence: "Different." }).error, "Sentence tokens do not match the question.");
  assert.equal(
    fail({ tokens: ["casa", "casa", "casa", "casa"], targetSentence: "casa casa casa casa", scrambled: ["casa", "casa", "casa", "casa"] }).error,
    "Sentence tokens do not match the question.",
    "at least two different tokens",
  );
  assert.equal(fail({ scrambled: ["en", "casa.", "trabajo", "Yo", "Yo"] }).error, "Token/scrambled mismatch.");
  assert.equal(fail({ scrambled: ["en", "casa.", "trabajo", "Tú"] }).error, "Scrambled is not a permutation of tokens.");
  // a scrambled order equal to the answer is reshuffled, never returned as is
  for (let i = 0; i < 20; i++) {
    const same = checkSentenceBuildQuestion({ ...LIVE, scrambled: [...LIVE.tokens] }, 1, "Spanish");
    assert.equal(same.ok, true);
    assert.notDeepEqual(same.question.scrambled, LIVE.tokens);
    assert.deepEqual([...same.question.scrambled].sort(), [...LIVE.tokens].sort());
  }
  // whitespace and Japanese joining, as before
  assert.equal(
    checkSentenceBuildQuestion({ ...LIVE, targetSentence: " Yo  trabajo en casa. " }, 1, "Spanish").ok,
    true,
  );
  const ja = { ...LIVE, targetSentence: "私は学生です", tokens: ["私は", "学生", "で", "す"], scrambled: ["学生", "私は", "す", "で"] };
  assert.equal(checkSentenceBuildQuestion(ja, 1, "Japanese").ok, true);
});

test("sentence builder: a stored question is checked by the same rules, without a scrambled order", () => {
  const { scrambled: _s, ...stored } = LIVE;
  assert.equal(checkSentenceBuildItem(stored, 1, "Spanish").ok, true);
  assert.equal(checkSentenceBuildItem({ ...stored, targetSentence: "Otra." }, 1, "Spanish").ok, false);
  assert.match(checkSentenceBuildItem({ ...stored, cefr: "B2" }, 1, "Spanish").error, /incomplete/);
});

test("sentence builder: scrambleSentenceTokens never returns the correct order", () => {
  const tokens = ["Revisen", "la", "escalera."];
  for (let i = 0; i < 50; i++) {
    const out = scrambleSentenceTokens(tokens);
    assert.notDeepEqual(out, tokens);
    assert.deepEqual([...out].sort(), [...tokens].sort());
  }
  // the identity shuffle (random always ~1) is fixed by a swap
  assert.notDeepEqual(scrambleSentenceTokens(tokens, () => 0.999), tokens);
});

// ─── Shared validators: Conjugation ──────────────────────────────────────────

test("conjugation: the axes per level and the CEFR label are the live game's", () => {
  assert.deepEqual(CONJUGATION_LEVEL_AXES, { 1: ["tense", "person", "number"], 2: ["tense", "person", "mood"], 3: ["mixed"] });
  assert.deepEqual([1, 2, 3].map(conjugationCefr), ["A2", "B1", "B2"]);
  assert.equal(pickConjugationAxis(3), "mixed");
  assert.equal(pickConjugationAxis(1, () => 0), "tense");
  assert.equal(pickConjugationAxis(1, () => 0.999), "number");
  assert.equal(pickConjugationAxis(2, () => 0.999), "mood");
});

test("conjugation: the structural check and the requested-practice check keep their messages", () => {
  const q = question(1, "person", "a");
  assert.equal(checkConjugationQuestion(q, { cefr: "A2", axis: "person" }).ok, true);
  const bad = checkConjugationQuestion({ ...q, phrase: "Sin hueco." }, { cefr: "A2", axis: "person" });
  assert.deepEqual([bad.reason, bad.error], ["invalid", "The generated question could not be validated. Please try again."]);
  const other = checkConjugationQuestion(q, { cefr: "A2", axis: "tense" });
  assert.deepEqual(
    [other.reason, other.error],
    ["mismatch", "The generated question did not match the requested practice. Please try again."],
  );
  assert.equal(checkConjugationQuestion(q, { cefr: "B1", axis: "person" }).reason, "mismatch");
});

test("conjugation: the review gate sees sorted options and accepts only the single designated answer", () => {
  const q = question(2, "mood", "b");
  const input = conjugationReviewInput(q, { language: "Spanish", level: 2, cefr: "B1", axis: "mood" });
  assert.deepEqual(Object.keys(input), [
    "language", "level", "requestedCefr", "requestedAxis", "phrase", "translation", "infinitive", "options", "explanation", "statedAxis",
  ]);
  assert.deepEqual(input.options, [...input.options].sort());
  assert.equal(input.options.length, 4);
  assert.match(CONJUGATION_REVIEW_SYSTEM, /Do not assume the author's answer/);
  const verdict = { acceptableAnswers: [q.correctConjugation], unambiguous: true, explanationAccurate: true, axisAccurate: true, levelAppropriate: true };
  assert.equal(conjugationReviewAccepts(verdict, q.correctConjugation), true);
  assert.equal(conjugationReviewAccepts({ ...verdict, acceptableAnswers: [q.correctConjugation, q.wrongOptions[0]] }, q.correctConjugation), false);
  assert.equal(conjugationReviewAccepts({ ...verdict, levelAppropriate: false }, q.correctConjugation), false);
});

test("the server functions use the shared rules instead of inline copies", () => {
  const sb = read("src/fns/sentence-build.functions.ts");
  assert.match(sb, /checkSentenceBuildQuestion\(toolUse\.input, data\.level, data\.language\)/);
  assert.doesNotMatch(sb, /Scrambled is not a permutation/);
  const conj = read("src/fns/conjugation.functions.ts");
  assert.match(conj, /checkConjugationQuestion\(toolUse\.input, \{ cefr, axis \}\)/);
  assert.match(conj, /system: CONJUGATION_REVIEW_SYSTEM/);
  assert.match(conj, /conjugationReviewAccepts\(reviewTool\.input, q\.correctConjugation\)/);
  assert.doesNotMatch(conj, /function pickAxis/);
});

// ─── Parser leniency ─────────────────────────────────────────────────────────

test("the parser keeps valid questions, drops broken ones, and a pack with only one area is usable", () => {
  const raw = packFile({
    sentenceBuild: {
      items: [
        sentence(1, "ok"),
        sentence(1, "bad", { targetSentence: "No coincide." }),
        { ...sentence(1, "short"), level: 2, cefr: "B1" }, // too short for level 2
        { ...sentence(3, "nolevel"), level: 7 },
        "nope",
      ],
    },
    conjugation: {
      items: [
        question(1, "tense", "ok"),
        question(1, "mood", "axis"), // mood is not a level 1 axis
        question(3, "tense", "notmixed"),
        question(3, "mixed", "mix"),
        question(2, "person", "cefr", { cefr: "A2" }),
        question(2, "person", "blank", { phrase: "Sin hueco." }),
      ],
    },
  });
  const file = parseTradePack(raw, { moduleId: "roofing", language: "Spanish" });
  assert.equal(file.wordMatch, undefined);
  assert.deepEqual(file.sentenceBuild.items.map((i) => i.targetSentence), [sentence(1, "ok").targetSentence]);
  assert.deepEqual(file.conjugation.items.map((i) => `${i.level}:${i.axisTested}`), ["1:tense", "3:mixed"]);
  assert.equal(parseTradePack(packFile({ sentenceBuild: { items: [] }, conjugation: { items: "x" } }), { moduleId: "roofing", language: "Spanish" }), null);
});

// ─── Pickers ─────────────────────────────────────────────────────────────────

const PACK = packFile({
  sentenceBuild: { items: [sentence(1, "uno"), sentence(1, "dos"), sentence(1, "tres"), sentence(2, "cuatro"), sentence(3, "cinco")] },
  conjugation: {
    items: [
      question(1, "tense", "t1", { infinitive: "revisar" }),
      question(1, "tense", "t2", { infinitive: "medir" }),
      question(1, "person", "p1", { infinitive: "cortar" }),
      question(1, "number", "n1", { infinitive: "subir" }),
      question(2, "mood", "m1", { infinitive: "sellar" }),
      question(3, "mixed", "x1", { infinitive: "instalar" }),
    ],
  },
});

test("pickPackSentence: level, avoid by the first 30 characters, a fresh scrambled order, null when used up", async () => {
  await withFetch(() => json(PACK), async () => {
    await loadTradePack("roofing", "Spanish");
    const pick = (avoid, level = 1, random) => pickPackSentence({ moduleId: "roofing", language: "Spanish", level, avoid, random });
    for (let i = 0; i < 20; i++) {
      const q = pick([]);
      assert.equal(q.cefr, "A2");
      assert.notDeepEqual(q.scrambled, q.tokens);
      assert.deepEqual([...q.scrambled].sort(), [...q.tokens].sort());
    }
    const opening = (tag) => sentence(1, tag).targetSentence.slice(0, 30);
    assert.equal(pick([opening("uno"), opening("dos")]).targetSentence, sentence(1, "tres").targetSentence);
    assert.equal(pick([opening("uno"), opening("dos"), opening("tres")]), null);
    assert.equal(pick([], 2).targetSentence, sentence(2, "cuatro").targetSentence);
    assert.equal(pick([], 1, () => 0).targetSentence, sentence(1, "uno").targetSentence);
    // a copy: changing it does not change the pack
    const first = pick([], 3);
    first.tokens.push("x");
    assert.equal(pick([], 3).tokens.includes("x"), false);
    assert.equal(pickPackSentence({ moduleId: "roofing", language: "Spanish", level: 1, nativeLanguage: "French" }), null);
    assert.equal(pickPackSentence({ moduleId: null, language: "Spanish", level: 1 }), null);
  });
});

test("pickPackConjugation: avoids used infinitives and picks the axis among those still available", async () => {
  await withFetch(() => json(PACK), async () => {
    await loadTradePack("roofing", "Spanish");
    const pick = (avoid, level = 1, random) => pickPackConjugation({ moduleId: "roofing", language: "Spanish", level, avoid, random });
    // random 0 -> first axis (tense), random ~1 -> last axis (number)
    assert.equal(pick([], 1, () => 0).axisTested, "tense");
    assert.equal(pick([], 1, () => 0.999).axisTested, "number");
    const seen = new Set();
    for (let i = 0; i < 60; i++) seen.add(pick([]).axisTested);
    assert.deepEqual([...seen].sort(), ["number", "person", "tense"]);
    // with tense verbs used up, the axis comes from person or number only
    for (let i = 0; i < 30; i++) assert.notEqual(pick(["Revisar", "medir"]).axisTested, "tense");
    assert.equal(pick(["revisar", "medir", "cortar"]).axisTested, "number");
    assert.equal(pick(["revisar", "medir", "cortar", "subir"]), null);
    // level 2 has only mood questions in this pack; level 3 is always mixed
    assert.equal(pick([], 2).axisTested, "mood");
    const mixed = pick([], 3);
    assert.equal(mixed.axisTested, "mixed");
    assert.equal("level" in mixed, false);
    mixed.wrongOptions.push("x");
    assert.equal(pick([], 3).wrongOptions.length, 3, "a copy");
  });
});

test("packSentenceFor / packConjugationFor wait for the pack, and skip another pairing", async () => {
  await withFetch(() => json(PACK), async (calls) => {
    const [s, c] = await Promise.all([
      packSentenceFor({ moduleId: "roofing", language: "Spanish", nativeLanguage: "English", level: 2 }),
      packConjugationFor({ moduleId: "roofing", language: "Spanish", nativeLanguage: "English", level: 3 }),
    ]);
    assert.equal(s.targetSentence, sentence(2, "cuatro").targetSentence);
    assert.equal(c.axisTested, "mixed");
    assert.equal(calls.length, 1, "one request for both");
    assert.equal(await packSentenceFor({ moduleId: "roofing", language: "Spanish", nativeLanguage: "French", level: 1 }), null);
  });
  await withFetch(() => new Response("", { status: 404 }), async () => {
    assert.equal(await packConjugationFor({ moduleId: "gutters", language: "Spanish", level: 1 }), null);
  });
});

// ─── Module rules ────────────────────────────────────────────────────────────

test("one word per concept: gutters", () => {
  const ok = (english, spanish) => assert.deepEqual(conceptProblems("gutters", english, spanish), [], `${spanish} = ${english}`);
  const bad = (english, spanish) => assert.notDeepEqual(conceptProblems("gutters", english, spanish), [], `${spanish} = ${english}`);
  ok("gutter", "canaleta");
  ok("seamless gutters", "canaletas sin costura");
  bad("gutter", "canalón");
  ok("downspout", "bajante");
  bad("downspout", "tubo");
  ok("hanger", "gancho");
  ok("end cap", "tapa");
  ok("miter", "inglete");
  ok("scupper", "gárgola");
  bad("scupper", "rebosadero");
  ok("overflow scupper", "rebosadero");
  bad("overflow scupper", "gárgola de desborde");
  ok("outlet", "desagüe");
  bad("outlet", "salida");
  ok("Test every outlet with water.", "Prueben con agua cada desagüe.");
  bad("Test every outlet with water.", "Prueben con agua cada salida.");
  ok("electrical outlet", "tomacorriente");
  bad("ridge", "canal"); // banned whatever the English
  bad("clear the drain", "limpien la gárgola"); // gárgola only ever names a scupper
});

test("one word per concept: siding", () => {
  const ok = (english, spanish) => assert.deepEqual(conceptProblems("siding", english, spanish), [], `${spanish} = ${english}`);
  const bad = (english, spanish) => assert.notDeepEqual(conceptProblems("siding", english, spanish), [], `${spanish} = ${english}`);
  ok("vinyl siding", "revestimiento de vinilo");
  bad("siding", "forro");
  ok("fiber cement", "fibrocemento");
  ok("house wrap", "barrera");
  bad("house wrap", "envoltura");
  bad("house wrap", "barrera de humedad");
  ok("J-channel", "canal J");
  bad("J-channel", "moldura J");
  ok("starter strip", "tira de arranque");
  ok("soffit", "sofito");
  bad("soffit", "plafón");
  ok("fascia", "fascia");
  bad("Is there moisture behind the siding?", "¿Hay humedad detrás del siding?");
});

test("one word per concept: roofing keeps the P1 decisions", () => {
  assert.deepEqual(conceptProblems("roofing", "ridge vent", "ventilación de cumbrera"), []);
  assert.notDeepEqual(conceptProblems("roofing", "ridge vent", "ventilación de caballete"), []);
  assert.notDeepEqual(conceptProblems("roofing", "Sweep the deck.", "Barran la cubierta."), []);
  assert.deepEqual(conceptProblems("roofing", "Sweep the deck.", "Barran el entablado."), []);
  assert.notDeepEqual(conceptProblems("roofing", "lanyard", "eslinga"), []);
  assert.deepEqual(conceptProblems("some-other-module", "gutter", "canalón"), []);
  assert.ok(TRADE_PACK_MODULE_RULES.roofing && TRADE_PACK_MODULE_RULES.gutters && TRADE_PACK_MODULE_RULES.siding);
});

test("a specification needs an owner in the same sentence", () => {
  assert.notDeepEqual(specProblems("Pongan los ganchos cada 24 pulgadas."), []);
  assert.deepEqual(specProblems("Pongan los ganchos cada 24 pulgadas, según el fabricante."), []);
  assert.deepEqual(specProblems("Según el plano, la pendiente es de 1/4 de pulgada."), []);
  assert.deepEqual(specProblems("Empezamos a las 7."), [], "a time is not a spec");
  assert.deepEqual(specProblems("Necesito 2 bobinas blancas."), [], "a count is not a spec");
});

test("sentence section: pool size, one opening per level, and the module's Spanish rules", () => {
  const min = SENTENCE_BUILD_PACK_RULES.minItemsPerLevel;
  const full = [1, 2, 3].flatMap((level) => Array.from({ length: min }, (_, i) => sentence(level, `L${level}x${i}`)));
  const opts = { moduleId: "gutters", language: "Spanish" };
  assert.deepEqual(validateSentenceBuildSection(full, opts), []);
  assert.match(validateSentenceBuildSection(full.slice(1), opts).join("\n"), /level 1 has 39 valid sentences/);
  const twice = structuredClone(full);
  twice[1] = { ...twice[0] };
  assert.match(validateSentenceBuildSection(twice, opts).join("\n"), /twice/);
  const opening = structuredClone(full);
  const long = (end) => {
    const text = `Revisen bien las canaletas de la casa ${end}`;
    return sentence(2, end, { targetSentence: text, tokens: text.split(" "), englishTranslation: "Check the gutters of the house well." });
  };
  opening[min] = long("hoy.");
  opening[min + 1] = long("mañana.");
  assert.match(validateSentenceBuildSection(opening, opts).join("\n"), /level 2: two sentences open with/);
  const vos = structuredClone(full);
  vos[0] = sentence(1, "vos", { targetSentence: "Revisáis la canaleta hoy.", tokens: ["Revisáis", "la", "canaleta", "hoy."], englishTranslation: "You check the gutter today." });
  assert.match(validateSentenceBuildSection(vos, opts).join("\n"), /vosotros/);
  const concept = structuredClone(full);
  concept[0] = sentence(1, "cpt", { targetSentence: "Limpien el canalón hoy.", tokens: ["Limpien", "el", "canalón", "hoy."], englishTranslation: "Clean the gutter today." });
  assert.match(validateSentenceBuildSection(concept, opts).join("\n"), /canaleta/);
  const loose = structuredClone(full);
  loose[0] = sentence(1, "pun", { targetSentence: "Revisen la escalera hoy .", tokens: ["Revisen", "la", "escalera", "hoy", "."] });
  assert.match(validateSentenceBuildSection(loose, opts).join("\n"), /punctuation stays attached/);
});

test("conjugation section: pools per level and axis, verb variety, lesson verbs, vosotros", () => {
  const verbs = ["revisar", "medir", "cortar", "subir", "sellar", "instalar", "limpiar", "bajar"];
  const pool = [];
  for (const level of [1, 2, 3]) {
    for (const axis of CONJUGATION_LEVEL_AXES[level]) {
      const n = level === 3 ? CONJUGATION_PACK_RULES.minItemsLevel3 : CONJUGATION_PACK_RULES.minItemsPerAxis;
      for (let i = 0; i < n; i++) pool.push(question(level, axis, `${level}${axis}${i}`, { infinitive: verbs[i % verbs.length] }));
    }
  }
  const opts = { moduleId: "gutters", verbs: new Set(verbs) };
  assert.deepEqual(validateConjugationSection(pool, opts), []);
  assert.match(validateConjugationSection(pool.slice(1), opts).join("\n"), /level 1 tense has 11 valid questions/);
  const same = pool.map((q) => (q.level === 1 && q.axisTested === "person" ? { ...q, infinitive: "revisar" } : q));
  assert.match(validateConjugationSection(same, opts).join("\n"), /"revisar" is used 12 times/);
  const foreign = structuredClone(pool);
  foreign[0].infinitive = "bailar";
  assert.match(validateConjugationSection(foreign, opts).join("\n"), /not one of this module's lesson verbs/);
  const vos = structuredClone(pool);
  vos[0].wrongOptions[0] = "revisáis";
  assert.match(validateConjugationSection(vos, opts).join("\n"), /vosotros/);
  const noBlank = structuredClone(pool);
  noBlank[0].phraseTranslation = "Today we check it here.";
  assert.match(validateConjugationSection(noBlank, opts).join("\n"), /\[verb\]/);
});

// ─── The shipped packs ───────────────────────────────────────────────────────

const MODULES = ["roofing", "gutters", "siding"];
const lessonVerbs = (moduleId) =>
  new Set(
    Object.values(JSON.parse(read(`public/lesson-content/es/${moduleId}.json`)).lessons).flatMap((lesson) =>
      (lesson.verbs ?? []).map((verb) => verb.infinitive.trim().toLocaleLowerCase()),
    ),
  );

for (const moduleId of MODULES) {
  test(`the shipped ${moduleId} pack has all three areas, passes every rule and matches the index`, () => {
    const text = read(`public/trade-packs/es/${moduleId}.json`);
    const raw = JSON.parse(text);
    assert.equal(raw.module, moduleId);
    assert.equal(raw.reviewed, false);
    assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
    assert.deepEqual(raw.wordMatch.boards.flatMap((board) => wordMatchConceptProblems(moduleId, board)), []);
    assert.deepEqual(validateSentenceBuildSection(raw.sentenceBuild.items, { moduleId, language: "Spanish" }), []);
    assert.deepEqual(validateConjugationSection(raw.conjugation.items, { moduleId, verbs: lessonVerbs(moduleId) }), []);
    const file = parseTradePack(raw, { moduleId, language: "Spanish" });
    assert.equal(file.wordMatch.boards.length, raw.wordMatch.boards.length);
    assert.equal(file.sentenceBuild.items.length, raw.sentenceBuild.items.length);
    assert.equal(file.conjugation.items.length, raw.conjugation.items.length);

    const entry = JSON.parse(read("public/trade-packs/index.json")).packs.find((item) => item.module === moduleId);
    assert.equal(entry.path, tradePackPath(moduleId, "Spanish"));
    assert.equal(entry.bytes, Buffer.byteLength(text));
    assert.deepEqual(entry.areas, ["wordMatch", "sentenceBuild", "conjugation"]);
    for (const level of [1, 2, 3]) {
      assert.equal(entry.sentenceBuildItems[level], raw.sentenceBuild.items.filter((i) => i.level === level).length);
      for (const axis of CONJUGATION_LEVEL_AXES[level]) {
        assert.equal(
          entry.conjugationItems[level][axis],
          raw.conjugation.items.filter((i) => i.level === level && i.axisTested === axis).length,
        );
      }
    }
  });
}

/** Every English / Spanish pair of a pack: cards, sentences with their translation, filled-in questions. */
function packPairs(moduleId) {
  const raw = JSON.parse(read(`public/trade-packs/es/${moduleId}.json`));
  return [
    ...raw.wordMatch.boards.flatMap((board) => board.pairs.map((pair) => ({ english: pair.english, spanish: pair.target }))),
    ...raw.sentenceBuild.items.map((item) => ({ english: item.englishTranslation, spanish: item.targetSentence })),
    ...raw.conjugation.items.map((item) => ({
      english: item.phraseTranslation,
      spanish: item.phrase.replace("___", item.correctConjugation),
    })),
  ];
}

// Written out here (not read from the rules module) so a change to the rules cannot quietly pass.
const WORD = (pattern) => new RegExp(`(?<![\\p{L}])(?:${pattern})(?![\\p{L}])`, "iu");
const CONCEPTS = {
  gutters: [
    ["gutter", "gutters?", "canaletas?"],
    ["downspout", "downspouts?", "bajantes?"],
    ["hanger", "hangers?", "ganchos?"],
    ["end cap", "end caps?", "tapas?"],
    ["miter", "miters?|mitered", "ingletes?"],
    ["scupper", "(?<!overflow )scuppers?", "gárgolas?"],
    ["overflow scupper", "overflow scuppers?", "rebosaderos?"],
    ["outlet", "(?<!(electrical|power) )outlets?", "desagües?"],
  ],
  siding: [
    ["siding", "siding", "revestimientos?"],
    ["vinyl", "vinyl", "vinilo"],
    ["fiber cement", "fiber[- ]cement", "fibrocemento"],
    ["house wrap", "house ?wraps?", "barreras?"],
    ["J-channel", "j[- ]channels?", "canal(es)? J"],
    ["starter strip", "starter strips?", "tiras? de arranque"],
    ["soffit", "soffits?", "sofitos?"],
    ["fascia", "fascias?", "fascias?"],
  ],
  roofing: [
    ["ridge", "ridges?", "cumbreras?"],
    ["deck", "roof deck|soft deck|sheathing", "entablados?"],
    ["gutter", "gutters?", "canaletas?"],
    ["lanyard", "lanyards?", "acollador(es)?"],
    ["underlayment", "underlayments?", "subcapas?"],
  ],
};
const NEVER = {
  gutters: ["canalón", "canalones", "salida de la canaleta"],
  siding: ["plafón", "siding", "barrera de humedad"],
  roofing: ["canalón", "caballete", "sub-capa", "cubierta blanda"],
};

for (const moduleId of MODULES) {
  test(`the ${moduleId} pack names each concept with one Spanish word in every area`, () => {
    const pairs = packPairs(moduleId);
    for (const [name, english, spanish] of CONCEPTS[moduleId]) {
      const en = WORD(english);
      const es = WORD(spanish);
      for (const pair of pairs.filter((p) => en.test(p.english))) {
        assert.match(pair.spanish, es, `${name}: "${pair.spanish}" = "${pair.english}"`);
      }
    }
    for (const term of NEVER[moduleId]) {
      const pattern = WORD(term);
      const hit = pairs.find((pair) => pattern.test(pair.spanish));
      assert.equal(hit, undefined, `"${term}" in ${hit?.spanish}`);
    }
    assert.ok(pairs.length > 400, `${pairs.length} pairs checked`);
  });
}
