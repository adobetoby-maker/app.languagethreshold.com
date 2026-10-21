// Built by TAC — 2026-10-20
// T5e: the blind review of 277 generated lessons found the same error classes again and again.
// The generator prompts now carry rules against them, and the validator rejects a note that
// thinks out loud ("Stem change e to ie? No: e to i"). Prompt rules are checked in the lesson
// content prompt (API and CLI) and in the Core 60 prompts; the validator is checked on the known
// self-talk strings, on legitimate notes, and over every shipped content file.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getModule } from "../src/data/modules.ts";
import {
  masterBlockRequest,
  foundationCurriculumRequest,
  stageContentRequest,
  MASTER_BLOCKS,
} from "../src/lib/core60-generator-core.ts";
import { validateStageFile } from "../src/lib/core60-validate.ts";
import { selfTalkIssue, validateLessonContent } from "../src/lib/lesson-content-core.ts";
import {
  DIRECT_SPEECH_RULE,
  NOTE_FINAL_RULE,
  PASSAGE_QUALITY_RULES,
  REGION_RULE,
  buildLessonContentRequest,
  lessonContentCliSystemPrompt,
} from "../src/lib/lesson-content-prompt.ts";

// ─── Self-talk in notes ──────────────────────────────────────────────────────

const SELF_TALK = [
  "Stem change e to ie? No: e to i (pido, pides), except nosotros.",
  "Stem change e to ie... no: e to i (sigo, sigues).",
  "Stem change o to ue? No, it is regular: cuento.",
  "Irregular yo form... no, it is regular (como, comes).",
  "Wait, the yo form is irregular: tengo.",
  "Stem change e to ue... actually e to ie (calentar, caliento), except nosotros.",
  "In the past tense the yo form is explicué... no: it is explqué.",
  "Regular -ar verb. Wait... no, it has a stem change o to ue.",
  "Actually this verb has a stem change e to ie.",
  "Hmm, the tú form is regular here.",
  "Let me check: u to ue (juego, juegas).",
  "Stem change e to ie…no: e to i (digo, dices).",
  "¿Cambio de raíz e a ie? No: e a i (pido, pides).",
  "Stem change e to ie. No: e to i (pido, pides).",
  "Stem change e to ie — no, e to i (pido, pides).",
  "Stem change e to ie, no wait: e to i (pido, pides).",
  "Stem change e to ie or rather e to i (pido, pides).",
  "Correction: the stem change is e to i (pido, pides).",
  "Oops, the stem change is e to i (pido, pides).",
  "Es regular. Espera, en realidad cambia e a i (pido, pides).",
  "Stem change e to ie? no, it is e to i (pido, pides).",
];

const CLEAN = [
  "No 'for' needed",
  "Creo que (I think)",
  "Stem change e to i (pido, pides), except nosotros.",
  "Used with a: ir a + infinitive.",
  "Say 'wait for' as esperar, with no preposition in Spanish.",
  'The English "actually" does not mean "actualmente".',
  "No se usa en Latinoamérica; formal only.",
  "Formal: use usted.",
  "Regular -ar verb. Wait until the utility confirms the disconnect before anyone touches the mast.",
  "Replace the diagnosis with what you actually found.",
  "Esperar already means wait for: espero la ambulancia, with no extra word for 'for'.",
  "Espera also works as a command to one person: wait.",
  "Esperar also means to hope, but here it means to wait.",
  "Déjenme pagar means let me pay (said to several people).",
  "The command Avísame means let me know (tú form + me).",
  "Read back the name and the value, then wait for the caller to say correcto.",
  "The window where finished plates wait for servers.",
  "Use 'Lo siento... no hay' to say you have none left.",
  "Answer ¿Tiene alergias? No, ninguna.",
  "¿Puede ayudarme? No se usa con amigos.",
  "En realidad means in fact, actually.",
  "Déjame: let me, informal.",
  "Espera … command: wait, then listen.",
  "Actually is a false friend of actualmente…",
  "Let me know is avíseme.",
  "Don't add 'a' here; it isn't needed. No wait time applies.",
];

