// Built by TAC — 2026-10-23
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const tick = () => new Promise((r) => setImmediate(r));

async function bundle(entry, plugins = []) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/tts-cache-"));
  const outfile = join(dir, "case.mjs");
  await build({
    stdin: { contents: entry, resolveDir: process.cwd() },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    plugins,
  });
  const mod = await import(`${outfile}?${Math.random()}`);
  return { mod, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const blobOf = (text, size) =>
  new Blob([text.padEnd(size ?? text.length, "x")], { type: "audio/mpeg" });

test("cache key is a stable sha256 of voice|language|renderedRate|text", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const parts = {
      voiceName: "es-US-Neural2-A",
      languageCode: "es-US",
      renderedRate: 0.85,
      text: "hola",
    };
    const key = await mod.ttsAudioCacheKey(parts);
    assert.equal(key, createHash("sha256").update("es-US-Neural2-A|es-US|0.85|hola").digest("hex"));
    assert.equal(await mod.ttsAudioCacheKey({ ...parts }), key, "same input, same key");
    assert.equal(
      await mod.ttsAudioCacheKey({ ...parts, text: "  hola \n" }),
      key,
      "server trims text, so does the key",
    );
    assert.equal(await mod.ttsAudioCacheKey({ ...parts, renderedRate: Number("0.850") }), key);
    for (const changed of [
      { voiceName: "es-US-Neural2-B" },
      { languageCode: "es-MX" },
      { renderedRate: 1 },
      { text: "Hola" },
    ]) {
      assert.notEqual(
        await mod.ttsAudioCacheKey({ ...parts, ...changed }),
        key,
        JSON.stringify(changed),
      );
    }
  } finally {
    cleanup();
  }
});

test("key is null, not a throw, when Web Crypto is unavailable", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  const saved = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  try {
    assert.equal(
      await mod.ttsAudioCacheKey({
        voiceName: "v",
        languageCode: "es-US",
        renderedRate: 1,
        text: "x",
      }),
      null,
    );
    const cache = mod.createTtsAudioCache({ openBackend: async () => mod.createMemoryBackend() });
    const request = { voiceName: "v", languageCode: "es-US", speakingRate: 1, text: "x" };
    assert.equal(await cache.lookup(request), null);
    await cache.store(request, 1, blobOf("audio"));
  } finally {
    Object.defineProperty(globalThis, "crypto", saved);
    cleanup();
  }
});

test("LruMap evicts the least recently used entry and reads refresh recency", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const lru = new mod.LruMap(3);
    lru.set("a", 1);
    lru.set("b", 2);
    lru.set("c", 3);
    assert.equal(lru.get("a"), 1, "touch a so b is now oldest");
    lru.set("d", 4);
    assert.deepEqual(lru.keys(), ["c", "a", "d"]);
    assert.equal(lru.get("b"), undefined);
    lru.set("a", 10);
    lru.set("e", 5);
    assert.deepEqual(lru.keys(), ["d", "a", "e"]);
    assert.equal(lru.size, 3);
  } finally {
    cleanup();
  }
});

test("planEviction removes the oldest stored entries until both caps hold", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const entries = {
      c: { at: 30, size: 10 },
      a: { at: 10, size: 10 },
      b: { at: 20, size: 10 },
      d: { at: 40, size: 10 },
    };
    assert.deepEqual(mod.planEviction(entries, 10, 1000), [], "within caps");
    assert.deepEqual(mod.planEviction(entries, 2, 1000), ["a", "b"], "entry cap, oldest first");
    assert.deepEqual(mod.planEviction(entries, 10, 25), ["a", "b"], "byte cap, oldest first");
    assert.deepEqual(
      mod.planEviction(entries, 3, 15),
      ["a", "b", "c"],
      "both caps, stops once satisfied",
    );
  } finally {
    cleanup();
  }
});

