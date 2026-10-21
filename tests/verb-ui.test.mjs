// Built by TAC — 2026-10-21
// Verb Games shared UI primitives. Assertions never depend on JSX attribute order:
// `tagOf` returns the opening tag that holds a marker and each attribute is checked on its own.
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";
import { miniData } from "./helpers/verb-fixture.mjs";

const ext = { external: ["react-dom/server"] };
const { PieceTile } = await loadModule("src/components/games/verbs/PieceTile.tsx", ext);
const { GameHud } = await loadModule("src/components/games/verbs/GameHud.tsx", ext);
const { ReasonBand } = await loadModule("src/components/games/verbs/ReasonBand.tsx", ext);
const { LiveRegion } = await loadModule("src/components/games/verbs/LiveRegion.tsx", ext);
const { Legend } = await loadModule("src/components/games/verbs/Legend.tsx", ext);
const { CompletionFlash } = await loadModule("src/components/games/verbs/CompletionFlash.tsx", ext);
const { createLongPress, isSaveKey, LONG_PRESS_MS } = await loadModule("src/components/games/verbs/long-press.ts", ext);
const { FrameChoices } = await loadModule("src/components/games/verbs/FrameChoices.tsx", ext);
const { choiceForKey } = await loadModule("src/components/games/verbs/choice-keys.ts", ext);
const { useReducedMotion } = await loadModule("src/hooks/use-reduced-motion.ts", ext);
const { BubblePopGame } = await loadModule("src/components/games/verbs/BubblePopGame.tsx", ext);

const html = (component, props) => renderToStaticMarkup(createElement(component, props));
/** The opening tag that contains `marker`, so attributes can be asserted in any order. */
const tagOf = (markup, marker) => {
  const tags = markup.match(/<[a-z][^>]*>/g) ?? [];
  const tag = tags.find((t) => t.includes(marker));
  assert.ok(tag, `no tag contains ${marker} in ${markup}`);
  return tag;
};

