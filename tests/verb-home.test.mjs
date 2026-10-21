// Built by TAC — 2026-10-21
// Verb Games Verbs home, picker, route guard and pattern loader. (Kept beside tests/verb-ui.test.mjs
// because the Task 12 primitives fix touches that file at the same time.)
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";
import { miniData } from "./helpers/verb-fixture.mjs";
import { EMPTY_VERB_DEVICE } from "../src/lib/verb-games/device.ts";
import { guardVerbRoute } from "../src/lib/verb-games/route-guard.ts";
import { parseVerbRoute, practiceScreen, verbRouteSearch } from "../src/lib/verb-games/verb-route.ts";

const ext = { external: ["react-dom/server", "lucide-react"] };
const { VerbsHome } = await loadModule("src/components/games/verbs/VerbsHome.tsx", ext);
const { VerbPicker } = await loadModule("src/components/games/verbs/VerbPicker.tsx", ext);
const { loadPatternData } = await loadModule("src/lib/verb-games/load-patterns.ts", ext);

const html = (component, props) => renderToStaticMarkup(createElement(component, props));
/** The opening tag that contains `marker`, so attributes can be asserted in any order. */
const tagOf = (markup, marker) => {
  const tag = (markup.match(/<[a-z][^>]*>/g) ?? []).find((t) => t.includes(marker));
  assert.ok(tag, `no tag contains ${marker} in ${markup}`);
  return tag;
};
const device = (patch) => ({ ...EMPTY_VERB_DEVICE, ...patch });

test("home shows the ladder and both games", () => {
  const h = html(VerbsHome, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, go() {} });
  // React escapes quotes in static markup (ruling F1).
  for (const label of ["The &quot;-go&quot; family", "e → ie", "o → ue", "e → i", "Regular -ar", "Bubble Pop", "Verb Crush"]) {
    assert.ok(h.includes(label), label);
  }
  assert.match(h, /Practice by pattern/);
  assert.match(h, />VERBS</);
});