test("persistent tier survives a new cache instance and evicts past the entry cap", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const backend = mod.createMemoryBackend();
    let clock = 1000;
    const open = () =>
      mod.createTtsAudioCache({
        openBackend: async () => backend,
        maxEntries: 3,
        memoryEntries: 2,
        now: () => (clock += 10),
      });
    const first = open();
    for (const word of ["uno", "dos", "tres"]) {
      await first.store(
        { voiceName: "v", languageCode: "es-US", speakingRate: 1, text: word },
        1,
        blobOf(word, 20),
      );
    }
    await first.settled();
    const second = open();
    for (const word of ["uno", "dos", "tres"]) {
      const hit = await second.lookup({
        voiceName: "v",
        languageCode: "es-US",
        speakingRate: 1,
        text: word,
      });
      assert.ok(hit, `${word} loaded from the persistent tier`);
      assert.equal(hit.renderedRate, 1);
      assert.equal(await hit.blob.text(), word.padEnd(20, "x"));
    }
    await second.store(
      { voiceName: "v", languageCode: "es-US", speakingRate: 1, text: "cuatro" },
      1,
      blobOf("cuatro", 20),
    );
    await second.settled();
    const third = open();
    const has = async (word) =>
      !!(await third.lookup({
        voiceName: "v",
        languageCode: "es-US",
        speakingRate: 1,
        text: word,
      }));
    assert.equal(await has("uno"), false, "oldest stored entry evicted");
    assert.equal(await has("dos"), true);
    assert.equal(await has("tres"), true);
    assert.equal(await has("cuatro"), true);
  } finally {
    cleanup();
  }
});

test("persistent tier evicts by byte cap", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const backend = mod.createMemoryBackend();
    let clock = 0;
    const cache = mod.createTtsAudioCache({
      openBackend: async () => backend,
      maxBytes: 50,
      memoryEntries: 1,
      now: () => (clock += 1),
    });
    const request = (text) => ({ voiceName: "v", languageCode: "es-US", speakingRate: 1, text });
    await cache.store(request("a"), 1, blobOf("a", 30));
    await cache.store(request("b"), 1, blobOf("b", 30));
    await cache.settled();
    const fresh = mod.createTtsAudioCache({ openBackend: async () => backend, memoryEntries: 1 });
    assert.equal(await fresh.lookup(request("a")), null, "a evicted to fit 50 bytes");
    assert.ok(await fresh.lookup(request("b")));
  } finally {
    cleanup();
  }
});

test("a voice that ignores speaking rate is cached once and found at any requested rate", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const backend = mod.createMemoryBackend();
    const open = () => mod.createTtsAudioCache({ openBackend: async () => backend });
    const cache = open();
    const at = (speakingRate) => ({
      voiceName: "es-US-Chirp-HD-D",
      languageCode: "es-US",
      speakingRate,
      text: "hola",
    });
    assert.equal(await cache.lookup(at(0.75)), null, "first ever request is a miss");
    await cache.store(at(0.75), 1, blobOf("hola")); // server answered X-TTS-Rendered-Rate: 1
    await cache.settled();
    for (const rate of [0.5, 0.75, 1, 1.5]) {
      const hit = await open().lookup(at(rate));
      assert.ok(hit, `hit at requested ${rate}`);
      assert.equal(hit.renderedRate, 1);
    }
    // A voice that does honor the rate keeps separate clips per rate.
    const honoring = (speakingRate) => ({
      voiceName: "es-US-Neural2-A",
      languageCode: "es-US",
      speakingRate,
      text: "hola",
    });
    await cache.store(honoring(0.75), 0.75, blobOf("slow"));
    await cache.settled();
    assert.ok(await open().lookup(honoring(0.75)));
    assert.equal(await open().lookup(honoring(1)), null);
  } finally {
    cleanup();
  }
});

