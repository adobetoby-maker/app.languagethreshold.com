import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";
const { navigationGroup, navigationVersion } = await loadModule("src/lib/navigation-menu.ts");
const { NavigationMenu } = await loadModule("src/components/navigation/NavigationMenu.tsx", {
  external: ["lucide-react"],
});
const keys = [
  "modules",
  "reader",
  "core30",
  "story",
  "speak",
  "flashcards",
  "games",
  "fieldPrep",
  "grammar",
  "dictionary",
  "cognates",
  "conjugation",
  "idiomMaster",
  "anatomy",
  "penpal",
  "exams",
];
const Icon = () => null;
const items = keys.map((key) => ({ key, label: key, Icon }));
test("navigation groups match the three learning intents", () => {
  for (const key of ["reader", "story", "core30", "exams"])
    assert.equal(navigationGroup(key), "Learn");
  for (const key of ["speak", "flashcards", "games", "fieldPrep"])
    assert.equal(navigationGroup(key), "Practice");
  for (const key of ["grammar", "dictionary", "cognates"])
    assert.equal(navigationGroup(key), "Reference");
});
test("preview comparison cannot change production navigation", () => {
  assert.equal(navigationVersion("?navVersion=accordion", "preview"), "accordion");
  assert.equal(navigationVersion("?navVersion=focused", "development"), "focused");
  assert.equal(navigationVersion("?navVersion=focused", "production"), "sections");
  assert.equal(navigationVersion("?navVersion=invalid", "preview"), "sections");
});
for (const version of ["sections", "accordion", "focused"]) {
  test(`${version}: all permitted tools remain reachable exactly once on desktop and mobile`, () => {
    for (const mobile of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(NavigationMenu, {
          items,
          active: "idiomMaster",
          onSelect: () => {},
          version,
          mobile,
        }),
      );
      for (const key of keys)
        assert.equal((html.match(new RegExp(`data-tour="${key}"`, "g")) ?? []).length, 1, key);
      for (const group of ["Learn", "Practice", "Reference"])
        assert.ok(html.includes(`aria-label="${group}"`));
      assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
      assert.ok(
        html.indexOf('data-tour="reader"') < html.indexOf('data-tour="modules"'),
        "learning action precedes administration",
      );
      assert.match(html, /aria-expanded="true"/); // active long-tail item's parent is expanded
      assert.match(html, /Practice Lab/);
    }
  });
}
