// Built by TAC — 2026-10-21
import assert from "node:assert/strict";
import test from "node:test";
import { VERB_ROUTE_PARAMS, parseVerbRoute, verbRouteSearch } from "../src/lib/verb-games/verb-route.ts";

const s = "?module=core&target=Spanish&native=English&tab=games";

test("round-trips every screen and rejects junk", () => {
  for (const screen of [
    { screen: "home" },
    { screen: "pick", game: "crush", family: "es.present.e-ie" },
    { screen: "pick", game: "bubble", family: null },
    { screen: "play", game: "bubble", family: "mix", level: null },
    { screen: "play", game: "crush", family: "es.present.go-yo", level: 3 },
    { screen: "board", game: "crush", scope: "L1:go-yo" },
    { screen: "board", game: "bubble", scope: null },
    { screen: "unit", family: "es.present.go-yo" },
  ])
    assert.deepEqual(parseVerbRoute(verbRouteSearch(s, screen)), screen);
  assert.deepEqual(parseVerbRoute("?verbs=play&vgame=chess"), { screen: "home" });
  assert.match(verbRouteSearch(s, { screen: "home" }), /tab=games/);
});

test("invalid or incomplete params fall back to home", () => {
  for (const q of [
    "",
    "?tab=games",
    "?verbs=nope",
    "?verbs=play&vgame=crush",
    "?verbs=play&vgame=crush&vfamily=es.present.xx",
    "?verbs=play&vgame=crush&vfamily=mix&vlevel=9",
    "?verbs=play&vgame=crush&vfamily=mix&vlevel=abc",
    "?verbs=pick&vgame=crush&vfamily=bogus",
    "?verbs=board",
    "?verbs=unit",
    "?verbs=unit&vfamily=mix",
  ])
    assert.deepEqual(parseVerbRoute(q), { screen: "home" }, q);
  assert.deepEqual(parseVerbRoute(undefined), { screen: "home" });
});

test("verbRouteSearch keeps other params and replaces only verb params", () => {
  const dirty = `${s}&utm=x&verbs=unit&vfamily=es.present.go-yo&vlevel=2&vscope=old`;
  const out = new URLSearchParams(verbRouteSearch(dirty, { screen: "board", game: "crush", scope: "L1:go-yo" }));
  assert.equal(out.get("utm"), "x");
  assert.equal(out.get("tab"), "games");
  assert.equal(out.get("verbs"), "board");
  assert.equal(out.get("vgame"), "crush");
  assert.equal(out.get("vscope"), "L1:go-yo");
  assert.equal(out.get("vfamily"), null);
  assert.equal(out.get("vlevel"), null);
  const home = verbRouteSearch(dirty, { screen: "home" });
  for (const key of VERB_ROUTE_PARAMS) assert.equal(new URLSearchParams(home).get(key), null);
  assert.equal(new URLSearchParams(home).get("utm"), "x");
  assert.equal(verbRouteSearch("", { screen: "home" }), "");
});