test("selfTalkIssue flags the known self-correction strings", () => {
  for (const note of SELF_TALK) assert.notEqual(selfTalkIssue(note), null, note);
});

test("selfTalkIssue accepts legitimate notes", () => {
  for (const note of CLEAN) assert.equal(selfTalkIssue(note), null, note);
});

const verb = (note) => ({
  infinitive: "pedir",
  native: "to ask for",
  forms: { yo: "pido", tú: "pides", "él/ella": "pide", nosotros: "pedimos", "ellos/ustedes": "piden" },
  example: { target: "Pido la cuenta.", native: "I ask for the check." },
  ...(note ? { note } : {}),
});

const ctxVerbs = { language: "Spanish", nativeLanguage: "English", parts: { verbs: true } };
// Only the self-talk errors are looked at; a one-verb lesson also trips the verb-count rule.
const verbErrors = (note) =>
  validateLessonContent({ verbs: [verb(note)] }, ctxVerbs).filter((error) => /thinks out loud/.test(error));

test("the content validator rejects a verb note that thinks out loud, and the retry error names it", () => {
  for (const note of SELF_TALK.slice(0, 2)) {
    const errors = verbErrors(note);
    assert.equal(errors.length, 1, note);
    assert.match(errors[0], /pedir: the note thinks out loud/);
    assert.ok(errors[0].includes(note));
  }
});

test("the content validator accepts clean verb notes", () => {
  for (const note of CLEAN) assert.deepEqual(verbErrors(note), [], note);
});

test("the content validator rejects a word note that thinks out loud", () => {
  const words = (note) => [{ es: "el techo", en: "the roof", kind: "term", note }];
  const ctx = { language: "Spanish", nativeLanguage: "English", parts: { words: true } };
  const bad = validateLessonContent({ words: words("Gender el? No: el techo.") }, ctx);
  assert.ok(bad.some((error) => /thinks out loud/.test(error)));
  const ok = validateLessonContent({ words: words("Masculine noun: el techo.") }, ctx);
  assert.ok(!ok.some((error) => /thinks out loud/.test(error)));
});

// ─── Stage files (Core 60) ───────────────────────────────────────────────────

test("the stage-file validator rejects a word note that thinks out loud", () => {
  const raw = JSON.parse(readFileSync("src/data/core60/es/foundation-electrician.json", "utf8"));
  const bad = JSON.parse(JSON.stringify(raw));
  bad.lessons[0].words[0].note = "Article el? No: la.";
  const errors = validateStageFile(bad, { moduleId: raw.module, stage: raw.stage, language: raw.language });
  assert.ok(errors.some((error) => /thinks out loud/.test(error)), errors.join("\n"));
  const good = JSON.parse(JSON.stringify(raw));
  good.lessons[0].words[0].note = "Feminine noun: la.";
  const clean = validateStageFile(good, { moduleId: raw.module, stage: raw.stage, language: raw.language });
  assert.ok(!clean.some((error) => /thinks out loud/.test(error)), clean.join("\n"));
});

// ─── Prompt rules ────────────────────────────────────────────────────────────

const RULE_SNIPPETS = [
  "states the final rule only, never deliberation or self-correction",
  "is introduced earlier in that passage",
  "Every clause of the lesson objective and roleplay is covered by at least one full sentence",
  "a capstone's listed beats each get their own sentence",
  "Any question about allergies or ingredients is answered in the passage",
  "Spain uses euros, billete, camarero, comisaría, franquicia",
  "Mexico and Latin America use pesos, boleto, mesero, deducible",
  "Direct speech goes at the end of a sentence",
  "never runs into narration",
];

const REQUEST_ARGS = {
  module: { name: "Travel", blurb: "b", userRole: "traveler", vocabFocus: ["hotel"] },
  lesson: { n: 2, title: "Breakfast", objective: "Order breakfast", steps: [{ instruction: "Say hi" }] },
  lessonCount: 15,
  previousTitle: "Arrival",
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  parts: { passage: true, words: true, verbs: true },
};