test("storage failures never throw and never block the in-memory tier", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const boom = async () => {
      throw new Error("storage unavailable");
    };
    const request = { voiceName: "v", languageCode: "es-US", speakingRate: 1, text: "hola" };

    const unopenable = mod.createTtsAudioCache({ openBackend: boom });
    await unopenable.store(request, 1, blobOf("audio"));
    const memoryHit = await unopenable.lookup(request);
    assert.ok(memoryHit, "memory tier still serves when the backend cannot open");
    assert.equal(await memoryHit.blob.text(), "audio");
    await unopenable.clear();
    assert.equal(await unopenable.lookup(request), null);

    const noBackend = mod.createTtsAudioCache({ openBackend: async () => null });
    await noBackend.store(request, 1, blobOf("audio"));
    assert.ok(await noBackend.lookup(request));

    const broken = {
      readBlob: boom,
      writeBlob: boom,
      deleteBlob: boom,
      readIndex: boom,
      writeIndex: boom,
      clear: boom,
    };
    const cache = mod.createTtsAudioCache({ openBackend: async () => broken, memoryEntries: 1 });
    await cache.store(request, 1, blobOf("audio"));
    await cache.settled();
    assert.ok(await cache.lookup(request), "write failure keeps the memory copy");
    await cache.store({ ...request, text: "adios" }, 1, blobOf("bye"));
    assert.equal(
      await cache.lookup(request),
      null,
      "evicted from memory and unreadable on disk is a plain miss",
    );
    await cache.forget("whatever");
    await cache.clear();
  } finally {
    cleanup();
  }
});

test("a corrupt persisted index is treated as empty", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    assert.deepEqual(mod.parseCacheIndex("nope"), { entries: {}, rateLocked: [] });
    assert.deepEqual(
      mod.parseCacheIndex({
        entries: { ok: { at: 1, size: 2 }, bad: { at: "x" } },
        rateLocked: ["v", 4],
      }),
      { entries: { ok: { at: 1, size: 2 } }, rateLocked: ["v"] },
    );
    const backend = mod.createMemoryBackend();
    await backend.writeIndex({ entries: "garbage" });
    const cache = mod.createTtsAudioCache({ openBackend: async () => backend });
    const request = { voiceName: "v", languageCode: "es-US", speakingRate: 1, text: "hola" };
    await cache.store(request, 1, blobOf("audio"));
    await cache.settled();
    assert.ok(await mod.createTtsAudioCache({ openBackend: async () => backend }).lookup(request));
  } finally {
    cleanup();
  }
});

test("clearTtsAudioCache style clear removes persisted clips and the rate lock", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const backend = mod.createMemoryBackend();
    const cache = mod.createTtsAudioCache({ openBackend: async () => backend });
    const request = {
      voiceName: "es-US-Chirp-HD-D",
      languageCode: "es-US",
      speakingRate: 0.75,
      text: "hola",
    };
    await cache.store(request, 1, blobOf("audio"));
    await cache.settled();
    assert.ok(await cache.lookup(request));
    await cache.clear();
    assert.equal(await cache.lookup(request), null);
    assert.equal(await cache.isRateLocked(request.voiceName), false);
    assert.equal(
      await mod.createTtsAudioCache({ openBackend: async () => backend }).lookup(request),
      null,
    );
  } finally {
    cleanup();
  }
});

test("sticky retry decision: wait once on 429 within the cap, otherwise fall back", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const decide = (status, retryAfterSeconds, alreadyRetried = false) =>
      mod.decideStickyRetry({ status, retryAfterSeconds, alreadyRetried });
    assert.deepEqual(decide(429, 3), { action: "retry", waitMs: 3000 });
    assert.deepEqual(decide(429, 0), { action: "retry", waitMs: 0 });
    assert.deepEqual(decide(429, 20), { action: "retry", waitMs: 8000 }, "capped at 8 s");
    assert.deepEqual(
      decide(429, null),
      { action: "retry", waitMs: 8000 },
      "unknown hint treated as the 20 s default, capped",
    );
    assert.deepEqual(decide(429, Number.NaN), { action: "retry", waitMs: 8000 });
    assert.deepEqual(decide(429, -5), { action: "retry", waitMs: 8000 });
    assert.deepEqual(decide(429, 3, true), { action: "fallback" }, "only one retry");
    for (const status of [null, 401, 403, 500, 502, 503, 504]) {
      assert.deepEqual(decide(status, 3), { action: "fallback" }, `status ${status}`);
    }
  } finally {
    cleanup();
  }
});

