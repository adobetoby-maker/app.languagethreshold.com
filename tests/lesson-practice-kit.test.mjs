import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceDeck,
  answerVariants,
  buildListenOptions,
  buildMatchTiles,
  clearMatchMismatch,
  EMPTY_MATCH_BOARD,
  groupByKind,
  isCorrectAnswer,
  MATCH_MISMATCH_MS,
  matchTileState,
  normalizeAnswer,
  shuffle,
  splitRounds,
  tapMatchTile,
  wordsToAdd,
} from "../src/lib/lesson-practice.ts";
import { packFor } from "../src/data/language-packs/registry.ts";
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
const es = packFor("es");

test("normalizeAnswer strips accents, punctuation, case and extra spaces", () => {
  assert.equal(normalizeAnswer("  ¿Dónde   está el TEJADO? ", es), "donde esta el tejado");
  assert.equal(normalizeAnswer("¡Cuidado!", es), "cuidado");
  assert.equal(normalizeAnswer("ñandú", es), "nandu");
});

test("isCorrectAnswer accepts accent-free, mis-cased, and padded input", () => {
  assert.ok(isCorrectAnswer("  TEJADO ", "tejado", es));
  assert.ok(isCorrectAnswer("canalon", "canalón", es));
  assert.ok(isCorrectAnswer("donde esta", "¿Dónde está?", es));
  assert.ok(!isCorrectAnswer("techo", "tejado", es));
  assert.ok(!isCorrectAnswer("", "tejado", es));
  assert.ok(!isCorrectAnswer("   ", "tejado", es));
});

test("answers accept the part before ' (' and either side of ' / '", () => {
  assert.ok(isCorrectAnswer("la teja", "la teja (de asfalto)", es));
  assert.ok(isCorrectAnswer("la teja de asfalto", "la teja (de asfalto)", es));
  assert.ok(isCorrectAnswer("alero", "alero / voladizo", es));
  assert.ok(isCorrectAnswer("Voladizo", "alero / voladizo", es));
  assert.ok(isCorrectAnswer("alero / voladizo", "alero / voladizo", es));
  assert.ok(isCorrectAnswer("alero", "alero / voladizo (techo)", es));
  assert.ok(isCorrectAnswer("voladizo", "alero / voladizo (techo)", es));
  assert.ok(!isCorrectAnswer("techo", "alero / voladizo (techo)", es));
  assert.deepEqual(answerVariants("a / b", es), ["a b", "a", "b"]);
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
      assert.ok(isCorrectAnswer(w.es, w.es, es), `lesson ${n}: ${w.es} accepts itself`);
      const options = buildListenOptions(words, w, seeded(n));
      assert.ok(options.includes(w.en));
      assert.equal(new Set(options).size, options.length);
    }
    const terms = words.filter((w) => w.kind === "term");
    const rounds = splitRounds(terms);
    assert.equal(rounds.flat().length, terms.length, `lesson ${n} rounds cover all terms`);
  }
});

// ─── Matching: red feedback on both tiles, then retryable ─────────────────────

const matchRound = [word("to connect", "conectar"), word("cable", "el cable"), word("panel", "el panel")];
const matchTiles = buildMatchTiles(matchRound, seeded(5));
const tileOf = (pairId, side) => matchTiles.find((t) => t.pairId === pairId && t.side === side);
/** Plays taps in order and returns every step. */
const play = (taps, board = EMPTY_MATCH_BOARD) =>
  taps.reduce(
    (steps, tile) => [...steps, tapMatchTile(steps.at(-1)?.board ?? board, matchTiles, tile)],
    [],
  );

test("a wrong pair marks BOTH tiles red, counts one miss and matches nothing", () => {
  const [first, second] = play([tileOf(0, "es"), tileOf(1, "en")]);
  assert.equal(first.outcome, "selected");
  assert.equal(second.outcome, "mismatch");
  assert.deepEqual([...second.board.wrong].sort(), [tileOf(0, "es").id, tileOf(1, "en").id].sort());
  assert.equal(second.board.wrong.length, 2, "both tiles, not only the second one");
  assert.equal(second.board.mistakes, 1);
  assert.deepEqual(second.board.matched, []);
  // Shown red on both: the first tile's selection highlight does not hide its red.
  assert.equal(second.board.selected, tileOf(0, "es").id);
  assert.equal(matchTileState(second.board, tileOf(0, "es")), "wrong");
  assert.equal(matchTileState(second.board, tileOf(1, "en")), "wrong");
  for (const tile of matchTiles.filter((t) => !second.board.wrong.includes(t.id)))
    assert.equal(matchTileState(second.board, tile), "idle", "no other tile is marked");
  assert.equal(matchTileState(first.board, tileOf(0, "es")), "selected");
  // The same holds whichever column is tapped first.
  const reversed = play([tileOf(2, "en"), tileOf(0, "es")]).at(-1);
  assert.equal(reversed.outcome, "mismatch");
  assert.deepEqual([...reversed.board.wrong].sort(), [tileOf(2, "en").id, tileOf(0, "es").id].sort());
});

