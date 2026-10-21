// Built by TAC — 2026-10-21
import assert from "node:assert/strict";
import test from "node:test";
import { createBubbleRound } from "../src/lib/verb-games/bubble.ts";
import { ROUND_MS } from "../src/lib/verb-games/rules.ts";
import { buildRoundLog, scoreRound } from "../src/lib/verb-games/scoring.ts";
import { base, miniData, playHonest } from "./helpers/verb-fixture.mjs";

test("honest logs replay to the client's own result across 50 seeds", () => {
  for (const game of ["bubble", "crush"]) for (let seed = 0; seed < 50; seed++) {
    const { log, result } = playHonest(miniData(), { ...base(game), seed });
    const v = scoreRound(miniData(), log);
    assert.equal(v.ok, true, `${game} seed ${seed}`);
    assert.deepEqual(v.result, result, `${game} seed ${seed}`);
    assert.equal(v.ranked, true, `${game} seed ${seed}`);
    assert.deepEqual(v.softReasons, []);
  }
});

test("stale data is reported, never judged", () => { // Review Focus 1
  const { log } = playHonest(miniData(), base("bubble"));
  assert.deepEqual(scoreRound(miniData(), { ...log, dataHash: "0000000000000000" }), { ok: false, stale: true });
});

test("a stale log returns before any replay, even when it is otherwise malformed", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const junk = { ...log, dataHash: "0000000000000000", config: { ...log.config, family: "nope" }, events: "not a list" };
  assert.deepEqual(scoreRound(miniData(), junk), { ok: false, stale: true });
});

test("constructed cheat logs are rejected", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const e = log.events;
  assert.equal(scoreRound(miniData(), { ...log, events: [e[1], e[0], ...e.slice(2)] }).reason, "out-of-order");
  assert.equal(scoreRound(miniData(), { ...log, events: [...e, { t: 99_000, kind: "pick", frame: 0, piece: 0 }] }).reason, "after-end");
  assert.equal(scoreRound(miniData(), { ...log, events: [{ ...e[0], piece: 42 }] }).reason, "invalid-event");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, family: "es.present.zco" } }).reason, "unknown-scope");
});

test("hard verdicts carry hard: true and no result", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const v = scoreRound(miniData(), { ...log, events: [{ ...log.events[0], piece: 42 }] });
  assert.deepEqual(v, { ok: false, hard: true, reason: "invalid-event" });
});

test("too many events is a hard failure", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const events = Array.from({ length: ROUND_MS.bubble / 100 + 1 }, (_, i) => ({ t: i, kind: "pick", frame: 0, piece: 0 }));
  assert.equal(scoreRound(miniData(), { ...log, events }).reason, "too-many-events");
  const crush = playHonest(miniData(), base("crush")).log;
  const swaps = Array.from({ length: ROUND_MS.crush / 100 + 1 }, (_, i) => ({ t: i, kind: "swap", a: 0, b: 1 }));
  assert.equal(scoreRound(miniData(), { ...crush, events: swaps }).reason, "too-many-events");
});

test("events of the wrong shape or the wrong game are invalid, never a throw", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const swap = { t: 500, kind: "swap", a: 0, b: 1 };
  assert.equal(scoreRound(miniData(), { ...log, events: [swap] }).reason, "invalid-event");
  assert.equal(scoreRound(miniData(), { ...log, events: "x" }).reason, "invalid-event");
  assert.equal(scoreRound(miniData(), { ...log, events: [null] }).reason, "invalid-event");
  assert.equal(scoreRound(miniData(), { ...log, events: [{ t: "5", kind: "pick", frame: 0, piece: 0 }] }).reason, "invalid-event");
});

test("a Crush log must carry its level and the level must be available", () => {
  const { log } = playHonest(miniData(), base("crush"));
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, level: null } }).reason, "unknown-scope");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, level: 9 } }).reason, "unknown-scope");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, level: 2.5 } }).reason, "unknown-scope");
  const unavailable = { ...log.config, family: "es.present.ar", level: 1 };
  assert.equal(scoreRound(miniData(), { ...log, config: unavailable }).reason, "unknown-scope");
});

