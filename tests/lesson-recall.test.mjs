import test from "node:test";
import assert from "node:assert/strict";
import { buildLessonRecall, advanceLessonRecall } from "../src/lib/lesson-recall.ts";
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
