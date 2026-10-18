import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speech-stream-"));
  const original = {
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  const c = {
    requests: [],
    timers: new Map(),
    provider: async () => new Response("audio"),
    expire() {
      for (const fn of [...this.timers.values()]) fn();
    },
  };
  try {
    const outfile = join(dir, "provider.mjs");
    await build({
      entryPoints: ["src/lib/remote-speech-provider.ts"],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    const m = await import(outfile);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== m.REMOTE_SPEECH_TIMEOUT_MS) return original.setTimeout(fn, ms, ...args);
      const timer = { unref() {} };
      c.timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (c.timers.has(timer)) c.timers.delete(timer);
      else original.clearTimeout(timer);
    };
    globalThis.fetch = async (url, opts) => {
      c.requests.push({ url, opts });
      return c.provider(url, opts);
    };
    await run(m, c);
    assert.equal(c.timers.size, 0, "all owned deadlines released");
  } finally {
    globalThis.fetch = original.fetch;
    globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("speech deadline rejects stalled headers and disposes a late response without retry", () =>
  fixture(async (m, c) => {
    const transport = deferred();
    c.provider = () => transport.promise;
    const request = new AbortController();
    const pending = m.remoteSpeechAudio("Synthetic text", "synthetic-key", request.signal);
    assert.equal(c.requests.length, 1);
    c.expire();
    await assert.rejects(
      pending,
      (error) => error.status === 504 && !error.message.includes("synthetic-key"),
    );
    assert.equal(c.requests[0].opts.signal.aborted, true);
    assert.equal(request.signal.aborted, false);
    let cancelled = 0;
    transport.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      ),
    );
    await tick();
    assert.equal(cancelled, 1);
    assert.equal(c.requests.length, 1);
  }));
test("speech deadline errors partial audio and cancels a stalled upstream read", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    c.provider = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
          },
          cancel() {
            cancelled++;
          },
        }),
      );
    const stream = await m.remoteSpeechAudio(
      "Synthetic text",
      "synthetic-key",
      new AbortController().signal,
    );
    const result = new Response(stream).blob();
    await tick();
    c.expire();
    await assert.rejects(result, /Remote speech interrupted/);
    await tick();
    assert.equal(cancelled, 1);
    assert.equal(c.requests[0].opts.signal.aborted, true);
    assert.equal(c.requests.length, 1);
  }));
test("incoming and downstream speech cancellation abort and dispose their own transport", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    c.provider = async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      );
    const incoming = new AbortController();
    const stream = await m.remoteSpeechAudio("Synthetic A", "synthetic-key", incoming.signal);
    const blob = new Response(stream).blob();
    await tick();
    incoming.abort();
    await assert.rejects(blob, /Remote speech interrupted/);
    await tick();
    assert.equal(cancelled, 1);
    const other = new AbortController();
    const next = await m.remoteSpeechAudio("Synthetic B", "synthetic-key", other.signal);
    const nextReader = next.getReader();
    await nextReader.cancel();
    await tick();
    assert.equal(cancelled, 2);
    assert.equal(c.requests[1].opts.signal.aborted, true);
    assert.equal(other.signal.aborted, false);
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(m.remoteSpeechAudio("Synthetic C", "synthetic-key", aborted.signal));
    assert.equal(c.requests.length, 2);
  }));
test("speech byte bound rejects cumulative overflow instead of returning truncated audio", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    c.provider = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(m.MAX_REMOTE_SPEECH_BYTES / 2));
            controller.enqueue(new Uint8Array(m.MAX_REMOTE_SPEECH_BYTES / 2 + 1));
          },
          cancel() {
            cancelled++;
          },
        }),
      );
    const audio = await m.remoteSpeechAudio(
      "Synthetic text",
      "synthetic-key",
      new AbortController().signal,
    );
    await assert.rejects(new Response(audio).arrayBuffer(), /Remote speech interrupted/);
    await tick();
    assert.equal(cancelled, 1);
    assert.equal(c.requests[0].opts.signal.aborted, true);
  }));
test("complete bounded speech closes cleanly and releases its deadline and incoming listener", () =>
  fixture(async (m, c) => {
    c.provider = async () => new Response(new Uint8Array(m.MAX_REMOTE_SPEECH_BYTES));
    const incoming = new AbortController();
    const audio = await m.remoteSpeechAudio("Synthetic text", "synthetic-key", incoming.signal);
    assert.equal((await new Response(audio).arrayBuffer()).byteLength, m.MAX_REMOTE_SPEECH_BYTES);
    assert.equal(c.timers.size, 0);
    incoming.abort();
    assert.equal(c.requests[0].opts.signal.aborted, false);
    assert.deepEqual(JSON.parse(c.requests[0].opts.body), {
      text: "Synthetic text",
      model_id: "eleven_v3",
      language_code: "ps",
    });
    assert.equal(c.requests[0].opts.cache, "no-store");
    assert.equal(c.requests.length, 1);
  }));
test("speech upstream failures suppress private details and cannot wait forever on cancellation", () =>
  fixture(async (m, c) => {
    c.provider = async () => {
      throw new Error("synthetic-private-provider-secret");
    };
    await assert.rejects(
      m.remoteSpeechAudio("Synthetic text", "synthetic-key", new AbortController().signal),
      (error) => error.status === 502 && !error.message.includes("private-provider"),
    );
    let cancelled = 0;
    c.provider = async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        { status: 503 },
      );
    await assert.rejects(
      m.remoteSpeechAudio("Synthetic text", "synthetic-key", new AbortController().signal),
      (error) => error.status === 502,
    );
    assert.equal(cancelled, 1);
    assert.equal(c.requests.length, 2);
  }));
