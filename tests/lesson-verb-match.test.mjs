// The real GameRound (the lesson's verb games, and the "Match the verb forms" break in the
// Recall deck) with the real matching rules, tapped the way a learner taps it. React, the
// speech context and the icons are stand-ins; timers are run by the test.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { fakeTimers, loadSurface } from "./helpers/listening-surface.mjs";
import { MATCH_MISMATCH_MS } from "../src/lib/lesson-practice.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
const FORMS = [
  { id: "conectar:yo", prompt: "yo · conectar", answer: "conecto", meaning: "to connect" },
  { id: "medir:tú", prompt: "tú · medir", answer: "mides", meaning: "to measure" },
  {
    id: "cortar:él_ella_usted",
    prompt: "él / ella / usted · cortar",
    answer: "corta",
    meaning: "to cut",
  },
];

async function round(run, props = {}) {
  const { mod, L, host, jsx } = await loadSurface({
    entry: "src/components/core30/LessonVerbGames.tsx",
    exports: ["GameRound"],
  });
  const saved = ["setTimeout", "clearTimeout"].map((key) => [key, globalThis[key]]);
  const clock = fakeTimers();
  globalThis.setTimeout = clock.setTimeout;
  globalThis.clearTimeout = clock.clearTimeout;
  try {
    const done = [];
    host.render(
      jsx(mod.GameRound, {
        game: "matching",
        language: "Spanish",
        source: FORMS,
        replay() {},
        onComplete: () => done.push("complete"),
        ...props,
      }),
    );
    const named = (names) =>
      host.where((el) => el.type === "button" && names.includes(host.text(el)));
    const prompts = () => named(FORMS.map((form) => form.prompt));
    const answers = () => named(FORMS.map((form) => form.answer));
    await run({
      L,
      host,
      clock,
      done,
      prompts,
      answers,
      prompt: (text) => prompts().find((el) => host.text(el) === text),
      answer: (text) => answers().find((el) => host.text(el) === text),
      tiles: () => [...prompts(), ...answers()],
      /** What the status line under the board says (it is also announced). */
      status: () =>
        host
          .where((el) => el.type === "p" && el.props.role === "status")
          .map(host.text)
          .at(-1),
      /** The red feedback's own timer runs out. */
      elapse: () => {
        const ran = clock.run(MATCH_MISMATCH_MS);
        host.render();
        return ran;
      },
    });
  } finally {
    for (const [key, value] of saved) globalThis[key] = value;
  }
}
const marks = (host, tile) =>
  host.all("verb-match-wrong-mark").filter((mark) => mark.parent === tile);

test("matching verb forms: BOTH tiles of a wrong pair turn red with an error mark, clear together, and can then be matched", () =>
  round(async ({ L, host, prompts, answers, prompt, answer, tiles, status, elapse, done }) => {
    assert.equal(prompts().length, 3);
    assert.equal(answers().length, 3);
    assert.deepEqual(prompts().map(host.text).sort(), FORMS.map((form) => form.prompt).sort());

    // An answer before a prompt asks for one; nothing is marked.
    host.click(answer("mides"));
    assert.equal(status(), "Choose a prompt first.");
    for (const tile of tiles()) assert.equal(tile.props["data-wrong"], "false");

    // Pick a prompt: it is the selection.
    host.click(prompt("yo · conectar"));
    assert.equal(prompt("yo · conectar").props["aria-pressed"], true);
    assert.match(prompt("yo · conectar").props.className, /aria-pressed:bg-gold/);

    // Tap the wrong answer: BOTH tiles show the word-match red, with a mark, not only a colour.
    host.click(answer("mides"));
    for (const tile of [prompt("yo · conectar"), answer("mides")]) {
      const name = host.text(tile);
      assert.equal(tile.props["data-wrong"], "true", `${name} is marked wrong`);
      assert.match(tile.props.className, /border-red-500\/60/, `${name} has the red border`);
      assert.match(tile.props.className, /bg-red-500\/10/, `${name} has the red fill`);
      assert.doesNotMatch(
        tile.props.className,
        /bg-gold|bg-background|border-border/,
        `${name} is red, not gold or plain`,
      );
      assert.notEqual(tile.props.disabled, true, `${name} stays available`);
      assert.equal(marks(host, tile).length, 1, `${name} carries the error mark`);
      assert.equal(marks(host, tile)[0].props["aria-hidden"], "true");
      assert.equal(host.text(tile), name, "the mark does not change the tile's name");
    }
    assert.equal(prompt("yo · conectar").props["aria-pressed"], true, "still the picked prompt");
    for (const tile of tiles().filter(
      (tile) => !["yo · conectar", "mides"].includes(host.text(tile)),
    )) {
      assert.equal(tile.props["data-wrong"], "false");
      assert.doesNotMatch(tile.props.className, /red-500/);
      assert.equal(marks(host, tile).length, 0);
    }
    assert.equal(answer("conecto").props["data-wrong"], "false", "the right answer is not marked");
    assert.equal(status(), "Not a match. Try again.", "the miss is said, not only coloured");
    assert.deepEqual(L.read, [], "a miss reads nothing aloud");
    assert.match(host.text(host.one("lesson-verb-game-round")), /0 of 3 matched/);

    // The red clears by itself and every tile is back to normal, with nothing picked.
    assert.equal(elapse(), 1);
    for (const tile of tiles()) {
      assert.equal(tile.props["data-wrong"], "false");
      assert.doesNotMatch(tile.props.className, /red-500/);
      assert.notEqual(tile.props.disabled, true);
    }
    assert.equal(host.all("verb-match-wrong-mark").length, 0);
    for (const tile of prompts()) assert.equal(tile.props["aria-pressed"], false);
    assert.equal(status(), "");

    // Retry with the same two tiles, each against its real partner.
    host.click(prompt("yo · conectar"));
    host.click(answer("conecto"));
    assert.equal(prompt("yo · conectar").props.disabled, true);
    assert.equal(answer("conecto").props.disabled, true);
    assert.equal(status(), "Matched. conecto");
    assert.deepEqual(L.read, [{ text: "conecto", index: 0 }], "a match is still read aloud");
    host.click(prompt("tú · medir"));
    host.click(answer("mides"));
    assert.match(host.text(host.one("lesson-verb-game-round")), /2 of 3 matched/);
    host.click(prompt("él / ella / usted · cortar"));
    host.click(answer("corta"));
    assert.match(host.text(host.one("lesson-verb-game-round")), /Round complete · 3 pairs matched/);
    assert.deepEqual(done, []);
    host.click(host.button("Continue cards"));
    assert.deepEqual(done, ["complete"], "the round completes after a miss");
  }));

