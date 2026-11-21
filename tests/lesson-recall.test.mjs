import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildLessonRecall,
  advanceLessonRecall,
  recallFormLines,
} from "../src/lib/lesson-recall.ts";
import { packFor } from "../src/data/language-packs/registry.ts";
const es = packFor("es");
const words = Array.from({ length: 10 }, (_, i) => ({
  es: `palabra ${i}`,
  en: `word ${i}`,
  kind: i % 2 ? "phrase" : "term",
}));
const verbs = Array.from({ length: 6 }, (_, i) => ({
  infinitive: `verbo${i}`,
  native: `to act ${i}`,
  forms: { yo: `actúo${i}`, tu: `actúas${i}` },
  example: { target: "", native: "" },
}));
test("Recall keeps every word, phrase and verb once, with games between cards", () => {
  const deck = buildLessonRecall(words, verbs, "Spanish");
  const cards = deck.filter((item) => item.kind === "card");
  assert.equal(cards.length, 16);
  assert.deepEqual(
    new Set(cards.map((card) => card.word.es)),
    new Set([...words.map((w) => w.es), ...verbs.map((v) => v.infinitive)]),
  );
  assert.deepEqual(
    new Set(cards.slice(0, 3).map((card) => card.label)),
    new Set(["Word", "Phrase", "Verb"]),
  );
  assert.ok(deck.some((item) => item.kind === "match"));
  assert.ok(deck.some((item) => item.kind === "verb-game"));
  assert.equal(deck.at(-1).kind, "card");
  const seen = new Set();
  for (const item of deck) {
    if (item.kind === "card") seen.add(item.word.es);
    if (item.kind === "match") {
      assert.ok(item.words.length >= 2 && item.words.length <= 4);
      for (const word of item.words) assert.ok(seen.has(word.es));
    }
    if (item.kind === "verb-game") {
      assert.ok(item.source.length <= 4);
      for (const form of item.source)
        assert.ok(verbs.some((verb) => Object.values(verb.forms).includes(form.answer)));
    }
  }
});
test("Again requeues the same card without losing progress; stale grading cannot remove another", () => {
  const deck = buildLessonRecall(words, [], "Spanish");
  const again = advanceLessonRecall(deck, deck[0].id, true);
  assert.equal(again[2].id, deck[0].id);
  assert.equal(again.length, deck.length);
  assert.equal(new Set(again.map((item) => item.id)).size, deck.length);
  const next = advanceLessonRecall(deck, deck[0].id);
  assert.deepEqual(advanceLessonRecall(next, deck[0].id), next);
});
test("small lessons stay playable, ambiguous matches are excluded, missing verbs invent no games", () => {
  assert.deepEqual(buildLessonRecall([], [], "Spanish"), []);
  assert.equal(buildLessonRecall(words.slice(0, 1), [], "Spanish").length, 1);
  const small = buildLessonRecall(words.slice(0, 2), verbs.slice(0, 1), "Spanish");
  assert.ok(small.some((item) => item.kind === "verb-game" && item.game === "typing"));
  assert.equal(
    buildLessonRecall(words, [], "Spanish").some((item) => item.kind === "verb-game"),
    false,
  );
  const ambiguous = buildLessonRecall(
    words.map((word) => ({ ...word, en: "same meaning" })),
    [],
    "Spanish",
  );
  assert.equal(
    ambiguous.some((item) => item.kind === "match"),
    false,
  );
});
test("duplicate vocabulary becomes one verb card with its authored forms", () => {
  const word = {
    es: verbs[0].infinitive,
    en: verbs[0].native,
    kind: "term",
    note: "Authored usage note",
  };
  const deck = buildLessonRecall([word, word], verbs.slice(0, 1), "Spanish");
  assert.equal(deck.length, 1);
  assert.equal(deck[0].label, "Verb");
  assert.ok(deck[0].forms.length);
  assert.equal(deck[0].word.note, word.note);
});

test("English infinitive gloss variants merge without erasing notes or different meanings", () => {
  const verb = { ...verbs[0], infinitive: "hablar", native: "to speak" };
  const word = { es: "hablar", en: "speak", kind: "term", note: "Authored note" };
  const deck = buildLessonRecall([word], [verb], "Spanish");
  assert.equal(deck.length, 1);
  assert.equal(deck[0].word.en, "speak");
  assert.equal(deck[0].word.note, word.note);
  assert.equal(
    buildLessonRecall([{ ...word, en: "speech" }], [verb], "Spanish").filter(
      (item) => item.kind === "card",
    ).length,
    2,
  );
  assert.deepEqual(buildLessonRecall([{ es: " ", en: "word", kind: "term" }], [], "Spanish"), []);
});

// ─── Verb card back: authored conjugations, spelled out ───────────────────────

