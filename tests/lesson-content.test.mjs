import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import {
  CONTENT_LIMITS,
  LESSON_CONTENT_VERSION,
  cleanLessonVerbs,
  cleanPassage,
  conjugationItems,
  contentNativeLanguage,
  isCorrectForm,
  lessonContentPath,
  parseLessonContent,
  pickContentPassage,
  pickContentVerbs,
  pickContentWords,
  stripReflexive,
  validateLessonContent,
  verbFormKeys,
  verbFormLabel,
  verbsFromModelOutput,
} from "../src/lib/lesson-content-core.ts";
import {
  LESSON_CONTENT_MODEL,
  buildLessonContentRequest,
  lessonContentFromResponse,
  levelFor,
} from "../src/lib/lesson-content-prompt.ts";

// ─── Fixtures: a valid Spanish lesson ────────────────────────────────────────

const term = (es, en) => ({ es, en, kind: "term" });
const phrase = (es, en) => ({ es, en, kind: "phrase" });

const WORDS = [
  term("césped", "lawn"),
  term("cortadora", "mower"),
  term("cuchilla", "blade"),
  term("bordeadora", "edger"),
  term("soplador", "blower"),
  term("guantes", "gloves"),
  term("lentes", "safety glasses"),
  term("seguridad", "safety"),
  term("banqueta", "sidewalk"),
  phrase("Corten a 3 pulgadas.", "Cut at 3 inches."),
  phrase("Revisen la cuchilla.", "Check the blade."),
  phrase("¿Tienen preguntas?", "Do you have questions?"),
  phrase("Primero la seguridad.", "Safety first."),
];

const PASSAGE = {
  title: "Cortar el césped hoy",
  target: [
    "Hoy cortamos el césped en la casa Ruiz.",
    "La altura es 3 pulgadas, según el plan.",
    "Revisen la cuchilla de la cortadora antes de empezar.",
    "Primero la seguridad: usen guantes y lentes.",
    "Después, bordeadora y soplador en la banqueta.",
    "¿Tienen preguntas?",
  ],
  native: [
    "Today we mow the lawn at the Ruiz house.",
    "The height is 3 inches, according to the plan.",
    "Check the mower blade before you start.",
    "Safety first: wear gloves and safety glasses.",
    "Afterward, edger and blower on the sidewalk.",
    "Do you have questions?",
  ],
};

const VERB = (infinitive, native, forms, example, note) => ({
  infinitive,
  native,
  forms: {
    yo: forms[0],
    tú: forms[1],
    él_ella_usted: forms[2],
    nosotros: forms[3],
    ellos_ustedes: forms[4],
  },
  example: { target: example[0], native: example[1] },
  ...(note ? { note } : {}),
});

const VERBS = [
  VERB("cortar", "to cut", ["corto", "cortas", "corta", "cortamos", "cortan"], [
    "Hoy cortamos el césped.",
    "Today we mow the lawn.",
  ]),
  VERB("revisar", "to check", ["reviso", "revisas", "revisa", "revisamos", "revisan"], [
    "Revisen la cuchilla.",
    "Check the blade.",
  ]),
  VERB("usar", "to use", ["uso", "usas", "usa", "usamos", "usan"], [
    "Usen guantes y lentes.",
    "Wear gloves and glasses.",
  ]),
];

