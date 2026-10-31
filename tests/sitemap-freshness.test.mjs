import test from "node:test";
import assert from "node:assert/strict";
import { renderSitemap, sourceDate } from "../src/lib/sitemap.ts";
import { publishIndexNow } from "../scripts/seo/indexnow.mjs";
test("CMS dates survive without using the build date; unknown dates are omitted", () => {
  const xml = renderSitemap(
    [
      { path: "/", lastmod: "2026-01-02" },
      { path: "/blog", lastmod: "2026-01-01" },
    ],
    [
      { slug: "new & useful", updated: "2026-03-04T10:00:00Z", published_at: "2026-02-01" },
      { slug: "unknown", updated: "yesterday" },
      { slug: "original", published_at: "2026-02-03" },
    ],
  );
  assert.match(xml, /new%20%26%20useful<\/loc><lastmod>2026-03-04T10:00:00.000Z/);
  assert.match(xml, /\/blog<\/loc><lastmod>2026-03-04T10:00:00.000Z/);
  assert.match(xml, /\/unknown<\/loc><\/url>/);
  assert.match(xml, /\/original<\/loc><lastmod>2026-02-03T00:00:00.000Z/);
  assert.equal(sourceDate("2026-02-31"), undefined);
});
test("IndexNow checks ownership before one batch and rejects foreign URLs", async () => {
  const config = { host: "app.languagethreshold.com", key: "1234567890abcdef" };
  const calls = [];
  await publishIndexNow(config, async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith(".txt")) return new Response(config.key);
    if (url.endsWith("sitemap.xml"))
      return new Response(
        "<urlset><url><loc>https://app.languagethreshold.com/blog/new</loc></url></urlset>",
      );
    return new Response("", { status: 202 });
  });
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[2].options.body).urlList, [
    "https://app.languagethreshold.com/blog/new",
  ]);
  await assert.rejects(
    () => publishIndexNow(config, async () => new Response("wrong-key")),
    /not live/,
  );
  await assert.rejects(
    () =>
      publishIndexNow(
        config,
        async (url) =>
          new Response(
            url.endsWith(".txt")
              ? config.key
              : "<urlset><loc>https://other.example/</loc></urlset>",
          ),
      ),
    /outside this site/,
  );
});