const electrician = JSON.parse(
  readFileSync(new URL("../public/lesson-content/es/electrician.json", import.meta.url), "utf8"),
);
const conectar = Object.values(electrician.lessons)
  .flatMap((lesson) => lesson.verbs)
  .find((verb) => verb.infinitive === "conectar");
const verbCard = (deck, infinitive) =>
  deck.find((item) => item.kind === "card" && item.word.es === infinitive);

test("the back of the conectar card spells out every authored conjugation with its subject", () => {
  const card = verbCard(buildLessonRecall([], [conectar], "Spanish"), "conectar");
  assert.equal(card.label, "Verb");
  assert.equal(card.word.en, "to connect");
  const lines = recallFormLines(card, es);
  assert.deepEqual(
    lines.map((line) => line.text),
    [
      "yo conecto",
      "tú conectas",
      "él / ella / usted conecta",
      "nosotros conectamos",
      "ellos / ustedes conectan",
    ],
  );
  // What is read aloud is the authored form itself, unchanged.
  assert.deepEqual(
    lines.map((line) => line.form),
    Object.values(conectar.forms),
  );
  assert.equal(new Set(lines.map((line) => line.id)).size, 5);
});

test("conjugations come only from authored forms: nothing is generated or guessed", () => {
  // A verb authored with two forms shows two lines, not a completed table.
  const partial = { ...conectar, forms: { yo: "conecto", nosotros: "conectamos" } };
  assert.deepEqual(
    recallFormLines(verbCard(buildLessonRecall([], [partial], "Spanish"), "conectar"), es).map(
      (line) => line.text,
    ),
    ["yo conecto", "nosotros conectamos"],
  );
  // The same infinitive as a plain vocabulary word, with no authored verb, has no lines.
  const wordOnly = buildLessonRecall(
    [{ es: "conectar", en: "to connect", kind: "term" }],
    [],
    "Spanish",
  );
  assert.equal(wordOnly[0].label, "Word");
  assert.deepEqual(recallFormLines(wordOnly[0], es), []);
  // A language without authored verb forms gets none invented for it.
  const french = buildLessonRecall(
    [],
    [{ ...conectar, infinitive: "connecter", forms: { je: "connecte" } }],
    "French",
  );
  assert.deepEqual(recallFormLines(verbCard(french, "connecter"), packFor("fr")), []);
  // Every real authored line is "subject + authored form" and nothing else.
  for (const lesson of Object.values(electrician.lessons)) {
    const deck = buildLessonRecall(lesson.words ?? [], lesson.verbs, "Spanish");
    for (const verb of lesson.verbs) {
      const lines = recallFormLines(verbCard(deck, verb.infinitive), es);
      assert.equal(lines.length, 5, verb.infinitive);
      for (const line of lines) {
        assert.ok(Object.values(verb.forms).includes(line.form), `${verb.infinitive}: ${line.form}`);
        assert.equal(line.text, `${line.subject} ${line.form}`);
      }
    }
  }
});

test("reflexive, pattern and English-target cards keep their authored wording", () => {
  const reflexive = {
    infinitive: "lavarse",
    native: "to wash up",
    forms: {
      yo: "me lavo",
      tú: "te lavas",
      él_ella_usted: "se lava",
      nosotros: "nos lavamos",
      ellos_ustedes: "se lavan",
    },
    example: { target: "", native: "" },
  };
  assert.deepEqual(
    recallFormLines(verbCard(buildLessonRecall([], [reflexive], "Spanish"), "lavarse"), es).map(
      (line) => line.text,
    ),
    [
      "yo me lavo",
      "tú te lavas",
      "él / ella / usted se lava",
      "nosotros nos lavamos",
      "ellos / ustedes se lavan",
    ],
  );
  // An authored pattern replaces the reference table; its own persons are used as written.
  const pattern = {
    id: "p",
    title: "Formal requests",
    verbs: [{ infinitive: "conectar", native: "to connect", forms: { usted: "conecte", ustedes: "conecten" } }],
  };
  assert.deepEqual(
    recallFormLines(verbCard(buildLessonRecall([], [conectar], "Spanish", pattern), "conectar"), es).map(
      (line) => line.text,
    ),
    ["usted conecte", "ustedes conecten"],
  );
  const english = {
    infinitive: "clean",
    native: "limpiar",
    forms: { i: "clean", you: "clean", he_she: "cleans", we: "clean", they: "clean" },
    example: { target: "", native: "" },
  };
  assert.deepEqual(
    recallFormLines(verbCard(buildLessonRecall([], [english], "English"), "clean"), packFor("en")).map(
      (line) => line.text,
    ),
    ["I clean", "you clean", "he / she cleans", "we clean", "they clean"],
  );
  // A form already written with its subject is not doubled.
  assert.deepEqual(
    recallFormLines({
      forms: [{ id: "x:yo", prompt: "yo · x", answer: "yo conecto", meaning: "" }],
    }, es).map((line) => line.text),
    ["yo conecto"],
  );
});
