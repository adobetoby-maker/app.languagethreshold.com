import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareBlogHtml,
  listBlogArticles,
  readBlogArticle,
} from "../src/lib/heycatch-blog.server.ts";
test("sanitization keeps article structure and inserts TOC after takeaways", () => {
  const html = prepareBlogHtml(
    '<h2>Key takeaways</h2><ul><li>Keep me</li></ul><h2 id="practice">Practice <strong>daily</strong></h2><p onclick="evil()">Body<script>evil()</script><a href="javascript:evil()">link</a></p><h2 id="faq">FAQ</h2><h3>Question</h3><table><tr><td>Answer</td></tr></table>',
  );
  assert.ok(html.indexOf("</ul>") < html.indexOf("Table of contents"));
  assert.ok(html.indexOf("Table of contents") < html.indexOf('<h2 id="practice">'));
  assert.match(html, /href="#practice"/);
  assert.doesNotMatch(html, /href="#faq"|onclick|javascript:|<script/);
  assert.match(html, /<table>/);
});
test("TOC is omitted without qualifying headings", () => {
  assert.equal(prepareBlogHtml("<p>Hello</p>"), "<p>Hello</p>");
});
test("all pages, encoded slugs, canonical and safe JSON-LD; missing and unavailable differ", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.HEYCATCH_API_KEY;
  process.env.HEYCATCH_API_KEY = "test-publication-key";
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    calls.push(url);
    assert.equal(url.searchParams.get("key"), "test-publication-key");
    if (url.pathname.endsWith("/articles")) {
      const offset = Number(url.searchParams.get("offset"));
      return Response.json({
        total: 51,
        articles: Array.from({ length: offset ? 1 : 50 }, (_, i) => ({
          id: String(offset + i),
          slug: String(offset + i),
          title: "Title",
        })),
      });
    }
    if (url.pathname.endsWith("/missing")) return new Response("", { status: 404 });
    if (url.pathname.endsWith("/unavailable")) throw new Error("offline");
    return Response.json({
      article: {
        id: "post",
        slug: "hello world",
        title: "Post",
        content_html: '<h2 id="intro">Intro</h2>',
        jsonLd: { headline: "</script>" },
      },
    });
  };
  try {
    assert.equal((await listBlogArticles()).length, 51);
    assert.equal(calls[1].searchParams.get("offset"), "50");
    const article = await readBlogArticle("hello world");
    assert.equal(article.canonical, "https://app.languagethreshold.com/blog/hello%20world");
    assert.doesNotMatch(article.schema, /</);
    assert.equal(await readBlogArticle("missing"), null);
    assert.match((await readBlogArticle("unavailable")).content_html, /temporarily unavailable/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.HEYCATCH_API_KEY;
    else process.env.HEYCATCH_API_KEY = oldKey;
  }
});
