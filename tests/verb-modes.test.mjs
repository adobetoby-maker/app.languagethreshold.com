// Built by TAC — 2026-10-21
// Verb Games round modes (timed / count / forever) and multi-pattern pools: engines, scoring, keys.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBubbleRound } from "../src/lib/verb-games/bubble.ts";
import { createCrushRound } from "../src/lib/verb-games/crush.ts";
import {
  MAX_UNTIMED_EVENTS,
  ROUND_MS,
  UNTIMED_MAX_MS,
  crushTargets,
  familyPick,
  levelAvailable,
  modeOf,
  roundFamilies,
  roundLimitMs,
  scopeKey,
} from "../src/lib/verb-games/rules.ts";
import { buildRoundLog, scoreRound } from "../src/lib/verb-games/scoring.ts";
import { base, miniData, playHonest } from "./helpers/verb-fixture.mjs";

const realData = () => JSON.parse(readFileSync(new URL("../src/data/verb-patterns/es.json", import.meta.url), "utf8"));
const COUNT = (n) => ({ kind: "count", n });
const FOREVER = { kind: "forever" };

/** Bubble: pick the correct piece every `gap` ms, `picks` times (or until the round ends). */
function bubbleRight(round, picks, gap = 900, from = 0) {
  let t = from;
  for (let i = 0; i < picks && !round.view().ended; i++) {
    t += gap;
    const v = round.view();
    round.pick(t, v.frame.index, v.pieces.find((p) => p.correct).id);
  }
  return t;
}

/** Crush: play the first popping swap every `gap` ms until `stop()` or the round ends. */
function crushPop(round, stop, gap = 900) {
  let t = 0;
  while (!round.view().ended && !stop(round.view())) {
    t += gap;
    const s = round.findPopSwap();
    if (!s) break;
    round.swap(t, s[0], s[1]);
  }
  return t;
}

// ---- rules ------------------------------------------------------------------------------------

test("modeOf: an absent mode is timed; the round limit is the game clock only when timed", () => {
  assert.deepEqual(modeOf(base("bubble")), { kind: "timed" });
  assert.deepEqual(modeOf({ ...base("bubble"), mode: COUNT(10) }), COUNT(10));
  assert.equal(roundLimitMs(base("bubble")), ROUND_MS.bubble);
  assert.equal(roundLimitMs(base("crush")), ROUND_MS.crush);
  assert.equal(roundLimitMs({ ...base("bubble"), mode: { kind: "timed" } }), ROUND_MS.bubble);
  assert.equal(roundLimitMs({ ...base("bubble"), mode: FOREVER }), UNTIMED_MAX_MS);
  assert.equal(roundLimitMs({ ...base("crush"), mode: COUNT(5) }), UNTIMED_MAX_MS);
  assert.equal(MAX_UNTIMED_EVENTS, 2000);
});

test("familyPick: families win over family; one family is the same as family; FAMILIES order, no repeats", () => {
  assert.deepEqual(familyPick(base("bubble")), ["es.present.go-yo"]);
  assert.equal(familyPick({ ...base("bubble"), family: "mix" }), "mix");
  assert.deepEqual(familyPick({ ...base("bubble"), family: "mix", families: ["es.present.go-yo", "es.present.ar", "es.present.go-yo"] }), [
    "es.present.ar",
    "es.present.go-yo",
  ]);
  assert.deepEqual(familyPick({ ...base("bubble"), families: ["es.present.e-ie"] }), ["es.present.e-ie"]);
});

test("roundFamilies: a multi pick is exactly those families; Crush level 3 still uses its own list", () => {
  const d = miniData();
  const cfg = { ...base("bubble"), family: "mix", families: ["es.present.go-yo", "es.present.ar"] };
  assert.deepEqual(roundFamilies(cfg, d), ["es.present.ar", "es.present.go-yo"]);
  assert.deepEqual(roundFamilies({ ...cfg, game: "crush", level: 3 }, d), ["es.present.go-yo", "es.present.e-ie"]);
});