test("pieces carry shape and label, not color alone", () => {
  const stem = html(PieceTile, { kind: "stem", label: "ten" });
  assert.ok(tagOf(stem, 'aria-label="stem ten"'));
  assert.match(tagOf(stem, 'aria-label="stem ten"'), /data-shape="rounded"/);
  assert.match(stem, />ten-</);

  const ending = html(PieceTile, { kind: "ending", label: "go" });
  const endingTag = tagOf(ending, 'aria-label="ending go"');
  assert.match(endingTag, /data-shape="chevron"/);
  assert.match(endingTag, /clip-path:polygon\(/);
  assert.match(ending, />-go</);

  const whole = html(PieceTile, { kind: "whole", label: "vengo" });
  assert.match(tagOf(whole, 'aria-label="form vengo"'), /data-shape="pill"/);
  assert.match(whole, />vengo</);
});

test("piece colors are the pinned palette and state is exposed", () => {
  const colors = { stem: "#c9d3e0", ending: "#e6c35c", whole: "#7fb2e5", done: "#8fd1a8" };
  for (const [kind, hex] of Object.entries(colors)) {
    assert.match(tagOf(html(PieceTile, { kind, label: "x" }), `data-kind="${kind}"`), new RegExp(`background-color:${hex}`));
  }
  const tag = tagOf(html(PieceTile, { kind: "ending", label: "go", selected: true, dimmed: true, onClick() {}, testId: "p1" }), 'data-testid="p1"');
  assert.match(tag, /aria-pressed="true"/);
  assert.match(tag, /data-dimmed="true"/);
  assert.match(tag, /cursor-pointer/);
  assert.match(tag, /focus-visible:shadow-\[inset/);
  assert.match(tag, /shadow-\[inset_0_0_0_3px_#0a1220\]/);
  assert.match(tagOf(html(PieceTile, { kind: "stem", label: "ten" }), 'aria-label="stem ten"'), /role="img"/);
});

test("eyebrows use the contrast-safe gold and choices show a visible focus style", () => {
  const hud = html(GameHud, { eyebrow: "E", score: 0, streak: 0, msLeft: 0 });
  assert.match(hud, /text-gold-ink/);
  assert.doesNotMatch(hud, /text-gold(?!-ink)/);
  const choices = html(FrameChoices, { prompt: "p", english: "e", infinitive: "venir", options: [{ id: 1, label: "vengo" }], disabled: [], onPick() {} });
  assert.match(choices, /text-gold-ink/);
  assert.doesNotMatch(choices, /text-gold(?!-ink)/);
  assert.match(tagOf(choices, 'data-choice="1"'), /focus-visible:outline-2/);
});

test("HUD, reason band, legend and choices", () => {
  const hud = html(GameHud, { eyebrow: "GAME · BUBBLE POP", score: 2060, streak: 6, msLeft: 39000 });
  assert.match(hud, /SCORE 2,060.*STREAK ×6.*0:39/);
  assert.match(hud, /GAME · BUBBLE POP/);
  assert.match(html(ReasonBand, { text: null }), /data-testid="reason-band"/);
  assert.match(html(Legend, {}), /stem · ending \/ letters · whole form/);
  assert.match(
    html(FrameChoices, { prompt: "yo ___", english: "I come", infinitive: "venir", options: [{ id: 0, label: "vengo" }], disabled: [], onPick() {} }),
    /1.*vengo/,
  );
});

test("HUD shows moves left only when given, and rounds the clock up", () => {
  assert.doesNotMatch(html(GameHud, { eyebrow: "E", score: 0, streak: 0, msLeft: 0 }), /MOVES/);
  assert.match(html(GameHud, { eyebrow: "E", score: 0, streak: 0, msLeft: 0 }), /0:00/);
  assert.match(html(GameHud, { eyebrow: "E", score: 10, streak: 1, msLeft: 38_100, movesLeft: 12 }), /0:39.*MOVES 12/);
  assert.match(html(GameHud, { eyebrow: "E", score: 10, streak: 1, msLeft: 61_000 }), /1:01/);
});

test("reason band keeps its height and shows the miss text", () => {
  const empty = html(ReasonBand, { text: null });
  const shown = html(ReasonBand, { text: "salo ✗ → salgo · salir is a -go verb" });
  assert.match(shown, /salo ✗ → salgo/);
  assert.equal(tagOf(empty, 'data-testid="reason-band"').match(/h-\d+|min-h-\d+/)?.[0], tagOf(shown, 'data-testid="reason-band"').match(/h-\d+|min-h-\d+/)?.[0]);
  assert.match(tagOf(shown, 'data-testid="reason-band"'), /background-color:#2a1414/);
  assert.match(tagOf(shown, 'data-testid="reason-band"'), /border-color:#7a3b3b/);
});

test("live region is polite and carries the message", () => {
  const out = html(LiveRegion, { message: "vengo, I come" });
  assert.match(tagOf(out, 'aria-live="polite"'), /aria-live="polite"/);
  assert.match(out, />vengo, I come</);
});

test("completion flash shows form and English, empty when idle", () => {
  const completion = { t: 1, infinitive: "venir", person: "yo", familyId: "es.present.go-yo", form: "vengo", english: "I come", points: 100 };
  assert.match(html(CompletionFlash, { completion, onSaveCard() {} }), /vengo · I come/);
  assert.doesNotMatch(html(CompletionFlash, { completion: null, onSaveCard() {} }), /·/);
  const tag = tagOf(html(CompletionFlash, { completion, onSaveCard() {} }), 'aria-keyshortcuts="S"');
  assert.match(tag, /role="button"/);
  assert.match(tag, /aria-label="Save vengo, I come, to Verb Cards \(S\)"/);
});

test("long press fires after 500 ms, and cancelling stops it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const saved = [];
  const press = createLongPress((c) => saved.push(c.t));
  assert.equal(LONG_PRESS_MS, 500);
  press.start({ t: 1 });
  t.mock.timers.tick(499);
  assert.deepEqual(saved, []);
  t.mock.timers.tick(1);
  assert.deepEqual(saved, [1]);
  press.start({ t: 2 });
  t.mock.timers.tick(300);
  press.cancel();
  t.mock.timers.tick(1000);
  assert.deepEqual(saved, [1]);
});

test("long press saves the completion captured when the press started", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const saved = [];
  const press = createLongPress((c) => saved.push(c.form));
  press.start({ t: 1, form: "vengo" });
  t.mock.timers.tick(200);
  // A newer completion arrives while the finger is still down: the old one is still the one saved.
  t.mock.timers.tick(300);
  assert.deepEqual(saved, ["vengo"]);
});

test("a long press plus its contextmenu event saves once; a new completion saves again", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const saved = [];
  const press = createLongPress((c) => saved.push(c.t));
  press.start({ t: 7 });
  t.mock.timers.tick(500);
  press.save({ t: 7 });
  press.save({ t: 7 });
  assert.deepEqual(saved, [7]);
  press.save({ t: 8 });
  assert.deepEqual(saved, [7, 8]);
});

test("S saves only without modifiers and outside editable fields", () => {
  assert.equal(isSaveKey({ key: "s", target: { tagName: "DIV" } }), true);
  assert.equal(isSaveKey({ key: "S", target: { tagName: "BUTTON" } }), true);
  assert.equal(isSaveKey({ key: "s", ctrlKey: true }), false);
  assert.equal(isSaveKey({ key: "s", metaKey: true }), false);
  assert.equal(isSaveKey({ key: "s", altKey: true }), false);
  assert.equal(isSaveKey({ key: "s", repeat: true }), false);
  assert.equal(isSaveKey({ key: "s", target: { tagName: "INPUT" } }), false);
  assert.equal(isSaveKey({ key: "s", target: { tagName: "TEXTAREA" } }), false);
  assert.equal(isSaveKey({ key: "s", target: { tagName: "DIV", isContentEditable: true } }), false);
  assert.equal(isSaveKey({ key: "a" }), false);
});

test("choice keys 1-6 map to enabled options only", () => {
  const options = [10, 11, 12, 13, 14, 15, 16].map((id) => ({ id, label: `f${id}` }));
  assert.equal(choiceForKey("1", options, []), 10);
  assert.equal(choiceForKey("6", options, []), 15);
  assert.equal(choiceForKey("7", options, []), null);
  assert.equal(choiceForKey("0", options, []), null);
  assert.equal(choiceForKey("a", options, []), null);
  assert.equal(choiceForKey("2", options, [11]), null);
  assert.equal(choiceForKey("3", options.slice(0, 2), []), null);
});

test("choices number options and disable the ones already tried", () => {
  const out = html(FrameChoices, {
    prompt: "yo ___",
    english: "I come",
    infinitive: "venir",
    options: [{ id: 4, label: "vengo" }, { id: 5, label: "venzo" }],
    disabled: [5],
    onPick() {},
  });
  assert.match(out, /1.*vengo.*2.*venzo/);
  assert.match(tagOf(out, 'data-choice="5"'), /\sdisabled(=|\s|>)/);
  assert.doesNotMatch(tagOf(out, 'data-choice="4"'), /\sdisabled(=|\s|>)/);
});

test("useReducedMotion returns a boolean on the server render", () => {
  const Probe = () => createElement("i", null, typeof useReducedMotion());
  assert.equal(html(Probe, {}), "<i>boolean</i>");
});

const bubbleCfg = { game: "bubble", family: "es.present.go-yo", level: null, source: { kind: "core" }, seed: 5, listMode: false, reducedMotion: false };

test("bubble screen renders frame, legend and numbered pieces", () => {
  const h = html(BubblePopGame, { data: miniData(), config: bubbleCfg, onEnd() {}, onSaveCard() {} });
  assert.match(h, /GAME · BUBBLE POP · THE &quot;-GO&quot; FAMILY/);
  assert.equal((h.match(/data-testid="bubble"/g) ?? []).length, 4);
  assert.match(h, /data-testid="reason-band"/);
});

test("bubble frame reads prompt · English · infinitive and keys are numbered 1-4", () => {
  const h = html(BubblePopGame, { data: miniData(), config: bubbleCfg, onEnd() {}, onSaveCard() {} });
  const frame = tagOf(h, 'data-testid="bubble-frame"');
  assert.ok(frame);
  const text = h.match(/data-testid="bubble-frame"[^>]*>([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, "");
  assert.match(text, /^yo ___ · I \w+ · \w+ir|^yo ___ · I \w+ · \w+er/);
  for (const n of [1, 2, 3, 4]) assert.match(h, new RegExp(`data-key="${n}"`));
  assert.match(h, /data-testid="legend"/);
  assert.match(h, /data-testid="live-region"/);
  assert.match(tagOf(h, 'data-testid="bubble-board"'), /data-motion="rise"/);
});

test("list mode renders the frame as numbered choices with a countdown, no rising board", () => {
  const h = html(BubblePopGame, { data: miniData(), config: { ...bubbleCfg, listMode: true }, onEnd() {}, onSaveCard() {} });
  assert.match(h, /data-testid="frame-choices"/);
  assert.equal((h.match(/data-choice="/g) ?? []).length, 4);
  assert.match(h, /data-testid="countdown"/);
  assert.doesNotMatch(h, /data-motion="rise"/);
});

test("dev-only answer marker is absent outside dev builds", () => {
  const h = html(BubblePopGame, { data: miniData(), config: bubbleCfg, onEnd() {}, onSaveCard() {} });
  assert.doesNotMatch(h, /data-correct=/);
});

test("bubble eyebrow says MIX for a mixed round", () => {
  const h = html(BubblePopGame, { data: miniData(), config: { ...bubbleCfg, family: "mix" }, onEnd() {}, onSaveCard() {} });
  assert.match(h, /GAME · BUBBLE POP · MIX/);
});
