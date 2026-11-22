import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clearPairMismatch,
  EMPTY_PAIR_BOARD,
  gameRoundItems,
  lessonGameBank,
  distinctGameItems,
  gameAnswer,
  maskedAnswer,
  gameLetters,
  pairTileState,
  tapPairAnswer,
  tapPairPrompt,
} from "../src/lib/lesson-verb-games.ts";
import { packFor } from "../src/data/language-packs/registry.ts";
import { spanishBasicsLesson } from "../src/data/spanish-basics.ts";
const courses = [
  "spanish-basics",
  "spanish-102",
  "spanish-frequent-verbs",
  "spanish-conjugation-patterns",
  "spanish-usage-verbs",
  "spanish-common-patterns",
];
for (const base of courses)
  test(`${base}: all stages produce lesson-local game answers`, () => {
    for (const pre of ["foundation-", "", "master-"]) {
      const id = pre + base;
      const content = JSON.parse(
        readFileSync(new URL("../public/lesson-content/es/" + id + ".json", import.meta.url)),
      );
      for (const [n, lesson] of Object.entries(content.lessons)) {
        const pattern = spanishBasicsLesson(id, Number(n), "Spanish", "English")?.pattern;
        const bank = lessonGameBank(lesson.verbs, "Spanish", pattern);
        assert.ok(bank.forms.length > 0, id + n);
        const source = pattern?.verbs ?? lesson.verbs;
        assert.deepEqual(
          bank.meanings.map((v) => v.answer),
          source.map((v) => v.infinitive),
        );
        for (const item of bank.forms) {
          const [verb, key] = item.id.split(":");
          assert.equal(item.answer, source.find((v) => v.infinitive === verb).forms[key]);
        }
        const round = gameRoundItems(bank.forms);
        assert.equal(new Set(round.map((v) => v.id.split(":")[0])).size, round.length);
        if (pattern) {
          assert.equal(round.length, 10, id + n);
          assert.equal(bank.meanings.length, 10);
          assert.equal(bank.label, pattern.title);
        }
        const distinct = distinctGameItems(bank.forms);
        assert.equal(new Set(distinct.map((v) => v.answer.toLowerCase())).size, distinct.length);
      }
    }
  });
test("pattern games override present reference forms and preserve accents", () => {
  const pattern = spanishBasicsLesson(
    "spanish-conjugation-patterns",
    1,
    "Spanish",
    "English",
  ).pattern;
  const bank = lessonGameBank([], "Spanish", pattern);
  assert.equal(bank.forms.find((v) => v.id === "hablar:yo").answer, "hablé");
  assert.equal(gameAnswer("hablé", "HABLÉ ", [], packFor("es")), true);
  assert.equal(gameAnswer("hablé", "hable", [], packFor("es")), false);
  const letters = gameLetters(packFor("es"));
  assert.equal(maskedAnswer("él ha ido", ["é", "l", "h", "a", "i", "d", "o"], letters), "é l   h a   i d o");
  assert.ok(maskedAnswer("hablé", ["h", "a", "b", "l", "e"], letters).includes("＿"));
  // The pack alphabet masks every letter of the language: nothing is given away unmasked.
  assert.equal(letters.join(""), "abcdefghijklmnñopqrstuvwxyzáéíóúü");
  // A pack with no alphabet (an IME script) plays with the letters of the round's answers.
  assert.deepEqual(gameLetters(packFor("ja"), ["たべる", "たべます"]), ["た", "べ", "る", "ま", "す"]);
});

// ─── Matching: red feedback on both tiles, then retryable ─────────────────────

const PAIRS = ["conectar:yo", "medir:tú", "cortar:él_ella_usted"];
const states = (board) =>
  Object.fromEntries(
    PAIRS.flatMap((id) => [
      [`${id} prompt`, pairTileState(board, id, "prompt")],
      [`${id} answer`, pairTileState(board, id, "answer")],
    ]),
  );
/** A prompt is picked, then an answer is tapped. */
const pair = (board, prompt, answer) => tapPairAnswer(tapPairPrompt(board, prompt).board, answer);

test("verb matching: a wrong pair marks BOTH tiles, counts one mistake and matches nothing", () => {
  const picked = tapPairPrompt(EMPTY_PAIR_BOARD, PAIRS[0]);
  assert.equal(picked.outcome, "selected");
  assert.equal(pairTileState(picked.board, PAIRS[0], "prompt"), "selected");
  assert.equal(
    pairTileState(picked.board, PAIRS[0], "answer"),
    "idle",
    "only the prompt is picked",
  );

  const miss = tapPairAnswer(picked.board, PAIRS[1]);
  assert.equal(miss.outcome, "mismatch");
  assert.deepEqual(miss.board.wrong, { prompt: PAIRS[0], answer: PAIRS[1], serial: 1 });
  assert.equal(miss.board.mistakes, 1);
  assert.deepEqual(miss.board.matched, []);
  // Both tiles of the wrong pair, and only those two: red outranks the picked prompt's highlight.
  assert.deepEqual(states(miss.board), {
    "conectar:yo prompt": "wrong",
    "conectar:yo answer": "idle",
    "medir:tú prompt": "idle",
    "medir:tú answer": "wrong",
    "cortar:él_ella_usted prompt": "idle",
    "cortar:él_ella_usted answer": "idle",
  });
  assert.equal(miss.board.selected, PAIRS[0], "the prompt stays picked while the red shows");

  // An answer with no prompt picked asks for one and changes nothing.
  const early = tapPairAnswer(EMPTY_PAIR_BOARD, PAIRS[0]);
  assert.equal(early.outcome, "needs-prompt");
  assert.equal(early.board, EMPTY_PAIR_BOARD);
});

