import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { readSportsFeed, MAX_SPORTS_FEED_BYTES } from "../src/lib/sports-news-feed.ts";
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function fixture(run) {
  const saved = { fetch, set: setTimeout, clear: clearTimeout };
  const timers = new Map();
  const owner = new AbortController();
  const c = {
    owner,
    timers,
    calls: [],
    provider: async () => new Response("<rss/>"),
    expire() {
      for (const fn of [...timers.values()]) fn();
    },
    async until(check) {
      for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => saved.set(r, 1));
      assert.ok(check());
    },
  };
  globalThis.fetch = async (url, options) => {
    c.calls.push({ url: String(url), options });
    return c.provider(url, options);
  };
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (ms !== 8000 && ms !== 10000) return saved.set(fn, ms, ...args);
    const token = { unref() {} };
    timers.set(token, fn);
    return token;
  };
  globalThis.clearTimeout = (token) => {
    if (timers.has(token)) timers.delete(token);
    else saved.clear(token);
  };
  try {
    await run(c);
    assert.equal(timers.size, 0);
  } finally {
    owner.abort();
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
  }
}
async function route() {
  const root = mkdtempSync(path.resolve("node_modules/.cache/sports-news-"));
  const file = path.join(root, "route.mjs");
  await build({
    stdin: {
      contents: `export {Route} from ${JSON.stringify(path.resolve("src/routes/api.sports-news.ts"))};export {errors} from 'fixture-controls';`,
      resolveDir: process.cwd(),
    },
    outfile: file,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["zod"],
    logLevel: "silent",
    plugins: [
      {
        name: "fixtures",
        setup(b) {
          b.onResolve(
            { filter: /^(@tanstack\/react-router|\.\.\/lib\/sentry|fixture-controls)$/ },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `export const errors=[];export const createFileRoute=()=>config=>config;export const initSentry=()=>{};export const Sentry={captureException(error){errors.push(error.message);}};`,
          }));
        },
      },
    ],
  });
  try {
    return await import(file);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function request(body = { sport: "baseball" }, headers = {}, signal) {
  return new Request("https://fixture.invalid/api/sports-news", {
    method: "POST",
    headers: { Origin: "https://fixture.invalid", "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal,
  });
}
function privacy(response) {
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
const item = (title, url = "https://example.invalid/news/1", date = "2026-10-17T12:00:00Z") =>
  `<item><title><![CDATA[${title}]]></title><link>${url}</link><description>Public synthetic summary</description><pubDate>${date}</pubDate></item>`;

test("sports feed admits exact bytes and refuses advertised/stream overflow and invalid UTF-8", () =>
  fixture(async (c) => {
    c.provider = async () => new Response("x".repeat(MAX_SPORTS_FEED_BYTES));
    assert.equal(
      (await readSportsFeed("https://feed.invalid", c.owner.signal)).length,
      MAX_SPORTS_FEED_BYTES,
    );
    for (const advertised of [false, true]) {
      let cancelled = 0;
      const body = new ReadableStream({
        start(out) {
          out.enqueue(new Uint8Array(MAX_SPORTS_FEED_BYTES + 1));
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      });
      c.provider = async () =>
        new Response(body, {
          headers: advertised ? { "content-length": String(MAX_SPORTS_FEED_BYTES + 1) } : {},
        });
      await assert.rejects(
        readSportsFeed("https://feed.invalid", c.owner.signal),
        /News feed unavailable/,
      );
      assert.equal(cancelled, 1);
      assert.equal(body.locked, false);
    }
    c.provider = async () => new Response(new Uint8Array([255]));
    await assert.rejects(
      readSportsFeed("https://feed.invalid", c.owner.signal),
      /News feed unavailable/,
    );
    assert.ok(c.calls.every((x) => x.options.cache === "no-store"));
  }));
test("sports feed owns ignored late headers and disposes them after the eight-second phase", () =>
  fixture(async (c) => {
    const held = deferred();
    c.provider = () => held.promise;
    const pending = readSportsFeed("https://feed.invalid", c.owner.signal);
    await c.until(() => c.calls.length === 1);
    c.expire();
    await assert.rejects(pending, /News feed unavailable/);
    assert.equal(c.calls[0].options.signal.aborted, true);
    assert.equal(c.owner.signal.aborted, false);
    let cancelled = false;
    held.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
            return new Promise(() => {});
          },
        }),
      ),
    );
    await c.until(() => cancelled);
    c.provider = async () => new Response("fresh");
    assert.equal(await readSportsFeed("https://feed.invalid", c.owner.signal), "fresh");
  }));
test("sports partial feed timeout and incoming abort release readers despite stalled cancellation", () =>
  fixture(async (c) => {
    for (const reason of ["timeout", "incoming"]) {
      let cancelled = false;
      const body = new ReadableStream({
        start(out) {
          out.enqueue(new TextEncoder().encode("<rss>"));
        },
        cancel() {
          cancelled = true;
          return new Promise(() => {});
        },
      });
      c.provider = async () => new Response(body);
      const pending = readSportsFeed("https://feed.invalid", c.owner.signal);
      await c.until(() => body.locked);
      if (reason === "timeout") c.expire();
      else c.owner.abort();
      await assert.rejects(pending, /News feed unavailable/);
      assert.equal(cancelled, true);
      assert.equal(body.locked, false);
    }
  }));