const GOOD = { passage: PASSAGE, words: WORDS, verbs: VERBS };
const CTX = {
  language: "Spanish",
  nativeLanguage: "English",
  parts: { passage: true, words: true, verbs: true },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const errorsOf = (content, ctx = CTX) => validateLessonContent(content, ctx);

// ─── Validator ───────────────────────────────────────────────────────────────

test("a well-formed lesson passes every rule", () => {
  assert.deepEqual(errorsOf(GOOD), []);
});

test("passage: sentence count must be 5 to 9 and aligned", () => {
  const short = clone(GOOD);
  short.passage.target = short.passage.target.slice(0, 4);
  short.passage.native = short.passage.native.slice(0, 4);
  assert.match(errorsOf(short).join("\n"), /4 sentences/);

  const misaligned = clone(GOOD);
  misaligned.passage.native.pop();
  assert.match(errorsOf(misaligned).join("\n"), /align one to one/);

  const long = clone(GOOD);
  long.passage.target = [...long.passage.target, "a.", "b.", "c.", "d."];
  long.passage.native = [...long.passage.native, "a.", "b.", "c.", "d."];
  assert.match(errorsOf(long).join("\n"), /10 sentences/);
});

test("passage: numbers must be identical in each sentence pair", () => {
  const bad = clone(GOOD);
  bad.passage.native[1] = "The height is 7 inches, according to the plan.";
  assert.match(errorsOf(bad).join("\n"), /sentence 2: numbers differ/);
});

test("passage: Spanish ¿ and ¡ must be paired, on either side when Spanish is native", () => {
  const bad = clone(GOOD);
  bad.passage.target[5] = "Tienen preguntas?";
  assert.match(errorsOf(bad).join("\n"), /missing ¿/);
  const exclaim = clone(GOOD);
  exclaim.passage.target[0] = "Hoy cortamos el césped!";
  assert.match(errorsOf(exclaim).join("\n"), /missing ¡/);

  // English target, Spanish native: the native side is checked.
  const englishLesson = {
    passage: {
      title: "Room turnover",
      target: ["The room is ready.", "Clean the table.", "Is it clean?", "Yes, it is.", "Thank you."],
      native: [
        "El cuarto está listo.",
        "Limpie la mesa.",
        "Está limpio?",
        "Sí, lo está.",
        "Gracias.",
      ],
    },
    words: [
      term("room", "cuarto"),
      term("table", "mesa"),
      term("clean", "limpio"),
      term("ready", "listo"),
      term("thank", "gracias"),
      term("yes", "sí"),
      term("floor", "piso"),
      term("bed", "cama"),
      phrase("The room is ready.", "El cuarto está listo."),
      phrase("Is it clean?", "¿Está limpio?"),
      phrase("Clean the table.", "Limpie la mesa."),
      phrase("Yes, it is.", "Sí, lo está."),
    ],
    verbs: [],
  };
  const englishCtx = {
    language: "English",
    nativeLanguage: "Spanish",
    parts: { passage: true, words: false, verbs: false },
    words: englishLesson.words,
  };
  assert.match(errorsOf(englishLesson, englishCtx).join("\n"), /missing ¿/);
  englishLesson.passage.native[2] = "¿Está limpio?";
  assert.deepEqual(errorsOf(englishLesson, englishCtx), []);
});

test("passage: must use at least 5 of the lesson's terms and 1 phrase", () => {
  const off = clone(GOOD);
  off.passage.target = [
    "Hoy hay una reunión en la oficina.",
    "El jefe habla con todos los trabajadores.",
    "Hablamos de las tareas de la semana.",
    "Cada persona escucha con atención.",
    "Después, el grupo hace preguntas.",
  ];
  off.passage.native = [
    "Today there is a meeting at the office.",
    "The boss talks with all the workers.",
    "We talk about the week's tasks.",
    "Each person listens carefully.",
    "Then the group asks questions.",
  ];
  const text = errorsOf(off).join("\n");
  assert.match(text, /uses only \d of the lesson's terms/);
  assert.match(text, /none of the lesson's phrases/);
});

test("passage terms match by accent-insensitive stem (corten / cortadora, lentes)", () => {
  const accentless = clone(GOOD);
  accentless.passage.target[0] = "Hoy cortamos el CESPED en la casa Ruiz.";
  assert.deepEqual(errorsOf(accentless), []);
});

test("words: 8-12 terms, 4-6 phrases, no duplicates, matching numbers", () => {
  const few = clone(GOOD);
  few.words = few.words.filter((w) => w.es !== "banqueta" && w.es !== "seguridad");
  assert.match(errorsOf(few).join("\n"), /7 terms/);

  const noPhrases = clone(GOOD);
  noPhrases.words = noPhrases.words.filter((w) => w.kind === "term");
  assert.match(errorsOf(noPhrases).join("\n"), /0 phrases/);

  const duplicate = clone(GOOD);
  duplicate.words.push(term("Césped", "turf"));
  assert.match(errorsOf(duplicate).join("\n"), /duplicate Spanish entry/);

  const numbers = clone(GOOD);
  numbers.words[9] = phrase("Corten a 3 pulgadas.", "Cut at 7 inches.");
  assert.match(errorsOf(numbers).join("\n"), /numbers differ in/);
});

test("verbs: 3-5 verbs with sound infinitives, five different forms, and a real example", () => {
  const two = clone(GOOD);
  two.verbs = two.verbs.slice(0, 2);
  assert.match(errorsOf(two).join("\n"), /2 verbs/);

  const notInfinitive = clone(GOOD);
  notInfinitive.verbs[0].infinitive = "corto";
  assert.match(errorsOf(notInfinitive).join("\n"), /not a Spanish infinitive/);

  const reflexive = clone(GOOD);
  reflexive.verbs[0] = VERB(
    "lavarse",
    "to wash up",
    ["me lavo", "te lavas", "se lava", "nos lavamos", "se lavan"],
    ["Nos lavamos las manos.", "We wash our hands."],
  );
  assert.deepEqual(errorsOf(reflexive), []);

  const same = clone(GOOD);
  same.verbs[0].forms.yo = "corta";
  assert.match(errorsOf(same).join("\n"), /must all be different/);

  const wrongEndings = clone(GOOD);
  wrongEndings.verbs[0].forms.nosotros = "cortan";
  wrongEndings.verbs[0].forms.ellos_ustedes = "cortamos";
  const text = errorsOf(wrongEndings).join("\n");
  assert.match(text, /nosotros form .* should end in -mos/);
  assert.match(text, /ellos\/ustedes form .* should end in -n/);

  const empty = clone(GOOD);
  empty.verbs[1].forms.tú = "";
  assert.match(errorsOf(empty).join("\n"), /form "tú" is empty/);

  const withPronoun = clone(GOOD);
  withPronoun.verbs[0].forms.yo = "yo corto";
  assert.match(errorsOf(withPronoun).join("\n"), /without the pronoun/);

  const unrelatedExample = clone(GOOD);
  unrelatedExample.verbs[2].example.target = "El equipo trabaja hoy.";
  assert.match(errorsOf(unrelatedExample).join("\n"), /does not use any form of the verb/);

  const duplicateVerb = clone(GOOD);
  duplicateVerb.verbs[2] = clone(duplicateVerb.verbs[0]);
  assert.match(errorsOf(duplicateVerb).join("\n"), /duplicate verb/);
});

test("passage: no quotation marks or dialogue dashes", () => {
  const dash = clone(GOOD);
  dash.passage.target[5] = "—¿Tienen preguntas?";
  assert.match(errorsOf(dash).join("\n"), /quotation marks or a dialogue dash/);
  const quoted = clone(GOOD);
  quoted.passage.native[0] = '"Today we mow the lawn at the Ruiz house."';
  assert.match(errorsOf(quoted).join("\n"), /quotation marks or a dialogue dash/);
});

test("verbs: notes are written in the learner's native language", () => {
  const spanishNote = clone(GOOD);
  spanishNote.verbs[0].note = "Yo traigo es irregular. Mandato: traigan.";
  assert.match(errorsOf(spanishNote).join("\n"), /note must be written in English/);
  const englishNote = clone(GOOD);
  englishNote.verbs[0].note = "Crew command: corten. Stem change none.";
  assert.deepEqual(errorsOf(englishNote), []);
  // English target, Spanish native: the note must be Spanish.
  const ctx = {
    language: "English",
    nativeLanguage: "Spanish",
    parts: { passage: false, words: false, verbs: true },
  };
  const verbs = ["clean", "empty", "check"].map((verb) => ({
    infinitive: verb,
    native: "x",
    forms: { i: verb, you: verb, he_she: `${verb}s`, we: verb, they: verb },
    example: { target: `We ${verb} the room.`, native: "Lo hacemos." },
  }));
  verbs[0].note = "Use the form with -s for he and she.";
  assert.match(errorsOf({ verbs }, ctx).join("\n"), /note must be written in Spanish/);
  verbs[0].note = "Con él y ella se agrega -s.";
  assert.deepEqual(errorsOf({ verbs }, ctx), []);
});

test("verbs: an irregular form is accepted when the example uses it (poder -> puedo)", () => {
  const irregular = clone(GOOD);
  irregular.verbs[2] = VERB(
    "poder",
    "to be able to",
    ["puedo", "puedes", "puede", "podemos", "pueden"],
    ["Ana puede revisar la cuchilla.", "Ana can check the blade."],
    "Stem change o to ue",
  );
  assert.deepEqual(errorsOf(irregular), []);
});

test("verbs: English targets conjugate with the he/she -s and no pronoun", () => {
  const english = {
    verbs: ["clean", "empty", "check"].map((verb) => ({
      infinitive: verb,
      native: verb === "clean" ? "limpiar" : verb === "empty" ? "vaciar" : "revisar",
      forms: {
        i: verb,
        you: verb,
        he_she: verb === "empty" ? "empties" : `${verb}s`,
        we: verb,
        they: verb,
      },
      example: {
        target: `We ${verb} the room.`,
        native: "Nosotros lo hacemos en el cuarto.",
      },
    })),
  };
  const ctx = {
    language: "English",
    nativeLanguage: "Spanish",
    parts: { passage: false, words: false, verbs: true },
  };
  assert.deepEqual(errorsOf(english, ctx), []);
  const bad = clone(english);
  bad.verbs[0].forms.he_she = "clean";
  assert.match(errorsOf(bad, ctx).join("\n"), /must differ from the I form/);
  const pronoun = clone(english);
  pronoun.verbs[0].forms.i = "I clean";
  assert.match(errorsOf(pronoun, ctx).join("\n"), /without the pronoun/);
  const withTo = clone(english);
  withTo.verbs[0].infinitive = "to clean";
  assert.match(errorsOf(withTo, ctx).join("\n"), /plain English verb/);
});

test("verbs-only lessons (roofing) skip passage and words rules", () => {
  const ctx = { ...CTX, parts: { passage: false, words: false, verbs: true } };
  assert.deepEqual(errorsOf({ verbs: VERBS }, ctx), []);
  assert.match(errorsOf({ verbs: [] }, ctx).join("\n"), /0 verbs/);
});

// ─── Cleaning and parsing ────────────────────────────────────────────────────

test("verb form keys and labels per language", () => {
  assert.deepEqual(verbFormKeys("Spanish"), [
    "yo",
    "tú",
    "él_ella_usted",
    "nosotros",
    "ellos_ustedes",
  ]);
  assert.deepEqual(verbFormKeys("English"), ["i", "you", "he_she", "we", "they"]);
  assert.equal(verbFormKeys("French"), null);
  assert.equal(verbFormLabel("él_ella_usted"), "él / ella / usted");
  assert.equal(verbFormLabel("he_she"), "he / she");
});

test("verbsFromModelOutput maps the ASCII tool keys (tu) onto the file keys (tú)", () => {
  const raw = [
    {
      infinitive: "cortar",
      native: "to cut",
      forms: {
        yo: "corto",
        tu: "cortas",
        el_ella_usted: "corta",
        nosotros: "cortamos",
        ellos_ustedes: "cortan",
      },
      example: { target: "Corto el césped.", native: "I cut the lawn." },
      note: "  regular  ",
    },
    { infinitive: "x", native: "y" },
  ];
  const verbs = verbsFromModelOutput(raw, "Spanish");
  assert.equal(verbs.length, 1);
  assert.equal(verbs[0].forms["tú"], "cortas");
  assert.equal(verbs[0].note, "regular");
});

test("cleanLessonVerbs drops entries with a missing form, example or meaning", () => {
  const ok = clone(VERBS[0]);
  const noExample = { ...clone(VERBS[1]), example: { target: "", native: "" } };
  const noForm = clone(VERBS[2]);
  delete noForm.forms.nosotros;
  const cleaned = cleanLessonVerbs([ok, noExample, noForm, null, "x"], "Spanish");
  assert.deepEqual(
    cleaned.map((v) => v.infinitive),
    ["cortar"],
  );
  assert.deepEqual(cleanLessonVerbs(VERBS, "French"), []);
});

test("cleanPassage needs equal, non-empty sentence arrays and a title", () => {
  assert.ok(cleanPassage(PASSAGE));
  assert.equal(cleanPassage({ ...PASSAGE, native: PASSAGE.native.slice(1) }), null);
  assert.equal(cleanPassage({ ...PASSAGE, title: " " }), null);
  assert.equal(cleanPassage({ ...PASSAGE, target: [""], native: [""] }), null);
  assert.equal(cleanPassage(null), null);
});

function fileOf(overrides = {}) {
  return {
    version: LESSON_CONTENT_VERSION,
    module: "landscaper",
    language: "Spanish",
    nativeLanguage: "English",
    model: LESSON_CONTENT_MODEL,
    generatedAt: "2026-10-17T00:00:00.000Z",
    reviewed: false,
    lessons: { 1: { passage: PASSAGE, words: WORDS, verbs: VERBS } },
    ...overrides,
  };
}
const EXPECT = { moduleId: "landscaper", language: "Spanish" };

test("parseLessonContent accepts a good file and rejects wrong version, module or language", () => {
  const file = parseLessonContent(fileOf(), EXPECT);
  assert.ok(file);
  assert.equal(file.reviewed, false);
  assert.equal(file.lessons["1"].verbs.length, 3);
  assert.equal(file.lessons["1"].words.length, WORDS.length);
  assert.equal(file.lessons["1"].passage.title, "Cortar el césped hoy");
  assert.equal(parseLessonContent(fileOf({ version: 99 }), EXPECT), null);
  assert.equal(parseLessonContent(fileOf({ module: "plumber" }), EXPECT), null);
  assert.equal(parseLessonContent(fileOf({ language: "French" }), EXPECT), null);
  assert.equal(parseLessonContent(fileOf({ nativeLanguage: "" }), EXPECT), null);
  assert.equal(parseLessonContent(fileOf({ lessons: [] }), EXPECT), null);
  assert.equal(parseLessonContent("<html>", EXPECT), null);
  assert.equal(parseLessonContent(null, EXPECT), null);
});

test("parseLessonContent keeps verbs-only lessons and drops empty ones", () => {
  const file = parseLessonContent(
    fileOf({ lessons: { 1: { verbs: VERBS }, 2: { verbs: [] }, 3: "bad" } }),
    EXPECT,
  );
  assert.deepEqual(Object.keys(file.lessons), ["1"]);
  assert.equal(file.lessons["1"].passage, undefined);
  assert.equal(file.lessons["1"].words, undefined);
});

test("picks only serve a file written for the learner's native language", () => {
  const file = parseLessonContent(fileOf(), EXPECT);
  assert.equal(pickContentPassage(file, 1, "English").title, "Cortar el césped hoy");
  assert.equal(pickContentPassage(file, 1, "French"), null);
  assert.equal(pickContentPassage(file, 2, "English"), null);
  assert.equal(pickContentPassage(null, 1, "English"), null);
  assert.equal(pickContentWords(file, 1, "English").length, WORDS.length);
  assert.equal(pickContentWords(file, 1, "French"), null);
  assert.equal(pickContentVerbs(file, 1, "English").length, 3);
  assert.deepEqual(pickContentVerbs(file, 1, "French"), []);
  assert.deepEqual(pickContentVerbs(undefined, 1, "English"), []);
});

test("pickContentWords refuses a list too small to practice", () => {
  const small = parseLessonContent(
    fileOf({ lessons: { 1: { words: WORDS.slice(0, 5), verbs: VERBS } } }),
    EXPECT,
  );
  assert.equal(pickContentWords(small, 1, "English"), null);
});

test("content paths and native languages", () => {
  assert.equal(lessonContentPath("landscaper", "Spanish"), "/lesson-content/es/landscaper.json");
  assert.equal(lessonContentPath("or-evs", "English"), "/lesson-content/en/or-evs.json");
  assert.equal(contentNativeLanguage("Spanish"), "English");
  assert.equal(contentNativeLanguage("English"), "Spanish");
});

// ─── Conjugation drill ───────────────────────────────────────────────────────

test("conjugationItems is one item per form per verb, labelled with the pronoun", () => {
  const items = conjugationItems(VERBS, "Spanish");
  assert.equal(items.length, VERBS.length * 5);
  const first = items.find((i) => i.verb.infinitive === "cortar" && i.key === "él_ella_usted");
  assert.equal(first.pronoun, "él / ella / usted");
  assert.equal(first.expected, "corta");
  assert.deepEqual(conjugationItems(VERBS, "French"), []);
});

test("stripReflexive and the typed-answer rule accept a form with or without the pronoun", () => {
  assert.equal(stripReflexive("se lava"), "lava");
  assert.equal(stripReflexive("nos lavamos"), "lavamos");
  assert.equal(stripReflexive("corta"), "corta");
  // The drill accepts the full form or the bare one, accents optional.
  assert.ok(isCorrectForm("se lava", "se lava"));
  assert.ok(isCorrectForm("lava", "se lava"));
  assert.ok(isCorrectForm("ESTAS", "estás"));
  assert.ok(isCorrectForm(" Corta ", "corta"));
  assert.ok(!isCorrectForm("lavan", "se lava"));
  assert.ok(!isCorrectForm("", "corta"));
});

// ─── Prompt ──────────────────────────────────────────────────────────────────

const MODULE = {
  name: "Landscaper",
  blurb: "Lawn care",
  userRole: "Crew lead",
  vocabFocus: ["césped"],
};
const LESSON = {
  n: 1,
  title: "Morning Crew Meeting",
  objective: "Run a morning safety and task meeting for your landscape crew",
  steps: [{ instruction: "Read." }, { instruction: "Drill: césped." }],
};
const ARGS = {
  module: MODULE,
  lesson: LESSON,
  lessonCount: 30,
  previousTitle: null,
  targetLanguage: "Spanish",
  nativeLanguage: "English",
  parts: { passage: true, words: true, verbs: true },
};

test("request: Sonnet 5.5 with tool_choice auto (a forced tool choice is rejected)", () => {
  const body = buildLessonContentRequest(ARGS);
  assert.equal(body.model, "claude-sonnet-5-5");
  assert.deepEqual(body.tool_choice, { type: "auto" });
  assert.equal(body.tools.length, 1);
  assert.deepEqual(body.tools[0].input_schema.required, ["passage", "words", "verbs"]);
  assert.match(body.system, /call it, once/);
});

test("request: tool property names are ASCII (the API rejects tú) and verbs-only drops the rest", () => {
  const body = buildLessonContentRequest({
    ...ARGS,
    parts: { passage: false, words: false, verbs: true },
  });
  const schema = body.tools[0].input_schema;
  assert.deepEqual(schema.required, ["verbs"]);
  assert.deepEqual(Object.keys(schema.properties), ["verbs"]);
  const forms = schema.properties.verbs.items.properties.forms;
  assert.deepEqual(Object.keys(forms.properties), [
    "yo",
    "tu",
    "el_ella_usted",
    "nosotros",
    "ellos_ustedes",
  ]);
  for (const name of Object.keys(forms.properties)) assert.match(name, /^[a-zA-Z0-9_.-]{1,64}$/);
  const english = buildLessonContentRequest({
    ...ARGS,
    targetLanguage: "English",
    nativeLanguage: "Spanish",
  });
  const englishForms = english.tools[0].input_schema.properties.verbs.items.properties.forms;
  assert.deepEqual(Object.keys(englishForms.properties), ["i", "you", "he_she", "we", "they"]);
});

test("request: the user message carries the lesson context, previous title and level", () => {
  const content = JSON.parse(
    buildLessonContentRequest({
      ...ARGS,
      previousTitle: "Mowing Instructions",
      lesson: { ...LESSON, n: 2 },
    }).messages[0].content,
  );
  assert.equal(content.lesson.title, "Morning Crew Meeting");
  assert.equal(content.lesson.previousLessonTitle, "Mowing Instructions");
  assert.equal(content.lesson.of, 30);
  assert.equal(content.level.cefr, "A1-A2");
  assert.deepEqual(content.produce, ["passage", "words", "verbs"]);
  assert.equal(content.alreadyWrittenForThisLesson, undefined);
});

test("request: authored passage and words are passed as context for verbs-only lessons", () => {
  const content = JSON.parse(
    buildLessonContentRequest({
      ...ARGS,
      parts: { passage: false, words: false, verbs: true },
      authored: { passage: PASSAGE, words: WORDS },
    }).messages[0].content,
  );
  assert.deepEqual(content.produce, ["verbs"]);
  assert.equal(content.alreadyWrittenForThisLesson.words.length, WORDS.length);
  assert.equal(content.alreadyWrittenForThisLesson.words[0].target, "césped");
});

test("levels scale with position: 30, 15 and 10 lesson modules", () => {
  const band = (n, total) => levelFor(n, total).band;
  const expected = ["A1-A2", "A1-A2", "A2-B1", "A2-B1", "B1", "B1"];
  assert.deepEqual([1, 10, 11, 20, 21, 30].map((n) => band(n, 30)), expected);
  assert.deepEqual([1, 5, 6, 10, 11, 15].map((n) => band(n, 15)), expected);
  assert.deepEqual([1, 3, 4, 6, 7, 10].map((n) => band(n, 10)), expected);
});

test("response parsing: the tool call is read, mapped and cleaned; no tool call is null", () => {
  const input = {
    passage: PASSAGE,
    words: {
      terms: WORDS.filter((w) => w.kind === "term").map((w) => ({ native: w.en, target: w.es })),
      phrases: WORDS.filter((w) => w.kind === "phrase").map((w) => ({
        native: w.en,
        target: w.es,
      })),
    },
    verbs: [
      {
        infinitive: "cortar",
        native: "to cut",
        forms: {
          yo: "corto",
          tu: "cortas",
          el_ella_usted: "corta",
          nosotros: "cortamos",
          ellos_ustedes: "cortan",
        },
        example: { target: "Cortamos el césped.", native: "We mow the lawn." },
      },
    ],
  };
  const parsed = lessonContentFromResponse(
    [
      { type: "text", text: "Here you go." },
      { type: "tool_use", id: "t1", name: "return_lesson_content", input },
    ],
    "Spanish",
  );
  assert.equal(parsed.passage.target.length, 6);
  assert.equal(parsed.words.length, WORDS.length);
  assert.equal(parsed.verbs[0].forms["tú"], "cortas");
  assert.equal(lessonContentFromResponse([{ type: "text", text: "no tool" }], "Spanish"), null);
  assert.equal(
    lessonContentFromResponse([{ type: "tool_use", name: "other_tool", input }], "Spanish"),
    null,
  );
});

// ─── Every generated public file ─────────────────────────────────────────────

const CONTENT_DIR = join(import.meta.dirname, "..", "public", "lesson-content");
const generated = [];
if (existsSync(CONTENT_DIR)) {
  for (const dir of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of readdirSync(join(CONTENT_DIR, dir.name))) {
      if (name.endsWith(".json")) generated.push({ dir: dir.name, name });
    }
  }
}

const LANGUAGE_BY_DIR = { es: "Spanish", en: "English" };

test(
  "generated lesson-content files (if any) are listed in index.json",
  { skip: generated.length === 0 },
  () => {
    const index = JSON.parse(readFileSync(join(CONTENT_DIR, "index.json"), "utf8"));
    assert.equal(index.version, LESSON_CONTENT_VERSION);
    const listed = index.files.map((f) => `${f.language}/${f.module}`).sort();
    const onDisk = generated.map((g) => `${g.dir}/${g.name.replace(/\.json$/, "")}`).sort();
    assert.deepEqual(listed, onDisk);
  },
);

for (const { dir, name } of generated) {
  const moduleId = name.replace(/\.json$/, "");
  const language = LANGUAGE_BY_DIR[dir];

  test(`lesson-content ${dir}/${moduleId}: covers every lesson and passes the validator`, () => {
    assert.ok(language, `unknown language directory ${dir}`);
    const raw = JSON.parse(readFileSync(join(CONTENT_DIR, dir, name), "utf8"));
    const file = parseLessonContent(raw, { moduleId, language });
    assert.ok(file, "parses as a lesson-content file");
    assert.equal(file.nativeLanguage, contentNativeLanguage(language));
    assert.equal(typeof raw.reviewed, "boolean", "reviewed flag is present");
    const curriculum = getCurriculum(moduleId);
    assert.ok(curriculum, "module has a curriculum");
    const wanted = curriculum.lessons.map((l) => String(l.n));
    assert.deepEqual(
      Object.keys(file.lessons).sort((a, b) => a - b),
      wanted,
      "every lesson present",
    );
    for (const lesson of curriculum.lessons) {
      const content = file.lessons[String(lesson.n)];
      const parts = {
        passage: content.passage !== undefined,
        words: content.words !== undefined,
        verbs: true,
      };
      // A verbs-only lesson (roofing) must really have its passage and words authored elsewhere.
      if (!parts.passage || !parts.words) {
        assert.equal(moduleId, "roofing", "only roofing may omit its passage and words");
      }
      const errors = validateLessonContent(content, {
        language,
        nativeLanguage: file.nativeLanguage,
        parts,
        words: lesson.words,
      });
      assert.deepEqual(errors, [], `lesson ${lesson.n} (${lesson.title}) has no validator errors`);
      assert.ok(content.verbs.length >= CONTENT_LIMITS.minVerbs);
    }
  });
}
