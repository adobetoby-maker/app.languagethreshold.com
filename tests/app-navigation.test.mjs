import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_TABS, appTab, appNavigationLocation } from "../src/lib/app-navigation.ts";
const context = {
  ready: true,
  moduleId: "roofing",
  target: "Spanish",
  native: "English",
  tab: "reader",
};
const incoming =
  "/?module=roofing&target=Spanish&native=English&tab=core30&lesson=12&way=write&plan=qa-plan&utm_source=qa#practice";
const params = (path) => new URL(path, "https://qa.invalid").searchParams;
test("all app tabs round-trip through the same supported link vocabulary", () => {
  assert.equal(new Set(APP_TABS).size, APP_TABS.length);
  for (const tab of APP_TABS) {
    const next = appNavigationLocation(incoming, { ...context, tab });
    assert.equal(appTab(params(next).get("tab")), tab);
  }
  for (const invalid of [null, "", "unknown-tool", "Reader", "__proto__"])
    assert.equal(appTab(invalid), null);
});
test("pending identity/profile/link restoration cannot rewrite an incoming lesson", () => {
  assert.equal(
    appNavigationLocation(incoming, { ...context, ready: false, moduleId: "landscaper" }),
    null,
  );
});
test("leaving Core 30 updates the tab and clears stale position without losing same-track plan context", () => {
  const next = appNavigationLocation(incoming, context),
    p = params(next);
  assert.equal(p.get("tab"), "reader");
  assert.equal(p.get("lesson"), null);
  assert.equal(p.get("way"), null);
  assert.equal(p.get("plan"), "qa-plan");
  assert.equal(p.get("utm_source"), "qa");
  assert.equal(new URL(next, "https://qa.invalid").hash, "#practice");
});
test("the Core 30 runner keeps ownership of its visible lesson and way", () => {
  const next = appNavigationLocation(incoming, { ...context, tab: "core30" }),
    p = params(next);
  assert.equal(p.get("lesson"), "12");
  assert.equal(p.get("way"), "write");
});
test("a module or language-pair change drops the previous enrollment and lesson position", () => {
  for (const changed of [{ moduleId: "landscaper" }, { target: "French" }, { native: "Spanish" }]) {
    const p = params(appNavigationLocation(incoming, { ...context, tab: "core30", ...changed }));
    assert.equal(p.get("plan"), null);
    assert.equal(p.get("lesson"), null);
    assert.equal(p.get("way"), null);
    for (const [key, value] of Object.entries(changed))
      assert.equal(p.get(key === "moduleId" ? "module" : key), value);
  }
});
test("returning to Core 30 from another tool does not revive stale lesson markers", () => {
  const next = appNavigationLocation(incoming.replace("tab=core30", "tab=reader"), {
    ...context,
    tab: "core30",
  });
  assert.equal(params(next).get("lesson"), null);
  assert.equal(params(next).get("way"), null);
});
test("clearing a specialty links explicitly to Core and only the root app page is rewritten", () => {
  const p = params(appNavigationLocation(incoming, { ...context, moduleId: null, tab: "modules" }));
  assert.equal(p.get("module"), "core");
  assert.equal(p.get("plan"), null);
  for (const path of ["/exams?module=roofing", "/team", "/account", "/team/accept"])
    assert.equal(appNavigationLocation(path, context), null);
  assert.equal(appNavigationLocation(incoming, { ...context, tab: "invalid" }), null);
});
test("Core language pairs remain explicit without inheriting a saved specialty", () => {
  const next = appNavigationLocation(incoming, {
    ...context,
    moduleId: null,
    target: "French",
    tab: "dictionary",
  });
  const p = params(next);
  assert.equal(p.get("module"), "core");
  assert.equal(p.get("target"), "French");
  assert.equal(p.get("native"), "English");
  assert.equal(
    appNavigationLocation(next, {
      ...context,
      moduleId: null,
      target: "French",
      tab: "dictionary",
    }),
    next,
  );
});
test("an already synchronized address is stable through repeated renders", () => {
  const next = appNavigationLocation(incoming, {
    ...context,
    moduleId: "landscaper",
    tab: "flashcards",
  });
  assert.equal(
    appNavigationLocation(next, { ...context, moduleId: "landscaper", tab: "flashcards" }),
    next,
  );
});
test("leaving Games clears the Verbs sub-route", () => {
  const next = appNavigationLocation(
    "/?module=core&target=Spanish&native=English&tab=games&verbs=unit&vfamily=es.present.go-yo",
    { ...context, tab: "reader" },
  );
  assert.equal(params(next).get("verbs"), null);
  assert.equal(params(next).get("vfamily"), null);
});
test("staying on Games keeps the Verbs sub-route", () => {
  const next = appNavigationLocation(
    "/?module=core&target=Spanish&native=English&tab=games&verbs=unit&vfamily=es.present.go-yo",
    { ...context, tab: "games" },
  );
  assert.equal(params(next).get("verbs"), "unit");
  assert.equal(params(next).get("vfamily"), "es.present.go-yo");
});


test("speaking return selection survives only its current tab and learning pair", () => {
  const current = "/?tab=speak&module=roofing&target=Spanish&native=English&mission=public-mission";
  assert.equal(params(appNavigationLocation(current, {...context, tab: "speak"})).get("mission"), "public-mission");
  for (const next of [{...context, tab: "reader"}, {...context, tab:"speak", moduleId:"landscaper"}, {...context, tab:"speak", target:"French"}])
    assert.equal(params(appNavigationLocation(current, next)).has("mission"), false);
});