test("home marks the suggested family once and shows personal best; weekly rank only when boards are open", () => {
  const data = miniData();
  const none = html(VerbsHome, { data, device: EMPTY_VERB_DEVICE, moduleId: null, go() {} });
  assert.equal(none.match(/data-suggested="true"/g)?.length, 1);
  assert.match(tagOf(none, 'data-suggested="true"'), /data-family="es\.present\.ar"/);
  assert.match(none, /Suggested/);
  assert.doesNotMatch(none, /leaderboard.*error/i);
  assert.match(none, /Leaderboards coming soon/);

  const played = device({
    bests: { "bubble|go-yo": { score: 2060, moves: 0, at: "2026-10-20T00:00:00Z" }, "bubble|mix": { score: 900, moves: 0, at: "2026-10-20T00:00:00Z" } },
    ranks: { "bubble|go-yo": { period: "2026-W43", rank: 7 } },
  });
  const h = html(VerbsHome, { data, device: played, moduleId: null, go() {} });
  assert.match(h, /2,060/);
  // Boards are closed in this slice: a rank cell that can never fill in is hidden, the closed-boards line stays.
  assert.doesNotMatch(h, /Weekly rank|>#7</);
  assert.match(h, /Leaderboards coming soon/);
  const open = html(VerbsHome, { data, device: played, moduleId: null, boardsOpen: true, go() {} });
  assert.match(open, /Weekly rank/);
  assert.match(open, />#7</);
});

test("ladder tiles go where the recap's Practice button goes: the Bubble Pop picker on that family", () => {
  const data = miniData();
  const seen = [];
  const h = html(VerbsHome, { data, device: EMPTY_VERB_DEVICE, moduleId: null, go: (s) => seen.push(s) });
  assert.equal(h.match(/data-family="es\.[^"]+"/g)?.length, 7);
  for (const id of [...h.matchAll(/data-family="(es\.[^"]+)"/g)].map((m) => m[1])) {
    assert.deepEqual(practiceScreen(id), { screen: "pick", game: "bubble", family: id });
    assert.equal(parseVerbRoute(verbRouteSearch("", practiceScreen(id))).screen, "pick");
  }
});

test("home meters count mastered verbs", () => {
  const data = miniData();
  const mastery = { "es.present.go-yo|tener": { picks: 40, correct: 40 } };
  const h = html(VerbsHome, { data, device: device({ mastery }), moduleId: null, go() {} });
  const bar = tagOf(h, 'data-family-meter="es.present.go-yo"');
  assert.match(bar, /role="progressbar"/);
  assert.match(bar, /aria-valuenow="1"/);
});

test("home tile counts use the same source pool as the picker", () => {
  const data = miniData();
  const goYo = "es.present.go-yo";
  const pickerCount = (dev, moduleId) => {
    const h = html(VerbPicker, { data, device: dev, moduleId, game: "bubble", family: goYo, go() {}, onSettings() {} });
    return Number(h.slice(h.indexOf(`data-testid="family-${goYo}"`)).match(/(\d+) verbs?</)?.[1]);
  };
  const homeMax = (dev, moduleId) => {
    const h = html(VerbsHome, { data, device: dev, moduleId, go() {} });
    return Number(tagOf(h, `data-family-meter="${goYo}"`).match(/aria-valuemax="(\d+)"/)?.[1]);
  };
  const sources = [
    ["core", null, device({})],
    ["core with module", "roofing", device({})],
    ["module", "roofing", device({ settings: { source: "module", listMode: false } })],
    ["both", "roofing", device({ settings: { source: "both", listMode: false } })],
  ];
  const seen = new Set();
  for (const [name, moduleId, dev] of sources) {
    const picker = pickerCount(dev, moduleId);
    assert.ok(Number.isInteger(picker), `${name}: picker count parsed`);
    assert.equal(homeMax(dev, moduleId), picker, name);
    seen.add(picker);
  }
  assert.ok(seen.size > 1, "module and core pools differ in the fixture");
});

test("a Core learner can fill the meter: mastered verbs count against the core pool only", () => {
  const data = miniData();
  const mastery = {};
  const core = data.verbs.filter((v) => v.sources.some((s) => s.kind === "core") && v.forms.some((f) => f.families.includes("es.present.go-yo")));
  for (const v of core) mastery[`es.present.go-yo|${v.infinitive}`] = { picks: 40, correct: 40 };
  const bar = tagOf(html(VerbsHome, { data, device: device({ mastery }), moduleId: null, go() {} }), 'data-family-meter="es.present.go-yo"');
  assert.equal(bar.match(/aria-valuenow="(\d+)"/)?.[1], bar.match(/aria-valuemax="(\d+)"/)?.[1]);
});

test("below sm each tile shows one example form; the rest appear from sm", () => {
  const h = html(VerbsHome, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, go() {} });
  const tile = h.slice(h.indexOf('data-family="es.present.go-yo"'));
  const forms = tile.slice(0, tile.indexOf("<span role=\"progressbar\""));
  assert.equal((forms.match(/<span class="hidden sm:inline">/g) ?? []).length, 2);
});

test("family tiles and game cards navigate through go()", () => {
  const seen = [];
  const h = html(VerbsHome, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, go: (s) => seen.push(s) });
  assert.match(tagOf(h, 'data-family="es.present.go-yo"'), /cursor-pointer/);
  assert.match(tagOf(h, 'data-game="crush"'), /cursor-pointer/);
  assert.deepEqual(seen, []);
});

test("picker disables unreachable Crush levels and shows source counts", () => {
  const h = html(VerbPicker, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: "roofing", game: "crush", family: "es.present.go-yo", go() {}, onSettings() {} });
  assert.match(h, /Your module · 3 verbs/);
  assert.match(h, /Core · 15 verbs/);
  assert.match(h, /Both/);
  assert.match(h, /data-level="2"[^>]*disabled/);
  assert.doesNotMatch(tagOf(h, 'data-level="1"'), /\sdisabled(=|\s|>)/);
  assert.match(tagOf(h, 'data-testid="start-round"'), /^(?!.*\sdisabled)/);
});