test("levelAvailable uses the union pool: go-yo alone has no level 2, go-yo + regular -ar does", () => {
  const d = miniData();
  const l2 = d.crushLevels.find((l) => l.level === 2);
  assert.equal(levelAvailable(d, l2, "es.present.go-yo", { kind: "core" }), false);
  assert.equal(levelAvailable(d, l2, ["es.present.go-yo", "es.present.ar"], { kind: "core" }), true);
});

test("scope keys: timed keys never change; modes and multi picks get their own keys", () => {
  const b = base("bubble");
  const c = base("crush");
  assert.equal(scopeKey(b), "go-yo");
  assert.equal(scopeKey({ ...b, mode: { kind: "timed" } }), "go-yo");
  assert.equal(scopeKey(c), "L1:go-yo");
  assert.equal(scopeKey({ ...c, mode: COUNT(10) }), "L1:go-yo|count10");
  assert.equal(scopeKey({ ...b, mode: FOREVER }), "go-yo|forever");
  assert.equal(scopeKey({ ...b, family: "mix", mode: COUNT(5) }), "mix|count5");
  assert.equal(scopeKey({ ...c, level: 3, mode: FOREVER }), "L3:crossover|forever");
  const multi = { ...b, family: "mix", families: ["es.present.go-yo", "es.present.ar"] };
  assert.equal(scopeKey(multi), "ar+go-yo");
  assert.equal(scopeKey({ ...multi, mode: FOREVER }), "ar+go-yo|forever");
});

test("crushTargets: count scales moves by N / goalCount, rounded up; timed and forever keep the level row", () => {
  const row = { level: 1, label: "", persons: ["yo"], families: "picked", goalCount: 5, moveBudget: 20 };
  const l4 = { level: 4, label: "", persons: "family", families: "picked", goalCount: 8, moveBudget: 16 };
  assert.deepEqual(crushTargets(row, { kind: "timed" }), { goalCount: 5, moveBudget: 20 });
  assert.deepEqual(crushTargets(row, FOREVER), { goalCount: 5, moveBudget: 20 });
  assert.deepEqual(crushTargets(row, COUNT(10)), { goalCount: 10, moveBudget: 40 });
  assert.deepEqual(crushTargets(l4, COUNT(5)), { goalCount: 5, moveBudget: 10 });
  assert.deepEqual(crushTargets(l4, COUNT(15)), { goalCount: 15, moveBudget: 30 });
});

// ---- Bubble -----------------------------------------------------------------------------------

test("bubble timed: an explicit timed mode plays exactly like no mode", () => {
  const a = playHonest(miniData(), base("bubble"));
  const b = playHonest(miniData(), { ...base("bubble"), mode: { kind: "timed" } });
  assert.deepEqual(a.result, b.result);
  assert.deepEqual(a.log.events, b.log.events);
});

test("bubble count 5: ends on the fifth correct pick, with the same points per pick as timed", () => {
  const d = miniData();
  const timed = createBubbleRound(d, base("bubble"));
  const count = createBubbleRound(d, { ...base("bubble"), mode: COUNT(5) });
  bubbleRight(timed, 5);
  const t = bubbleRight(count, 5);
  const v = count.view();
  assert.equal(v.ended, true);
  assert.equal(v.made, 5);
  const r = count.end(t + 5000);
  assert.equal(r.correct, 5);
  assert.equal(r.durationMs, t);
  assert.equal(r.won, true);
  assert.deepEqual(
    r.completions.map((c) => c.points),
    timed.end(t).completions.map((c) => c.points),
  );
  // Nothing is taken after the end.
  assert.deepEqual(count.pick(t + 100, v.frame.index, 0), [{ kind: "invalid" }]);
});

test("bubble count: no clock, so a pick after 60 s still counts; escapes are misses and play goes on", () => {
  const d = miniData();
  const r = createBubbleRound(d, { ...base("bubble"), mode: COUNT(10) });
  const out = r.advance(65_000);
  assert.ok(out.some((o) => o.kind === "miss"));
  assert.equal(out.some((o) => o.kind === "end"), false);
  assert.equal(r.view().ended, false);
  const v = r.view();
  const res = r.pick(65_100, v.frame.index, v.pieces.find((p) => p.correct).id);
  assert.equal(res.some((o) => o.kind === "complete"), true);
  assert.equal(r.view().made, 1);
});

