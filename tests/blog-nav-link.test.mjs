import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";

test("empty or unavailable blog does not advertise a navigation link", async () => {
  const { BlogNavLink } = await loadModule("src/components/blog/BlogNavLink.tsx");
  assert.equal(renderToStaticMarkup(createElement(BlogNavLink)), "");
});
