import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
test("actual speaking attestation helpers recheck cancellation/identity after headers and JSON without dispatching stale consent", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-client-")),
    oldFetch = globalThis.fetch;
  try {
    const out = join(dir, "client.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/speaking-client';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
      plugins: [
        {
          name: "session-fixture",
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
    const auth = () =>
      m.c.sessions.shift()({ data: { session: { access_token: "synthetic-test-token" } } });
    const abort = new AbortController(),
      get = m.getSpeakingAgeAttestation(abort.signal);
    abort.abort();
    auth();
    await assert.rejects(get, { name: "AbortError" });
    assert.equal(requests.length, 0);
    let current = true;
    const save = m.saveSpeakingAgeAttestation(true, undefined, () => current);
    current = false;
    auth();
    await assert.rejects(save, { name: "AbortError" });
    assert.equal(
      requests.length,
      0,
      "identity lost during credential read cannot send consent to another actor",
    );
    current = true;
    const valid = m.saveSpeakingAgeAttestation(true, undefined, () => current);
    auth();
    await tick();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].opts.method, "POST");
    requests[0].resolve({ ok: true, json: async () => ({ attested: true }) });
    assert.equal(await valid, true);
    const late = m.saveSpeakingAgeAttestation(true, undefined, () => current);
    auth();
    await tick();
    let finishJson;
    requests[1].resolve({ ok: true, json: () => new Promise((r) => (finishJson = r)) });
    await tick();
    current = false;
    finishJson({ attested: true });
    await assert.rejects(late, { name: "AbortError" });
    assert.equal(
      requests.length,
      2,
      "a dispatched write may already be accepted; stale acknowledgement is rejected, not undone",
    );
  } finally {
    globalThis.fetch = oldFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});
