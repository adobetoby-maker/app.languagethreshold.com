import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const message = {
  id: "synthetic-message",
  type: "message",
  role: "assistant",
  model: "claude-haiku-5-5",
  content: [{ type: "text", text: "synthetic-answer" }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
};
const params = {
  model: "claude-haiku-5-5",
  max_tokens: 1,
  messages: [{ role: "user", content: "synthetic-private-input" }],
};
const event = (value) => `event: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`;
const start = event({ type: "message_start", message: { ...message, content: [] } });
const delta = event({
  type: "content_block_delta",
  index: 0,
  delta: { type: "text_delta", text: "synthetic-answer" },
});
const stop = event({ type: "message_stop" });
const sse = (value) => new Response(value, { headers: { "content-type": "text/event-stream" } });
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-provider-"));
  const saved = { fetch: globalThis.fetch, set: setTimeout, clear: clearTimeout };
  const c = {
    calls: [],
    timers: new Map(),
    shutdown: new AbortController(),
    operations: new Set(),
    provider: async () => Response.json(message),
    expire() {
      for (const fn of [...this.timers.values()]) fn();
    },
    async until(predicate) {
      for (let i = 0; i < 100 && !predicate(); i++) await new Promise((r) => saved.set(r, 1));
      assert.ok(predicate());
    },
  };
  try {
    const outfile = join(dir, "provider.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/speaking-provider';export {anthropicTextStream} from './src/lib/anthropic-text-stream';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      packages: "external",
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    const m = await import(outfile);
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 45000) return saved.set(fn, ms, ...args);
      const token = { unref() {} };
      c.timers.set(token, fn);
      return token;
    };
    globalThis.clearTimeout = (token) => {
      if (c.timers.has(token)) c.timers.delete(token);
      else saved.clear(token);
    };
    globalThis.fetch = async (url, opts) => {
      assert.equal(new URL(url).hostname, "api.anthropic.com");
      c.calls.push({ url: String(url), opts });
      return c.provider(url, opts);
    };
    c.call = (stream = false, signal) => {
      const request = new Request("https://fixture.invalid/api/speak", {
        signal: AbortSignal.any([c.shutdown.signal, ...(signal ? [signal] : [])]),
      });
      const operation = m.withSpeakingProvider(
        request,
        "synthetic-provider-key",
        async (client, options) => {
          const result = await client.messages.create(
            { ...params, ...(stream ? { stream: true } : {}) },
            options,
          );
          return stream
            ? new Response(m.anthropicTextStream(result), {
                headers: { "content-type": "text/event-stream" },
              })
            : Response.json(result);
        },
      );
      c.operations.add(operation);
      void operation.then(
        () => c.operations.delete(operation),
        () => c.operations.delete(operation),
      );
      return operation;
    };
    await run(m, c);
    assert.equal(c.timers.size, 0);
  } finally {
    c.shutdown.abort();
    await Promise.allSettled([...c.operations]);
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("speaking installed SDK keeps exact request contract, no-store and one attempt on retryable error", () =>
  fixture(async (m, c) => {
    const response = await c.call();
    assert.deepEqual(await response.json(), message);
    assert.equal(c.calls.length, 1);
    assert.equal(c.calls[0].opts.cache, "no-store");
    assert.deepEqual(JSON.parse(c.calls[0].opts.body), params);
    c.provider = async () =>
      Response.json(
        { error: { type: "rate_limit_error", message: "synthetic-private-upstream-detail" } },
        { status: 429 },
      );
    await assert.rejects(
      c.call(),
      (e) =>
        e.status === 502 && e.message === "Speaking provider unavailable" && e.cause === undefined,
    );
    assert.equal(c.calls.length, 2);
  }));
test("speaking header deadline discards late responses and does not cancel a later request", () =>
  fixture(async (m, c) => {
    const held = deferred();
    c.provider = () => held.promise;
    const pending = c.call();
    await c.until(() => c.calls.length === 1);
    c.expire();
    await assert.rejects(pending, (e) => e.status === 504);
    assert.equal(c.calls[0].opts.signal.aborted, true);
    let cancelled = 0;
    held.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      ),
    );
    await c.until(() => cancelled === 1);
    c.provider = async () => Response.json(message);
    assert.equal((await c.call()).status, 200);
    assert.equal(c.calls.length, 2);
    assert.equal(c.calls[1].opts.signal.aborted, false);
  }));
