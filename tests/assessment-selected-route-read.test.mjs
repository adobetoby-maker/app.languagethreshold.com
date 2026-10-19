import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { routingFixture } from "./helpers/routing-fixture.mjs";
const id = "33333333-3333-4333-8333-333333333333";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/selected-route-"));
  const old = {
    fetch: globalThis.fetch,
    set: setTimeout,
    clear: clearTimeout,
    env: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].map((k) => process.env[k]),
  };
  const timers = new Map();
  try {
    await build({
      stdin: {
        contents: `export {selectedAttemptPath} from '@/lib/assessments/routing-path-server';export {teamAdminClient} from '@/lib/team-server';export {evaluateRouting} from '@/lib/assessments/routing';export {proposeWritingReview} from '@/lib/assessments/ai-server';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "selected-route-fixture",
          setup(b) {
            if (process.env.LT_SELECTED_ROUTE_BASELINE)
              b.onLoad({ filter: /\/routing-path-server\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  [
                    "show",
                    `${process.env.LT_SELECTED_ROUTE_BASELINE}:src/lib/assessments/routing-path-server.ts`,
                  ],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve({ filter: /^(fixture|@tanstack\/react-start\/server-only)$/ }, (args) => ({
              path: args.path,
              namespace: "fixture",
            }));
            b.onResolve({ filter: /^\.\/server$/ }, (args) =>
              args.importer.endsWith("/ai-server.ts")
                ? { path: "server", namespace: "fixture" }
                : null,
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
              resolveDir: process.cwd(),
              contents:
                args.path === "fixture"
                  ? `export const c={context:null,claims:0};`
                  : args.path === "server"
                    ? `import {c} from 'fixture';export {AssessmentAccessError} from '@/lib/assessments/errors';export const attemptAccess=async()=>c.context;export const pilotAllowed=()=>true;export const assessmentBudget=async()=>{throw Error('Unexpected quota');};export const rpc=async()=>{c.claims++;throw Error('Unexpected claim');};`
                    : "",
            }));
          },
        },
      ],
    });
    const a = await import(join(dir, "case.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-only";
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 8000) return old.set(fn, ms, ...args);
      const timer = { unref() {} };
      timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (t) => {
      if (!timers.delete(t)) old.clear(t);
    };
    const { form, answers } = routingFixture();
    const decision = a.evaluateRouting(form, id, 4, answers).decision;
    const context = {
      attempt: {
        id,
        form_id: form.id,
        revision: 5,
        submitted_at: "2026-10-18T00:00:00Z",
        form_snapshot: {
          pilot: true,
          definition: form,
          version: form.version,
          rubricVersion: form.rubricVersion,
        },
      },
      enrollment: { user_id: "learner", program_scope: "full_module" },
      checkpoint: {},
    };
    a.c.context = context;
    const row = { attempt_id: id, source_revision: 4, decision_revision: 5, decision };
    const calls = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      return Response.json([row]);
    };
    await run({
      ...a,
      context,
      row,
      calls,
      timers,
      db: a.teamAdminClient(),
      expire: () => {
        for (const fn of [...timers.values()]) fn();
      },
    });
    assert.equal(timers.size, 0);
  } finally {
    globalThis.fetch = old.fetch;
    globalThis.setTimeout = old.set;
    globalThis.clearTimeout = old.clear;
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].forEach((k, i) =>
      old.env[i] === undefined ? delete process.env[k] : (process.env[k] = old.env[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
}
const request = (c) => new Request("https://synthetic.invalid/api/exams", { signal: c.signal });
const outcome = (p) =>
  p.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
async function entered(calls) {
  for (let i = 0; i < 100 && !calls.length; i++) await tick();
  assert.ok(calls.length);
}

test("selected route cancellation settles before ignored late headers", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    let release,
      settled = false,
      cancelled = 0;
    globalThis.fetch = async (input, init) => {
      a.calls.push({ url: new URL(String(input)), init });
      return new Promise((r) => (release = r));
    };
    const pending = outcome(a.selectedAttemptPath(a.db, a.context, true, request(owner))).then(
      (r) => {
        settled = true;
        return r;
      },
    );
    await entered(a.calls);
    owner.abort();
    for (let i = 0; i < 5; i++) await tick();
    const beforeLate = settled;
    release(
      process.env.LT_SELECTED_ROUTE_BASELINE
        ? Response.json([a.row])
        : new Response(
            new ReadableStream({
              cancel() {
                cancelled++;
              },
            }),
          ),
    );
    const result = await pending;
    await tick();
    assert.equal(
      beforeLate,
      true,
      "cancelled selected route must settle before ignored late headers",
    );
    assert.equal(result.error?.status, 499);
    assert.equal(cancelled, 1);
  }));

test("normal selected route uses exact projection, one GET and request-owned transport", () =>
  fixture(async (a) => {
    const path = await a.selectedAttemptPath(a.db, a.context, true, request(new AbortController()));
    assert.equal(path.items.length, 19);
    assert.equal(path.items.at(-1).id, "branch-band-b");
    assert.equal(a.calls.length, 1);
    const { url, init } = a.calls[0];
    assert.equal(url.pathname, "/rest/v1/assessment_attempt_routes");
    assert.equal(
      url.searchParams.get("select"),
      "attempt_id,source_revision,decision_revision,decision",
    );
    assert.equal(url.searchParams.get("attempt_id"), `eq.${id}`);
    assert.equal([...url.searchParams].length, 2);
    assert.ok(init.signal);
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "error");
    assert.equal(init.signal.aborted, true);
  }));

test("route headers and body share deadline and dispose late responses", () =>
  fixture(async (a) => {
    for (const body of [false, true]) {
      a.calls.length = 0;
      let release,
        cancelled = 0;
      globalThis.fetch = async (input, init) => {
        a.calls.push({ init });
        if (body)
          return new Response(
            new ReadableStream({
              cancel() {
                cancelled++;
              },
            }),
            { headers: { "content-type": "application/json" } },
          );
        return new Promise((r) => (release = r));
      };
      const pending = outcome(
        a.selectedAttemptPath(a.db, a.context, true, request(new AbortController())),
      );
      await entered(a.calls);
      a.expire();
      assert.equal((await pending).error?.status, 503);
      assert.equal(a.calls[0].init.signal.aborted, true);
      if (release)
        release(
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
    }
  }));

test("strict route wire caps, UTF8, projection, identity and cardinality fail closed", () =>
  fixture(async (a) => {
    const json = (x) => Response.json(x);
    const valid = JSON.stringify([a.row]);
    globalThis.fetch = async () =>
      new Response(valid + " ".repeat(65536 - Buffer.byteLength(valid)), {
        headers: { "content-type": "application/json" },
      });
    assert.equal(
      (await a.selectedAttemptPath(a.db, a.context, true, request(new AbortController()))).items
        .length,
      19,
    );
    const responses = [
      () => json([a.row, a.row]),
      () => json([{ ...a.row, attempt_id: "foreign" }]),
      () => json([{ ...a.row, privateAnswer: "PRIVATE" }]),
      () => json([{ ...a.row, source_revision: 1.5 }]),
      () => json([{ ...a.row, decision_revision: 2147483648 }]),
      () => json([{ ...a.row, decision: null }]),
      () =>
        new Response(new Uint8Array([255]), { headers: { "content-type": "application/json" } }),
      () => new Response(" ".repeat(65537), { headers: { "content-type": "application/json" } }),
      () =>
        new Response("{}", {
          headers: { "content-type": "application/json", "content-length": "65537" },
        }),
      () => new Response("<html>PRIVATE</html>", { headers: { "content-type": "text/html" } }),
    ];
    for (const response of responses) {
      globalThis.fetch = async () => response();
      await assert.rejects(
        a.selectedAttemptPath(a.db, a.context, true, request(new AbortController())),
        (e) => e.status === 503 && !e.message.includes("PRIVATE"),
      );
    }
  }));

test("one service attempt; confirmed no route retains409/core and malformed decisions503", () =>
  fixture(async (a) => {
    for (const status of [429, 500, 503]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response("PRIVATE", { status });
      };
      await assert.rejects(
        a.selectedAttemptPath(a.db, a.context, true, request(new AbortController())),
        { status: 503 },
      );
      assert.equal(calls, 1);
    }
    globalThis.fetch = async () => Response.json([]);
    await assert.rejects(
      a.selectedAttemptPath(a.db, a.context, true, request(new AbortController())),
      { status: 409 },
    );
    assert.equal(
      (await a.selectedAttemptPath(a.db, a.context, false, request(new AbortController()))).items
        .length,
      18,
    );
    for (const change of [
      (r) => r.decision_revision++,
      (r) => (r.decision.attemptId = "foreign"),
      (r) => (r.decision.branchId = "unknown"),
      (r) => (r.decision.sourceDigest = "bad"),
    ]) {
      const row = structuredClone(a.row);
      change(row);
      globalThis.fetch = async () => Response.json([row]);
      await assert.rejects(
        a.selectedAttemptPath(a.db, a.context, true, request(new AbortController())),
        { status: 503 },
      );
    }
  }));

test("flat forms, preabort and legacy calls preserve boundaries", () =>
  fixture(async (a) => {
    const flat = structuredClone(a.context);
    delete flat.attempt.form_snapshot.definition.routing;
    const path = await a.selectedAttemptPath(a.db, flat, true, request(new AbortController()));
    assert.equal(path.items.length, 21);
    assert.equal(a.calls.length, 0);
    const owner = new AbortController();
    owner.abort();
    await assert.rejects(a.selectedAttemptPath(a.db, flat, true, request(owner)), { status: 499 });
    assert.equal(a.calls.length, 0);
    assert.equal((await a.selectedAttemptPath(a.db, a.context, true)).items.length, 19);
    assert.equal(a.calls.length, 1);
    assert.equal(a.calls[0].init.signal, undefined);
  }));

test("independent requests and incoming listeners clean up without cancelling peer", () =>
  fixture(async (a) => {
    const ca = new AbortController(),
      cb = new AbortController();
    const releases = [];
    globalThis.fetch = async (input, init) =>
      new Promise((r) => releases.push({ release: r, signal: init.signal }));
    const ra = request(ca),
      rb = request(cb);
    const listeners = new Set();
    for (const r of [ra, rb]) {
      const add = r.signal.addEventListener.bind(r.signal),
        remove = r.signal.removeEventListener.bind(r.signal);
      r.signal.addEventListener = (type, fn, opts) => {
        if (type === "abort") listeners.add(fn);
        return add(type, fn, opts);
      };
      r.signal.removeEventListener = (type, fn, opts) => {
        if (type === "abort") listeners.delete(fn);
        return remove(type, fn, opts);
      };
    }
    const pa = outcome(a.selectedAttemptPath(a.db, a.context, true, ra));
    const pb = outcome(a.selectedAttemptPath(a.db, a.context, true, rb));
    for (let i = 0; i < 100 && releases.length < 2; i++) await tick();
    assert.equal(releases.length, 2);
    ca.abort();
    assert.equal((await pa).error?.status, 499);
    const stopped = releases.find((x) => x.signal.aborted),
      live = releases.find((x) => !x.signal.aborted);
    assert.ok(stopped && live);
    live.release(Response.json([a.row]));
    assert.equal((await pb).value.items.length, 19);
    stopped.release(Response.json([a.row]));
    await tick();
    assert.equal(listeners.size, 0);
    assert.equal(a.timers.size, 0);
  }));

test("actual AI caller passes request into saved-route wait before evidence or claim", () =>
  fixture(async (a) => {
    const owner = new AbortController();
    let release;
    globalThis.fetch = async (input, init) => {
      a.calls.push({ url: new URL(String(input)), init });
      return new Promise((r) => (release = r));
    };
    const pending = outcome(
      a.proposeWritingReview(
        a.db,
        "learner",
        id,
        "44444444-4444-4444-8444-444444444444",
        request(owner),
      ),
    );
    await entered(a.calls);
    assert.equal(a.calls[0].url.pathname, "/rest/v1/assessment_attempt_routes");
    owner.abort();
    assert.equal((await pending).error?.status, 499);
    release(Response.json([a.row]));
    await tick();
    assert.equal(a.calls.length, 1);
    assert.equal(a.c.claims, 0);
    a.calls.length = 0;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      a.calls.push({ url, init });
      return Response.json(url.pathname.endsWith("assessment_attempt_routes") ? [a.row] : []);
    };
    await assert.rejects(
      a.proposeWritingReview(
        a.db,
        "learner",
        id,
        "44444444-4444-4444-8444-444444444444",
        request(new AbortController()),
      ),
      { status: 404 },
    );
    assert.deepEqual(
      a.calls.map((x) => x.url.pathname),
      ["/rest/v1/assessment_attempt_routes", "/rest/v1/assessment_responses"],
    );
    assert.equal(a.c.claims, 0);
  }));
