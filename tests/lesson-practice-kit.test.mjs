import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDeck,
  answerVariants,
  buildListenOptions,
  buildMatchTiles,
  groupByKind,
  isCorrectAnswer,
  normalizeAnswer,
  shuffle,
  splitRounds,
  wordsToAdd,
} from "../src/lib/lesson-practice.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";

// Deterministic LCG so shuffles are reproducible.
const seeded = (seed = 1) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const word = (en, es, kind = "term") => ({ en, es, kind });

test("normalizeAnswer strips accents, punctuation, case and extra spaces", () => {
  assert.equal(normalizeAnswer("  ¿Dónde   está el TEJADO? "), "donde esta el tejado");
  assert.equal(normalizeAnswer("¡Cuidado!"), "cuidado");
  assert.equal(normalizeAnswer("ñandú"), "nandu");
});

test("isCorrectAnswer accepts accent-free, mis-cased, and padded input", () => {
  assert.ok(isCorrectAnswer("  TEJADO ", "tejado"));
  assert.ok(isCorrectAnswer("canalon", "canalón"));
  assert.ok(isCorrectAnswer("donde esta", "¿Dónde está?"));
  assert.ok(!isCorrectAnswer("techo", "tejado"));
  assert.ok(!isCorrectAnswer("", "tejado"));
  assert.ok(!isCorrectAnswer("   ", "tejado"));
});

test("answers accept the part before ' (' and either side of ' / '", () => {
  assert.ok(isCorrectAnswer("la teja", "la teja (de asfalto)"));
  assert.ok(isCorrectAnswer("la teja de asfalto", "la teja (de asfalto)"));
  assert.ok(isCorrectAnswer("alero", "alero / voladizo"));
  assert.ok(isCorrectAnswer("Voladizo", "alero / voladizo"));
  assert.ok(isCorrectAnswer("alero / voladizo", "alero / voladizo"));
  assert.ok(isCorrectAnswer("alero", "alero / voladizo (techo)"));
  assert.ok(isCorrectAnswer("voladizo", "alero / voladizo (techo)"));
  assert.ok(!isCorrectAnswer("techo", "alero / voladizo (techo)"));
  assert.deepEqual(answerVariants("a / b"), ["a b", "a", "b"]);
});

test("shuffle is a permutation, does not mutate, and is deterministic with injected random", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const frozen = [...input];
  const a = shuffle(input, seeded(7));
  const b = shuffle(input, seeded(7));
  assert.deepEqual(input, frozen);
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort((x, y) => x - y), frozen);
  assert.notDeepEqual(a, frozen);
  // random() === 0.999.. keeps the index in range
  assert.deepEqual([...shuffle(input, () => 0.9999999)].sort((x, y) => x - y), frozen);
});

test("splitRounds: <=12 is one round, more are balanced rounds of at most 6", () => {
  const make = (n) => Array.from({ length: n }, (_, i) => i);
  assert.deepEqual(splitRounds([]), []);
  assert.equal(splitRounds(make(5)).length, 1);
  assert.equal(splitRounds(make(12)).length, 1);
  assert.deepEqual(splitRounds(make(13)).map((r) => r.length), [5, 4, 4]);
  assert.deepEqual(splitRounds(make(14)).map((r) => r.length), [5, 5, 4]);
  assert.deepEqual(splitRounds(make(18)).map((r) => r.length), [6, 6, 6]);
  for (const n of [13, 15, 17, 19, 24, 25]) {
    const rounds = splitRounds(make(n));
    assert.ok(rounds.every((r) => r.length >= 4 && r.length <= 6), `n=${n}`);
    assert.deepEqual(rounds.flat(), make(n), `covers all, in order, n=${n}`);
  }
});

test("buildMatchTiles yields one ES and one EN tile per word, shuffled", () => {
  const round = [word("roof", "tejado"), word("nail", "clavo"), word("ladder", "escalera")];
  const tiles = buildMatchTiles(round, seeded(3));
  assert.equal(tiles.length, 6);
  assert.equal(new Set(tiles.map((t) => t.id)).size, 6);
  round.forEach((w, pairId) => {
    const es = tiles.find((t) => t.pairId === pairId && t.side === "es");
    const en = tiles.find((t) => t.pairId === pairId && t.side === "en");
    assert.equal(es.text, w.es);
    assert.equal(en.text, w.en);
  });
});

test("buildListenOptions gives 4 unique options including the answer, distractors from the lesson", () => {
  const words = [
    word("roof", "tejado"),
    word("nail", "clavo"),
    word("ladder", "escalera"),
    word("shingle", "teja"),
    word("hammer", "martillo"),
    word("Watch your step", "Cuidado donde pisa", "phrase"),
  ];
  for (const seed of [1, 2, 3, 4, 5]) {
    const options = buildListenOptions(words, words[0], seeded(seed));
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes("roof"));
    assert.ok(options.every((o) => words.some((w) => w.en === o)));
    // same-kind terms are preferred: the phrase is never used while 4+ terms exist
    assert.ok(!options.includes("Watch your step"));
  }
});

test("buildListenOptions handles tiny lessons and duplicate English text", () => {
  const two = [word("roof", "tejado"), word("nail", "clavo")];
  assert.equal(buildListenOptions(two, two[0], seeded(1)).length, 2);
  const dupes = [word("roof", "tejado"), word("Roof", "techo"), word("nail", "clavo")];
  const options = buildListenOptions(dupes, dupes[0], seeded(1));
  assert.equal(options.filter((o) => o.toLowerCase() === "roof").length, 1);
  assert.equal(buildListenOptions([word("solo", "solo")], word("solo", "solo")).length, 1);
});

test("advanceDeck: got removes the card, again re-queues it at the back", () => {
  assert.deepEqual(advanceDeck([0, 1, 2], "got"), [1, 2]);
  assert.deepEqual(advanceDeck([0, 1, 2], "again"), [1, 2, 0]);
  assert.deepEqual(advanceDeck([5], "again"), [5]);
  assert.deepEqual(advanceDeck([5], "got"), []);
  assert.deepEqual(advanceDeck([], "got"), []);
});

test("groupByKind and wordsToAdd", () => {
  const words = [word("a", "uno"), word("b", "dos", "phrase"), word("c", "Tres"), word("d", "uno")];
  const { terms, phrases } = groupByKind(words);
  assert.equal(terms.length, 3);
  assert.equal(phrases.length, 1);
  const toAdd = wordsToAdd(words, (es) => es === "Tres");
  assert.deepEqual(toAdd.map((w) => w.es), ["uno", "dos"]);
  assert.deepEqual(wordsToAdd(words, () => true), []);
});

test("real roofing lessons: every word is answerable and listen options build for all 30 lessons", () => {
  for (let n = 1; n <= 30; n += 1) {
    const words = ROOFING_LESSON_WORDS[n];
    assert.ok(words.length >= 4, `lesson ${n}`);
    for (const w of words) {
      assert.ok(isCorrectAnswer(w.es, w.es), `lesson ${n}: ${w.es} accepts itself`);
      const options = buildListenOptions(words, w, seeded(n));
      assert.ok(options.includes(w.en));
      assert.equal(new Set(options).size, options.length);
    }
    const terms = words.filter((w) => w.kind === "term");
    const rounds = splitRounds(terms);
    assert.equal(rounds.flat().length, terms.length, `lesson ${n} rounds cover all terms`);
  }
});
