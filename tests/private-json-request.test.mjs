import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const request = (body, signal, headers = {}) =>
  new Request("https://fixture.invalid/private", {
    method: "POST",
    body,
    signal,
    headers,
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  });
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-json-"));
  const original = { set: globalThis.setTimeout, clear: globalThis.clearTimeout };
  const c = {
    timers: new Map(),
    expire() {
      for (const fn of [...this.timers.values()]) fn();
    },
  };
  try {
    const outfile = join(dir, "reader.mjs");
    await build({
      entryPoints: ["src/lib/private-json-request.ts"],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    const m = await import(outfile);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== m.PRIVATE_JSON_READ_TIMEOUT_MS) return original.set(fn, ms, ...args);
      const token = { unref() {} };
      c.timers.set(token, fn);
      return token;
    };
    globalThis.clearTimeout = (token) => {
      if (c.timers.has(token)) c.timers.delete(token);
      else original.clear(token);
    };
    await run(m, c);
    assert.equal(c.timers.size, 0, "all input deadlines released");
  } finally {
    globalThis.setTimeout = original.set;
    globalThis.clearTimeout = original.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("private JSON reader preserves bounded UTF-8 input across chunks and releases completed input", () =>
  fixture(async (m, c) => {
    const bytes = new TextEncoder().encode(JSON.stringify({ text: "Synthetic پښتو" }));
    const req = request(
      new ReadableStream({
        start(s) {
          s.enqueue(bytes.slice(0, 17));
          s.enqueue(bytes.slice(17));
          s.close();
        },
      }),
    );
    assert.deepEqual(await m.readPrivateJson(req, bytes.byteLength), { text: "Synthetic پښتو" });
    assert.equal(req.body.locked, false);
    assert.equal(c.timers.size, 0);
  }));
test("private JSON advertised and cumulative byte overflow reject without waiting on stalled cancellation", () =>
  fixture(async (m) => {
    let cancelled = 0;
    const advertised = request(
      new ReadableStream({
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      }),
      undefined,
      { "Content-Length": "33" },
    );
    await assert.rejects(m.readPrivateJson(advertised, 32), (e) => e.status === 413);
    assert.equal(cancelled, 1);
    const streamed = request(
      new ReadableStream({
        start(s) {
          s.enqueue(new Uint8Array(16));
          s.enqueue(new Uint8Array(17));
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      }),
    );
    await assert.rejects(m.readPrivateJson(streamed, 32), (e) => e.status === 413);
    assert.equal(cancelled, 2);
    assert.equal(streamed.body.locked, false);
  }));
test("private JSON deadline rejects stalled input and releases its reader even when cancellation stalls", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    const req = request(
      new ReadableStream({
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      }),
    );
    const pending = m.readPrivateJson(req, 32);
    await tick();
    c.expire();
    await assert.rejects(pending, (e) => e.status === 408);
    assert.equal(cancelled, 1);
    assert.equal(req.body.locked, false);
  }));
test("private JSON incoming abort rejects pending or already-aborted input and disposes the body", () =>
  fixture(async (m) => {
    for (const initiallyAborted of [false, true]) {
      const controller = new AbortController();
      let cancelled = 0;
      if (initiallyAborted) controller.abort();
      const req = request(
        new ReadableStream({
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        controller.signal,
      );
      const pending = m.readPrivateJson(req, 32);
      if (!initiallyAborted) controller.abort();
      await assert.rejects(pending, (e) => e.status === 499);
      assert.equal(cancelled, 1);
      assert.equal(req.body.locked, false);
    }
  }));
test("private JSON malformed/invalid UTF-8 failures expose no body content and retain no reader", () =>
  fixture(async (m) => {
    for (const input of ['{"synthetic-private":', new Uint8Array([0xff])]) {
      const req = request(input);
      await assert.rejects(
        m.readPrivateJson(req, 64),
        (e) => e.status === 400 && !e.message.includes("synthetic-private"),
      );
      assert.equal(req.body.locked, false);
    }
    await assert.rejects(m.readPrivateJson(request(null), 64), (e) => e.status === 400);
  }));
