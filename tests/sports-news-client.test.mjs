import assert from "node:assert/strict";
import test from "node:test";
import { getSportsNews, SPORTS_NEWS_MAX_BYTES } from "../src/lib/sports-news-client.ts";
const article = {
  id: "synthetic",
  title: "Synthetic result",
  summary: "Summary",
  url: "https://fixture.invalid/news",
  pubDate: "2026-10-18T00:00:00Z",
  source: "Synthetic",
  sport: "soccer",
  teamMentions: ["Arsenal"],
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function fixture(run) {
  const saved = { fetch, set: setTimeout, clear: clearTimeout };
  const timers = new Map(),
    owner = new AbortController();
  const c = {
    owner,
    timers,
    current: true,
    calls: [],
    operations: new Set(),
    provider: async () => Response.json({ articles: [article] }),
    expire() {
      for (const fn of [...timers.values()]) fn();
    },
    async until(check) {
      for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => saved.set(r, 1));
      assert.ok(check());
    },
  };
  globalThis.setTimeout = (fn, ms, ...args) => {
    if (ms !== 30000) return saved.set(fn, ms, ...args);
    const token = {};
    timers.set(token, fn);
    return token;
  };
  globalThis.clearTimeout = (token) => {
    if (timers.has(token)) timers.delete(token);
    else saved.clear(token);
  };
  globalThis.fetch = async (url, options) => {
    c.calls.push({ url, options });
    return c.provider();
  };
  c.call = () => {
    const pending = getSportsNews(
      { sport: "soccer", favoriteTeam: "Arsenal" },
      { signal: owner.signal, isCurrent: () => c.current },
    );
    c.operations.add(pending);
    void pending.then(
      () => c.operations.delete(pending),
      () => c.operations.delete(pending),
    );
    return pending;
  };
  try {
    await run(c);
    assert.equal(timers.size, 0);
  } finally {
    owner.abort();
    await Promise.allSettled([...c.operations]);
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
  }
}
test("sports client validates article shape, scope and safe links before exposing data", () =>
  fixture(async (c) => {
    assert.deepEqual(await c.call(), [article]);
    assert.equal(c.calls[0].options.cache, "no-store");
    assert.equal(c.calls[0].url, "/api/sports-news");
    const bad = [
      null,
      {},
      [],
      { articles: [], error: "PRIVATE upstream detail" },
      { articles: [null] },
      { articles: Array(11).fill(article) },
      ...[
        { title: 4 },
        { title: "x".repeat(401) },
        { summary: "x".repeat(201) },
        { url: "javascript:alert(1)" },
        { url: "https://u:p@fixture.invalid" },
        { pubDate: "invalid" },
        { source: "" },
        { sport: "baseball" },
        { teamMentions: "Arsenal" },
        { teamMentions: [4] },
      ].map((patch) => ({ articles: [{ ...article, ...patch }] })),
    ];
    for (const value of bad) {
      c.provider = async () => Response.json(value);
      await assert.rejects(
        c.call(),
        (e) => e.message === "News unavailable — try again later." && e.cause === undefined,
      );
    }
    c.provider = async () => {
      throw Error("PRIVATE network detail");
    };
    await assert.rejects(c.call(), /News unavailable — try again later/);
  }));
test("sports client bounds exact and excess UTF-8 bytes, advertised length and encoding", () =>
  fixture(async (c) => {
    const text = JSON.stringify({ articles: [article] });
    c.provider = async () =>
      new Response(
        text + " ".repeat(SPORTS_NEWS_MAX_BYTES - new TextEncoder().encode(text).length),
      );
    assert.deepEqual(await c.call(), [article]);
    for (const advertised of [false, true]) {
      let cancelled = false;
      const body = new ReadableStream({
        start(out) {
          out.enqueue(new TextEncoder().encode(text + "é".repeat(SPORTS_NEWS_MAX_BYTES)));
        },
        cancel() {
          cancelled = true;
          return new Promise(() => {});
        },
      });
      c.provider = async () =>
        new Response(body, {
          headers: advertised ? { "content-length": String(SPORTS_NEWS_MAX_BYTES + 1) } : {},
        });
      await assert.rejects(c.call(), /News unavailable/);
      assert.equal(cancelled, true);
      assert.equal(body.locked, false);
    }
    c.provider = async () => new Response(new Uint8Array([255]));
    await assert.rejects(c.call(), /News unavailable/);
  }));
test("sports client deadline rejects ignored headers, disposes late body and permits later request", () =>
  fixture(async (c) => {
    const held = deferred();
    c.provider = () => held.promise;
    const pending = c.call();
    await c.until(() => c.calls.length === 1);
    c.expire();
    await assert.rejects(pending, /News unavailable/);
    assert.equal(c.owner.signal.aborted, false);
    assert.equal(c.calls[0].options.signal.aborted, true);
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
    c.provider = async () => Response.json({ articles: [] });
    assert.deepEqual(await c.call(), []);
  }));
test("sports client owns partial JSON timeout and incoming cancellation with nonsettling cleanup", () =>
  fixture(async (c) => {
    for (const mode of ["timeout", "incoming"]) {
      let cancelled = false;
      const body = new ReadableStream({
        start(out) {
          out.enqueue(new TextEncoder().encode('{"articles":'));
        },
        cancel() {
          cancelled = true;
          return new Promise(() => {});
        },
      });
      c.provider = async () => new Response(body);
      const pending = c.call();
      await c.until(() => body.locked);
      if (mode === "timeout") c.expire();
      else c.owner.abort();
      await assert.rejects(pending, (e) =>
        mode === "incoming"
          ? e.name === "AbortError"
          : e.message === "News unavailable — try again later.",
      );
      assert.equal(cancelled, true);
      assert.equal(body.locked, false);
    }
  }));
test("sports client completed phase releases incoming listener and departed owner cannot dispatch", () =>
  fixture(async (c) => {
    await c.call();
    const signal = c.calls[0].options.signal;
    c.current = false;
    await assert.rejects(c.call(), (e) => e.name === "AbortError");
    assert.equal(c.calls.length, 1);
    c.owner.abort();
    assert.equal(signal.aborted, false);
  }));