test("picker hides the module chip without a module and has no Crush levels for Bubble", () => {
  const h = html(VerbPicker, { data: miniData(), device: EMPTY_VERB_DEVICE, moduleId: null, game: "bubble", family: "es.present.go-yo", go() {}, onSettings() {} });
  assert.doesNotMatch(h, /Your module/);
  assert.match(h, /Core · 15 verbs/);
  assert.doesNotMatch(h, /Both/); // without a module, Both would equal Core
  assert.doesNotMatch(h, /data-level=/);
  assert.match(h, /List mode/);
  assert.match(h, /Mix/);
});

test("picker disables Start when the chosen source has no frames for the pattern", () => {
  const data = miniData();
  const moduleOnly = device({ settings: { source: "module", listMode: false } });
  const empty = html(VerbPicker, { data, device: moduleOnly, moduleId: "roofing", game: "bubble", family: "es.present.o-ue", go() {}, onSettings() {} });
  assert.match(tagOf(empty, 'data-testid="start-round"'), /\sdisabled(=|\s|>)/);
  const ok = html(VerbPicker, { data, device: moduleOnly, moduleId: "roofing", game: "bubble", family: "es.present.go-yo", go() {}, onSettings() {} });
  assert.doesNotMatch(tagOf(ok, 'data-testid="start-round"'), /\sdisabled(=|\s|>)/);
});

test("route guard: a Crush round with no level falls back to home and never throws", () => {
  const data = miniData();
  const core = { kind: "core" };
  const route = parseVerbRoute("?verbs=play&vgame=crush&vfamily=mix");
  assert.deepEqual(route, { screen: "play", game: "crush", family: "mix", level: null });
  assert.deepEqual(guardVerbRoute(route, data, core), { screen: "home" });
});

test("route guard: unavailable level, Bubble with a level and unknown board scope fall back to home", () => {
  const data = miniData();
  const core = { kind: "core" };
  const home = { screen: "home" };
  // go-yo only applies to yo, so Crush level 2 (yo and tú) cannot be built.
  assert.deepEqual(guardVerbRoute(parseVerbRoute("?verbs=play&vgame=crush&vfamily=es.present.go-yo&vlevel=2"), data, core), home);
  assert.deepEqual(guardVerbRoute({ screen: "play", game: "crush", family: "es.present.go-yo", level: 4 }, data, core).screen, "play");
  assert.deepEqual(guardVerbRoute(parseVerbRoute("?verbs=play&vgame=bubble&vfamily=mix&vlevel=1"), data, core), home);
  assert.deepEqual(guardVerbRoute(parseVerbRoute("?verbs=board&vgame=crush&vscope=L9:xyz"), data, core), home);
  assert.deepEqual(guardVerbRoute(parseVerbRoute("?verbs=board&vgame=bubble&vscope=nope"), data, core), home);
});

test("route guard keeps valid routes", () => {
  const data = miniData();
  const core = { kind: "core" };
  for (const search of [
    "?verbs=play&vgame=bubble&vfamily=es.present.go-yo",
    "?verbs=play&vgame=crush&vfamily=es.present.go-yo&vlevel=1",
    "?verbs=board&vgame=bubble&vscope=go-yo",
    "?verbs=board&vgame=crush&vscope=L1:go-yo",
    "?verbs=board&vgame=crush",
    "?verbs=pick&vgame=crush",
    "?verbs=unit&vfamily=es.present.e-ie",
  ]) {
    const route = parseVerbRoute(search);
    assert.deepEqual(guardVerbRoute(route, data, core), route, search);
  }
});

test("loadPatternData resolves the compiled data once", async () => {
  const a = loadPatternData();
  assert.equal(loadPatternData(), a);
  const data = await a;
  assert.equal(data.language, "es");
  assert.equal(data.families.length, 7);
  assert.ok(data.verbs.length > 100);
});
