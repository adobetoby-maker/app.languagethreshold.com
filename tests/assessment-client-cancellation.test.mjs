import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(action) {
  const dir = mkdtempSync(resolve("node_modules/.cache/exam-client-")),
    old = globalThis.fetch;
  try {
    const out = join(dir, "client.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/assessments/client';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
      plugins: [
        {
          name: "session",
          setup(b) {
            b.onResolve({ filter: /^(fixture|@\/integrations\/supabase\/client)$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={sessions:[]};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};`,
            }));
          },
        },
      ],
    });
    const m = await import(out),
      requests = [];
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => requests.push({ url, opts, resolve }));
    const auth = (actor = "synthetic-a") =>
      m.c.sessions.shift()({
        data: { session: { user: { id: actor }, access_token: "synthetic-token" } },
      });
    const calls = [
      (s, o) => m.examRequest({ action: "fixture" }, s, o),
      (s, o) => m.examPlanRequest("/api/exam-plans?fixture", s, o),
      (s, o) => m.examReviewerRequest({ action: "fixture" }, s, o),
      (s, o) => m.examContentRequest({ action: "fixture" }, s, o),
      (s, o) => m.examAudioRequest("/api/exams?fixture", s, o),
      (s, o) =>
        m.uploadExamSpeech(
          {
            attemptId: "fixture",
            itemId: "fixture",
            revision: 1,
            policyVersion: "fixture",
            consent: true,
            mime: "audio/webm",
            durationMs: 1000,
            requestId: "fixture",
          },
          new Blob(["synthetic non-speech"]),
          s,
          o,
        ),
      (s, o) => m.examHistoryExport("fixture", s, o),
    ];
    const response = (index, body) => ({
      ok: true,
      headers: new Headers(
        index === 4
          ? { "Content-Type": "audio/webm" }
          : index === 6
            ? { "Content-Type": "text/csv", "x-lt-export-events": "1" }
            : { "Content-Type": "application/json" },
      ),
      json: body ?? (async () => ({ attached: true, evidenceId: "fixture" })),
      blob: body ?? (async () => new Blob(["synthetic non-speech"])),
    });
    await action({ m, requests, auth, calls, response });
  } finally {
    globalThis.fetch = old;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("all assessment client helpers reject pre-cancelled work without credentials or network", async () =>
  fixture(async ({ m, calls, requests }) => {
    for (const call of calls) {
      const c = new AbortController();
      c.abort();
      await assert.rejects(call(c.signal), { name: "AbortError" });
    }
    assert.equal(m.c.sessions.length, 0);
    assert.equal(requests.length, 0);
  }));
test("all assessment helpers stop after cancellation during credentials or delayed transport", async () =>
  fixture(async ({ calls, requests, auth, response }) => {
    for (const [i, call] of calls.entries()) {
      const c = new AbortController(),
        p = call(c.signal);
      c.abort();
      auth();
      await assert.rejects(p, { name: "AbortError" });
      assert.equal(requests.length, i);
      const next = new AbortController(),
        pending = call(next.signal);
      auth();
      await tick();
      next.abort();
      requests[i].resolve(response(i));
      await assert.rejects(pending, { name: "AbortError" });
    }
  }));
test("assessment JSON/blob parsing cannot return success after cancellation; active requests retain contracts", async () =>
  fixture(async ({ calls, requests, auth, response }) => {
    for (const [i, call] of calls.entries()) {
      const c = new AbortController(),
        p = call(c.signal);
      auth();
      await tick();
      let resolveBody;
      requests.at(-1).resolve(response(i, () => new Promise((r) => (resolveBody = r))));
      await tick();
      c.abort();
      resolveBody(
        i === 4 || i === 6 ? new Blob(["synthetic"]) : { attached: true, evidenceId: "fixture" },
      );
      await assert.rejects(p, { name: "AbortError" });
      const valid = call();
      auth();
      await tick();
      const request = requests.at(-1);
      assert.equal(request.opts.cache, "no-store");
      requests.at(-1).resolve(response(i));
      const result = await valid;
      if (i === 4) assert.equal(result.mode, "private_clip");
      else if (i === 6) assert.equal(result.eventCount, 1);
      else assert.equal(result.attached, true);
    }
  }));
test("active assessment authorization and attachment/export validation failures retain their errors", async () =>
  fixture(async ({ calls, m, auth, requests, response }) => {
    for (const call of calls) {
      const noSession = call();
      m.c.sessions.shift()({ data: { session: null } });
      await assert.rejects(noSession, (e) => e instanceof m.ExamRequestError && e.status === 403);
      const denied = call();
      auth();
      await tick();
      requests
        .at(-1)
        .resolve({ ok: false, status: 403, json: async () => ({ error: "synthetic denied" }) });
      await assert.rejects(denied, (e) => e instanceof m.ExamRequestError && e.status === 403);
    }
    const upload = calls[5]();
    auth();
    await tick();
    requests.at(-1).resolve({ ...response(5), json: async () => ({ attached: false }) });
    await assert.rejects(upload, (e) => e.status === 503);
    const csv = calls[6]();
    auth();
    await tick();
    requests.at(-1).resolve({
      ...response(6),
      headers: new Headers({ "Content-Type": "text/csv", "x-lt-export-events": "10001" }),
    });
    await assert.rejects(csv, (e) => e.status === 503);
  }));
test("owned assessment helpers refuse stale or empty owners before credential lookup", () =>
  fixture(async ({ m, calls, requests }) => {
    for (const call of calls) {
      await assert.rejects(call(undefined, { userId: "a", isCurrent: () => false }), {
        name: "AbortError",
      });
      await assert.rejects(call(undefined, { userId: "", isCurrent: () => true }), {
        name: "AbortError",
      });
    }
    assert.equal(m.c.sessions.length, 0);
    assert.equal(requests.length, 0);
  }));
test("all owned assessment helpers reject replacement SDK credentials and retain exact current transport contracts", () =>
  fixture(async ({ m, calls, requests, auth, response }) => {
    for (const [i, call] of calls.entries()) {
      const controller = new AbortController(),
        owner = { userId: "synthetic-a", isCurrent: () => true };
      let p = call(controller.signal, owner);
      auth("synthetic-b");
      await assert.rejects(p, (e) => e instanceof m.ExamRequestError && e.status === 403);
      assert.equal(requests.length, i);
      p = call(controller.signal, owner);
      auth();
      await tick();
      assert.equal(requests.length, i + 1);
      const r = requests.at(-1);
      assert.equal(r.opts.headers.Authorization, "Bearer synthetic-token");
      assert.equal(r.opts.signal, controller.signal);
      assert.equal(r.opts.cache, "no-store");
      r.resolve(response(i));
      await p;
    }
  }));
test("owned helpers stop after owner departure during credentials, transport and JSON/blob parsing", () =>
  fixture(async ({ calls, requests, auth, response }) => {
    for (const [i, call] of calls.entries()) {
      let current = true;
      const owner = { userId: "synthetic-a", isCurrent: () => current };
      let p = call(undefined, owner);
      current = false;
      auth();
      await assert.rejects(p, { name: "AbortError" });
      current = true;
      p = call(undefined, owner);
      auth();
      await tick();
      current = false;
      requests.at(-1).resolve(response(i));
      await assert.rejects(p, { name: "AbortError" });
      current = true;
      p = call(undefined, owner);
      auth();
      await tick();
      let finish;
      requests.at(-1).resolve(response(i, () => new Promise((r) => (finish = r))));
      await tick();
      current = false;
      finish(
        i === 4 || i === 6 ? new Blob(["synthetic"]) : { attached: true, evidenceId: "fixture" },
      );
      await assert.rejects(p, { name: "AbortError" });
    }
  }));
