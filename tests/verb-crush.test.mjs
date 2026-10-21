// Built by TAC — 2026-10-20
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CRUSH_SIZE, adjacent, createCrushRound } from "../src/lib/verb-games/crush.ts";
import { isAnyPresentForm, norm } from "../src/lib/verb-games/distractors.ts";
import { ROUND_MS, levelAvailable, streakMultiplier } from "../src/lib/verb-games/rules.ts";
import { miniData } from "./helpers/verb-fixture.mjs";

const cfg = { game: "crush", family: "es.present.go-yo", level: 1, source: { kind: "core" }, seed: 7, listMode: false, reducedMotion: false };
const realData = () => JSON.parse(readFileSync(new URL("../src/data/verb-patterns/es.json", import.meta.url), "utf8"));

const tile = (kind, label, infinitive) => ({ kind, label, infinitive });
/** Every other cell is an ending "amos" (endings never pair with endings). */
function layoutWith(pairs) {
  const cells = Array.from({ length: CRUSH_SIZE * CRUSH_SIZE }, () => tile("ending", "amos", "hablar"));
  for (const [i, t] of pairs) cells[i] = t;
  return cells.map((t, id) => ({ id, ...t }));
}

/** Stem -> ending pairs on a board: [index of stem, concatenation]. */
function pairsOf(cells) {
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    if (i % CRUSH_SIZE === CRUSH_SIZE - 1) continue;
    if (cells[i].kind === "stem" && cells[i + 1].kind === "ending") out.push([i, norm(cells[i].label + cells[i + 1].label)]);
  }
  return out;
}

/** The goal forms of a level 1 go-yo round in the mini fixture. */
const MINI_GOALS = new Set(["tengo", "vengo", "salgo", "pongo", "digo"]);

test("deterministic board with a guaranteed first pop and no free pops", () => {
  const a = createCrushRound(miniData(), cfg), b = createCrushRound(miniData(), cfg);
  assert.deepEqual(a.view().cells, b.view().cells);
  assert.ok(pairsOf(a.view().cells).every(([, w]) => !MINI_GOALS.has(w)), "no goal pair at the start");
  const [x, y] = a.findPopSwap(); const out = a.swap(500, x, y);
  assert.equal(out.find((o) => o.kind === "complete").completion.points, 50);
  assert.equal(a.view().movesLeft, 19);
});
test("trap costs the streak, not a move, and is reverted", () => {
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "ten", "tener")], [2, tile("ending", "o", "tener")]]) });
  const [m] = r.swap(400, 1, 2);
  assert.equal(m.miss.reason, "teno ✗ → tengo · tener is a -go verb: the yo form ends in -go.");
  assert.equal(r.view().movesLeft, 20); assert.equal(r.view().cells[2].label, "o");
});
test("valid non-goal pair is neutral, never a miss", () => { // Review Focus 2
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "com", "comer")], [2, tile("ending", "o", "comer")]]) });
  assert.deepEqual(r.swap(400, 1, 2).filter((o) => o.kind === "miss"), []);
  assert.equal(r.view().movesLeft, 19);
});
test("levels: go-yo has levels 1, 3 and 4 but not 2", () => {
  const d = miniData();
  assert.deepEqual(d.crushLevels.map((l) => levelAvailable(d, l, "es.present.go-yo", { kind: "core" })), [true, false, true, true]);
});
test("non-adjacent swap is invalid", () => {
  assert.deepEqual(createCrushRound(miniData(), cfg).swap(300, 0, 2), [{ kind: "invalid" }]);
});

// ---- Beyond the brief's five cases -------------------------------------------------------

test("adjacent: orthogonal neighbors only, same row for left/right", () => {
  assert.equal(adjacent(0, 1), true);
  assert.equal(adjacent(0, 5), true);
  assert.equal(adjacent(4, 5), false, "row wrap is not adjacent");
  assert.equal(adjacent(0, 6), false);
  assert.equal(adjacent(3, 3), false);
  assert.equal(adjacent(24, 25), false);
  assert.equal(adjacent(-1, 0), false);
  assert.equal(adjacent(0.5, 1.5), false);
});