test("bubble count: the round still stops at the untimed cap", () => {
  const r = createBubbleRound(miniData(), { ...base("bubble"), mode: COUNT(15) });
  const out = r.advance(UNTIMED_MAX_MS);
  assert.equal(out.at(-1).kind, "end");
  assert.equal(r.end(UNTIMED_MAX_MS).durationMs, UNTIMED_MAX_MS);
});

test("bubble forever: the first wrong pick ends the round; score is the points so far", () => {
  const r = createBubbleRound(miniData(), { ...base("bubble"), mode: FOREVER });
  const t = bubbleRight(r, 4);
  const v = r.view();
  const out = r.pick(t + 500, v.frame.index, v.pieces.find((p) => !p.correct).id);
  assert.deepEqual(out.map((o) => o.kind), ["miss", "end"]);
  assert.equal(r.view().ended, true);
  const res = r.end(t + 9000);
  assert.equal(res.correct, 4);
  assert.equal(res.bestStreak, 4);
  assert.equal(res.misses.length, 1);
  assert.equal(res.durationMs, t + 500);
  assert.equal(res.score, res.completions.reduce((s, c) => s + c.points, 0));
  assert.equal(res.won, false);
});

test("bubble forever: an escaped frame is a miss and ends the round at its deadline", () => {
  const r = createBubbleRound(miniData(), { ...base("bubble"), mode: FOREVER });
  const t = bubbleRight(r, 2);
  const deadline = r.view().deadline;
  const out = r.advance(deadline + 4000);
  assert.deepEqual(out.map((o) => o.kind), ["miss", "end"]);
  assert.equal(out[0].miss.attempted, null);
  const res = r.end(deadline + 9000);
  assert.equal(res.durationMs, deadline);
  assert.equal(res.misses.length, 1);
  assert.ok(t < deadline);
});

test("bubble multi-family: every frame comes from the picked families only", () => {
  const d = realData();
  const families = ["es.present.go-yo", "es.present.e-i"];
  const r = createBubbleRound(d, { ...base("bubble"), family: "mix", families, seed: 3, mode: COUNT(15) });
  const seen = new Set();
  for (let i = 0; i < 15; i++) {
    const v = r.view();
    seen.add(v.frame.familyId);
    r.pick(1000 * (i + 1), v.frame.index, v.pieces.find((p) => p.correct).id);
  }
  assert.ok([...seen].every((f) => families.includes(f)), [...seen].join());
});

// ---- Crush ------------------------------------------------------------------------------------

test("crush timed: an explicit timed mode plays exactly like no mode", () => {
  const a = playHonest(miniData(), base("crush"));
  const b = playHonest(miniData(), { ...base("crush"), mode: { kind: "timed" } });
  assert.deepEqual(a.result, b.result);
});

test("crush count 10: the goal list has 10 forms and the moves scale; ends when the goal is met", () => {
  const r = createCrushRound(miniData(), { ...base("crush"), mode: COUNT(10) });
  assert.equal(r.view().goalCount, 10);
  assert.equal(r.view().movesLeft, 40);
  const t = crushPop(r, () => false);
  const v = r.view();
  assert.equal(v.ended, true);
  assert.equal(v.won, true);
  assert.ok(v.made >= 10);
  const res = r.end(t + 10_000);
  assert.equal(res.durationMs, t);
  assert.equal(res.won, true);
});

test("crush count: no clock, so a swap after 90 s still plays", () => {
  const r = createCrushRound(miniData(), { ...base("crush"), mode: COUNT(5) });
  assert.deepEqual(r.advance(95_000), []);
  const s = r.findPopSwap();
  assert.ok(r.swap(95_500, s[0], s[1]).some((o) => o.kind === "complete"));
});

test("crush forever: a full goal list deals a fresh one and tops the moves up by the level's moves", () => {
  const r = createCrushRound(miniData(), { ...base("crush"), mode: FOREVER });
  assert.equal(r.view().goalCount, 5);
  assert.equal(r.view().lists, 0);
  crushPop(r, (v) => v.lists >= 1);
  const v = r.view();
  assert.equal(v.ended, false);
  assert.equal(v.lists, 1);
  assert.equal(v.goalMade, v.made - 5);
  // 20 moves, minus the moves spent, plus 20 for the new list.
  const res = r.end(0);
  assert.equal(v.movesLeft, 20 - res.moves + 20);
});