test("a Bubble log with a level, or a bad game or source, is an unknown scope", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, level: 1 } }).reason, "unknown-scope");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, game: "snake" } }).reason, "unknown-scope");
  assert.equal(scoreRound(miniData(), { ...log, config: { ...log.config, source: { kind: "module", moduleId: "nope" } } }).reason, "unknown-scope");
  assert.equal(scoreRound(miniData(), { ...log, config: null }).reason, "unknown-scope");
});

test("module sources must name a module that exists in the data", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const withSource = (source) => scoreRound(miniData(), { ...log, config: { ...log.config, source } });
  for (const kind of ["module", "both"]) {
    assert.equal(withSource({ kind, moduleId: "invented" }).reason, "unknown-scope", `${kind} unknown`);
    assert.equal(withSource({ kind, moduleId: "a".repeat(65) }).reason, "unknown-scope", `${kind} overlong`);
    assert.equal(withSource({ kind, moduleId: "Roofing" }).reason, "unknown-scope", `${kind} bad pattern`);
    assert.equal(withSource({ kind, moduleId: 5 }).reason, "unknown-scope", `${kind} not a string`);
  }
  // A real module id is still accepted; the replay never sees an event it cannot play, so use an empty log.
  const real = scoreRound(miniData(), { ...log, config: { ...log.config, source: { kind: "module", moduleId: "roofing" } }, events: [] });
  assert.equal(real.ok, true);
  const both = scoreRound(miniData(), { ...log, config: { ...log.config, source: { kind: "both", moduleId: "roofing" } }, events: [] });
  assert.equal(both.ok, true);
});

test("an overlong module id that is also in the data is still rejected", () => {
  const data = miniData();
  const long = "a".repeat(65);
  data.verbs[0].sources.push({ kind: "module", moduleId: long });
  const { log } = playHonest(data, base("bubble"));
  const v = scoreRound(data, { ...log, config: { ...log.config, source: { kind: "module", moduleId: long } }, events: [] });
  assert.equal(v.reason, "unknown-scope");
});

test("list mode and machine-speed picks score but are not ranked", () => {
  const { log } = playHonest(miniData(), { ...base("bubble"), listMode: true });
  assert.deepEqual(scoreRound(miniData(), log).softReasons, ["list-mode"]);
  const fast = playHonest(miniData(), base("bubble"), { gapMs: 120 });
  const v = scoreRound(miniData(), fast.log);
  assert.equal(v.ok, true);
  assert.equal(v.ranked, false);
  assert.deepEqual(v.softReasons, ["fast-picks"]);
  assert.deepEqual(v.result, fast.result);
});

/** Bubble picks (always the correct piece) at exactly these times. */
function bubbleLogAt(times) {
  const config = base("bubble");
  const round = createBubbleRound(miniData(), config);
  for (const t of times) {
    round.advance(t);
    const view = round.view();
    round.pick(t, view.frame.index, view.pieces.find((p) => p.correct).id);
  }
  round.end(ROUND_MS.bubble);
  return buildRoundLog(config, round.events(), miniData());
}
const spread = Array.from({ length: 60 }, (_, i) => 5_000 + i * 900);

test("two quick gaps are tolerated, the third makes the round unranked", () => {
  const two = scoreRound(miniData(), bubbleLogAt([900, 1_000, 1_100, ...spread]));
  assert.deepEqual(two.softReasons, []);
  assert.equal(two.ranked, true);
  const three = scoreRound(miniData(), bubbleLogAt([900, 1_000, 1_100, 1_200, ...spread]));
  assert.deepEqual(three.softReasons, ["fast-picks"]);
  assert.equal(three.ranked, false);
  const edge = scoreRound(miniData(), bubbleLogAt([900, 1_150, 1_400, 1_650, ...spread])); // gaps of exactly 250
  assert.deepEqual(edge.softReasons, []);
});