test("speaking cancellation interrupts partial JSON and immediately releases a reader with stalled cancellation", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    const raw = new ReadableStream({
      start(s) {
        s.enqueue(new TextEncoder().encode("{"));
      },
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    c.provider = async () => new Response(raw);
    const incoming = new AbortController(),
      pending = c.call(false, incoming.signal);
    await c.until(() => raw.locked);
    incoming.abort();
    await assert.rejects(pending, (e) => e.status === 499);
    assert.equal(cancelled, 1);
    assert.equal(raw.locked, false);
    assert.equal(c.calls[0].opts.signal.aborted, true);
  }));
test("speaking response bytes enforce actual and advertised bounds while admitting exact valid JSON", () =>
  fixture(async (m, c) => {
    const json = JSON.stringify(message);
    c.provider = async () =>
      new Response(json + " ".repeat(m.MAX_SPEAKING_PROVIDER_BYTES - Buffer.byteLength(json)));
    assert.equal((await c.call()).status, 200);
    for (const advertised of [false, true]) {
      let cancelled = 0;
      const raw = new ReadableStream({
        start(s) {
          s.enqueue(new TextEncoder().encode(json + " ".repeat(m.MAX_SPEAKING_PROVIDER_BYTES)));
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      });
      c.provider = async () =>
        new Response(
          raw,
          advertised
            ? { headers: { "content-length": String(m.MAX_SPEAKING_PROVIDER_BYTES + 1) } }
            : {},
        );
      await assert.rejects(c.call(), (e) => e.status === 502);
      assert.equal(raw.locked, false);
      assert.equal(cancelled, 1);
    }
  }));
test("speaking SSE completes only with provider completion and releases its phase before later input abort", () =>
  fixture(async (m, c) => {
    c.provider = async () => sse(start + delta + stop);
    const incoming = new AbortController();
    const response = await c.call(true, incoming.signal);
    const value = await response.text();
    assert.match(value, /synthetic-answer/);
    assert.equal((value.match(/\[DONE\]/g) || []).length, 1);
    assert.equal(c.timers.size, 0);
    incoming.abort();
    assert.equal(c.calls[0].opts.signal.aborted, false);
  }));
test("speaking SSE deadline, truncated EOF and oversized responses error partial bodies without DONE", () =>
  fixture(async (m, c) => {
    for (const failure of ["deadline", "eof", "overflow"]) {
      let raw;
      c.provider = async () => {
        raw = new ReadableStream({
          start(s) {
            s.enqueue(new TextEncoder().encode(start + delta));
            if (failure === "eof") s.close();
            if (failure === "overflow")
              s.enqueue(new Uint8Array(m.MAX_SPEAKING_PROVIDER_BYTES + 1));
          },
        });
        return sse(raw);
      };
      const response = await c.call(true);
      assert.equal(response.status, 200);
      const pending = response.text();
      if (failure === "deadline") c.expire();
      await assert.rejects(pending, /AI response interrupted/);
      assert.equal(raw.locked, false);
      assert.equal(c.timers.size, 0);
    }
  }));
test("speaking downstream cancellation aborts only its phase and releases a stalled source cancel", () =>
  fixture(async (m, c) => {
    let cancelled = 0;
    const raw = new ReadableStream({
      start(s) {
        s.enqueue(new TextEncoder().encode(start + delta));
      },
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    c.provider = async () => sse(raw);
    const response = await c.call(true);
    const reader = response.body.getReader();
    await reader.read();
    await reader.cancel();
    reader.releaseLock();
    assert.equal(c.calls[0].opts.signal.aborted, true);
    await c.until(() => cancelled === 1);
    assert.equal(raw.locked, false);
    assert.equal(c.timers.size, 0);
    c.provider = async () => Response.json(message);
    assert.equal((await c.call()).status, 200);
    assert.equal(c.calls[1].opts.signal.aborted, false);
  }));
