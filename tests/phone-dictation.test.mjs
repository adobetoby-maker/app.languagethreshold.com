import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));

test("native iPhone dictation records repeated turns and rejects late events, scoped cleanup and permission races", async () => {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/phone-dictation-"));
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  globalThis.window = {};
  try {
    await build({
      stdin: {
        contents: `export * from './src/lib/phone-dictation';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "native-bridge",
          setup(b) {
            b.onResolve({ filter: /^(@capacitor\/core|fixture)$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
export const c={platform:'ios',available:true,listeners:[],starts:[],stops:[],cancels:[],delayListener:false};
export const Capacitor={getPlatform:()=>c.platform,isPluginAvailable:()=>c.available};
export const registerPlugin=()=>({
 addListener:async(name,fn)=>{const entry={fn,removed:false};c.listeners.push(entry);if(c.delayListener)await new Promise(r=>entry.release=r);return {remove:async()=>{entry.removed=true}}},
 start:options=>new Promise((resolve,reject)=>c.starts.push({options,resolve,reject})),
 stop:async options=>{c.stops.push(options)},cancel:async options=>{c.cancels.push(options)}
});`,
            }));
          },
        },
      ],
    });
    const { recognitionConstructor, NativePhoneRecognition, c } = await import(
      join(dir, "case.mjs")
    );
    assert.equal(recognitionConstructor(), NativePhoneRecognition);
    const web = class {};
    window.webkitSpeechRecognition = web;
    c.available = false;
    assert.equal(recognitionConstructor(), web);
    c.available = true;
    c.platform = "web";
    assert.equal(recognitionConstructor(), web);
    c.platform = "ios";
    const allIds = new Set();
    for (let turn = 0; turn < 3; turn++) {
      const rec = new (recognitionConstructor())();
      rec.lang = "es-MX";
      const results = [],
        errors = [];
      let ends = 0;
      rec.onresult = (e) => results.push(e.results[0]);
      rec.onerror = (e) => errors.push(e);
      rec.onend = () => ends++;
      rec.start();
      await tick();
      const start = c.starts.at(-1),
        listener = c.listeners.at(-1),
        id = start.options.requestId;
      assert.equal(allIds.has(id), false);
      allIds.add(id);
      assert.equal(start.options.locale, "es-MX");
      start.resolve();
      await tick();
      listener.fn({ requestId: "wrong", text: "cross-context", final: true, ended: true });
      assert.equal(results.length, 0);
      listener.fn({ requestId: id, text: `partial ${turn}`, final: false });
      assert.equal(results.at(-1).isFinal, false);
      rec.stop();
      await tick();
      assert.equal(c.stops.at(-1).requestId, id);
      listener.fn({ requestId: id, text: `complete ${turn}`, final: true, ended: true });
      assert.equal(results.at(-1)[0].transcript, `complete ${turn}`);
      assert.equal(ends, 1);
      assert.deepEqual(errors, []);
      assert.equal(listener.removed, true);
      listener.fn({ requestId: id, text: "late duplicate", final: true, ended: true });
      assert.equal(ends, 1);
      assert.equal(results.length, 2);
      rec.abort(); // A late teardown from the completed turn must not cancel its successor.
      assert.equal(
        c.cancels.some((x) => x.requestId === id),
        false,
      );
    }
    const failed = new NativePhoneRecognition();
    const errors = [];
    failed.onerror = (e) => errors.push(e.error);
    failed.start();
    await tick();
    const start = c.starts.at(-1),
      listener = c.listeners.at(-1);
    listener.fn({ requestId: start.options.requestId, error: "not-allowed", ended: true });
    start.reject({ code: "not-allowed" });
    await tick();
    assert.deepEqual(errors, ["native-not-allowed"]);
    assert.equal(listener.removed, true);
    // Cancellation while permission is pending is sent only to the old request.
    const cancelled = new NativePhoneRecognition();
    let delivered = 0;
    cancelled.onresult = () => delivered++;
    cancelled.start();
    await tick();
    const pending = c.starts.at(-1),
      stale = c.listeners.at(-1);
    cancelled.abort();
    const next = new NativePhoneRecognition();
    next.start();
    await tick();
    const fresh = c.starts.at(-1);
    assert.notEqual(fresh.options.requestId, pending.options.requestId);
    pending.resolve();
    stale.fn({ requestId: pending.options.requestId, text: "departed", ended: true });
    await tick();
    assert.equal(delivered, 0);
    assert.equal(c.cancels.at(-1).requestId, pending.options.requestId);
    next.abort();
    fresh.resolve();
    await tick();
    c.delayListener = true;
    const notStarted = new NativePhoneRecognition();
    const count = c.starts.length;
    notStarted.start();
    notStarted.abort();
    c.listeners.at(-1).release();
    await tick();
    assert.equal(
      c.starts.length,
      count,
      "aborted listener setup must not start a native microphone later",
    );
    assert.equal(c.listeners.at(-1).removed, true);
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else delete globalThis.window;
    rmSync(dir, { recursive: true, force: true });
  }
});