test("the lesson-content API prompt carries every new rule", () => {
  const { system } = buildLessonContentRequest(REQUEST_ARGS);
  for (const snippet of RULE_SNIPPETS) assert.ok(system.includes(snippet), snippet);
  assert.ok(system.includes(NOTE_FINAL_RULE));
  for (const rule of PASSAGE_QUALITY_RULES) assert.ok(system.includes(rule), rule);
});

test("the lesson-content CLI prompt carries every new rule too", () => {
  const cli = lessonContentCliSystemPrompt(buildLessonContentRequest(REQUEST_ARGS).system);
  for (const snippet of RULE_SNIPPETS) assert.ok(cli.includes(snippet), snippet);
  assert.match(cli, /ONE JSON object that matches the given JSON schema/);
});

test("a part-only request carries only the rules that part needs", () => {
  const verbsOnly = buildLessonContentRequest({ ...REQUEST_ARGS, parts: { verbs: true } }).system;
  assert.ok(verbsOnly.includes(NOTE_FINAL_RULE));
  assert.ok(!verbsOnly.includes(REGION_RULE));
  const passageOnly = buildLessonContentRequest({ ...REQUEST_ARGS, parts: { passage: true } }).system;
  assert.ok(passageOnly.includes(DIRECT_SPEECH_RULE));
  assert.ok(!passageOnly.includes(NOTE_FINAL_RULE));
});

const roofing = getModule("roofing");
const core30 = {
  titles: getCurriculum("roofing").lessons.map((l) => l.title),
  objectives: getCurriculum("roofing").lessons.map((l) => l.objective),
  terms: ["teja", "clavo"],
};
const ctx = (stage) => ({ module: roofing, stage, pair: { language: "Spanish", nativeLanguage: "English" }, core30 });
const lesson = (n) => ({
  n,
  title: "Titulo",
  objective: "Do the thing",
  focus: "ser",
  words: [],
  speaking: "Explain.",
  grammar: { focus: "f", examples: [] },
  lessonType: "Roleplay",
});

test("the Core 60 lesson prompt (passage and verbs) carries every new rule", () => {
  for (const stage of ["foundation", "master"]) {
    const { system } = stageContentRequest(ctx(stage), "m", lesson(1), { scene: "s" });
    for (const snippet of RULE_SNIPPETS) assert.ok(system.includes(snippet), `${stage}: ${snippet}`);
    // The region rule is stated once, not repeated by two sections.
    assert.equal(system.split(REGION_RULE).length - 1, 1, stage);
  }
});

test("the Core 60 stage prompts (Foundation words, Master block) carry the note and region rules", () => {
  const foundation = foundationCurriculumRequest(ctx("foundation"), "m").system;
  const outline = { threshold: "By Lesson 20, you can x", lessons: [], catalog: [] };
  const block = masterBlockRequest(ctx("master"), "m", outline, MASTER_BLOCKS[0], []).system;
  for (const system of [foundation, block]) {
    assert.ok(system.includes(NOTE_FINAL_RULE));
    assert.ok(system.includes(REGION_RULE));
  }
});

// ─── Every shipped content file passes the new note rule ─────────────────────

function* contentFiles() {
  for (const dir of ["public/lesson-content/es", "public/lesson-content/en", "src/data/core60/es"]) {
    for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) yield join(dir, name);
  }
}

test("no shipped lesson-content or Core 60 file has a verb or word note that thinks out loud", () => {
  const hits = [];
  for (const path of contentFiles()) {
    const file = JSON.parse(readFileSync(path, "utf8"));
    for (const lesson of Object.values(file.lessons ?? {})) {
      for (const v of lesson.verbs ?? []) {
        if (v.note && selfTalkIssue(v.note)) hits.push(`${path} lesson ${lesson.n ?? "?"} verb ${v.infinitive}: ${v.note}`);
      }
      for (const w of lesson.words ?? []) {
        if (w.note && selfTalkIssue(w.note)) hits.push(`${path} lesson ${lesson.n ?? "?"} word ${w.es}: ${w.note}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});
