import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createHash, webcrypto } from "node:crypto";
const sha = (text) => createHash("sha256").update(text).digest("hex");
function fixture(version = "one") {
  const content = JSON.stringify({ syntheticPublicLessonFixture: version });
  const js = `export const version='${version}';`;
  const asset = { url: `/assets/app-${version}.js`, bytes: Buffer.byteLength(js), sha256: sha(js) };
  const assets = [asset],
    appVersion = sha(JSON.stringify(assets));
  const data = {
    url: `/lesson-packs/roofing-es-en-${sha(content)}.json`,
    bytes: Buffer.byteLength(content),
    sha256: sha(content),
  };
  return {
    manifest: {
      schema: 1,
      packId: "roofing-es-en",
      version: sha(`${data.sha256}:${appVersion}`),
      appVersion,
      shell: "/",
      content: data,
      assets,
      totalBytes: data.bytes + asset.bytes,
    },
    content,
    js,
  };
}
function runtime() {
  const stores = new Map(),
    calls = [],
    listeners = {};
  let current = fixture(),
    corrupt = false,
    badShell = false;
  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name);
    return {
      match: async (url) => data.get(url)?.clone(),
      put: async (url, response) => {
        data.set(url, response.clone());
      },
    };
  };
  const context = vm.createContext({
    self: {
      addEventListener: (type, handler) => {
        listeners[type] = handler;
      },
    },
    caches: {
      keys: async () => [...stores.keys()],
      open: async (name) => cacheFor(name),
      delete: async (name) => stores.delete(name),
    },
    crypto: webcrypto,
    TextEncoder,
    Response,
    AbortSignal,
    URL,
    console,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url === "/lesson-packs/roofing-es-en.json")
        return new Response(JSON.stringify(current.manifest));
      if (url === current.manifest.content.url) return new Response(current.content);
      if (url === current.manifest.assets[0].url)
        return new Response(corrupt ? "bad bytes" : current.js);
      if (url === "/")
        return new Response(
          `<html><script src="${badShell ? "/assets/different.js" : current.manifest.assets[0].url}"></script></html>`,
        );
      throw Error("Unexpected URL");
    },
  });
  vm.runInContext(
    readFileSync(new URL("../public/offline-lessons-worker.js", import.meta.url), "utf8"),
    context,
  );
  return {
    stores,
    calls,
    context,
    setCurrent: (next) => (current = next),
    setCorrupt: (next) => (corrupt = next),
    setBadShell: (next) => (badShell = next),
    command: async (type) => {
      let job, result;
      listeners.message({
        data: { type, url: "https://untrusted.example/private" },
        ports: [{ postMessage: (value) => (result = value) }],
        waitUntil: (p) => (job = p),
      });
      await job;
      return result;
    },
  };
}

test("public lesson installation verifies files before readiness and survives unrelated cache storage", async () => {
  const r = runtime();
  r.stores.set("unrelated-cache", new Map());
  assert.equal((await r.command("LESSON_PACK_STATUS")).ready, false);
  const result = await r.command("LESSON_PACK_INSTALL");
  assert.equal(result.ok, true);
  assert.equal(result.ready, true);
  assert.ok(r.stores.has("unrelated-cache"));
  assert.ok(
    r.calls.every(
      (call) => call.options.credentials === "omit" && call.options.redirect === "error",
    ),
  );
  assert.ok(r.calls.every((call) => call.url.startsWith("/") && !call.url.includes("api/")));
  assert.equal((await r.command("LESSON_PACK_STATUS")).ready, true);
  const shell = await vm.runInContext("offlineLessonShell()", r.context);
  assert.match(await shell.text(), /app-one/);
  assert.equal((await r.command("LESSON_PACK_REMOVE")).ready, false);
  assert.ok(r.stores.has("unrelated-cache"));
});

test("failed replacement preserves prior complete pack and cannot leave a false ready marker", async () => {
  const r = runtime();
  await r.command("LESSON_PACK_INSTALL");
  const before = (await r.command("LESSON_PACK_STATUS")).version;
  r.setCurrent(fixture("two"));
  r.setCorrupt(true);
  const result = await r.command("LESSON_PACK_INSTALL");
  assert.equal(result.ok, false);
  assert.match(result.error, /integrity/);
  assert.equal((await r.command("LESSON_PACK_STATUS")).version, before);
  assert.equal([...r.stores.keys()].filter((name) => name.startsWith("lt-lesson-pack-")).length, 1);
  r.setCorrupt(false);
  r.setBadShell(true);
  assert.equal((await r.command("LESSON_PACK_INSTALL")).ok, false);
  assert.equal((await r.command("LESSON_PACK_STATUS")).version, before);
});

test("evicted or corrupted cached files remove ready status; retry repairs the same content version", async () => {
  const r = runtime();
  await r.command("LESSON_PACK_INSTALL");
  const pack = [...r.stores.values()][0];
  pack.delete("/assets/app-one.js");
  assert.equal((await r.command("LESSON_PACK_STATUS")).ready, false);
  assert.equal((await r.command("LESSON_PACK_INSTALL")).ready, true);
  r.stores.values().next().value.set("/assets/app-one.js", new Response("corrupt"));
  assert.equal((await r.command("LESSON_PACK_STATUS")).ready, false);
});

test("untrusted paths, duplicate files and inconsistent versions are rejected before asset fetches", async () => {
  const r = runtime();
  const next = fixture();
  next.manifest.assets[0].url = "/api/exams";
  r.setCurrent(next);
  assert.equal((await r.command("LESSON_PACK_INSTALL")).ok, false);
  assert.equal(r.calls.length, 1);
  const duplicate = fixture();
  duplicate.manifest.assets.push({ ...duplicate.manifest.assets[0] });
  r.setCurrent(duplicate);
  assert.equal((await r.command("LESSON_PACK_INSTALL")).ok, false);
  const mismatch = fixture();
  mismatch.manifest.appVersion = "a".repeat(64);
  r.setCurrent(mismatch);
  assert.equal((await r.command("LESSON_PACK_INSTALL")).ok, false);
  assert.equal(r.stores.size, 0);
});

test("the worker acknowledges protocol support without reading or downloading any content", async () => {
  const r = runtime();
  const response = await r.command("LESSON_PACK_PING");
  assert.equal(response.protocol, 1);
  assert.equal(response.ok, true);
  assert.equal(r.calls.length, 0);
  assert.equal(r.stores.size, 0);
});
