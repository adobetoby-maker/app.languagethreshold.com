import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const nodes = (n, out = []) => {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
};
const text = (n) =>
  n == null || typeof n === "boolean"
    ? ""
    : Array.isArray(n)
      ? n.map(text).join("")
      : typeof n === "object"
        ? text(n.props?.children)
        : String(n);
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/consent-recovery-"));
  const saved = { fetch: globalThis.fetch, set: setTimeout, clear: clearTimeout };
  let control;
  try {
    const outfile = join(dir, "case.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/speaking-client';export {SpeakingConsentDialog} from './src/components/speak/SpeakingConsentDialog';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "fixture",
          setup(b) {
            b.onResolve(
              { filter: /^(fixture|@\/integrations\/supabase\/client|@\/components\/ui\/dialog)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={actor:'a',sdkActor:'a',waitSession:false,sessions:[]};export const supabase={auth:{getSession:()=>c.waitSession?new Promise(resolve=>c.sessions.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor},access_token:'synthetic-token'}}})}};export const Dialog='dialog',DialogContent='section',DialogDescription='p',DialogHeader='header',DialogTitle='h2';`,
            }));
          },
        },
      ],
    });
    const m = await import(outfile),
      c = m.c;
    control = c;
    c.calls = [];
    c.timers = new Map();
    c.operations = new Set();
    c.shutdown = new AbortController();
    c.transport = async () => Response.json({ attested: true });
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== m.SPEAKING_CONFIRMATION_WAIT_MS) return saved.set(fn, ms, ...args);
      const timer = {};
      c.timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (c.timers.has(timer)) c.timers.delete(timer);
      else saved.clear(timer);
    };
    globalThis.fetch = async (url, opts) => {
      assert.equal(url, "/api/speaking-consent");
      c.calls.push({ url, opts });
      return c.transport(url, opts);
    };
    const owner = { userId: "a", isCurrent: () => c.actor === "a" };
    const tracked = (operation) => {
      c.operations.add(operation);
      void operation.then(
        () => c.operations.delete(operation),
        () => c.operations.delete(operation),
      );
      return operation;
    };
    c.save = (value = true) =>
      tracked(m.saveSpeakingAgeAttestation(value, c.shutdown.signal, () => c.actor === "a", owner));
    c.get = () => tracked(m.getSpeakingAgeAttestation(c.shutdown.signal, owner));
    c.expire = () => {
      for (const fn of [...c.timers.values()]) fn();
    };
    await run(m, c);
    assert.equal(c.timers.size, 0);
    c.shutdown.abort();
    await Promise.allSettled([...c.operations]);
  } finally {
    if (control?.shutdown) {
      control.shutdown.abort();
      await Promise.allSettled([...control.operations]);
    }
    globalThis.fetch = saved.fetch;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("consent transport failures, proxy responses and malformed acknowledgements remain unconfirmed without automatic requests", () =>
  fixture(async (m, c) => {
    for (const transport of [
      async () => {
        throw new TypeError("synthetic-private-detail");
      },
      async () => Response.json({ error: "synthetic-private-detail" }, { status: 503 }),
      async () => Response.json({ error: "synthetic-private-detail" }, { status: 400 }),
      async () => Response.json({ writeOutcome: "unknown" }, { status: 503 }),
      async () => new Response("synthetic-private-detail"),
      async () => Response.json({ attested: "true" }),
      async () => Response.json({ attested: false }),
    ]) {
      c.transport = transport;
      const before = c.calls.length;
      await assert.rejects(
        c.save(),
        (e) =>
          e instanceof m.SpeakingConsentSaveError &&
          e.outcome === "unknown" &&
          !e.message.includes("synthetic-private-detail") &&
          e.cause === undefined,
      );
      assert.equal(c.calls.length, before + 1);
      assert.equal(c.calls.at(-1).opts.method, "POST");
      assert.equal(c.calls.at(-1).opts.cache, "no-store");
    }
  }));
test("only explicit server not-started outcomes permit retry and matching boolean acknowledgements preserve true/false", () =>
  fixture(async (m, c) => {
    for (const status of [400, 401, 403, 408, 413, 429, 499, 503]) {
      c.transport = async () => Response.json({ writeOutcome: "not_started" }, { status });
      await assert.rejects(c.save(), (e) => e.outcome === "rejected");
    }
    for (const value of [true, false]) {
      c.transport = async () => Response.json({ attested: value });
      assert.equal(await c.save(value), value);
      assert.deepEqual(JSON.parse(c.calls.at(-1).opts.body), { attested: value });
    }
  }));
test("consent saved-status reads accept strict booleans and suppress foreign-owner transport outcomes", () =>
  fixture(async (m, c) => {
    for (const value of [true, false]) {
      c.transport = async () => Response.json({ attested: value });
      assert.equal(await c.get(), value);
      assert.equal(c.calls.at(-1).opts.method, "GET");
    }
    for (const value of ["true", null, 1, {}, []]) {
      c.transport = async () => Response.json({ attested: value });
      await assert.rejects(c.get(), /could not be loaded/);
    }
    c.transport = async () => {
      c.actor = "b";
      throw new Error("synthetic-private-detail");
    };
    await assert.rejects(c.save(), { name: "AbortError" });
    const before = c.calls.length;
    await assert.rejects(c.get(), { name: "AbortError" });
    assert.equal(c.calls.length, before);
  }));
test("consent acknowledgement waits bound SDK/read/write hangs without claiming a dispatched write failed", () =>
  fixture(async (m, c) => {
    c.waitSession = true;
    const beforeDispatch = c.save();
    c.expire();
    await assert.rejects(beforeDispatch, (e) => e.outcome === "rejected");
    assert.equal(c.calls.length, 0);
    c.sessions.shift()({
      data: { session: { user: { id: "a" }, access_token: "synthetic-token" } },
    });
    await tick();
    assert.equal(c.calls.length, 0, "late SDK cannot send a timed-out write");
    c.waitSession = false;
    let finish;
    c.transport = () => new Promise((resolve) => (finish = resolve));
    const afterDispatch = c.save();
    await tick();
    assert.equal(c.calls.length, 1);
    c.expire();
    await assert.rejects(afterDispatch, (e) => e.outcome === "unknown");
    assert.equal(c.calls[0].opts.signal.aborted, true);
    let cancelled = 0;
    finish(
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
    c.transport = () => new Promise((resolve) => (finish = resolve));
    const read = c.get();
    await tick();
    c.expire();
    await assert.rejects(read, /could not be loaded/);
    finish(Response.json({ attested: true }));
    await tick();
    c.transport = async () => Response.json({ attested: true });
    assert.equal(await c.get(), true);
    assert.equal(c.calls.at(-1).opts.signal.aborted, false);
  }));
test("actual consent dialog checks saved status in uncertain mode and retains explicit confirmation and disabled controls", () =>
  fixture(async (m, c) => {
    let reads = 0,
      writes = 0,
      closed = 0;
    const props = {
      open: true,
      saving: false,
      unknown: true,
      language: "Spanish",
      audioSource: "text",
      onOpenChange: () => closed++,
      onConfirm: () => writes++,
      onCheckSavedStatus: () => reads++,
    };
    let tree = m.SpeakingConsentDialog(props),
      buttons = nodes(tree).filter((n) => n.type === "button");
    assert.equal(text(buttons[0]), "Check saved confirmation");
    buttons[0].props.onClick();
    assert.equal(reads, 1);
    assert.equal(writes, 0);
    tree = m.SpeakingConsentDialog({ ...props, saving: true });
    buttons = nodes(tree).filter((n) => n.type === "button");
    assert.equal(buttons[0].props.disabled, true);
    assert.equal(buttons[1].props.disabled, true);
    assert.match(text(buttons[0]), /Checking/);
    nodes(tree)
      .find((n) => n.type === "dialog")
      .props.onOpenChange(false);
    assert.equal(closed, 0);
    const skippable = m.SpeakingConsentDialog({
      ...props,
      saving: true,
      allowSkipWhileSaving: true,
    });
    const skip = nodes(skippable).filter((n) => n.type === "button")[1];
    assert.equal(skip.props.disabled, false);
    skip.props.onClick();
    assert.equal(closed, 1);
    tree = m.SpeakingConsentDialog({ ...props, unknown: false });
    buttons = nodes(tree).filter((n) => n.type === "button");
    assert.equal(text(buttons[0]), "Agree & continue");
    assert.match(text(tree), /I am 13 or older/);
    assert.match(text(tree), /Anthropic/);
    assert.match(text(tree), /does not upload raw audio/);
    assert.equal(
      nodes(tree).some((n) => n.type === "input" && n.props.type === "checkbox"),
      false,
    );
    assert.deepEqual(
      nodes(tree)
        .filter((n) => n.type === "a")
        .map((n) => n.props.href),
      ["/privacy", "/terms"],
    );
    buttons[0].props.onClick();
    assert.equal(writes, 1);
    assert.equal(reads, 1);
  }));
