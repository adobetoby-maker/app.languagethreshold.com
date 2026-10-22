// Built by TAC — 2026-10-21
// Verb Games round modes in the UI: picker chips and Mode control, HUD and recap variants, home best.
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";
import { base, miniData } from "./helpers/verb-fixture.mjs";
import { EMPTY_VERB_DEVICE } from "../src/lib/verb-games/device.ts";

const ext = { external: ["react-dom/server", "lucide-react"] };
const { VerbPicker } = await loadModule("src/components/games/verbs/VerbPicker.tsx", ext);
const { VerbsHome } = await loadModule("src/components/games/verbs/VerbsHome.tsx", ext);
const { GameHud } = await loadModule("src/components/games/verbs/GameHud.tsx", ext);
const { BubblePopGame } = await loadModule("src/components/games/verbs/BubblePopGame.tsx", ext);
const { VerbCrushGame } = await loadModule("src/components/games/verbs/VerbCrushGame.tsx", ext);
const { RoundRecap } = await loadModule("src/components/games/verbs/RoundRecap.tsx", { external: ["react", "react-dom/server", "lucide-react"] });
const labels = await loadModule("src/components/games/verbs/mode-labels.ts", ext);

const html = (component, props) => renderToStaticMarkup(createElement(component, props));
const tagOf = (markup, marker) => {
  const tag = (markup.match(/<[a-z][^>]*>/g) ?? []).find((t) => t.includes(marker));
  assert.ok(tag, `no tag contains ${marker} in ${markup}`);
  return tag;
};
const text = (markup) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const device = (patch) => ({ ...EMPTY_VERB_DEVICE, ...patch });
const pickerProps = (over = {}) => ({ data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, game: "bubble", family: null, go() {}, onSettings() {}, ...over });
const withMode = (mode) => device({ settings: { source: "core", listMode: false, mode } });

// ---- Picker -----------------------------------------------------------------------------------

