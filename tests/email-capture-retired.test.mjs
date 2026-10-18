import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { checkGate } from "../src/lib/ai-gate.ts";
async function fixture(run) {
  const root = mkdtempSync(path.resolve("node_modules/.cache/email-retired-"));
  const saved = fetch;
  const savedError = console.error;
  const keys = [
    "RESEND_API_KEY",
    "RESEND_AUDIENCE_LANGUAGETHRESHOLD",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const savedEnv = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    const file = path.join(root, "route.mjs");
    await build({
      stdin: {
        contents: `export {Route} from ${JSON.stringify(path.resolve("src/routes/api.capture-email.ts"))};export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: file,
      bundle: true,
      platform: "node",
      format: "esm",
      external: ["zod"],
      logLevel: "silent",
      plugins: [
        {
          name: "no-real-contact-operations",
          setup(b) {
            b.onResolve(
              { filter: /^(fixture|@tanstack\/react-router|@supabase\/supabase-js)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={clients:0,writes:0,fetches:0,logs:0};export const createFileRoute=()=>config=>config;export function createClient(){c.clients++;return {from(){return {upsert:async()=>{c.writes++;return {error:null};}}}};}`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(file);
    globalThis.fetch = async () => {
      c.fetches++;
      return Response.json({ id: "synthetic-contact" });
    };
    console.error = () => {
      c.logs++;
    };
    await run(Route.server.handlers.POST, c, keys);
    assert.deepEqual(c, { clients: 0, writes: 0, fetches: 0, logs: 0 });
  } finally {
    globalThis.fetch = saved;
    console.error = savedError;
    for (const key of keys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    rmSync(root, { recursive: true, force: true });
  }
}
const request = (body, headers = {}, signal) =>
  new Request("https://fixture.invalid/api/capture-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === null ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    signal,
  });
async function retired(response) {
  assert.equal(response.status, 410);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Email capture is currently unavailable.",
  });
}
test("disabled client email gate has no contact-writing POST even with synthetic backend configuration", () =>
  fixture(async (post, c, keys) => {
    assert.equal(checkGate(false), "open");
    assert.equal(checkGate(true), "open");
    for (const key of keys)
      process.env[key] =
        key === "SUPABASE_URL" ? "https://fixture.supabase.co" : "synthetic-config";
    await retired(
      await post({
        request: request(
          { email: "synthetic@example.invalid", moduleId: "roofing", callCount: 3 },
          { Origin: "https://fixture.invalid" },
        ),
      }),
    );
  }));
test("retired email endpoint refuses missing, malformed, oversized and cross-origin input without parsing or diagnostics", () =>
  fixture(async (post, c, keys) => {
    for (const key of keys) delete process.env[key];
    for (const body of [
      null,
      "PRIVATE malformed",
      { email: "invalid" },
      JSON.stringify({ padding: "x".repeat(1024 * 1024) }),
    ])
      await retired(await post({ request: request(body, { Origin: "https://foreign.invalid" }) }));
    // Partial configurations cannot turn this legacy path back on.
    process.env.RESEND_API_KEY = "synthetic-config";
    await retired(await post({ request: request({ email: "synthetic@example.invalid" }) }));
  }));
test("retired email endpoint cancels unread partial input without awaiting stalled source cancellation", () =>
  fixture(async (post) => {
    let cancelled = false;
    const body = new ReadableStream({
      start(out) {
        out.enqueue(new TextEncoder().encode('{"email":"PRIVATE'));
      },
      cancel() {
        cancelled = true;
        return new Promise(() => {});
      },
    });
    const req = new Request("https://fixture.invalid/api/capture-email", {
      method: "POST",
      body,
      duplex: "half",
    });
    await retired(await post({ request: req }));
    assert.equal(cancelled, true);
    assert.equal(req.body.locked, false);
    const owner = new AbortController();
    owner.abort();
    await retired(
      await post({ request: request({ email: "synthetic@example.invalid" }, {}, owner.signal) }),
    );
  }));
