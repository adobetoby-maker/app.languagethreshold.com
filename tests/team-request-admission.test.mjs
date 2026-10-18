import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const org = "11111111-1111-4111-8111-111111111111";
async function fixture(name, run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-input-"));
  const savedSet = setTimeout,
    savedClear = clearTimeout;
  const timers = new Map(),
    owner = new AbortController();
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
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/api.${name}';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "route.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["zod"],
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-team-input",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|@tanstack\/react-router|@\/data\/(modules|curriculum)|@\/lib\/(team-server|team-certificate|roofing-assessment))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={clients:0,auth:0,queries:0,writes:0,members:0,certificates:0};export const createFileRoute=()=>config=>config;export const getModule=()=>({});export const getCurriculum=()=>({lessons:[]});export const maybeIssueRoofingCertificate=async()=>{c.certificates++;return null;};export const drawRoofingQuestions=()=>[];export const publicRoofingQuestion=()=>({});export const scoreRoofingAnswers=()=>({});export const authenticatedUser=async()=>{c.auth++;return{id:'synthetic-user'};};export const memberRole=async()=>{c.members++;return null;};export const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});export const teamError=()=>json({error:'Synthetic scoped denial'},403);export const teamAdminClient=()=>{c.clients++;return{from(){c.queries++;return{upsert:async()=>{c.writes++;return{error:null};},select(){return this;},eq(){return this;},single:async()=>({data:null,error:null}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}};}};};`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "route.mjs"));
    const valid =
      name === "team-activity"
        ? {
            action: "interval",
            moduleId: "roofing",
            activity: "see",
            startedAt: new Date().toISOString(),
            activeSeconds: 1,
            idempotencyKey: org,
          }
        : { action: "start", orgId: org };
    const call = (req) => Route.server.handlers.POST({ request: req });
    const req = (body = valid, headers = {}, signal = owner.signal) =>
      new Request(`https://fixture.invalid/api/${name}`, {
        method: "POST",
        headers: {
          Origin: "https://fixture.invalid",
          "Content-Type": "application/json",
          ...headers,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
        signal,
      });
    await run({
      c,
      call,
      req,
      valid,
      owner,
      timers,
      expire() {
        for (const fn of [...timers.values()]) fn();
      },
      async until(check) {
        for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => savedSet(r, 1));
        assert.ok(check());
      },
    });
    assert.equal(timers.size, 0);
  } finally {
    owner.abort();
    globalThis.setTimeout = savedSet;
    globalThis.clearTimeout = savedClear;
    rmSync(dir, { recursive: true, force: true });
  }
}
function privacy(response) {
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
for (const name of ["team-activity", "team-assessment"]) {
  test(`${name} rejects invalid origin/schema/bytes before SDK/auth/private work`, () =>
    fixture(name, async ({ c, call, req, valid }) => {
      const max = name === "team-activity" ? 16 * 1024 : 64 * 1024;
      for (const [body, headers, status] of [
        [valid, { Origin: "" }, 403],
        [valid, { Origin: "https://foreign.invalid" }, 403],
        ["PRIVATE invalid JSON", {}, 400],
        [{ action: "PRIVATE invalid action" }, {}, 400],
        [JSON.stringify({ padding: "é".repeat(max) }), {}, 413],
        [valid, { "Content-Length": String(max + 1) }, 413],
      ]) {
        const response = await call(req(body, headers));
        assert.equal(response.status, status);
        privacy(response);
        assert.ok(!(await response.text()).includes("PRIVATE"));
      }
      assert.deepEqual(c, {
        clients: 0,
        auth: 0,
        queries: 0,
        writes: 0,
        members: 0,
        certificates: 0,
      });
      const response = await call(req());
      assert.equal(response.status, name === "team-activity" ? 200 : 403);
      assert.equal(c.clients, 1);
      assert.equal(c.auth, 1);
      assert.equal(c.certificates, 0);
      if (name === "team-activity") {
        assert.equal(c.writes, 1);
        assert.deepEqual(await response.json(), { recorded: 0 });
      } else assert.equal(c.members, 1);
    }));
  test(`${name} owns partial input deadline/abort and starts no SDK on departed input`, () =>
    fixture(name, async ({ c, call, req, valid, owner, expire, until }) => {
      for (const reason of ["timeout", "incoming"]) {
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
        const pending = call(input);
        await until(() => input.body.locked);
        if (reason === "timeout") expire();
        else owner.abort();
        const response = await pending;
        assert.equal(response.status, reason === "timeout" ? 408 : 499);
        privacy(response);
        assert.equal(cancelled, true);
        assert.equal(input.body.locked, false);
      }
      const response = await call(req(valid));
      assert.equal(response.status, 499);
      privacy(response);
      assert.deepEqual(c, {
        clients: 0,
        auth: 0,
        queries: 0,
        writes: 0,
        members: 0,
        certificates: 0,
      });
    }));
}