test("verb matching: the red clears by its own miss only, and then both tiles can be matched", () => {
  const miss = pair(EMPTY_PAIR_BOARD, PAIRS[0], PAIRS[1]).board;
  const cleared = clearPairMismatch(miss, 1);
  assert.equal(cleared.wrong, null);
  assert.equal(cleared.selected, null, "nothing is picked: the same tiles are free");
  assert.equal(cleared.mistakes, 1, "the miss stays counted");
  for (const state of Object.values(states(cleared))) assert.equal(state, "idle");
  assert.equal(clearPairMismatch(cleared, 1), cleared, "clearing twice changes nothing");

  // Retry: each of the two tiles that were wrong matches its real partner.
  const first = pair(cleared, PAIRS[0], PAIRS[0]);
  assert.equal(first.outcome, "matched");
  const second = pair(first.board, PAIRS[1], PAIRS[1]);
  assert.equal(second.outcome, "matched");
  assert.deepEqual(second.board.matched, [PAIRS[0], PAIRS[1]]);
  assert.equal(second.board.mistakes, 1);
  assert.equal(pairTileState(second.board, PAIRS[0], "prompt"), "matched");
  assert.equal(pairTileState(second.board, PAIRS[1], "answer"), "matched");
  // Matched tiles take no more taps.
  assert.equal(tapPairPrompt(second.board, PAIRS[0]).outcome, "ignored");
  assert.equal(tapPairAnswer(second.board, PAIRS[1]).outcome, "ignored");
  const last = pair(second.board, PAIRS[2], PAIRS[2]);
  assert.deepEqual(last.board.matched, PAIRS, "the round completes after a miss");
});

test("verb matching: rapid misses are each marked, and a stale timer never clears a newer one", () => {
  // The prompt stays picked, so a second answer can be tried before the red has cleared.
  const first = pair(EMPTY_PAIR_BOARD, PAIRS[0], PAIRS[1]).board;
  const second = tapPairAnswer(first, PAIRS[2]);
  assert.equal(second.outcome, "mismatch");
  assert.deepEqual(second.board.wrong, { prompt: PAIRS[0], answer: PAIRS[2], serial: 2 });
  assert.equal(second.board.mistakes, 2);
  assert.equal(
    pairTileState(second.board, PAIRS[1], "answer"),
    "idle",
    "the earlier miss is no longer marked",
  );
  assert.equal(pairTileState(second.board, PAIRS[2], "answer"), "wrong");
  assert.equal(pairTileState(second.board, PAIRS[0], "prompt"), "wrong");

  // The first miss's timer fires late: the newer red pair stays.
  assert.equal(clearPairMismatch(second.board, 1), second.board);
  assert.equal(clearPairMismatch(second.board, 2).wrong, null);

  // A third quick tap that is right matches at once and ends the red.
  const right = tapPairAnswer(second.board, PAIRS[0]);
  assert.equal(right.outcome, "matched");
  assert.equal(right.board.wrong, null);
  assert.deepEqual(right.board.matched, [PAIRS[0]]);
  // Both earlier timers fire afterwards: nothing is unmatched or unpicked by them.
  assert.equal(clearPairMismatch(right.board, 1), right.board);
  assert.equal(clearPairMismatch(right.board, 2), right.board);

  // A tap on a prompt during the red ends it and is the first tap of the retry.
  const miss = pair(right.board, PAIRS[1], PAIRS[2]).board;
  assert.equal(miss.wrong.serial, 3);
  const retry = tapPairPrompt(miss, PAIRS[2]);
  assert.equal(retry.board.wrong, null);
  assert.equal(retry.board.selected, PAIRS[2]);
  // The miss's own timer fires after the learner has tapped past it: the pick is kept.
  assert.equal(clearPairMismatch(retry.board, 3), retry.board);
  assert.equal(tapPairAnswer(retry.board, PAIRS[2]).outcome, "matched");
});

test("verb matching: the same miss repeated is shown again each time, never stuck or silently accepted", () => {
  let board = EMPTY_PAIR_BOARD;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    board = pair(board, PAIRS[0], PAIRS[2]).board;
    assert.deepEqual(board.wrong, { prompt: PAIRS[0], answer: PAIRS[2], serial: attempt });
    assert.equal(board.mistakes, attempt);
    board = clearPairMismatch(board, attempt);
  }
  assert.deepEqual(board.matched, []);
});