test("an honest round that goes idle for its last 20 seconds stays ranked", () => {
  const idle = scoreRound(miniData(), bubbleLogAt(Array.from({ length: 40 }, (_, i) => 900 + i * 1_000)));
  assert.equal(idle.ok, true);
  assert.deepEqual(idle.softReasons, []);
  assert.equal(idle.ranked, true);
  const { log } = playHonest(miniData(), base("bubble"));
  const early = scoreRound(miniData(), { ...log, events: log.events.filter((e) => e.t < 20_000) });
  assert.equal(early.ranked, true);
  assert.equal(scoreRound(miniData(), { ...log, events: [] }).ranked, true);
});

test("quitAtMs before the timer makes the round unranked as abandoned", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const events = log.events.filter((e) => e.t <= 30_000);
  const v = scoreRound(miniData(), { ...log, events, quitAtMs: 30_000 });
  assert.equal(v.ok, true);
  assert.deepEqual(v.softReasons, ["abandoned"]);
  assert.equal(v.ranked, false);
  const atEnd = scoreRound(miniData(), { ...log, quitAtMs: ROUND_MS.bubble });
  assert.deepEqual(atEnd.softReasons, []);
  const quitEmpty = scoreRound(miniData(), { ...log, events: [], quitAtMs: 0 });
  assert.deepEqual(quitEmpty.softReasons, ["abandoned"]);
  const withList = scoreRound(miniData(), { ...log, config: { ...log.config, listMode: true }, events, quitAtMs: 30_000 });
  assert.deepEqual(withList.softReasons, ["list-mode", "abandoned"]);
});

test("a malformed quitAtMs, or one before the last event, is rejected", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const last = log.events.at(-1).t;
  for (const quitAtMs of [last - 1, -5, Number.NaN, Infinity, "30000", null]) {
    assert.deepEqual(scoreRound(miniData(), { ...log, quitAtMs }), { ok: false, hard: true, reason: "invalid-event" }, String(quitAtMs));
  }
  assert.equal(scoreRound(miniData(), { ...log, quitAtMs: last }).ok, true);
});

test("a Crush round that ends on its own is never abandoned, even with quitAtMs", () => {
  const { log, result } = playHonest(miniData(), base("crush"));
  assert.ok(result.durationMs < ROUND_MS.crush);
  const quit = log.events.at(-1).t + 1_000;
  const v = scoreRound(miniData(), { ...log, quitAtMs: quit });
  assert.deepEqual(v.softReasons, []);
  assert.equal(v.ranked, true);
});

test("the replay ends at the full round length, whatever the log's last event", () => {
  const { log } = playHonest(miniData(), base("bubble"));
  const v = scoreRound(miniData(), log);
  assert.equal(v.result.durationMs, ROUND_MS.bubble);
});

test("buildRoundLog builds the v1 log the server expects", () => {
  const data = miniData();
  const config = base("bubble");
  const events = [{ t: 900, kind: "pick", frame: 0, piece: 1 }];
  const log = buildRoundLog(config, events, data, Date.UTC(2026, 9, 21, 12, 0, 0));
  assert.equal(log.v, 1);
  assert.match(log.clientRoundId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(log.dataHash, data.dataHash);
  assert.equal(log.endedAt, "2026-10-21T12:00:00.000Z");
  assert.deepEqual(log.config, config);
  assert.deepEqual(log.events, events);
  assert.notEqual(log.config, config, "config is copied");
  assert.notEqual(log.events, events, "events are copied");
  assert.notEqual(buildRoundLog(config, events, data).clientRoundId, log.clientRoundId);
  assert.ok(Math.abs(Date.parse(buildRoundLog(config, events, data).endedAt) - Date.now()) < 5_000);
  assert.equal("quitAtMs" in log, false, "quitAtMs is absent unless the player quit");
  assert.equal(buildRoundLog(config, events, data, 0, 30_000).quitAtMs, 30_000);
});