test("crush forever: the first trap swap ends the round", () => {
  const tile = (kind, label, infinitive) => ({ kind, label, infinitive });
  const cells = Array.from({ length: 25 }, (_, id) => ({ id, ...tile("ending", "amos", "hablar") }));
  cells[0] = { id: 0, ...tile("stem", "ten", "tener") };
  cells[2] = { id: 2, ...tile("ending", "o", "tener") };
  const r = createCrushRound(miniData(), { ...base("crush"), mode: FOREVER }, { layout: cells });
  const out = r.swap(400, 1, 2);
  assert.deepEqual(out.map((o) => o.kind), ["miss", "end"]);
  assert.equal(r.view().ended, true);
  const res = r.end(9000);
  assert.equal(res.durationMs, 400);
  assert.equal(res.misses.length, 1);
  assert.equal(res.moves, 0);
});

test("crush forever: an honest round driven to the event cap ends on its own, as a natural end", () => {
  const config = { ...base("crush"), mode: FOREVER };
  const r = createCrushRound(miniData(), config);
  let last = [];
  let t = 0;
  while (!r.view().ended) {
    t += 400;
    const s = r.findPopSwap();
    assert.ok(s, "an honest round always has a pop to play");
    last = r.swap(t, s[0], s[1]);
  }
  const v = r.view();
  assert.equal(r.events().length, MAX_UNTIMED_EVENTS);
  assert.equal(v.endReason, "cap");
  assert.equal(v.won, false);
  assert.ok(v.movesLeft > 0, "it was not the moves that ran out");
  assert.equal(last.at(-1).kind, "end");
  // Nothing more is accepted, and ending it again keeps the cap end time.
  assert.deepEqual(r.swap(t + 400, 0, 1), [{ kind: "invalid" }]);
  assert.equal(r.events().length, MAX_UNTIMED_EVENTS);
  assert.equal(r.end(UNTIMED_MAX_MS).durationMs, t);
});

test("bubble forever: an honest round driven to the event cap ends on its own", () => {
  const r = createBubbleRound(miniData(), { ...base("bubble"), mode: FOREVER });
  const t = bubbleRight(r, MAX_UNTIMED_EVENTS + 50, 400);
  assert.equal(r.view().ended, true);
  assert.equal(r.view().endReason, "cap");
  assert.equal(r.events().length, MAX_UNTIMED_EVENTS);
  assert.equal(r.end(UNTIMED_MAX_MS).durationMs, t);
});

test("bubble count: the Nth form is a goal end, well before the cap", () => {
  const r = createBubbleRound(miniData(), { ...base("bubble"), mode: COUNT(15) });
  bubbleRight(r, 5000, 400);
  assert.equal(r.view().endReason, "goal");
  assert.equal(r.events().length, 15);
});

test("end reasons: moves, goal, the clock, the 30-minute stop and the player each name themselves", () => {
  const timed = createCrushRound(miniData(), base("crush"));
  assert.equal(timed.view().endReason, null);
  assert.equal(timed.advance(ROUND_MS.crush)[0].kind, "end");
  assert.equal(timed.view().endReason, "time");
  const quit = createCrushRound(miniData(), { ...base("crush"), mode: FOREVER });
  quit.end(12_000);
  assert.equal(quit.view().endReason, "player");
  const stop = createCrushRound(miniData(), { ...base("crush"), mode: FOREVER });
  assert.equal(stop.advance(UNTIMED_MAX_MS)[0].kind, "end");
  assert.equal(stop.view().endReason, "cap");
  const bubbleStop = createBubbleRound(miniData(), { ...base("bubble"), mode: COUNT(15) });
  bubbleStop.advance(UNTIMED_MAX_MS);
  assert.equal(bubbleStop.view().endReason, "cap");
  const goal = createCrushRound(miniData(), { ...base("crush"), mode: COUNT(5) });
  crushPop(goal, () => false);
  assert.equal(goal.view().endReason, "goal");
  // Moves: spend every move on swaps that do not pop (a trap spends none, so keep going).
  const moves = createCrushRound(miniData(), { ...base("crush"), mode: COUNT(5) });
  let t = 0;
  for (let i = 0; i < 2000 && !moves.view().ended; i++) {
    t += 400;
    const pop = moves.findPopSwap();
    const a = i % 24;
    const b = a % 5 < 4 ? a + 1 : a + 5;
    if (pop && pop[0] === a && pop[1] === b) continue;
    moves.swap(t, a, b);
  }
  assert.equal(moves.view().endReason, "moves");
  assert.equal(moves.view().won, false);
  assert.equal(moves.view().movesLeft, 0);
});

