// Built by TAC — 2026-10-21
// Verb Games round modes: the `vfamilies` / `vmode` URL params, the route guard and device bests.
import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_VERB_DEVICE, readVerbDevice, recordRound } from "../src/lib/verb-games/device.ts";
import { guardVerbRoute } from "../src/lib/verb-games/route-guard.ts";
import { VERB_ROUTE_PARAMS, parseVerbRoute, verbRouteSearch } from "../src/lib/verb-games/verb-route.ts";
import { buildRoundLog } from "../src/lib/verb-games/scoring.ts";
import { base, miniData } from "./helpers/verb-fixture.mjs";

const s = "?module=core&target=Spanish&native=English&tab=games";
const core = { kind: "core" };
const AR_GO = ["es.present.ar", "es.present.go-yo"];

test("vfamilies and vmode round-trip on the play and pick screens", () => {
  for (const screen of [
    { screen: "pick", game: "bubble", family: "mix", families: AR_GO },
    { screen: "play", game: "bubble", family: "mix", families: AR_GO, level: null },
    { screen: "play", game: "crush", family: "es.present.go-yo", level: 1, mode: { kind: "count", n: 10 } },
    { screen: "play", game: "bubble", family: "mix", level: null, mode: { kind: "forever" } },
    { screen: "play", game: "crush", family: "mix", families: AR_GO, level: 2, mode: { kind: "count", n: 5 } },
  ])
    assert.deepEqual(parseVerbRoute(verbRouteSearch(s, screen)), screen, JSON.stringify(screen));
});

test("a hand-written vfamilies link with commas parses; families come back in FAMILIES order", () => {
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=bubble&vfamilies=es.present.go-yo,es.present.ar"), {
    screen: "play",
    game: "bubble",
    family: "mix",
    families: AR_GO,
    level: null,
  });
});

test("old single-family links still parse to the same screen, and one-item vfamilies is vfamily", () => {
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=bubble&vfamily=es.present.go-yo"), {
    screen: "play",
    game: "bubble",
    family: "es.present.go-yo",
    level: null,
  });
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=bubble&vfamilies=es.present.go-yo"), {
    screen: "play",
    game: "bubble",
    family: "es.present.go-yo",
    level: null,
  });
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=bubble&vfamily=mix&vmode=timed"), {
    screen: "play",
    game: "bubble",
    family: "mix",
    level: null,
  });
});

test("bad vfamilies or vmode fall back to home", () => {
  for (const q of [
    "?verbs=play&vgame=bubble&vfamilies=es.present.zz,es.present.ar",
    "?verbs=play&vgame=bubble&vfamilies=es.present.ar,es.present.ar",
    "?verbs=play&vgame=bubble&vfamilies=",
    "?verbs=play&vgame=bubble&vfamilies=mix,es.present.ar",
    `?verbs=play&vgame=bubble&vfamilies=${Array(8).fill("es.present.ar").join(",")}`,
    "?verbs=play&vgame=bubble&vfamily=es.present.ar&vfamilies=es.present.ar,es.present.er",
    "?verbs=play&vgame=bubble&vfamily=mix&vmode=count7",
    "?verbs=play&vgame=bubble&vfamily=mix&vmode=zen",
    "?verbs=pick&vgame=bubble&vfamilies=es.present.zz",
  ])
    assert.deepEqual(parseVerbRoute(q), { screen: "home" }, q);
});

test("the new params are verb params: other screens and other tabs clear them", () => {
  assert.ok(VERB_ROUTE_PARAMS.includes("vfamilies"));
  assert.ok(VERB_ROUTE_PARAMS.includes("vmode"));
  const dirty = `${s}&verbs=play&vgame=bubble&vfamilies=es.present.ar,es.present.er&vmode=forever`;
  const home = new URLSearchParams(verbRouteSearch(dirty, { screen: "home" }));
  assert.equal(home.get("vfamilies"), null);
  assert.equal(home.get("vmode"), null);
  // A timed single-family round keeps the exact URL it always had.
  assert.equal(
    verbRouteSearch("", { screen: "play", game: "bubble", family: "es.present.go-yo", level: null }),
    "?verbs=play&vgame=bubble&vfamily=es.present.go-yo",
  );
});

test("guard: multi-family and untimed play routes pass when the data can play them", () => {
  const d = miniData();
  const multi = { screen: "play", game: "bubble", family: "mix", families: AR_GO, level: null, mode: { kind: "forever" } };
  assert.deepEqual(guardVerbRoute(multi, d, core), multi);
  // Crush level 2 needs yo and tú: go-yo alone cannot, go-yo + regular -ar can (union pool).
  const l2 = { screen: "play", game: "crush", family: "mix", families: AR_GO, level: 2, mode: { kind: "count", n: 10 } };
  assert.deepEqual(guardVerbRoute(l2, d, core), l2);
  assert.deepEqual(guardVerbRoute({ ...l2, family: "es.present.go-yo", families: undefined }, d, core), { screen: "home" });
});

test("guard: a picked family list with no frames in the source falls back to home", () => {
  const d = miniData();
  const route = { screen: "play", game: "bubble", family: "mix", families: ["es.present.e-i", "es.present.o-ue"], level: null };
  assert.deepEqual(guardVerbRoute(route, d, { kind: "module", moduleId: "nope" }), { screen: "home" });
});

test("device: bests are keyed by mode, and the timed key is unchanged", () => {
  const d = miniData();
  const result = { score: 500, moves: 0, picks: 5, correct: 5, bestStreak: 5, durationMs: 9000, completions: [], misses: [], won: true };
  let st = recordRound(EMPTY_VERB_DEVICE, buildRoundLog(base("bubble"), [], d), result, { queue: false });
  st = recordRound(st, buildRoundLog({ ...base("bubble"), mode: { kind: "forever" } }, [], d), { ...result, score: 900 }, { queue: false });
  st = recordRound(st, buildRoundLog({ ...base("crush"), mode: { kind: "count", n: 10 } }, [], d), { ...result, score: 300 }, { queue: false });
  assert.deepEqual(Object.keys(st.bests).sort(), ["bubble|go-yo", "bubble|go-yo|forever", "crush|L1:go-yo|count10"]);
  assert.equal(st.bests["bubble|go-yo"].score, 500);
  assert.equal(st.bests["bubble|go-yo|forever"].score, 900);
});

test("device: saved timed bests survive a read, and the remembered mode is kept only when valid", () => {
  const raw = {
    v: 1,
    bests: { "bubble|go-yo": { score: 1200, moves: 0, at: "2026-10-20T00:00:00.000Z" } },
    settings: { source: "core", listMode: false, mode: { kind: "count", n: 10 } },
  };
  const st = readVerbDevice(raw);
  assert.equal(st.bests["bubble|go-yo"].score, 1200);
  assert.deepEqual(st.settings, { source: "core", listMode: false, mode: { kind: "count", n: 10 } });
  assert.deepEqual(readVerbDevice({ ...raw, settings: { source: "core", listMode: true, mode: { kind: "count", n: 4 } } }).settings, {
    source: "core",
    listMode: true,
  });
  assert.deepEqual(readVerbDevice({ ...raw, settings: { source: "core", listMode: false } }).settings, { source: "core", listMode: false });
});