test("matching verb forms: rapid misses are each shown, and a timer from an earlier miss never clears a newer one or the retry", () =>
  round(async ({ host, clock, prompt, answer, tiles, status, elapse }) => {
    const wrong = () =>
      tiles()
        .filter((tile) => tile.props["data-wrong"] === "true")
        .map(host.text)
        .sort();

    // Two wrong answers in a row for the same prompt, the second before the red has cleared.
    host.click(prompt("yo · conectar"));
    host.click(answer("mides"));
    assert.deepEqual(wrong(), ["mides", "yo · conectar"]);
    const firstTimer = [...clock.timers.values()].at(-1).fn;
    host.click(answer("corta"));
    assert.deepEqual(wrong(), ["corta", "yo · conectar"], "the newer miss is the one marked");
    assert.equal(host.all("verb-match-wrong-mark").length, 2);
    assert.equal(status(), "Not a match. Try again.");
    assert.equal(clock.timers.size, 1, "one timer: the newer miss's");

    // The first miss's timer fires anyway: the newer red pair stays.
    firstTimer();
    host.render();
    assert.deepEqual(wrong(), ["corta", "yo · conectar"], "a stale timer clears nothing");
    assert.equal(prompt("yo · conectar").props["aria-pressed"], true);
    assert.equal(elapse(), 1);
    assert.deepEqual(wrong(), []);

    // A tap during the red ends it at once and is already the first tap of the retry.
    host.click(prompt("tú · medir"));
    host.click(answer("conecto"));
    assert.deepEqual(wrong(), ["conecto", "tú · medir"]);
    host.click(prompt("yo · conectar"));
    assert.deepEqual(wrong(), [], "the red is gone with the next tap");
    assert.equal(prompt("yo · conectar").props["aria-pressed"], true);
    assert.equal(prompt("tú · medir").props["aria-pressed"], false);
    // The miss's own timer now fires late: the learner's new pick is kept.
    assert.equal(elapse(), 1);
    assert.equal(prompt("yo · conectar").props["aria-pressed"], true, "the retry's pick survives");
    host.click(answer("conecto"));
    assert.equal(prompt("yo · conectar").props.disabled, true);
    assert.equal(answer("conecto").props.disabled, true);

    // A right answer tapped during the red matches at once.
    host.click(prompt("tú · medir"));
    host.click(answer("corta"));
    assert.deepEqual(wrong(), ["corta", "tú · medir"]);
    host.click(answer("mides"));
    assert.deepEqual(wrong(), []);
    assert.equal(answer("mides").props.disabled, true);
    assert.notEqual(answer("corta").props.disabled, true, "the wrong answer stays available");
    assert.equal(answer("corta").props["data-wrong"], "false");
    // Every leftover timer fires: matched pairs stay matched.
    elapse();
    assert.equal(prompt("tú · medir").props.disabled, true);
    assert.equal(prompt("yo · conectar").props.disabled, true);
    assert.match(host.text(host.one("lesson-verb-game-round")), /2 of 3 matched/);
  }));

test("matching verb forms: leaving in the middle of the red leaves no timer behind", () =>
  round(async ({ host, clock, prompt, answer }) => {
    host.click(prompt("yo · conectar"));
    host.click(answer("corta"));
    assert.equal(clock.timers.size, 1);
    host.unmount();
    assert.equal(clock.timers.size, 0);
  }));

test("verb games: an answer that could not be read aloud belongs to its question", () =>
  round(
    async ({ L, host }) => {
      const game = () => host.one("lesson-verb-game-round");
      assert.match(host.text(game()), /Question 1 of 3/);
      assert.equal(L.forgotten, 0);
      // Answer the question, hear it, move on: the notice for this answer is withdrawn.
      const options = host.where(
        (el) => el.type === "button" && FORMS.some((form) => form.answer === host.text(el)),
      );
      for (const option of options) {
        if (host.where((el) => host.text(el) === "Next question").length) break;
        host.click(
          host.where((el) => el.type === "button" && host.text(el) === host.text(option))[0],
        );
      }
      host.click(host.button("Listen to answer"));
      assert.equal(L.read.length, 1);
      host.click(host.button("Next question"));
      assert.match(host.text(game()), /Question 2 of 3/);
      assert.equal(L.forgotten, 1, "the next question leaves the previous answer's notice behind");
      host.unmount();
      assert.equal(L.forgotten, 2, "and so does leaving the round");
    },
    { game: "choice" },
  ));
