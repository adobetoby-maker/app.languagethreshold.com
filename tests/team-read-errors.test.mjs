import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const id = "11111111-1111-4111-8111-111111111111";
async function fixture(name, run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-read-"));
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
          name: "controlled-read",
          setup(b) {
            b.onResolve(
              { filter: /^(@tanstack\/react-router|@\/lib\/team-server|controls)$/ },
              () => ({ path: "controlled", namespace: "controlled" }),
            );
            b.onLoad({ filter: /.*/, namespace: "controlled" }, () => ({
              resolveDir: process.cwd(),
              contents: `import {TeamOperationError} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export {json,teamError,scopedTeamError} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};export const createFileRoute=()=>c=>c;export const c={clients:0,auth:0,reads:[],rows:{},fail:null};export const authenticatedUser=async request=>{c.auth++;if(!request.headers.has('Authorization'))throw new TeamOperationError('Sign in to continue.',403);return{id:'synthetic'};};export const teamAdminClient=()=>{c.clients++;if(c.fail==='client')throw Error('PRIVATE configuration session detail');return{from(table){c.reads.push(table);return{select(){return this;},eq(){return this;},in(){return this;},maybeSingle(){return this;},then(resolve){return Promise.resolve({data:c.rows[table]??null,error:c.fail===table?Error('PRIVATE database session configured detail'):null}).then(resolve);}}}}};`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    await run({
      c,
      call: (query = "", auth = true) =>
        Route.server.handlers.GET({
          request: new Request(`https://fixture.invalid/api/${name}${query}`, {
            headers: auth ? { Authorization: "Bearer synthetic" } : {},
          }),
        }),
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function privacy(response) {
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}
test("certificate invalid IDs return fixed guidance before SDK construction", () =>
  fixture("certificate", async ({ c, call }) => {
    for (const query of ["", "?id=PRIVATE-invalid", "?id=" + "x".repeat(20000)]) {
      const response = await call(query, false);
      privacy(response);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Check the certificate link and try again.",
      });
    }
    assert.equal(c.clients, 0);
    assert.equal(c.auth, 0);
    assert.deepEqual(c.reads, []);
  }));
test("certificate read retains synthetic record/not-found responses and suppresses backend failures", () =>
  fixture("certificate", async ({ c, call }) => {
    let response = await call(`?id=${id}`, false);
    privacy(response);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Certificate not found." });
    c.rows.team_certificates = {
      id,
      learner_name: "Synthetic fixture only",
      status: "revoked",
      revoked_at: "2026-01-01T00:00:00Z",
    };
    response = await call(`?id=${id}`, false);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { certificate: c.rows.team_certificates });
    for (const fail of ["client", "team_certificates"]) {
      c.fail = fail;
      response = await call(`?id=${id}`, false);
      privacy(response);
      assert.equal(response.status, 503);
      assert.doesNotMatch(await response.text(), /PRIVATE|configuration|database/);
    }
    assert.equal(c.auth, 0);
  }));
test("entitlement missing auth stops before reads; unexpected membership/plan/client failures are fixed", () =>
  fixture("team-entitlement", async ({ c, call }) => {
    let response = await call("", false);
    privacy(response);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Sign in to continue." });
    assert.deepEqual(c.reads, []);
    c.rows.team_members = [{ organization_id: id }];
    for (const fail of ["client", "team_members", "team_entitlements"]) {
      c.fail = fail;
      response = await call();
      privacy(response);
      assert.equal(response.status, 503);
      assert.doesNotMatch(await response.text(), /PRIVATE|configuration|database/);
    }
  }));
test("entitlement preserves no-membership and active/manual expiry read behavior", () =>
  fixture("team-entitlement", async ({ c, call }) => {
    c.rows.team_members = [];
    let response = await call();
    assert.deepEqual(await response.json(), { active: false });
    assert.deepEqual(c.reads, ["team_members"]);
    c.rows.team_members = [{ organization_id: id }];
    for (const [plans, active] of [
      [[], false],
      [[{ status: "active" }], true],
      [[{ status: "manual", period_end: "2000-01-01T00:00:00Z" }], false],
      [[{ status: "manual", period_end: "2999-01-01T00:00:00Z" }], true],
      [[{ status: "manual", period_end: null }], false],
    ]) {
      c.rows.team_entitlements = plans;
      response = await call();
      privacy(response);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { active });
    }
  }));