test("trap: miss fields, streak reset, logged, english beside the miss", () => {
  const cells = layoutWith([
    [0, tile("stem", "ten", "tener")], [2, tile("ending", "go", "tener")],
    [10, tile("stem", "ten", "tener")], [12, tile("ending", "o", "tener")],
    [15, tile("stem", "pon", "poner")], [17, tile("ending", "go", "poner")], // keeps a pop swap, so no regeneration
  ]);
  const r = createCrushRound(miniData(), cfg, { layout: cells });
  const [pop] = r.swap(100, 1, 2);
  assert.equal(pop.kind, "complete");
  assert.deepEqual([pop.completion.form, pop.completion.english, pop.completion.points], ["tengo", "I have", 50]);
  // Refills can chain extra pops (cascades), so the streak is at least 1 here.
  const before = r.view().streak;
  assert.ok(before >= 1 && !r.view().ended);
  const out = r.swap(300, 11, 12);
  assert.equal(out.length, 1);
  const { miss } = out[0];
  assert.deepEqual(
    [miss.t, miss.infinitive, miss.person, miss.familyId, miss.attempted, miss.correct, miss.english],
    [300, "tener", "yo", "es.present.go-yo", "teno", "tengo", "I have"],
  );
  assert.equal(r.view().streak, 0);
  assert.equal(r.view().lastReason, miss.reason);
  assert.deepEqual(r.events().map((e) => [e.t, e.a, e.b]), [[100, 1, 2], [300, 11, 12]]);
  const res = r.end(ROUND_MS.crush);
  assert.deepEqual([res.moves, res.picks, res.correct, res.bestStreak, res.misses.length], [1, 2, before, before, 1]);
});

test("a goal is a pop on the exact form only; a wrong ending never pops", () => {
  // ten + go pops; ten + gos is not a goal and not a present form -> trap, never a pop.
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "ten", "tener")], [2, tile("ending", "es", "tener")]]) });
  const out = r.swap(100, 1, 2);
  assert.equal(out.filter((o) => o.kind === "complete").length, 0);
  assert.equal(out[0].kind, "miss");
  assert.equal(out[0].miss.correct, "tienes");
});

test("time guards: earlier t, non-finite t, bad cells and t at the round end are invalid and not logged", () => {
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "com", "comer")], [2, tile("ending", "o", "comer")]]) });
  r.swap(1000, 1, 2);
  assert.deepEqual(r.swap(999, 6, 7), [{ kind: "invalid" }], "time cannot run backwards");
  assert.deepEqual(r.swap(Number.NaN, 6, 7), [{ kind: "invalid" }]);
  assert.deepEqual(r.swap(1100, 6, 6), [{ kind: "invalid" }]);
  assert.deepEqual(r.swap(1100, 24, 25), [{ kind: "invalid" }]);
  assert.deepEqual(r.swap(ROUND_MS.crush, 6, 7), [{ kind: "invalid" }]);
  assert.equal(r.events().length, 1);
  assert.equal(r.view().t, 1000);
});

test("round ends at 90 s through advance; nothing after", () => {
  const r = createCrushRound(miniData(), cfg);
  assert.deepEqual(r.advance(89_999), []);
  assert.deepEqual(r.advance(95_000), [{ kind: "end" }]);
  assert.equal(r.view().ended, true);
  const [x, y] = [0, 1];
  assert.deepEqual(r.swap(95_001, x, y), [{ kind: "invalid" }]);
  assert.deepEqual(r.advance(96_000), []);
  const res = r.end(99_000);
  assert.equal(res.durationMs, ROUND_MS.crush);
  assert.equal(res.won, false);
});

test("reaching the goal wins and ends the round at that swap's time", () => {
  const r = createCrushRound(miniData(), cfg);
  let t = 0;
  let last = [];
  while (!r.view().ended && t < 80_000) {
    t += 900;
    const s = r.findPopSwap();
    assert.ok(s, "a pop swap always exists while the round runs");
    last = r.swap(t, s[0], s[1]);
  }
  const v = r.view();
  assert.equal(v.won, true);
  assert.ok(v.made >= v.goalCount);
  assert.equal(last.at(-1).kind, "end");
  const res = r.end(ROUND_MS.crush);
  assert.equal(res.won, true);
  assert.equal(res.durationMs, t, "an ended round keeps its end time");
  assert.equal(res.score, res.completions.reduce((s, c) => s + c.points, 0));
});

