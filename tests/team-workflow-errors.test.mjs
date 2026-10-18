import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(name, run) {
  const valid =
    name === "team"
      ? { action: "create", name: "Synthetic fixture", billingEmail: "fixture@example.invalid" }
      : name === "team-billing"
        ? { action: "quote", orgId: "11111111-1111-4111-8111-111111111111", addSeats: 1 }
        : name === "module-request"
          ? {
              title: "Synthetic fixture",
              audience: "Synthetic audience",
              situations: "Synthetic situations only",
              vocabulary: "",
            }
          : { action: "ledger_import_stripe" };
  const dir = mkdtempSync(resolve("node_modules/.cache/team-workflow-"));
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.${name}';export {c} from 'controls';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "route.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-workflow",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(controls|@tanstack\/react-router|@\/lib\/team-server|stripe|@\/lib\/(stripe-ledger-backfill|team-subscription))$/,
              },
              () => ({ path: "controls", namespace: "controls" }),
            );
            b.onLoad({ filter: /.*/, namespace: "controls" }, () => ({
              resolveDir: process.cwd(),
              contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {TeamOperationError} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export const c={clients:0,auth:0,privateCalls:0,sideEffects:0,fail:false};export const createFileRoute=()=>c=>c;export const teamAdminClient=()=>{c.clients++;if(c.fail)throw Error('PRIVATE backend session configured detail');return{from(){c.privateCalls++;throw Error('Unexpected private read');},rpc(){c.sideEffects++;throw Error('Unexpected write');}};};export const authenticatedUser=async request=>{c.auth++;if(!request.headers.has('Authorization'))throw new TeamOperationError('Sign in to continue.',403);return{id:'synthetic'};};export const authenticatedTeamUser=authenticatedUser;export const requirePlatformOwner=async()=>{};export const requireTeamAdmin=async()=>{};export const audit=async()=>{c.sideEffects++;throw Error('Unexpected audit');};export const sendTeamEmail=async()=>{c.sideEffects++;throw Error('Unexpected mail');};export const backfillStripeLedger=async()=>{c.sideEffects++;throw Error('Unexpected import');};export const syncTeamSubscription=async()=>{c.sideEffects++;throw Error('Unexpected sync');};export default class Stripe{constructor(){c.sideEffects++;throw Error('Unexpected Stripe construction');}}`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    await run({
      c,
      valid,
      post: (request) => Route.server.handlers.POST({ request }),
      call: (method, body = valid, auth = true) =>
        Route.server.handlers[method]({
          request: new Request(`https://fixture.invalid/api/${name}`, {
            method,
            headers: {
              Origin: "https://fixture.invalid",
              ...(auth ? { Authorization: "Bearer synthetic" } : {}),
            },
            ...(method === "POST"
              ? { body: typeof body === "string" ? body : JSON.stringify(body) }
              : {}),
          }),
        }),
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function privacy(r) {
  assert.equal(r.headers.get("Cache-Control"), "private, no-store");
  assert.equal(r.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(r.headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(r.headers.get("X-Content-Type-Options"), "nosniff");
}
for (const name of ["team", "team-billing", "module-request", "platform"]) {
  for (const method of ["GET", "POST"]) {
    test(`${name} ${method} suppresses unexpected SDK errors and retains missing-auth denial`, () =>
      fixture(name, async ({ c, call }) => {
        c.fail = true;
        let response = await call(method);
        privacy(response);
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), {
          error: "We could not confirm this team request. Check your workspace before retrying.",
        });
        assert.equal(c.auth, 0);
        c.fail = false;
        response = await call(method, undefined, false);
        privacy(response);
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: "Sign in to continue." });
        assert.equal(c.privateCalls, 0);
        assert.equal(c.sideEffects, 0);
      }));
  }
  test(`${name} invalid schema and JSON use fixed 400 before workflow reads or side effects`, () =>
    fixture(name, async ({ c, call }) => {
      for (const body of [
        '{"PRIVATE invalid JSON":',
        JSON.stringify({ action: "PRIVATE invalid action", title: "PRIVATE" }),
      ]) {
        const response = await call("POST", body);
        privacy(response);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
          error: "Check your team request and try again.",
        });
      }
      assert.equal(c.privateCalls, 0);
      assert.equal(c.sideEffects, 0);
    }));
}
for (const name of ["team", "team-billing", "module-request", "platform"]) {
  test(`${name} owns bounded origin/input deadline/abort before SDK authentication`, () =>
    fixture(name, async ({ c, valid, post }) => {
      const savedSet = setTimeout,
        savedClear = clearTimeout,
        timers = new Map();
      globalThis.setTimeout = (fn, ms, ...args) => {
        if (ms !== 10000) return savedSet(fn, ms, ...args);
        const token = { unref() {} };
        timers.set(token, fn);
        return token;
      };
      globalThis.clearTimeout = (token) => {
        if (timers.has(token)) timers.delete(token);
        else savedClear(token);
      };
      try {
        const request = (body, headers = {}) =>
          new Request(`https://fixture.invalid/api/${name}`, {
            method: "POST",
            headers: { Origin: "https://fixture.invalid", ...headers },
            body: typeof body === "string" ? body : JSON.stringify(body),
          });
        for (const [body, headers, status] of [
          [valid, { Origin: "" }, 403],
          [{ invalid: "PRIVATE schema" }, {}, 400],
          ["{", {}, 400],
          [valid, { Origin: "https://foreign.invalid" }, 403],
          [valid, { "Content-Length": "65537" }, 413],
          [JSON.stringify({ padding: "é".repeat(65536) }), {}, 413],
        ]) {
          const response = await post(request(body, headers));
          privacy(response);
          assert.equal(response.status, status);
          assert.equal(c.clients, 0);
          assert.equal(c.auth, 0);
          assert.equal(timers.size, 0);
        }
        for (const reason of ["timeout", "incoming"]) {
          const owner = new AbortController();
          let cancelled = false;
          const body = new ReadableStream({
            start(out) {
              out.enqueue(new TextEncoder().encode('{"action":'));
            },
            cancel() {
              cancelled = true;
              return new Promise(() => {});
            },
          });
          const input = new Request(`https://fixture.invalid/api/${name}`, {
            method: "POST",
            headers: { Origin: "https://fixture.invalid" },
            body,
            duplex: "half",
            signal: owner.signal,
          });
          const pending = post(input);
          for (let i = 0; i < 100 && (!input.body.locked || !timers.size); i++)
            await new Promise((r) => savedSet(r, 1));
          assert.equal(input.body.locked, true);
          assert.equal(timers.size, 1);
          if (reason === "timeout") for (const fn of [...timers.values()]) fn();
          else owner.abort();
          const response = await pending;
          privacy(response);
          assert.equal(response.status, reason === "timeout" ? 408 : 499);
          assert.equal(cancelled, true);
          assert.equal(input.body.locked, false);
          assert.equal(timers.size, 0);
        }
        assert.equal(c.clients, 0);
        assert.equal(c.auth, 0);
        assert.equal(c.privateCalls, 0);
        assert.equal(c.sideEffects, 0);
      } finally {
        globalThis.setTimeout = savedSet;
        globalThis.clearTimeout = savedClear;
      }
    }));
}
test("maximum escaped Unicode custom-module brief fits the workflow limit and reaches missing-auth gate", () =>
  fixture("module-request", async ({ c, post }) => {
    const payload = JSON.stringify({
      title: "漢".repeat(120),
      audience: "漢".repeat(300),
      situations: "漢".repeat(2000),
      vocabulary: "漢".repeat(2000),
    }).replaceAll("漢", "\\u6f22");
    assert.ok(new TextEncoder().encode(payload).byteLength > 26000);
    assert.ok(new TextEncoder().encode(payload).byteLength < 65536);
    const response = await post(
      new Request("https://fixture.invalid/api/module-request", {
        method: "POST",
        headers: { Origin: "https://fixture.invalid" },
        body: payload,
      }),
    );
    privacy(response);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Sign in to continue." });
    assert.equal(c.clients, 1);
    assert.equal(c.auth, 1);
    assert.equal(c.privateCalls, 0);
    assert.equal(c.sideEffects, 0);
  }));