test("picker: Mode control is one radio group of five, Timed by default, labels per game", () => {
  const h = html(VerbPicker, pickerProps());
  assert.match(tagOf(h, 'data-testid="mode-control"'), /role="radiogroup"/);
  assert.match(tagOf(h, 'data-testid="mode-control"'), /grid-cols-5/);
  const order = ["60 sec", "5 words", "10 words", "15 words", "Forever"].map((l) => text(h).indexOf(l));
  assert.ok(order.every((i) => i >= 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(tagOf(h, 'data-testid="mode-timed"'), /aria-checked="true"/);
  assert.match(tagOf(h, 'data-testid="mode-forever"'), /aria-checked="false"/);
  for (const key of ["timed", "count5", "count10", "count15", "forever"]) {
    const tag = tagOf(h, `data-testid="mode-${key}"`);
    assert.match(tag, /role="radio"/);
    assert.match(tag, /cursor-pointer/);
    assert.match(tag, /min-h-11/);
    assert.match(tag, /duration-200/);
    assert.match(tag, /focus-visible:ring-foreground/);
    assert.match(tag, /dark:focus-visible:ring-gold/);
  }
  assert.match(html(VerbPicker, pickerProps({ game: "crush" })), /90 sec/);
});

test("picker: the remembered mode is checked, with roving tab stops", () => {
  const h = html(VerbPicker, pickerProps({ device: withMode({ kind: "count", n: 10 }) }));
  assert.match(tagOf(h, 'data-testid="mode-count10"'), /aria-checked="true"/);
  assert.match(tagOf(h, 'data-testid="mode-count10"'), /tabindex="0"/);
  assert.match(tagOf(h, 'data-testid="mode-timed"'), /tabindex="-1"/);
  assert.match(h, /The round ends after 10 correct words/);
});

test("picker: Crush level targets follow the mode (count scales moves, forever lists)", () => {
  const count = html(VerbPicker, pickerProps({ game: "crush", family: "es.present.go-yo", device: withMode({ kind: "count", n: 10 }) }));
  assert.match(text(count), /Level 1 .*10 forms · 40 moves/);
  const forever = html(VerbPicker, pickerProps({ game: "crush", family: "es.present.go-yo", device: withMode({ kind: "forever" }) }));
  assert.match(text(forever), /5 per list · 20 moves/);
  const timed = html(VerbPicker, pickerProps({ game: "crush", family: "es.present.go-yo" }));
  assert.match(text(timed), /5 forms · 20 moves/);
});

test("picker: several families show as picked with a summary; Mix is not picked then", () => {
  const h = html(VerbPicker, pickerProps({ family: "mix", families: ["es.present.go-yo", "es.present.ar"] }));
  assert.match(tagOf(h, 'data-testid="family-es.present.go-yo"'), /aria-pressed="true"/);
  assert.match(tagOf(h, 'data-testid="family-es.present.ar"'), /aria-pressed="true"/);
  assert.match(tagOf(h, 'data-testid="family-es.present.er"'), /aria-pressed="false"/);
  assert.match(tagOf(h, 'data-testid="family-mix"'), /aria-pressed="false"/);
  assert.match(h, /2 patterns · \d+ verbs/);
  assert.match(h, /pick one or more/);
});

test("picker: Crush level 2 is available for go-yo + regular -ar (union pool), not go-yo alone", () => {
  const alone = html(VerbPicker, pickerProps({ game: "crush", family: "es.present.go-yo" }));
  assert.match(alone, /data-level="2"[^>]*disabled/);
  const both = html(VerbPicker, pickerProps({ game: "crush", family: "mix", families: ["es.present.go-yo", "es.present.ar"] }));
  assert.doesNotMatch(tagOf(both, 'data-level="2"'), /\sdisabled(=|\s|>)/);
});

test("picker: Crush disables families with no goal forms at the chosen level", () => {
  // Without pedir the core pool has no e -> i verb, so that chip is out at level 1.
  const data = miniData();
  data.verbs = data.verbs.filter((v) => v.infinitive !== "pedir");
  const h = html(VerbPicker, pickerProps({ data, game: "crush", family: "es.present.go-yo" }));
  assert.match(tagOf(h, 'data-testid="family-es.present.e-i"'), /\sdisabled(=|\s|>)/);
  assert.match(tagOf(h, 'data-testid="family-es.present.e-i"'), /cursor-not-allowed/);
  assert.doesNotMatch(tagOf(h, 'data-testid="family-es.present.go-yo"'), /\sdisabled(=|\s|>)/);
});

// ---- HUD --------------------------------------------------------------------------------------

test("HUD timed is unchanged; count shows N without a clock; forever shows STREAK large, no clock", () => {
  const timed = html(GameHud, { eyebrow: "E", score: 2060, streak: 6, msLeft: 39000 });
  assert.equal(timed, html(GameHud, { eyebrow: "E", score: 2060, streak: 6, msLeft: 39000, mode: { kind: "timed" } }));
  assert.match(timed, /SCORE 2,060 · STREAK ×6 · 0:39/);
  const count = html(GameHud, { eyebrow: "E", score: 300, streak: 3, msLeft: 0, mode: { kind: "count", n: 10 }, made: 3 });
  assert.match(count, /SCORE 300 · STREAK ×3 · 3 \/ 10/);
  assert.doesNotMatch(count, /\d:\d\d/);
  const forever = html(GameHud, { eyebrow: "E", score: 900, streak: 23, msLeft: 0, movesLeft: 12, mode: { kind: "forever" } });
  assert.match(forever, /SCORE 900 · MOVES 12/);
  assert.match(forever, /data-testid="hud-streak"[\s\S]*STREAK[\s\S]*>23</);
  assert.match(tagOf(forever, "text-3xl"), /font-display/);
  assert.doesNotMatch(forever, /\d:\d\d/);
});

test("game screens pass the mode to the HUD and the goal list", () => {
  const bubble = html(BubblePopGame, { data: miniData(), config: { ...base("bubble"), mode: { kind: "count", n: 5 } }, onEnd() {} });
  assert.match(bubble, /data-mode="count"/);
  assert.match(bubble, /0 \/ 5/);
  const crush = html(VerbCrushGame, { data: miniData(), config: { ...base("crush"), mode: { kind: "count", n: 10 } }, onEnd() {} });
  assert.match(crush, /MOVES 40/);
  assert.match(crush, /Make 10 yo forms/);
  assert.equal((crush.match(/data-goal-slot=/g) ?? []).length, 10);
  const forever = html(VerbCrushGame, { data: miniData(), config: { ...base("crush"), mode: { kind: "forever" } }, onEnd() {} });
  assert.match(forever, /data-mode="forever"/);
  assert.match(forever, /Goal · list 1/);
  assert.match(forever, /Make yo forms/);
  const multi = html(BubblePopGame, { data: miniData(), config: { ...base("bubble"), family: "mix", families: ["es.present.ar", "es.present.go-yo"] }, onEnd() {} });
  assert.match(multi, /GAME · BUBBLE POP · REGULAR -AR \+ -GO YO FORM/);
});

// ---- Recap ------------------------------------------------------------------------------------

const result = (over = {}) => ({ score: 2300, moves: 0, picks: 24, correct: 23, bestStreak: 23, durationMs: 102_000, completions: [], misses: [], won: false, ...over });
const recapProps = (over = {}) => ({ result: result(), best: null, placement: null, signedIn: false, savedKeys: [], onPlayAgain() {}, onPractice() {}, onBack() {}, onSendCards() {}, ...over });

test("recap timed is unchanged: Round over and Best streak", () => {
  const h = html(RoundRecap, recapProps());
  assert.equal(h, html(RoundRecap, recapProps({ mode: { kind: "timed" } })));
  assert.match(h, /Round over/);
  assert.match(h, /Best streak/);
  assert.doesNotMatch(h, /recap-summary/);
});

test("recap forever: the headline is the streak; time replaces Best streak", () => {
  const h = html(RoundRecap, recapProps({ mode: { kind: "forever" }, eyebrow: "GAME · BUBBLE POP · FOREVER" }));
  assert.match(h, /GAME · BUBBLE POP · FOREVER/);
  assert.match(text(h), /Streak 23 · 2,300 points/);
  assert.match(h, /data-testid="recap-time"[^>]*>1:42</);
  assert.doesNotMatch(h, /Best streak/);
});

test("recap forever: the end line follows the engine's reason, one line each", () => {
  const line = (endReason) => {
    const h = html(RoundRecap, recapProps({ mode: { kind: "forever" }, endReason }));
    return /data-testid="recap-summary"[^>]*>([^<]*)</.exec(h)?.[1] ?? null;
  };
  assert.equal(line("moves"), "Out of moves.");
  assert.equal(line("cap"), "Round complete — that&#x27;s the longest round we keep.");
  assert.equal(line("player"), "You ended the round.");
  assert.equal(line("miss"), "One miss ends a forever round.");
  // A recap handed no reason names none: it does not guess from the misses.
  assert.equal(line(undefined), null);
  assert.equal(html(RoundRecap, recapProps({ mode: { kind: "forever" }, result: result({ misses: [] }) })).includes("You ended the round."), false);
});

test("recap forever: no misses and moves out never says the player ended it", () => {
  const h = html(RoundRecap, recapProps({ mode: { kind: "forever" }, endReason: "moves", result: result({ misses: [] }) }));
  assert.match(h, />Out of moves\.</);
  assert.doesNotMatch(h, /You ended the round/);
});

test("recap count: words in time, or how far the round got", () => {
  const done = html(RoundRecap, recapProps({ mode: { kind: "count", n: 10 }, result: result({ correct: 10, durationMs: 102_000, won: true }) }));
  assert.match(done, /data-testid="recap-summary"[^>]*>10 words in 1:42</);
  assert.match(done, /Round over/);
  const short = html(RoundRecap, recapProps({ mode: { kind: "count", n: 10 }, result: result({ correct: 4, durationMs: 52_000 }) }));
  assert.match(short, />4 of 10 words in 0:52</);
});

test("mode labels: recap eyebrows, goal titles, multi-pick eyebrow", () => {
  assert.equal(labels.recapEyebrow(base("bubble")), "GAME · BUBBLE POP");
  assert.equal(labels.recapEyebrow({ ...base("bubble"), mode: { kind: "forever" } }), "GAME · BUBBLE POP · FOREVER");
  assert.equal(labels.recapEyebrow({ ...base("crush"), mode: { kind: "count", n: 10 } }), "GAME · VERB CRUSH · 10 WORDS");
  const level = (label) => ({ level: 1, label, persons: ["yo"], families: "picked", goalCount: 5, moveBudget: 20 });
  assert.equal(labels.goalTitle(level("Make 5 yo forms"), { kind: "timed" }), "Make 5 yo forms");
  assert.equal(labels.goalTitle(level("Make 6 forms: yo and tú"), { kind: "count", n: 15 }), "Make 15 forms: yo and tú");
  assert.equal(labels.goalTitle(level("Make 8 forms, every person"), { kind: "forever" }), "Make forms, every person");
  assert.equal(labels.goalTitle(level("Crossover: tengo and tienes"), { kind: "count", n: 5 }), "Crossover: tengo and tienes · 5 forms");
  assert.equal(labels.pickLabel({ ...base("bubble"), family: "mix", families: ["es.present.ar", "es.present.er", "es.present.ir"] }), "3 PATTERNS");
});

// ---- Home -------------------------------------------------------------------------------------

test("home game card best counts timed rounds only, so it reads as it did before modes", () => {
  const bests = {
    "bubble|go-yo": { score: 500, moves: 0, at: "2026-10-20T00:00:00.000Z" },
    "bubble|go-yo|forever": { score: 9000, moves: 0, at: "2026-10-21T00:00:00.000Z" },
  };
  const h = text(html(VerbsHome, { data: miniData(), device: device({ bests }), moduleId: null, go() {} }));
  assert.match(h, /Personal best 500/);
  assert.doesNotMatch(h, /9,000/);
});