test("crush timed: a trap still only costs the streak", () => {
  const tile = (kind, label, infinitive) => ({ kind, label, infinitive });
  const cells = Array.from({ length: 25 }, (_, id) => ({ id, ...tile("ending", "amos", "hablar") }));
  cells[0] = { id: 0, ...tile("stem", "ten", "tener") };
  cells[2] = { id: 2, ...tile("ending", "o", "tener") };
  const r = createCrushRound(miniData(), base("crush"), { layout: cells });
  assert.deepEqual(r.swap(400, 1, 2).map((o) => o.kind), ["miss"]);
  assert.equal(r.view().ended, false);
});

test("crush multi-family: goals come from the union of the picked families", () => {
  const d = miniData();
  const r = createCrushRound(d, { ...base("crush"), level: 2, family: "mix", families: ["es.present.go-yo", "es.present.ar"], mode: COUNT(15) });
  crushPop(r, () => false);
  const res = r.end(0);
  assert.ok(res.completions.length > 0);
  assert.ok(res.completions.every((c) => ["es.present.go-yo", "es.present.ar"].includes(c.familyId)));
});

// ---- Scoring ----------------------------------------------------------------------------------

/** Plays an untimed round like the client: correct picks until `picks`, then the round runs to its natural end. */
function playUntimed(data, config, picks) {
  if (config.game === "bubble") {
    const round = createBubbleRound(data, config);
    const t = bubbleRight(round, picks);
    if (!round.view().ended) round.advance(t + 60_000);
    return { log: buildRoundLog(config, round.events(), data), result: round.end(roundLimitMs(config)) };
  }
  const round = createCrushRound(data, config);
  crushPop(round, (v) => v.made >= picks);
  return { log: buildRoundLog(config, round.events(), data), result: round.end(roundLimitMs(config)) };
}

test("honest count and forever logs replay to the client's own result", () => {
  for (const game of ["bubble", "crush"]) {
    for (const mode of [COUNT(5), COUNT(10), COUNT(15), FOREVER]) {
      for (let seed = 0; seed < 8; seed++) {
        const config = { ...base(game), seed, mode };
        const { log, result } = playUntimed(miniData(), config, 12);
        const v = scoreRound(miniData(), log);
        assert.equal(v.ok, true, `${game} ${JSON.stringify(mode)} seed ${seed}`);
        assert.deepEqual(v.result, result, `${game} ${JSON.stringify(mode)} seed ${seed}`);
        assert.equal(v.ranked, false);
        assert.ok(v.softReasons.includes("mode"));
      }
    }
  }
});

test("a quit count round replays to the quit time and is abandoned", () => {
  const config = { ...base("bubble"), mode: COUNT(10) };
  const round = createBubbleRound(miniData(), config);
  const t = bubbleRight(round, 3);
  const result = round.end(t + 700);
  const log = buildRoundLog(config, round.events(), miniData(), Date.now(), t + 700);
  const v = scoreRound(miniData(), log);
  assert.equal(v.ok, true);
  assert.deepEqual(v.result, result);
  assert.ok(v.softReasons.includes("abandoned"));
});

test("multi-family rounds are unranked with reason mode; one family and Mix stay ranked", () => {
  const multi = { ...base("bubble"), family: "mix", families: ["es.present.go-yo", "es.present.ar"] };
  const a = scoreRound(miniData(), playHonest(miniData(), multi).log);
  assert.equal(a.ok, true);
  assert.deepEqual(a.softReasons, ["mode"]);
  const one = scoreRound(miniData(), playHonest(miniData(), { ...base("bubble"), families: ["es.present.go-yo"] }).log);
  assert.deepEqual(one.softReasons, []);
  const mix = scoreRound(miniData(), playHonest(miniData(), { ...base("bubble"), family: "mix" }).log);
  assert.deepEqual(mix.softReasons, []);
  // An untimed multi-family round names the reason once.
  const both = scoreRound(miniData(), playUntimed(miniData(), { ...multi, mode: FOREVER }, 3).log);
  assert.equal(both.softReasons.filter((r) => r === "mode").length, 1);
});

