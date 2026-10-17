import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Exercise the shipped callback with controlled hook/network boundaries. This is
// not a browser-offline or physical handwriting-recognition acceptance trial.
async function readerFixture() {
  const root = resolve("node_modules/.cache/lle-tests");
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(resolve(root, "handwriting-reader-"));
  const outfile = resolve(directory, "fixture.mjs");
  try {
    await build({
      stdin: { contents: `export {useHandwritingReader} from './src/hooks/use-handwriting-reader.ts'; export {controls} from 'test-controls';`, resolveDir: process.cwd() },
      outfile, bundle: true, format: "esm", platform: "node", logLevel: "silent",
      plugins: [{ name: "reader-boundaries", setup(b) {
        b.onResolve({filter: /^(react|@tanstack\/react-start|test-controls|@\/fns\/handwriting-read.functions)$/}, () => ({path: "controls", namespace: "fixture"}));
        b.onLoad({filter: /.*/, namespace: "fixture"}, () => ({contents: `
          export const controls = {requests: [], result: {text: 'TEJA'}};
          export const useCallback = callback => callback;
          export const readHandwriting = async request => {controls.requests.push(request); return controls.result;};
          export const useServerFn = fn => fn;
        `}));
      }}],
    });
    return await import(outfile);
  } finally { rmSync(directory, {recursive: true, force: true}); }
}

async function withConnection(online, callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {value: {onLine: online}, configurable: true});
  try { await callback(); }
  finally {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete globalThis.navigator;
  }
}

test("offline writing offers manual checking without sending ink or spending a provider request", async () => {
  const {useHandwritingReader, controls} = await readerFixture();
  await withConnection(false, async () => {
    const result = await useHandwritingReader("Spanish")("synthetic-ink");
    assert.equal(result.kind, "manual");
    assert.match(result.message, /offline.*check your writing yourself/i);
    assert.equal(controls.requests.length, 0);
  });
});

test("response recognition sends no answer hint; unavailable recognition remains manual", async () => {
  const {useHandwritingReader, controls} = await readerFixture();
  await withConnection(true, async () => {
    assert.deepEqual(await useHandwritingReader("Spanish")("synthetic-ink"), {kind: "read", text: "TEJA"});
    assert.deepEqual(controls.requests, [{data: {imageBase64: "synthetic-ink", language: "Spanish"}}]);
    controls.result = {error: "unavailable"};
    const fallback = await useHandwritingReader("Spanish")("synthetic-ink");
    assert.equal(fallback.kind, "manual");
    assert.match(fallback.message, /Your writing is kept/);
    assert.equal(controls.requests.length, 2);
    const unsupported = await useHandwritingReader("Klingon")("synthetic-ink");
    assert.equal(unsupported.kind, "manual");
    assert.equal(controls.requests.length, 2);
  });
});