test("actual speakMissionTts plays a repeat from cache with no network and shares concurrent requests", async () => {
  const saved = Object.fromEntries(
    ["fetch", "Audio", "document"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const requests = [];
  const plays = [];
  let audio;
  let nextUrl = 0;
  globalThis.document = {};
  globalThis.Audio = class {
    constructor() {
      audio = this;
    }
    pause() {}
    removeAttribute() {
      this.src = "";
    }
    load() {}
    play() {
      plays.push(this.src);
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    }
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    const status = globalThis.__ttsStatus ?? 200;
    if (status !== 200) {
      return new Response(JSON.stringify({ error: "Too many voice requests." }), {
        status,
        headers: { "Retry-After": "7" },
      });
    }
    await tick();
    return new Response(new Blob(["mp3-bytes"], { type: "audio/mpeg" }), {
      status: 200,
      headers: { "X-TTS-Rendered-Rate": globalThis.__ttsRendered ?? "1" },
    });
  };
  URL.createObjectURL = () => `blob:cache-${++nextUrl}`;
  URL.revokeObjectURL = () => {};
  const speakingClient = {
    name: "speaking-client-stub",
    setup(b) {
      b.onResolve({ filter: /^@\/lib\/speaking-client$/ }, () => ({
        path: "stub",
        namespace: "stub",
      }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
        contents: "export const speakingRequestHeaders = async () => ({});",
      }));
    },
  };
  const { mod, cleanup } = await bundle(
    `export * from './src/lib/mission-tts'; export * from './src/lib/tts-audio-cache';`,
    [speakingClient],
  );
  try {
    const opts = {
      text: "la manzana",
      voiceName: "es-US-Neural2-A",
      languageCode: "es-US",
      speakingRate: 1,
      usage: "learning",
    };
    await mod.speakMissionTts(opts);
    assert.equal(requests.length, 1, "first play of a word hits the network once");
    await tick();
    await mod.speakMissionTts(opts);
    await mod.speakMissionTts({ ...opts, text: "  la manzana " });
    assert.equal(requests.length, 1, "replays come from the cache with zero network");
    assert.equal(plays.length, 3);

    // Chirp-HD style voice: server renders at 1 whatever was asked.
    globalThis.__ttsRendered = "1";
    const chirp = { ...opts, voiceName: "es-US-Chirp-HD-D", speakingRate: 0.75, text: "el perro" };
    await mod.speakMissionTts(chirp);
    assert.equal(requests.length, 2);
    await tick();
    assert.equal(audio.playbackRate, 0.75, "cached rate-1 clip still plays at the requested speed");
    await mod.speakMissionTts({ ...chirp, speakingRate: 1.25 });
    await mod.speakMissionTts(chirp);
    assert.equal(requests.length, 2, "other speeds reuse the single rendered clip");

    // Identical concurrent requests share one network call.
    const fresh = { ...opts, text: "la casa" };
    const a = mod.speakMissionTts(fresh);
    const b = mod.speakMissionTts(fresh);
    await a.catch(() => {});
    await b.catch(() => {});
    assert.equal(
      requests.filter((r) => r.body.text === "la casa").length,
      1,
      "one call for one word",
    );

    // Sign-out clearing forgets everything.
    await mod.clearTtsAudioCache();
    await mod.speakMissionTts(opts);
    assert.equal(requests.length, 4, "after clearTtsAudioCache the word is fetched again");

    // 429 surfaces status and Retry-After so the caller can stay on the Google voice.
    globalThis.__ttsStatus = 429;
    const limited = await mod.speakMissionTts({ ...opts, text: "nunca oido" }).then(
      () => null,
      (error) => error,
    );
    assert.ok(limited instanceof mod.MissionTtsHttpError);
    assert.equal(limited.status, 429);
    assert.equal(limited.retryAfterSeconds, 7);
    assert.equal(limited.message, "Too many voice requests.");
  } finally {
    delete globalThis.__ttsStatus;
    delete globalThis.__ttsRendered;
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    URL.createObjectURL = urls.create;
    URL.revokeObjectURL = urls.revoke;
    cleanup();
  }
});

// ---- per-user namespacing and clearing on sign-out ----

function fakeCacheStorage() {
  const stores = new Map();
  const keyOf = (request) => (typeof request === "string" ? request : request.url);
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      match: async (request) => entries.get(keyOf(request))?.clone(),
      put: async (request, response) => void entries.set(keyOf(request), response),
      delete: async (request) => entries.delete(keyOf(request)),
    };
  };
  return {
    stores,
    open,
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };
}