test("untimed rounds cap events at 2000; timed caps are unchanged", () => {
  const { log } = playUntimed(miniData(), { ...base("bubble"), mode: FOREVER }, 2);
  const events = Array.from({ length: MAX_UNTIMED_EVENTS + 1 }, (_, i) => ({ t: i * 200, kind: "pick", frame: 0, piece: 0 }));
  assert.equal(scoreRound(miniData(), { ...log, events }).reason, "too-many-events");
  const ok = Array.from({ length: MAX_UNTIMED_EVENTS }, (_, i) => ({ t: i * 200, kind: "pick", frame: 0, piece: 0 }));
  assert.notEqual(scoreRound(miniData(), { ...log, events: ok }).reason, "too-many-events");
});

test("a capped Crush forever log replays to the client's result: ok, unranked, reason mode only", () => {
  const config = { ...base("crush"), mode: FOREVER };
  const round = createCrushRound(miniData(), config);
  let t = 0;
  while (!round.view().ended) {
    t += 400;
    const s = round.findPopSwap();
    round.swap(t, s[0], s[1]);
  }
  const result = round.end(roundLimitMs(config));
  // The client logs a natural end: no quitAtMs.
  const log = buildRoundLog(config, round.events(), miniData());
  assert.equal(log.events.length, MAX_UNTIMED_EVENTS);
  assert.equal(log.quitAtMs, undefined);
  const v = scoreRound(miniData(), log);
  assert.equal(v.ok, true);
  assert.deepEqual(v.result, result);
  assert.equal(v.ranked, false);
  assert.deepEqual(v.softReasons, ["mode"]);
});

test("a capped Bubble forever log replays the same way", () => {
  const config = { ...base("bubble"), mode: FOREVER };
  const round = createBubbleRound(miniData(), config);
  bubbleRight(round, MAX_UNTIMED_EVENTS + 50, 400);
  const result = round.end(roundLimitMs(config));
  const v = scoreRound(miniData(), buildRoundLog(config, round.events(), miniData()));
  assert.equal(v.ok, true);
  assert.deepEqual(v.result, result);
  assert.deepEqual(v.softReasons, ["mode"]);
});

test("untimed events past the untimed cap are after-end; a pick at 70 s is fine", () => {
  const { log } = playUntimed(miniData(), { ...base("bubble"), mode: COUNT(10) }, 2);
  const late = { t: UNTIMED_MAX_MS + 5000, kind: "pick", frame: 0, piece: 0 };
  assert.equal(scoreRound(miniData(), { ...log, events: [...log.events, late] }).reason, "after-end");
  assert.notEqual(scoreRound(miniData(), { ...log, events: [{ ...log.events[0], t: 70_000 }] }).reason, "after-end");
});

test("bad modes and bad family lists are unknown scopes, never a throw", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  for (const mode of [{ kind: "count", n: 7 }, { kind: "count" }, { kind: "zen" }, "forever", null, 5])
    assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, mode } }).reason, "unknown-scope", JSON.stringify(mode));
  for (const families of [[], ["es.present.zz"], ["es.present.ar", "es.present.ar"], "es.present.ar", Array(8).fill("es.present.ar")])
    assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, families } }).reason, "unknown-scope", JSON.stringify(families));
});

test("buildRoundLog carries the mode and families", () => {
  const config = { ...base("bubble"), family: "mix", families: ["es.present.ar", "es.present.go-yo"], mode: COUNT(10) };
  const log = buildRoundLog(config, [], miniData());
  assert.deepEqual(log.config.mode, COUNT(10));
  assert.deepEqual(log.config.families, ["es.present.ar", "es.present.go-yo"]);
  config.mode.n = 5;
  assert.equal(log.config.mode.n, 10);
});
