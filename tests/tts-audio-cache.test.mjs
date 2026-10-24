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
