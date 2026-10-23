import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const PARENT = "parent-user-id";
const OTHER = "someone-else-id";

async function loadRoute() {
  const dir = mkdtempSync(resolve("node_modules/.cache/family-add-kid-"));
  try {
    const outfile = join(dir, "case.mjs");
    await build({
      stdin: {
        contents: `export {Route} from './src/routes/api.family-add-kid';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "fixture",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(@tanstack\/react-router|@supabase\/supabase-js|@\/lib\/active-plan|@\/lib\/speaking-security|fixture)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={tokens:new Map(),created:[],getUserCalls:[],plan:async()=>true,budget:async()=>true,budgetCalls:[]};
export const createFileRoute=()=>x=>x;
export const createClient=()=>({auth:{
  getUser:async(t)=>{c.getUserCalls.push(t);const u=c.tokens.get(t);return u?{data:{user:u},error:null}:{data:{user:null},error:{message:'bad jwt'}}},
  admin:{createUser:async(input)=>{c.created.push(input);return {data:{user:{id:'kid-'+c.created.length}},error:null}}}}});
export const hasActivePlan=async(db,id)=>c.plan(id);
export const consumeServerRequestBudget=async(...a)=>{c.budgetCalls.push(a);return c.budget(...a)};`,
            }));
          },
        },
      ],
    });
    return await import(outfile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { Route, c } = await loadRoute();
process.env.SUPABASE_URL = "https://fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
c.tokens.set("parent-token", { id: PARENT, email: "parent@example.invalid", app_metadata: {}, user_metadata: {} });
c.tokens.set("kid-token", {
  id: "kid-x",
  email: "sophie@kids.languagethreshold.app",
  app_metadata: { is_kid: true },
  user_metadata: { is_kid: true },
});

function post(body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return Route.server.handlers.POST({
    request: new Request("https://fixture.invalid/api/family-add-kid", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  });
}

function reset() {
  c.created.length = 0;
  c.budgetCalls.length = 0;
  c.plan = async () => true;
  c.budget = async () => true;
}

test("no bearer token is rejected with 401 before any account is created", async () => {
  reset();
  const res = await post({ parentId: PARENT, username: "Sophie", pin: "1234" });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(c.created.length, 0);
});

test("invalid or expired token is rejected with 401", async () => {
  reset();
  const res = await post({ username: "Sophie", pin: "1234" }, "forged-token");
  assert.equal(res.status, 401);
  assert.equal(c.created.length, 0);
});

test("parentId in the body is ignored; the kid is linked to the authenticated caller", async () => {
  reset();
  const res = await post({ parentId: OTHER, username: "Sophie", pin: "1234" }, "parent-token");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: "kid-1", username: "Sophie" });
  assert.equal(c.created.length, 1);
  const [created] = c.created;
  assert.equal(created.app_metadata.parent_id, PARENT);
  assert.equal(created.user_metadata.parent_id, PARENT);
  assert.equal(created.app_metadata.is_kid, true);
  assert.equal(created.email, "sophie@kids.languagethreshold.app");
  assert.ok(!JSON.stringify(created).includes(OTHER));
  assert.deepEqual(c.budgetCalls[0].slice(0, 4), ["user:family-add-kid", PARENT, 5, 3600]);
});

test("kid accounts cannot create more kid accounts", async () => {
  reset();
  const res = await post({ username: "Friend", pin: "1234" }, "kid-token");
  assert.equal(res.status, 403);
  assert.equal(c.created.length, 0);
});

test("parents without an active plan are refused", async () => {
  reset();
  c.plan = async () => false;
  const res = await post({ username: "Sophie", pin: "1234" }, "parent-token");
  assert.equal(res.status, 403);
  assert.equal(c.created.length, 0);
});

test("plan lookup failure fails closed", async () => {
  reset();
  c.plan = async () => {
    throw new Error("db down");
  };
  const res = await post({ username: "Sophie", pin: "1234" }, "parent-token");
  assert.equal(res.status, 503);
  assert.equal(c.created.length, 0);
});

test("rate limit exhaustion returns 429 and storage failure fails closed", async () => {
  reset();
  c.budget = async () => false;
  assert.equal((await post({ username: "Sophie", pin: "1234" }, "parent-token")).status, 429);
  c.budget = async () => {
    throw new Error("budget storage down");
  };
  assert.equal((await post({ username: "Sophie", pin: "1234" }, "parent-token")).status, 503);
  assert.equal(c.created.length, 0);
});

test("input validation still applies to authenticated parents", async () => {
  reset();
  for (const body of [
    { username: "Sophie", pin: "12a4" },
    { username: "S", pin: "1234" },
    { username: "!!", pin: "1234" },
    { username: "Sophie" },
  ]) {
    assert.equal((await post(body, "parent-token")).status, 400, JSON.stringify(body));
  }
  assert.equal(c.created.length, 0);
});