test("taps wait while the red shows; afterwards the same tiles are free and can be matched", () => {
  const wrong = play([tileOf(0, "es"), tileOf(1, "en")]).at(-1).board;
  for (const tile of matchTiles) {
    const ignored = tapMatchTile(wrong, matchTiles, tile);
    assert.equal(ignored.outcome, "ignored");
    assert.equal(ignored.board, wrong, "nothing changes during the feedback");
    assert.equal(ignored.speak, null);
  }
  assert.ok(MATCH_MISMATCH_MS >= 400 && MATCH_MISMATCH_MS <= 1500, "long enough to see, short enough to retry");

  const cleared = clearMatchMismatch(wrong);
  for (const tile of matchTiles)
    assert.equal(matchTileState(cleared, tile), "idle", "every tile is back to normal");
  assert.deepEqual(cleared.wrong, []);
  assert.equal(cleared.selected, null);
  assert.equal(cleared.mistakes, 1, "the miss stays counted");
  assert.deepEqual(cleared.matched, []);
  assert.equal(clearMatchMismatch(cleared), cleared);

  // Retry: the two tiles that were wrong each match their real partner.
  const retry = play([tileOf(0, "es"), tileOf(0, "en"), tileOf(1, "en"), tileOf(1, "es")], cleared);
  assert.deepEqual(retry.map((step) => step.outcome), ["selected", "matched", "selected", "matched"]);
  assert.deepEqual([...retry.at(-1).board.matched].sort(), [0, 1]);
  assert.equal(retry.at(-1).board.mistakes, 1);
  assert.equal(retry.at(-1).board.selected, null);
});

test("a repeated miss on the same pair is shown again, never stuck or silently accepted", () => {
  let board = EMPTY_MATCH_BOARD;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    board = play([tileOf(0, "es"), tileOf(2, "en")], board).at(-1).board;
    assert.equal(board.wrong.length, 2);
    assert.equal(board.mistakes, attempt);
    board = clearMatchMismatch(board);
  }
  assert.deepEqual(board.matched, []);
});

test("matching selection rules and what is read aloud", () => {
  // Every accepted tap on a target-language tile is read; native-language tiles are not.
  assert.equal(tapMatchTile(EMPTY_MATCH_BOARD, matchTiles, tileOf(0, "es")).speak, "conectar");
  assert.equal(tapMatchTile(EMPTY_MATCH_BOARD, matchTiles, tileOf(0, "en")).speak, null);
  const steps = play([tileOf(0, "en"), tileOf(1, "es")]);
  assert.equal(steps[1].outcome, "mismatch");
  assert.equal(steps[1].speak, "el cable", "the tapped word is still read on a miss");
  // Tapping the selected tile again clears it; another tile in the same column replaces it.
  const again = play([tileOf(0, "es"), tileOf(0, "es")]);
  assert.equal(again[1].outcome, "deselected");
  assert.equal(again[1].board.selected, null);
  const sameColumn = play([tileOf(0, "es"), tileOf(1, "es")]);
  assert.equal(sameColumn[1].outcome, "selected");
  assert.equal(sameColumn[1].board.selected, tileOf(1, "es").id);
  assert.equal(sameColumn[1].board.mistakes, 0);
  // Matched tiles and a finished round take no more taps.
  const done = play(matchRound.flatMap((_, pairId) => [tileOf(pairId, "es"), tileOf(pairId, "en")]));
  assert.equal(done.at(-1).board.matched.length, matchRound.length);
  assert.equal(done.at(-1).board.mistakes, 0);
  for (const tile of matchTiles)
    assert.equal(tapMatchTile(done.at(-1).board, matchTiles, tile).outcome, "ignored");
  const partial = play([tileOf(0, "es"), tileOf(0, "en")]).at(-1).board;
  assert.equal(tapMatchTile(partial, matchTiles, tileOf(0, "es")).outcome, "ignored");
  assert.equal(tapMatchTile(partial, matchTiles, tileOf(1, "es")).outcome, "selected");
});
