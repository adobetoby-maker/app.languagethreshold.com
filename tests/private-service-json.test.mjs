import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-service-json-"));
  try {
    const outfile = join(dir, "reader.mjs");
    await build({
      entryPoints: ["src/lib/private-service-json.ts"],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    await run(await import(outfile));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const signal = () => new AbortController().signal;
const fixed = (e) => e.message === "Private service response unavailable" && e.cause === undefined;
test("private service JSON preserves split UTF8 at the exact actual byte boundary", () =>
  fixture(async (m) => {
    const bytes = new TextEncoder().encode('{"value":"é"}');
    const response = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(bytes.slice(0, 11));
          c.enqueue(bytes.slice(11));
          c.close();
        },
      }),
    );
    assert.deepEqual(await m.readPrivateServiceJson(response, bytes.length, signal()), {
      value: "é",
    });
    assert.equal(response.body.locked, false);
  }));
test("private service JSON rejects advertised and cumulative overflow and releases stalled cancel locks", () =>
  fixture(async (m) => {
    for (const advertised of [true, false]) {
      let cancelled = 0;
      const response = new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode("true "));
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        advertised ? { headers: { "content-length": "100" } } : {},
      );
      await assert.rejects(m.readPrivateServiceJson(response, 4, signal()), fixed);
      assert.equal(cancelled, 1);
      assert.equal(response.body.locked, false);
    }
  }));
test("private service JSON aborts partial reads without waiting for source cancellation", () =>
  fixture(async (m) => {
    const controller = new AbortController();
    let cancelled = 0;
    const response = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("["));
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      }),
    );
    const pending = m.readPrivateServiceJson(response, 100, controller.signal);
    await new Promise((r) => setImmediate(r));
    controller.abort(new Error("synthetic-private-detail"));
    await assert.rejects(pending, fixed);
    assert.equal(cancelled, 1);
    assert.equal(response.body.locked, false);
    await assert.rejects(
      m.readPrivateServiceJson(new Response("true"), 4, controller.signal),
      fixed,
    );
  }));
test("private service JSON sanitizes malformed JSON, invalid UTF8 and stream errors", () =>
  fixture(async (m) => {
    for (const response of [
      new Response("synthetic-private-detail"),
      new Response(new Uint8Array([255])),
      new Response(
        new ReadableStream({
          start(c) {
            c.error(new Error("synthetic-private-detail"));
          },
        }),
      ),
    ]) {
      await assert.rejects(m.readPrivateServiceJson(response, 100, signal()), fixed);
      assert.equal(response.body.locked, false);
    }
  }));
