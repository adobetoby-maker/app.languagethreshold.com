import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBubbleRound } from "../src/lib/verb-games/bubble.ts";
import { FAMILIES } from "../src/lib/verb-games/families.ts";
import {
  REASON_MS,
  ROUND_MS,
  SENTENCE_AFTER_MS,
  boardScopes,
  bubbleCount,
  bubbleLifetimeMs,
  onCorrect,
  roundFamilies,
  scopeKey,
  streakMultiplier,
} from "../src/lib/verb-games/rules.ts";
import { miniData } from "./helpers/verb-fixture.mjs";

const cfg = { game: "bubble", family: "es.present.go-yo", level: null, source: { kind: "core" }, seed: 11, listMode: false, reducedMotion: false };
const realData = () => JSON.parse(readFileSync(new URL("../src/data/verb-patterns/es.json", import.meta.url), "utf8"));

test("same seed, same frames and pieces", () => {
  assert.deepEqual(createBubbleRound(miniData(), cfg).view(), createBubbleRound(miniData(), cfg).view());
});
test("correct pick scores with streak and speed bonus", () => {
  const r = createBubbleRound(miniData(), cfg); const v = r.view();
  const right = v.pieces.find((p) => p.correct).id;
  const [done] = r.pick(1000, 0, right);
  assert.equal(done.completion.points, 100 + Math.round(20 * 5000 / 6000));
  assert.equal(r.view().frame.index, 1);
});
test("a log that omits escapes cannot avoid the miss", () => {
  const r = createBubbleRound(miniData(), cfg);
  const out = r.advance(9000);
  assert.equal(out[0].kind, "miss"); assert.equal(out[0].miss.attempted, null);
  assert.equal(r.view().streak, 0); assert.equal(r.view().shownAt, 6000);
});
test("wrong pick shows the reason and keeps the frame", () => {
  const r = createBubbleRound(miniData(), cfg); const v = r.view();
  const wrong = v.pieces.find((p) => !p.correct);
  const [m] = r.pick(500, 0, wrong.id);
  assert.match(m.miss.reason, / ✗ → .* · .* is a -go verb: the yo form ends in -go\.$/);
  assert.deepEqual(r.pick(600, 0, wrong.id), [{ kind: "invalid" }]);
});
test("scope keys", () => {
  assert.equal(scopeKey(cfg), "go-yo");
  assert.equal(scopeKey({ ...cfg, game: "crush", level: 3 }), "L3:crossover");
  assert.equal(scopeKey({ ...cfg, game: "crush", level: 1, family: "mix" }), "L1:mix");
});