test("running out of moves ends the round without a win", () => {
  // ten-amos-go keeps a pop swap (1, 2) on the board, so the board never regenerates.
  const r = createCrushRound(miniData(), cfg, { layout: layoutWith([[0, tile("stem", "ten", "tener")], [2, tile("ending", "go", "tener")]]) });
  let t = 0;
  for (let i = 0; i < 20; i++) {
    const v = r.view();
    // swap two cells in the last row that hold endings (never a pop, never a trap)
    const out = r.swap((t += 100), 20 + (i % 4), 21 + (i % 4));
    if (i < 19) assert.ok(!out.some((o) => o.kind === "end"), `move ${i}`);
    else assert.equal(out.at(-1).kind, "end");
    assert.equal(v.ended, false);
  }
  assert.equal(r.view().movesLeft, 0);
  assert.equal(r.view().won, false);
  assert.deepEqual(r.swap((t += 100), 20, 21), [{ kind: "invalid" }]);
});

test("generation over many seeds and levels: no goal pair, a pop swap, and the move budget", () => {
  const data = realData();
  for (const [family, level] of [["es.present.go-yo", 1], ["mix", 2], ["mix", 3], ["es.present.e-ie", 4], ["es.present.ar", 4]]) {
    const row = data.crushLevels.find((l) => l.level === level);
    for (let seed = 0; seed < 12; seed++) {
      const r = createCrushRound(data, { ...cfg, family, level, seed });
      const v = r.view();
      assert.equal(v.cells.length, 25);
      assert.equal(new Set(v.cells.map((c) => c.id)).size, 25);
      assert.equal(v.goalCount, row.goalCount);
      assert.equal(v.movesLeft, row.moveBudget);
      assert.ok(r.findPopSwap(), `${family} L${level} seed ${seed}`);
      assert.equal(v.made, 0);
    }
  }
});

test("F14: about a third of the starting stem->ending pairs are seeded invalid words", () => {
  // Tolerance: over seeds 0-99 per level, the invalid share lies in [0.25, 0.42] (target 1/3,
  // measured 0.30-0.33), and boards average at least 3 starting pairs (measured about 5.0).
  const data = realData();
  const cache = new Map();
  const valid = (w) => { if (!cache.has(w)) cache.set(w, isAnyPresentForm(data, w)); return cache.get(w); };
  const levels = [
    ["es.present.go-yo", 1], ["es.present.ar", 1], ["es.present.er", 1], ["es.present.ir", 1],
    ["mix", 2], ["mix", 3], ["es.present.o-ue", 2], ["es.present.ar", 4],
  ];
  for (const [family, level] of levels) {
    let pairs = 0, invalid = 0;
    const seeds = 100;
    for (let seed = 0; seed < seeds; seed++) {
      const cells = createCrushRound(data, { ...cfg, family, level, seed }).view().cells;
      for (const [, word] of pairsOf(cells)) {
        pairs++;
        if (!valid(word)) invalid++;
      }
    }
    const share = invalid / pairs;
    assert.ok(pairs / seeds >= 3, `${family} L${level}: ${(pairs / seeds).toFixed(2)} pairs per board`);
    assert.ok(share >= 0.25 && share <= 0.42, `${family} L${level}: share ${share.toFixed(3)} of ${pairs}`);
  }
});

test("F14: seeded traps are deterministic and plausible", () => {
  // Own-class regular endings first (ten + o); a regular stem, whose own-class endings all make
  // words, takes another class's ending or -go (habl + es). Never a present form of any verb.
  const data = realData();
  const c1 = { ...cfg, seed: 42 };
  assert.deepEqual(createCrushRound(data, c1).view().cells, createCrushRound(data, c1).view().cells);
  const regular = { ar: ["o", "as", "a", "amos", "an"], er: ["o", "es", "e", "emos", "en"], ir: ["o", "es", "e", "imos", "en"] };
  const every = [...new Set([...Object.values(regular).flat(), "go"])];
  let regularTraps = 0;
  for (const [family, level] of [["mix", 2], ["es.present.ar", 1], ["es.present.ar", 4]]) {
    for (let seed = 0; seed < 10; seed++) {
      const cells = createCrushRound(data, { ...cfg, family, level, seed }).view().cells;
      for (const [i, word] of pairsOf(cells)) {
        if (isAnyPresentForm(data, word)) continue;
        const stem = cells[i].label;
        const inf = norm(cells[i].infinitive).replace(/ír$/, "ir");
        const own = regular[inf.slice(-2)].filter((e) => !isAnyPresentForm(data, stem + e));
        if (own.length === 0) regularTraps++;
        assert.ok((own.length > 0 ? own : every).includes(cells[i + 1].label), `${word} from ${cells[i].infinitive}`);
      }
    }
  }
  assert.ok(regularTraps > 0, "regular stems get traps too");
});

