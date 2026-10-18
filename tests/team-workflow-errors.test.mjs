import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
async function fixture(name, run) {
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
              contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {TeamOperationError} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export const c={clients:0,auth:0,privateCalls:0,sideEffects:0,fail:false};export const createFileRoute=()=>c=>c;export const teamAdminClient=()=>{c.clients++;if(c.fail)throw Error('PRIVATE backend session configured detail');return{from(){c.privateCalls++;throw Error('Unexpected private read');},rpc(){c.sideEffects++;throw Error('Unexpected write');}};};export const authenticatedUser=async request=>{c.auth++;if(!request.headers.has('Authorization'))throw new TeamOperationError('Sign in to continue.',403);return{id:'synthetic'};};export const requirePlatformOwner=async()=>{};export const requireTeamAdmin=async()=>{};export const audit=async()=>{c.sideEffects++;throw Error('Unexpected audit');};export const sendTeamEmail=async()=>{c.sideEffects++;throw Error('Unexpected mail');};export const backfillStripeLedger=async()=>{c.sideEffects++;throw Error('Unexpected import');};export const syncTeamSubscription=async()=>{c.sideEffects++;throw Error('Unexpected sync');};export default class Stripe{constructor(){c.sideEffects++;throw Error('Unexpected Stripe construction');}}`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    await run({
      c,
      call: (method, body = "{}", auth = true) =>
        Route.server.handlers[method]({
          request: new Request(`https://fixture.invalid/api/${name}`, {
            method,
            headers: auth ? { Authorization: "Bearer synthetic" } : {},
            ...(method === "POST" ? { body } : {}),
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
        response = await call(method, "{}", false);
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