test("constants and curves", () => {
  assert.deepEqual(ROUND_MS, { bubble: 60_000, crush: 90_000 });
  assert.equal(REASON_MS, 1200);
  assert.equal(SENTENCE_AFTER_MS, 30_000);
  assert.deepEqual([0, 9999, 10_000, 50_000, 90_000].map(bubbleLifetimeMs), [6000, 6000, 5500, 3500, 3500]);
  assert.deepEqual([0, 19_999, 20_000, 39_999, 40_000].map(bubbleCount), [4, 4, 5, 5, 6]);
  assert.deepEqual([0, 1, 7, 8, 9, 50].map(streakMultiplier), [0, 1, 7, 8, 8, 8]);
});
test("ruling F21: streak increments first, so the first correct answer is x1", () => {
  assert.deepEqual(onCorrect(0), { streak: 1, multiplier: 1 });
  assert.deepEqual(onCorrect(7), { streak: 8, multiplier: 8 });
  assert.deepEqual(onCorrect(8), { streak: 9, multiplier: 8 });
});
test("pieces: right count by time, one correct, exact form only", () => {
  const data = realData();
  for (const [from, n] of [[0, 4], [20_000, 5], [40_000, 6]]) {
    const r = createBubbleRound(data, { ...cfg, family: "mix", seed: 5 });
    let t = 0;
    while (r.view().shownAt < from) { t += 700; const v = r.view(); r.pick(t, v.frame.index, v.pieces.find((p) => p.correct).id); }
    const v = r.view();
    assert.equal(v.pieces.length, n, `from ${from}`);
    assert.equal(v.pieces.length, bubbleCount(v.shownAt));
    assert.equal(v.pieces.filter((p) => p.correct).length, 1);
    assert.equal(v.pieces.find((p) => p.correct).label, v.frame.answer);
    assert.equal(new Set(v.pieces.map((p) => p.label)).size, v.pieces.length);
  }
});
test("streak builds to x8 and a miss resets it; score never drops", () => {
  const r = createBubbleRound(miniData(), cfg);
  const points = [];
  for (let i = 0; i < 10; i++) {
    const v = r.view();
    const [done] = r.pick(i * 100 + 1, v.frame.index, v.pieces.find((p) => p.correct).id);
    points.push(done.completion.points - Math.round(20 * (v.deadline - (i * 100 + 1)) / (v.deadline - v.shownAt)));
  }
  assert.deepEqual(points, [100, 200, 300, 400, 500, 600, 700, 800, 800, 800]);
  const before = r.view().score;
  const v = r.view();
  r.pick(1500, v.frame.index, v.pieces.find((p) => !p.correct).id);
  assert.equal(r.view().streak, 0);
  assert.equal(r.view().score, before);
});
test("stale frame, bad piece, removed piece and late picks are invalid and not logged", () => {
  const r = createBubbleRound(miniData(), cfg);
  assert.deepEqual(r.pick(100, 7, 0), [{ kind: "invalid" }]);
  assert.deepEqual(r.pick(100, 0, 99), [{ kind: "invalid" }]);
  assert.deepEqual(r.pick(100, 0, -1), [{ kind: "invalid" }]);
  assert.deepEqual(r.pick(100, 0, 1.5), [{ kind: "invalid" }]);
  assert.deepEqual(r.pick(Number.NaN, 0, 0), [{ kind: "invalid" }]);
  assert.deepEqual(r.events(), []);
  const v = r.view();
  r.pick(200, 0, v.pieces.find((p) => p.correct).id);
  assert.deepEqual(r.pick(150, 1, 0), [{ kind: "invalid" }], "time cannot run backwards");
  assert.equal(r.events().length, 1);
  assert.deepEqual(r.events()[0], { t: 200, kind: "pick", frame: 0, piece: v.pieces.find((p) => p.correct).id });
});
test("a pick on a frame that already escaped is invalid but the escape is reported", () => {
  const r = createBubbleRound(miniData(), cfg);
  const out = r.pick(6500, 0, 0);
  assert.equal(out[0].kind, "miss"); assert.equal(out[0].miss.attempted, null);
  assert.equal(out.at(-1).kind, "invalid");
  assert.equal(r.events().length, 0);
  assert.equal(r.view().frame.index, 1);
});
test("sentences appear from 30 s on when the form has one", () => {
  const data = realData();
  const early = createBubbleRound(data, { ...cfg, family: "mix", seed: 3 }).view().frame;
  assert.ok(early.prompt.endsWith(" ___"));
  const r = createBubbleRound(data, { ...cfg, family: "mix", seed: 3 });
  let sawSentence = false;
  for (let t = 0; t <= 59_000; t += 500) {
    r.advance(t);
    const f = r.view().frame;
    if (r.view().shownAt >= SENTENCE_AFTER_MS && f.sentence) { assert.equal(f.prompt, f.sentence.target); sawSentence = true; }
    if (r.view().shownAt < SENTENCE_AFTER_MS) assert.ok(f.prompt.endsWith(" ___"));
  }
  assert.ok(sawSentence);
});
test("round ends at 60 s: no escape at or after the end, no picks after", () => {
  const r = createBubbleRound(miniData(), cfg);
  const out = r.advance(70_000);
  assert.equal(out.at(-1).kind, "end");
  assert.ok(out.filter((o) => o.kind === "miss").every((o) => o.miss.t < 60_000));
  assert.equal(r.view().ended, true);
  assert.deepEqual(r.pick(70_001, r.view().frame.index, 0), [{ kind: "invalid" }]);
  assert.deepEqual(r.advance(80_000), []);
  const res = r.end(80_000);
  assert.equal(res.durationMs, 60_000);
  assert.equal(res.won, false);
});
test("result tallies", () => {
  const r = createBubbleRound(miniData(), cfg);
  for (let i = 0; i < 3; i++) { const v = r.view(); r.pick(100 * (i + 1), v.frame.index, v.pieces.find((p) => p.correct).id); }
  const v = r.view();
  r.pick(500, v.frame.index, v.pieces.find((p) => !p.correct).id);
  const res = r.end(1000);
  assert.deepEqual([res.picks, res.correct, res.bestStreak, res.misses.length, res.completions.length, res.moves, res.durationMs], [4, 3, 3, 1, 3, 0, 1000]);
  assert.equal(res.score, res.completions.reduce((s, c) => s + c.points, 0));
});