const stubBrowser = () => {
  const saved = Object.fromEntries(
    ["document", "caches"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const caches = fakeCacheStorage();
  globalThis.document = {};
  globalThis.caches = caches;
  return {
    caches,
    restore() {
      for (const [k, d] of Object.entries(saved)) {
        if (d) Object.defineProperty(globalThis, k, d);
        else delete globalThis[k];
      }
    },
  };
};

const requestFor = (text) => ({
  voiceName: "es-US-Neural2-A",
  languageCode: "es-US",
  speakingRate: 1,
  text,
});

// Opening a cache creates an empty store; what must never exist is a stored entry.
const storedEntries = (caches) =>
  [...caches.stores.entries()]
    .filter(([name]) => name.startsWith("tts-audio-v1-"))
    .reduce((sum, [, entries]) => sum + entries.size, 0);

const persisted = (caches) =>
  [...caches.stores.keys()].filter((n) => n.startsWith("tts-audio-v1-"));

test("user B cannot read user A's cached audio; signed-out callers are memory only", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    await mod.storeTtsAudio(requestFor("secreto de a"), 1, blobOf("a-audio"), "user-a");
    await mod.flushTtsAudioCache();
    assert.equal(persisted(env.caches).length, 1, "user A got a persistent store");

    assert.equal(
      await mod.lookupTtsAudio(requestFor("secreto de a"), "user-b"),
      null,
      "B misses A's clip",
    );
    assert.equal(
      await mod.lookupTtsAudio(requestFor("secreto de a"), null),
      null,
      "signed out misses it too",
    );
    await mod.storeTtsAudio(requestFor("de b"), 1, blobOf("b-audio"), "user-b");
    await mod.flushTtsAudioCache();
    const names = persisted(env.caches);
    assert.equal(names.length, 2, "B has a separate store");
    assert.equal(new Set(names).size, 2);
    assert.ok(
      !names.some((n) => n.includes("user-a") || n.includes("user-b")),
      "raw ids never appear in names",
    );

    // A comes back: memory was dropped on the switch, so this proves the disk copy is A's alone.
    const again = await mod.lookupTtsAudio(requestFor("secreto de a"), "user-a");
    assert.equal(await again.blob.text(), "a-audio");
    assert.equal(
      await mod.lookupTtsAudio(requestFor("de b"), "user-a"),
      null,
      "A cannot read B's clip",
    );

    await mod.storeTtsAudio(requestFor("invitado"), 1, blobOf("guest"), null);
    await mod.storeTtsAudio(requestFor("invitado2"), 1, blobOf("guest"), "");
    await mod.flushTtsAudioCache();
    assert.equal(persisted(env.caches).length, 2, "signed-out audio is never written to disk");
    assert.ok(await mod.lookupTtsAudio(requestFor("invitado"), null), "but plays from memory");
  } finally {
    env.restore();
    cleanup();
  }
});

test("clearTtsAudioCache removes only the named user's store and, with no id, every store", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    for (const user of ["user-a", "user-b"]) {
      await mod.storeTtsAudio(requestFor(`palabra ${user}`), 1, blobOf(user), user);
      await mod.flushTtsAudioCache();
    }
    env.caches.stores.set("lt-v1-unrelated", new Map());
    assert.equal(persisted(env.caches).length, 2);

    await mod.clearTtsAudioCache("user-b");
    assert.equal(persisted(env.caches).length, 1);
    assert.equal(await mod.lookupTtsAudio(requestFor("palabra user-b"), "user-b"), null);
    assert.ok(await mod.lookupTtsAudio(requestFor("palabra user-a"), "user-a"));

    await mod.clearTtsAudioCache();
    assert.equal(persisted(env.caches).length, 0);
    assert.equal(await mod.lookupTtsAudio(requestFor("palabra user-a"), "user-a"), null);
    assert.ok(env.caches.stores.has("lt-v1-unrelated"), "other caches are never touched");
  } finally {
    env.restore();
    cleanup();
  }
});

