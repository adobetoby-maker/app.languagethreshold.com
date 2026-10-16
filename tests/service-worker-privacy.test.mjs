import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
function runtime() {
  const listeners = {},
    stores = new Map(),
    origin = "https://practice.example";
  let network = new Response("public"),
    fail = false,
    calls = 0;
  const normalize = (value) =>
    typeof value === "string" ? new URL(value, origin).href : value.url;
  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      match: async (request) => store.get(normalize(request))?.clone(),
      put: async (request, response) => store.set(normalize(request), response.clone()),
    };
  };
  const caches = {
    open: async (name) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (request) => {
      for (const store of stores.values()) {
        const value = store.get(normalize(request));
        if (value) return value.clone();
      }
    },
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    Response,
    AbortSignal,
    console,
    caches,
    importScripts() {},
    self: {
      location: { origin },
      addEventListener: (name, handler) => {
        listeners[name] = handler;
      },
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    fetch: async () => {
      calls++;
      if (fail) throw Error("offline");
      return network.clone();
    },
  });
  return {
    stores,
    caches,
    listeners,
    network(value) {
      network = value;
    },
    offline() {
      fail = true;
    },
    calls: () => calls,
    async fetch(path, { asset = false, headers = {} } = {}) {
      let result;
      const pending = [];
      listeners.fetch({
        request: {
          url: new URL(path, origin).href,
          mode: asset ? "cors" : "navigate",
          method: "GET",
          headers: new Headers(headers),
        },
        respondWith(value) {
          result = value;
        },
        waitUntil(value) {
          pending.push(value);
        },
      });
      const response = result ? await result : null;
      await Promise.all(pending);
      await new Promise((resolve) => setImmediate(resolve));
      return response;
    },
    async activate() {
      let pending;
      listeners.activate({
        waitUntil(value) {
          pending = value;
        },
      });
      await pending;
    },
    async install() {
      let pending;
      listeners.install({
        waitUntil(value) {
          pending = value;
        },
      });
      await pending;
    },
  };
}
test("private routes and legacy Exams entry never read or write the public cache, even offline", async () => {
  const r = runtime();
  const cache = await r.caches.open("lt-v15");
  await cache.put("/", new Response("public shell"));
  for (const path of [
    "/exam-content",
    "/exam-reviewers",
    "/team",
    "/team/accept?token=private",
    "/account",
    "/owner",
    "/certificate?id=private",
    "/family-setup",
    "/subscribe/success",
    "/?tab=exams",
  ]) {
    await cache.put(path, new Response("old private fixture"));
    assert.equal(await r.fetch(path), null, path);
  }
  r.offline();
  assert.equal(await r.fetch("/account"), null);
  assert.equal(r.calls(), 0);
});
test("no-store and private navigation responses are delivered without being cached", async () => {
  for (const directive of [
    "no-store",
    "private",
    "max-age=0, private, must-revalidate",
    'PRIVATE="Set-Cookie"',
  ]) {
    const r = runtime();
    r.network(new Response("sensitive", { headers: { "Cache-Control": directive } }));
    assert.equal(await (await r.fetch("/public-page")).text(), "sensitive");
    assert.equal(await (await r.caches.open("lt-v15")).match("/public-page"), undefined);
  }
});
test("public root stays cacheable while a private-context lesson URL uses only the public shell offline", async () => {
  const r = runtime();
  await r.fetch("/");
  r.network(new Response("context fixture"));
  await r.fetch("/?module=roofing&tab=core30&plan=private");
  assert.equal(
    await (await r.caches.open("lt-v15")).match("/?module=roofing&tab=core30&plan=private"),
    undefined,
  );
  r.offline();
  assert.equal(await (await r.fetch("/?module=roofing&tab=core30&plan=private")).text(), "public");
});
test("protected responses and authenticated or cross-origin assets never become public cached files", async () => {
  const r = runtime();
  r.network(new Response("private asset", { headers: { "Cache-Control": "no-store" } }));
  await r.fetch("/assets/a.js", { asset: true });
  await r.fetch("/assets/a.js", { asset: true });
  assert.equal(r.calls(), 2);
  assert.equal(
    await r.fetch("/assets/a.js", { asset: true, headers: { Authorization: "Bearer fixture" } }),
    null,
  );
  assert.equal(await r.fetch("https://other.example/a.js", { asset: true }), null);
});
test("worker activation purges the previous general cache but retains complete public lesson packs", async () => {
  const r = runtime();
  await r.caches.open("lt-v12");
  await r.caches.open("lt-v14");
  await r.caches.open("lt-v15");
  await r.caches.open("lt-lesson-pack-fixture");
  await r.activate();
  assert.deepEqual([...r.stores.keys()], ["lt-v15", "lt-lesson-pack-fixture"]);
});
test("initial automatic shell caching also honors private response policy", async () => {
  const r = runtime();
  r.network(new Response("private shell", { headers: { "Cache-Control": "no-store" } }));
  await r.install();
  assert.equal(await (await r.caches.open("lt-v15")).match("/"), undefined);
});