test("replaying only the picks reproduces the round, escapes included", () => {
  const data = realData();
  const config = { ...cfg, family: "mix", seed: 1234 };
  const live = createBubbleRound(data, config);
  let t = 0;
  const rnd = (() => { let a = 7; return () => (a = (a * 1103515245 + 12345) % 2147483648) / 2147483648; })();
  while (t < 61_000) {
    t += 100;
    live.advance(t);
    const v = live.view();
    if (v.ended) break;
    const roll = rnd();
    if (roll < 0.12) live.pick(t, v.frame.index, v.pieces.find((p) => p.correct).id);
    else if (roll < 0.16) live.pick(t, v.frame.index, v.pieces.find((p) => !p.correct && !v.removed.includes(p.id)).id);
  }
  const a = live.end(61_000);
  const replay = createBubbleRound(data, config);
  for (const e of live.events()) replay.pick(e.t, e.frame, e.piece);
  const b = replay.end(61_000);
  assert.deepEqual(b, a);
  assert.ok(a.completions.length > 0 && a.misses.some((m) => m.attempted === null) && a.misses.some((m) => m.attempted !== null));
});

test("roundFamilies: single, mix (FAMILIES order), crossover list, source filter", () => {
  const data = miniData();
  assert.deepEqual(roundFamilies(cfg, data), ["es.present.go-yo"]);
  const mix = roundFamilies({ ...cfg, family: "mix" }, data);
  assert.deepEqual(mix, FAMILIES.map((f) => f.id).filter((id) => mix.includes(id)));
  assert.ok(mix.length >= 5);
  assert.deepEqual(roundFamilies({ ...cfg, game: "crush", level: 3, family: "es.present.ar" }, data), ["es.present.go-yo", "es.present.e-ie"]);
  assert.deepEqual(roundFamilies({ ...cfg, game: "crush", level: 1, family: "es.present.ar" }, data), ["es.present.ar"]);
  assert.deepEqual(roundFamilies({ ...cfg, family: "mix", source: { kind: "module", moduleId: "roofing" } }, data).includes("es.present.ir"), true);
});

test("boardScopes: every key comes from scopeKey, no duplicates, crossover once", () => {
  const data = realData();
  const bubble = boardScopes("bubble", data);
  assert.deepEqual(bubble.map((s) => s.key), [...FAMILIES.map((f) => f.id.replace("es.present.", "")), "mix"]);
  const crush = boardScopes("crush", data);
  const keys = crush.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(keys.filter((k) => k.startsWith("L3")), ["L3:crossover"]);
  assert.ok(keys.includes("L1:go-yo") && keys.includes("L2:mix") && keys.includes("L4:e-ie"));
  assert.equal(keys.length, 3 * (FAMILIES.length + 1) + 1);
  assert.ok([...bubble, ...crush].every((s) => s.label.length > 0));
  assert.throws(() => scopeKey({ ...cfg, game: "crush", level: null }));
});