test("sign-out removes the account's cached audio only after a successful local sign-out", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(
    `export * from './src/lib/tts-audio-cache'; export { signOutWithDeviceSafety } from './src/lib/device-sign-out';`,
  );
  try {
    const signOutWith = (overrides) =>
      mod.signOutWithDeviceSafety({
        actor: "user-a",
        storage: null,
        examPending: false,
        confirmDiscard: () => true,
        signOut: async () => ({}),
        onExamDiscardApproved() {},
        clearExamDrafts() {},
        ...overrides,
      });
    const seed = async () => {
      await mod.storeTtsAudio(requestFor("lectura privada"), 1, blobOf("reader"), "user-a");
      await mod.flushTtsAudioCache();
      assert.equal(persisted(env.caches).length, 1);
    };

    await seed();
    const failed = await signOutWith({ signOut: async () => ({ error: new Error("offline") }) });
    assert.equal(failed.signedOut, false);
    assert.equal(persisted(env.caches).length, 1, "failed sign-out keeps the clips");

    const others = await signOutWith({ scope: "others" });
    assert.equal(others.signedOut, true);
    assert.equal(
      persisted(env.caches).length,
      1,
      "signing out other devices keeps this device's clips",
    );

    const done = await signOutWith({});
    assert.equal(done.signedOut, true);
    assert.equal(persisted(env.caches).length, 0, "local sign-out removed the store");
    assert.equal(await mod.lookupTtsAudio(requestFor("lectura privada"), "user-a"), null);
  } finally {
    env.restore();
    cleanup();
  }
});

test("reset to first run clears every user's cached audio and the auth listener clears on session end", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(
    `export * from './src/lib/tts-audio-cache'; export { resetAppToFirstRun } from './src/lib/app-update';`,
  );
  try {
    for (const user of ["user-a", "user-b"]) {
      await mod.storeTtsAudio(requestFor(user), 1, blobOf(user), user);
      await mod.flushTtsAudioCache();
    }
    assert.equal(persisted(env.caches).length, 2);
    let restarted = false;
    await mod.resetAppToFirstRun(async () => true, {
      clearCaches: async () => {},
      unregisterServiceWorkers: async () => {},
      clearLocalStorage() {},
      clearSessionStorage() {},
      restart: () => (restarted = true),
    });
    assert.ok(restarted);
    assert.equal(persisted(env.caches).length, 0);
  } finally {
    env.restore();
    cleanup();
  }
  const { readFileSync } = await import("node:fs");
  const authState = readFileSync("src/state/auth-state.tsx", "utf8");
  assert.match(
    authState,
    /previousUser && previousUser !== nextUser\) \{[\s\S]*?clearTtsAudioCache\(previousUser\)/,
    "SIGNED_OUT, expiry and account switch all pass through acceptSession's identity-loss branch",
  );
});

// ---- sign-out races and the legacy unscoped store ----

const waitUntil = async (predicate, label) => {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await tick();
  }
  assert.fail(`timed out waiting for ${label}`);
};