test("sports completed feed drops incoming abort listener and pre-aborted feed starts no fetch", () =>
  fixture(async (c) => {
    await readSportsFeed("https://feed.invalid", c.owner.signal);
    const signal = c.calls[0].options.signal;
    c.owner.abort();
    assert.equal(signal.aborted, false);
    await assert.rejects(
      readSportsFeed("https://feed.invalid", c.owner.signal),
      /News feed unavailable/,
    );
    assert.equal(c.calls.length, 1);
  }));
test("sports route rejects foreign, oversized, malformed and invalid input before feeds with fixed private errors", () =>
  fixture(async (c) => {
    const { Route } = await route();
    const call = (req) => Route.server.handlers.POST({ request: req });
    for (const [body, headers, status] of [
      [{}, { Origin: "https://foreign.invalid" }, 403],
      [" ".repeat(4097), {}, 413],
      ["PRIVATE invalid JSON", {}, 400],
      [{ sport: "PRIVATE invalid sport" }, {}, 400],
    ]) {
      const response = await call(request(body, headers));
      assert.equal(response.status, status);
      privacy(response);
      assert.ok(!(await response.text()).includes("PRIVATE"));
    }
    assert.equal(c.calls.length, 0);
  }));
test("sports route does not manufacture current baseball headlines when the real feed fails", () =>
  fixture(async (c) => {
    const { Route, errors } = await route();
    c.provider = async () => {
      throw Error("PRIVATE upstream learner-shaped detail");
    };
    const response = await Route.server.handlers.POST({ request: request() });
    assert.equal(response.status, 200);
    privacy(response);
    assert.deepEqual(await response.json(), {
      articles: [],
      error: "News feeds unavailable — try again later.",
    });
    assert.deepEqual(errors, ["Sports news feed unavailable"]);
  }));
test("sports route preserves partial real-feed results, safe links, sorting, dedup and favorite promotion", () =>
  fixture(async (c) => {
    const { Route, errors } = await route();
    c.provider = async (url) => {
      if (String(url).includes("theguardian"))
        return new Response("PRIVATE upstream body", { status: 502 });
      return new Response(
        "<rss>" +
          item("New neutral story", "https://example.invalid/new", "2026-10-18T12:00:00Z") +
          item("Arsenal synthetic result") +
          item("Arsenal synthetic result") +
          item("Unsafe story", "javascript:alert(1)") +
          item("Credentials", "https://user:pass@example.invalid") +
          Array.from({ length: 15 }, (_, i) =>
            item(`Other ${i}`, `https://example.invalid/${i}`),
          ).join("") +
          "</rss>",
      );
    };
    const response = await Route.server.handlers.POST({
      request: request({ sport: "soccer", favoriteTeam: "Arsenal" }),
    });
    privacy(response);
    const data = await response.json();
    assert.equal(data.articles.length, 10);
    assert.equal(data.articles[0].title, "Arsenal synthetic result");
    assert.equal(data.articles[1].title, "New neutral story");
    assert.equal(data.articles[0].source, "BBC Sport");
    assert.equal(data.articles.filter((a) => a.title === "Arsenal synthetic result").length, 1);
    assert.ok(!data.articles.some((a) => /Unsafe|Credentials/.test(a.title)));
    assert.ok(!data.error);
    assert.deepEqual(errors, ["Sports news feed unavailable"]);
    assert.equal(c.calls.length, 2);
  }));
test("sports route owns partial input and request departure before or during feeds", () =>
  fixture(async (c) => {
    const { Route } = await route();
    let cancelled = false;
    const body = new ReadableStream({
      start(out) {
        out.enqueue(new TextEncoder().encode('{"sport":'));
      },
      cancel() {
        cancelled = true;
        return new Promise(() => {});
      },
    });
    const req = new Request("https://fixture.invalid/api/sports-news", {
      method: "POST",
      headers: { Origin: "https://fixture.invalid" },
      body,
      duplex: "half",
    });
    const pending = Route.server.handlers.POST({ request: req });
    await c.until(() => req.body.locked);
    c.expire();
    let response = await pending;
    assert.equal(response.status, 408);
    privacy(response);
    assert.equal(cancelled, true);
    assert.equal(req.body.locked, false);
    assert.equal(c.calls.length, 0);
    const held = deferred();
    c.provider = () => held.promise;
    const active = Route.server.handlers.POST({
      request: request({ sport: "soccer" }, {}, c.owner.signal),
    });
    await c.until(() => c.calls.length === 2);
    c.owner.abort();
    response = await active;
    assert.equal(response.status, 499);
    privacy(response);
    held.resolve(new Response("<rss/>"));
  }));
