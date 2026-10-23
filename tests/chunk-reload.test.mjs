import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CHUNK_RELOAD_KEY,
  RELOAD_GUARD_MS,
  canAutoReload,
  isChunkLoadError,
  reloadForChunkError,
  resetChunkReloadForTests,
} from "../src/lib/chunk-reload.ts";

function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    items,
  };
}

function runtime(storage, now, reloads) {
  return { storage, now: () => now, reload: () => reloads.push(now) };
}

const chromeError = new TypeError(
  "Failed to fetch dynamically imported module: https://app.languagethreshold.com/assets/SpeakLearn-Co0PTW-C.js",
);

test("recognizes chunk-load failures from every browser and nothing else", () => {
  assert.equal(isChunkLoadError(chromeError), true);
  assert.equal(isChunkLoadError(new TypeError("Importing a module script failed.")), true);
  assert.equal(isChunkLoadError(new TypeError("error loading dynamically imported module: /a.js")), true);
  assert.equal(isChunkLoadError(Object.assign(new Error("x"), { name: "ChunkLoadError" })), true);
  assert.equal(isChunkLoadError(new Error("Unable to preload CSS for /assets/a.css")), true);
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined")), false);
  assert.equal(isChunkLoadError("Failed to fetch dynamically imported module"), false);
  assert.equal(isChunkLoadError(null), false);
});

test("first chunk failure stores a timestamp and reloads once", () => {
  resetChunkReloadForTests();
  const storage = memoryStorage();
  const reloads = [];

  assert.equal(reloadForChunkError(chromeError, runtime(storage, 1_000_000, reloads)), true);
  assert.deepEqual(reloads, [1_000_000]);
  assert.equal(storage.getItem(CHUNK_RELOAD_KEY), "1000000");

  // A second failure in the same page life reports the pending reload without reloading again.
  assert.equal(reloadForChunkError(chromeError, runtime(storage, 1_000_100, reloads)), true);
  assert.deepEqual(reloads, [1_000_000]);
});

test("after the automatic reload, a repeat failure inside the guard window does not reload", () => {
  resetChunkReloadForTests(); // the new page after the reload
  const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "1000000" });
  const reloads = [];

  assert.equal(
    reloadForChunkError(chromeError, runtime(storage, 1_000_000 + RELOAD_GUARD_MS - 1, reloads)),
    false,
  );
  assert.deepEqual(reloads, []);
});

test("a later deploy, past the guard window, may reload again", () => {
  resetChunkReloadForTests();
  const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "1000000" });
  const reloads = [];
  const later = 1_000_000 + RELOAD_GUARD_MS;

  assert.equal(reloadForChunkError(chromeError, runtime(storage, later, reloads)), true);
  assert.deepEqual(reloads, [later]);
  assert.equal(storage.getItem(CHUNK_RELOAD_KEY), String(later));
});

test("other errors never reload", () => {
  resetChunkReloadForTests();
  const reloads = [];
  assert.equal(
    reloadForChunkError(new Error("render bug"), runtime(memoryStorage(), 5, reloads)),
    false,
  );
  assert.deepEqual(reloads, []);
});

test("without a usable sessionStorage the guard cannot hold, so it does not reload", () => {
  resetChunkReloadForTests();
  const reloads = [];
  assert.equal(reloadForChunkError(chromeError, runtime(null, 5, reloads)), false);

  const throwing = {
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(reloadForChunkError(chromeError, runtime(throwing, 5, reloads)), false);
  assert.deepEqual(reloads, []);
});

test("guard treats a corrupt stamp as absent and a future stamp as recent", () => {
  assert.equal(canAutoReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "nope" }), 10), true);
  assert.equal(canAutoReload(memoryStorage({ [CHUNK_RELOAD_KEY]: "999999999" }), 10), false);
  assert.equal(canAutoReload(memoryStorage(), 10), true);
});

test("the tab error boundary and the root route both wire the chunk reload", () => {
  const tabShell = readFileSync(new URL("../src/components/TabShell.tsx", import.meta.url), "utf8");
  assert.match(tabShell, /reloadForChunkError\(error, browserChunkReloadRuntime\(\)\)/);
  assert.match(tabShell, /if \(this\.state\.chunkError\) \{[\s\S]*?reloadNewestAppVersion\(\)/);
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /useEffect\(\(\) => installChunkReloadListener\(\), \[\]\)/);
});