test("fallback: the placed pop is the only pop and nothing pops for free", () => {
  // attempts: 0 forces the fallback on an unseeded draw, which on the mini fixture often holds
  // goal pairs (tengo, salgo...); every one of them must be cleared.
  const data = miniData();
  for (let seed = 0; seed < 40; seed++) {
    const r = createCrushRound(data, { ...cfg, seed }, { attempts: 0 });
    const cells = r.view().cells;
    assert.equal(cells[0].kind, "stem");
    assert.ok(MINI_GOALS.has(norm(cells[0].label + cells[2].label)), `seed ${seed}: goal at 0 + 2`);
    assert.ok(!MINI_GOALS.has(norm(cells[0].label + cells[1].label)), `seed ${seed}: filler is not a goal`);
    assert.deepEqual(pairsOf(cells).filter(([, w]) => MINI_GOALS.has(w)), [], `seed ${seed}: no free pop`);
    const out = r.swap(100, 1, 2);
    assert.equal(out[0].kind, "complete");
    assert.equal(out[0].completion.points, 50);
  }
});

test("replaying only the swaps reproduces the round: pops, cascades and a trap", () => {
  const data = realData();
  const rnd = (() => { let a = 7; return () => (a = (a * 1103515245 + 12345) % 2147483648) / 2147483648; })();
  let found = null;
  for (let seed = 1; seed <= 200 && !found; seed++) {
    for (const [family, level] of [["mix", 4], ["es.present.ar", 4], ["mix", 1]]) {
      const config = { ...cfg, family, level, seed };
      const live = createCrushRound(data, config);
      let t = 0, cascade = false, trap = false;
      while (!live.view().ended && t < ROUND_MS.crush + 1000) {
        t += 700;
        live.advance(t);
        const v = live.view();
        if (v.ended) break;
        let out;
        if (rnd() < 0.55) {
          const s = live.findPopSwap();
          out = live.swap(t, s[0], s[1]);
        } else {
          const a = Math.floor(rnd() * 25);
          const b = a % 5 < 4 && rnd() < 0.5 ? a + 1 : a + 5;
          out = live.swap(t, a, b);
        }
        let streak = v.streak;
        for (const o of out) {
          if (o.kind === "miss") trap = true;
          if (o.kind !== "complete") continue;
          streak++;
          const step = o.completion.points / (50 * streakMultiplier(streak));
          assert.ok(Number.isInteger(step) && step >= 1);
          if (step >= 2) cascade = true;
        }
      }
      const a = live.end(ROUND_MS.crush);
      const replay = createCrushRound(data, config);
      for (const e of live.events()) replay.swap(e.t, e.a, e.b);
      const b = replay.end(ROUND_MS.crush);
      assert.deepEqual(b, a, `replay of ${family} L${level} seed ${seed}`);
      assert.deepEqual(replay.view(), live.view());
      if (cascade && trap && a.completions.length > 0) { found = { family, level, seed }; break; }
    }
  }
  assert.ok(found, "some round had pops, a cascade and a trap");
});

test("Crush needs a level and a goal", () => {
  assert.throws(() => createCrushRound(miniData(), { ...cfg, level: null }));
  assert.throws(() => createCrushRound(miniData(), cfg, { layout: layoutWith([]).slice(0, 24) }));
});

test("levelAvailable on the real data", () => {
  const data = realData();
  const [l1, l2, l3, l4] = data.crushLevels;
  assert.equal(levelAvailable(data, l1, "mix", { kind: "core" }), true);
  assert.equal(levelAvailable(data, l2, "es.present.ar", { kind: "core" }), true);
  assert.equal(levelAvailable(data, l2, "es.present.go-yo", { kind: "core" }), false);
  assert.equal(levelAvailable(data, l3, "es.present.ar", { kind: "core" }), true, "crossover ignores the picked family");
  assert.equal(levelAvailable(data, l4, "es.present.o-ue", { kind: "core" }), true);
});
