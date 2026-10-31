import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/bundle.mjs";

test("homepage Blog navigation renders without a query provider or article request", async () => {
  const { BlogNavLink } = await loadModule("src/components/blog/BlogNavLink.tsx");
  assert.match(renderToStaticMarkup(createElement(BlogNavLink)), /href="\/blog"[^>]*>Blog<\/a>/);
});