test("a store that began before a clear is refused afterwards, even when it is already queued", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    // 1. Request begins (epoch taken), user signs out, response arrives.
    const epoch = mod.ttsAudioCacheEpoch("user-a");
    await mod.clearTtsAudioCache("user-a");
    assert.notEqual(mod.ttsAudioCacheEpoch("user-a"), epoch, "clear bumps the user's epoch");
    await mod.storeTtsAudio(requestFor("llegó tarde"), 1, blobOf("late"), "user-a", epoch);
    await mod.flushTtsAudioCache();
    assert.equal(storedEntries(env.caches), 0, "stale write left nothing on disk");
    assert.equal(await mod.lookupTtsAudio(requestFor("llegó tarde"), "user-a"), null);
    assert.equal(storedEntries(env.caches), 0, "and the lookup did not resurrect an entry");

    // 2. A request that begins after the clear is fine.
    const fresh = mod.ttsAudioCacheEpoch("user-a");
    await mod.storeTtsAudio(requestFor("nueva"), 1, blobOf("new"), "user-a", fresh);
    await mod.flushTtsAudioCache();
    assert.equal(persisted(env.caches).length, 1);

    // 3. Other users' epochs are untouched by a user clear; a clear-all bumps everyone's.
    const b = mod.ttsAudioCacheEpoch("user-b");
    await mod.clearTtsAudioCache("user-a");
    assert.equal(mod.ttsAudioCacheEpoch("user-b"), b);
    await mod.clearTtsAudioCache();
    assert.notEqual(mod.ttsAudioCacheEpoch("user-b"), b);
  } finally {
    env.restore();
    cleanup();
  }
});

test("clear cancels and awaits queued writes of every handle, not just the active user's", async () => {
  const env = stubBrowser();
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    // user-a stores, then user-b takes over (a's handle is no longer the active one).
    await mod.storeTtsAudio(requestFor("de a"), 1, blobOf("a"), "user-a");
    await mod.storeTtsAudio(requestFor("de b"), 1, blobOf("b"), "user-b");
    // No flush: a's write may still be queued when the clear starts.
    await mod.clearTtsAudioCache("user-a");
    for (let i = 0; i < 20; i++) await tick();
    await mod.flushTtsAudioCache();
    const remaining = persisted(env.caches);
    assert.equal(remaining.length, 1, "only user-b's store is left");
    assert.equal(await mod.lookupTtsAudio(requestFor("de a"), "user-a"), null);
    assert.ok(await mod.lookupTtsAudio(requestFor("de b"), "user-b"));
  } finally {
    env.restore();
    cleanup();
  }
});

test("a closed cache handle skips queued writes and refuses new ones", async () => {
  const { mod, cleanup } = await bundle(`export * from './src/lib/tts-audio-cache';`);
  try {
    const backend = mod.createMemoryBackend();
    const writes = [];
    const slow = {
      ...backend,
      writeBlob: async (key, blob) => {
        writes.push(key);
        await tick();
        return backend.writeBlob(key, blob);
      },
    };
    const cache = mod.createTtsAudioCache({ openBackend: async () => slow });
    const request = (text) => ({ voiceName: "v", languageCode: "es-US", speakingRate: 1, text });
    const first = cache.store(request("uno"), 1, blobOf("uno"));
    const second = cache.store(request("dos"), 1, blobOf("dos"));
    await tick();
    cache.close();
    await Promise.all([first, second, cache.settled()]);
    assert.ok(writes.length <= 1, "the write queued behind the first never ran");
    await cache.store(request("tres"), 1, blobOf("tres"));
    await cache.settled();
    assert.ok(!writes.some((_, i) => i > 0));
    assert.equal(await cache.lookup(request("tres")), null, "closed handle serves nothing");
  } finally {
    cleanup();
  }
});

