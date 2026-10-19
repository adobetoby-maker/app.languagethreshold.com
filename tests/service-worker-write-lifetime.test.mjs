import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const tick = () => new Promise((r) => setImmediate(r));
function runtime({
  cached = false,
  failWrite = false,
  holdOpen = false,
  failOpen = false,
  response = new Response("network lesson"),
} = {}) {
  const handlers = {},
    jobs = [],
    puts = [],
    store = new Map();
  let release, releaseOpen;
  let opens = 0;
  const url = "https://practice.example/lesson-content/es/plumber.json";
  if (cached) store.set(url, new Response("saved lesson"));
  const key = (v) => (typeof v === "string" ? new URL(v, "https://practice.example").href : v.url);
  const cache = {
    match: async (request) => store.get(key(request))?.clone(),
    put: async (request, value) => {
      puts.push(key(request));
      if (failWrite) throw Error("Controlled quota failure");
      await new Promise((r) => (release = r));
      store.set(key(request), value);
    },
  };
  const source = process.env.LT_SW_WRITE_BASELINE
    ? execFileSync("git", ["show", `${process.env.LT_SW_WRITE_BASELINE}:public/sw.js`], {
        encoding: "utf8",
      })
    : readFileSync("public/sw.js", "utf8");
  vm.runInNewContext(source, {
    URL,
    Response,
    AbortSignal,
    importScripts() {},
    self: {
      location: { origin: "https://practice.example" },
      addEventListener: (name, handler) => (handlers[name] = handler),
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => {
        opens++;
        if (failOpen) throw Error("Controlled cache opening failure");
        if (holdOpen) await new Promise((r) => (releaseOpen = r));
        return cache;
      },
      match: async (request) => cache.match(request),
    },
    fetch: async () => response.clone(),
  });
  return {
    jobs,
    puts,
    store,
    release: () => release?.(),
    openStarted: () => opens > 0,
    releaseOpen: () => releaseOpen?.(),
    dispatch(path = url, options = {}) {
      let result;
      handlers.fetch({
        request: {
          url: new URL(path, "https://practice.example").href,
          mode: options.navigate ? "navigate" : "cors",
          method: options.method ?? "GET",
          headers: new Headers(options.headers),
        },
        respondWith: (p) => (result = p),
        waitUntil: (p) => jobs.push(p),
      });
      return result;
    },
  };
}
async function until(fn) {
  for (let i = 0; i < 30 && !fn(); i++) await tick();
  assert.ok(fn());
}
async function trackedSettled(r) {
  let settled = false;
  Promise.all(r.jobs).then(() => (settled = true));
  for (let i = 0; i < 4; i++) await tick();
  return settled;
}

test("cached lesson refresh keeps write alive after network response finishes", async () => {
  const r = runtime({ cached: true });
  const response = await r.dispatch();
  assert.equal(await response.text(), "saved lesson");
  await until(() => r.puts.length);
  const premature = await trackedSettled(r);
  r.release();
  await Promise.all(r.jobs);
  await tick();
  assert.equal(
    premature,
    false,
    "worker lifetime must include pending lesson cache.put, not just the completed fetch",
  );
  assert.equal(await r.store.get(r.puts[0]).text(), "network lesson");
});

test("uncached lesson content and word decks return before writes but keep writes alive", async () => {
  for (const path of ["/lesson-content/es/plumber.json", "/lesson-decks/es/plumber.json"]) {
    const r = runtime();
    let response;
    const pending = r.dispatch(path).then((value) => (response = value));
    await until(() => r.puts.length);
    assert.ok(response, "response delivery must not wait on cache storage");
    assert.equal(await response.text(), "network lesson");
    const premature = await trackedSettled(r);
    r.release();
    await pending;
    await Promise.all(r.jobs);
    assert.equal(premature, false);
    assert.ok(r.store.has(new URL(path, "https://practice.example").href));
  }
});

test("static assets and public navigation track cache opening and delayed write", async () => {
  for (const [path, navigate] of [
    ["/assets/app-1234.js", false],
    ["/public-help", true],
  ]) {
    const r = runtime({ holdOpen: true });
    const response = await r.dispatch(path, { navigate });
    assert.equal(await response.text(), "network lesson");
    await until(r.openStarted);
    assert.equal(await trackedSettled(r), false, "event must also own a pending cache open");
    r.releaseOpen();
    await until(() => r.puts.length);
    const premature = await trackedSettled(r);
    r.release();
    await Promise.all(r.jobs);
    assert.equal(premature, false);
  }
});

test("quota failures are contained while all public response branches still deliver", async () => {
  for (const [path, navigate, cached] of [
    ["/lesson-content/es/plumber.json", false, false],
    ["/lesson-content/es/plumber.json", false, true],
    ["/lesson-decks/es/plumber.json", false, false],
    ["/assets/app-1234.js", false, false],
    ["/public-help", true, false],
  ]) {
    const r = runtime({ failWrite: true, cached });
    const response = await r.dispatch(path, { navigate });
    assert.equal(await response.text(), cached ? "saved lesson" : "network lesson");
    await until(() => r.puts.length);
    await Promise.all(r.jobs);
    assert.equal(r.puts.length, 1);
    assert.equal(r.store.size, cached ? 1 : 0);
  }
  for (const [path, navigate] of [
    ["/assets/app-1234.js", false],
    ["/public-help", true],
  ]) {
    const r = runtime({ failOpen: true });
    assert.equal(await (await r.dispatch(path, { navigate })).text(), "network lesson");
    await Promise.all(r.jobs);
    assert.equal(r.puts.length, 0);
  }
});

test("lifetime tracking cannot cache private responses or intercept excluded requests", async () => {
  for (const path of ["/lesson-content/es/plumber.json", "/assets/app-1234.js", "/public-help"]) {
    for (const policy of ["no-store", "private"]) {
      const r = runtime({
        response: new Response("private", { headers: { "cache-control": policy } }),
      });
      assert.equal(
        await (await r.dispatch(path, { navigate: path === "/public-help" })).text(),
        "private",
      );
      await tick();
      assert.equal(r.puts.length, 0);
    }
  }
  for (const [path, options] of [
    ["/api/exams", {}],
    ["/team", {}],
    ["https://other.example/file.js", {}],
    ["/assets/app-1234.js", { headers: { Authorization: "Bearer synthetic" } }],
    ["/lesson-content/es/plumber.json", { method: "POST" }],
  ]) {
    const r = runtime();
    assert.equal(r.dispatch(path, options), undefined);
    assert.equal(r.puts.length, 0);
    assert.equal(r.jobs.length, 0);
  }
});