test("actual speakMissionTts does not repopulate the cache after sign-out or owner loss mid-request", async () => {
  const env = stubBrowser();
  const saved = Object.fromEntries(
    ["fetch", "Audio"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const pending = [];
  globalThis.Audio = class {
    pause() {}
    removeAttribute() {}
    load() {}
    play() {
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    }
  };
  globalThis.fetch = () =>
    new Promise((resolve) =>
      pending.push(() => resolve(new Response(new Blob(["mp3"]), { status: 200 }))),
    );
  URL.createObjectURL = () => "blob:x";
  URL.revokeObjectURL = () => {};
  const speakingClient = {
    name: "speaking-client-stub",
    setup(b) {
      b.onResolve({ filter: /^@\/lib\/speaking-client$/ }, () => ({
        path: "stub",
        namespace: "stub",
      }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
        contents: "export const speakingRequestHeaders = async () => ({});",
      }));
    },
  };
  const { mod, cleanup } = await bundle(
    `export * from './src/lib/mission-tts'; export * from './src/lib/tts-audio-cache';`,
    [speakingClient],
  );
  try {
    let current = true;
    const owner = { userId: "user-a", isCurrent: () => current };
    const opts = (text) => ({
      text,
      voiceName: "es-US-Neural2-A",
      languageCode: "es-US",
      speakingRate: 1,
      usage: "learning",
      owner,
    });
    // Sanity: an uninterrupted play does persist.
    const ok = mod.speakMissionTts(opts("control"));
    await waitUntil(() => pending.length === 1, "request");
    pending.shift()();
    await ok;
    await mod.flushTtsAudioCache();
    assert.equal(persisted(env.caches).length, 1, "control play was stored");
    await mod.clearTtsAudioCache("user-a");
    assert.equal(persisted(env.caches).length, 0);

    // Sign-out (clear) while the request is in flight.
    const raced = mod.speakMissionTts(opts("durante cierre"));
    await waitUntil(() => pending.length === 1, "request");
    await mod.clearTtsAudioCache("user-a");
    pending.shift()();
    await raced.catch(() => {});
    for (let i = 0; i < 20; i++) await tick();
    await mod.flushTtsAudioCache();
    assert.equal(storedEntries(env.caches), 0, "response after sign-out was not stored");

    // The owner stops being current (account switch) while the request is in flight.
    const lost = mod.speakMissionTts(opts("cambio de cuenta"));
    await waitUntil(() => pending.length === 1, "request");
    current = false;
    pending.shift()();
    await lost.catch(() => {});
    for (let i = 0; i < 20; i++) await tick();
    await mod.flushTtsAudioCache();
    assert.equal(storedEntries(env.caches), 0, "response for a non-current owner was not stored");
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    URL.createObjectURL = urls.create;
    URL.revokeObjectURL = urls.revoke;
    env.restore();
    cleanup();
  }
});

test("the legacy unscoped store is removed on every clear and once at startup", async () => {
  const env = stubBrowser();
  const deletedDatabases = [];
  const savedIdb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  globalThis.indexedDB = {
    databases: async () => [{ name: "tts-audio-v1" }, { name: "other-db" }],
    deleteDatabase: (name) => {
      deletedDatabases.push(name);
      const request = {};
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  const seedLegacy = () => {
    env.caches.stores.set("tts-audio-v1", new Map()); // what commit 4522350 wrote
    env.caches.stores.set("lt-tts-v1", new Map());
    env.caches.stores.set("lt-v1-app-shell", new Map());
  };
  try {
    // Startup cleanup: the first browser use removes the legacy store without any clear.
    seedLegacy();
    const first = await bundle(`export * from './src/lib/tts-audio-cache';`);
    try {
      await first.mod.lookupTtsAudio(requestFor("hola"), "user-a");
      await waitUntil(() => !env.caches.stores.has("tts-audio-v1"), "startup cleanup");
      assert.ok(!env.caches.stores.has("lt-tts-v1"));
      assert.ok(env.caches.stores.has("lt-v1-app-shell"), "unrelated caches are untouched");
      assert.ok(deletedDatabases.includes("tts-audio-v1"), "legacy IndexedDB database deleted too");

      // Every clear removes it again, for a named user and for clear-all.
      seedLegacy();
      deletedDatabases.length = 0;
      await first.mod.clearTtsAudioCache("user-a");
      assert.ok(!env.caches.stores.has("tts-audio-v1") && !env.caches.stores.has("lt-tts-v1"));
      assert.ok(deletedDatabases.includes("tts-audio-v1"));

      seedLegacy();
      await first.mod.clearTtsAudioCache();
      assert.ok(!env.caches.stores.has("tts-audio-v1") && !env.caches.stores.has("lt-tts-v1"));
      assert.ok(env.caches.stores.has("lt-v1-app-shell"));
    } finally {
      first.cleanup();
    }
  } finally {
    if (savedIdb) Object.defineProperty(globalThis, "indexedDB", savedIdb);
    else delete globalThis.indexedDB;
    env.restore();
  }
});
