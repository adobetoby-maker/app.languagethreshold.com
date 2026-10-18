import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
const org = "11111111-1111-4111-8111-111111111111";
const session = "22222222-2222-4222-8222-222222222222";
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-replay-"));
  try {
    const helpersSource = readFileSync("src/lib/team-server.ts", "utf8");
    const helpers = helpersSource.slice(
      helpersSource.indexOf("export function json("),
      helpersSource.indexOf("export function teamBillingReady("),
    );
    await build({
      stdin: {
        contents: "export {Route} from '@/routes/api.team-activity';export {c} from 'fixture';",
        resolveDir: process.cwd(),
        loader: "ts",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      outfile: join(dir, "case.mjs"),
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-team-db",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|@tanstack\/react-router|@\/data\/(modules|curriculum)|@\/lib\/(team-server|team-certificate))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              loader: "ts",
              contents: `
export const c={tables:{},queries:[],writes:[],certificates:0,fail:null};
export const createFileRoute=()=>config=>config;
export const getModule=id=>['roofing','landscaper'].includes(id)?{id}:null;
export const getCurriculum=()=>({lessons:[{n:1},{n:2}]});
export const maybeIssueRoofingCertificate=async()=>{c.certificates++;return null};
export const authenticatedUser=async request=>{const id=request.headers.get('authorization');if(!id)throw Error('Sign in');return{id}};
${helpers}
class Query {
 constructor(table){this.table=table;this.filters=[];this.op='read';this.value=null;this.one=false;}
 select(){return this;}eq(key,value){this.filters.push([key,value]);return this;}gte(key,value){this.lower=[key,value];return this;}limit(){return this;}not(){return this;}
 insert(value){this.op='insert';this.value=value;return this;}update(value){this.op='update';this.value=value;return this;}upsert(value,options){this.op='upsert';this.value=value;this.options=options;return this;}
 single(){this.one=true;return this;}maybeSingle(){this.one=true;return this;}
 then(resolve,reject){return Promise.resolve().then(()=>{
 const q={table:this.table,op:this.op,filters:this.filters.map(x=>[...x]),value:this.value};c.queries.push(q);
 if(c.fail===this.table+':'+this.op)return{data:null,error:Error('synthetic query failure')};
 const table=c.tables[this.table]??=[];let rows=table.filter(row=>this.filters.every(([k,v])=>row[k]===v)&&(!this.lower||row[this.lower[0]]>=this.lower[1]));
 if(this.op==='insert'){const value={id:'synthetic-new',...this.value};table.push(value);rows=[value];c.writes.push(q);}
 if(this.op==='upsert'){const keys=this.options?.onConflict?.split(',')??[];if(!table.some(row=>keys.every(k=>row[k]===this.value[k])))table.push({...this.value});rows=[this.value];c.writes.push(q);}
 if(this.op==='update'){for(const row of rows)Object.assign(row,this.value);c.writes.push(q);}
 return{data:this.one?(rows[0]??null):rows,error:null};}).then(resolve,reject);}
}
export const teamAdminClient=()=>({from:table=>new Query(table)});
`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "case.mjs"));
    const scope = { organization_id: org, user_id: "a", module_id: "roofing", lesson_number: 1 };
    c.tables = {
      team_assignments: [{ organization_id: org, user_id: "a", module_id: "roofing" }],
      team_members: [{ organization_id: org, user_id: "a", status: "active", role: "learner" }],
      team_entitlements: [{ organization_id: org, status: "active" }],
      team_lesson_sessions: [
        {
          ...scope,
          id: session,
          started_at: new Date(Date.now() - 120000).toISOString(),
          completed_at: new Date(Date.now() - 60000).toISOString(),
        },
      ],
      team_lesson_completions: [{ ...scope }],
      team_activity_intervals: [
        { ...scope, started_at: new Date(Date.now() - 90000).toISOString(), active_seconds: 30 },
      ],
    };
    const invoke = async (
      body = {
        action: "lesson",
        moduleId: "roofing",
        lessonNumber: 1,
        sessions: { [org]: session },
      },
      actor = "a",
    ) => {
      const response = await Route.server.handlers.POST({
        request: new Request("https://synthetic.invalid/api/team-activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://synthetic.invalid",
            ...(actor ? { Authorization: actor } : {}),
          },
          body: JSON.stringify(body),
        }),
      });
      return { status: response.status, headers: response.headers, body: await response.json() };
    };
    await run({ c, invoke, scope });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("exact accepted lesson-session replay acknowledges without writes, activity recount or certificate issuance", () =>
  fixture(async ({ c, invoke }) => {
    const timestamp = c.tables.team_lesson_sessions[0].completed_at;
    for (let i = 0; i < 2; i++) {
      const result = await invoke();
      assert.equal(result.status, 200);
      assert.deepEqual(result.body, { recorded: 1, sessions: {} });
      assert.equal(result.headers.get("Cache-Control"), "private, no-store");
    }
    assert.equal(c.writes.length, 0);
    assert.equal(c.certificates, 0);
    assert.equal(c.tables.team_lesson_sessions[0].completed_at, timestamp);
    assert.equal(c.queries.filter((q) => q.table === "team_activity_intervals").length, 0);
    const sessionQuery = c.queries.find((q) => q.table === "team_lesson_sessions");
    assert.deepEqual(
      sessionQuery.filters.map((x) => x[0]),
      ["id", "organization_id", "user_id", "module_id", "lesson_number"],
    );
    const completion = c.queries.find((q) => q.table === "team_lesson_completions");
    assert.deepEqual(
      completion.filters.map((x) => x[0]),
      ["organization_id", "user_id", "module_id", "lesson_number"],
    );
  }));
test("completed session without matching authoritative completion fails closed, including database lookup error", () =>
  fixture(async ({ c, invoke }) => {
    c.tables.team_lesson_completions = [];
    let result = await invoke();
    assert.equal(result.status, 403);
    assert.match(result.body.error, /could not be verified/);
    assert.equal(c.writes.length, 0);
    c.fail = "team_lesson_completions:read";
    result = await invoke();
    assert.equal(result.status, 403);
    assert.equal(c.writes.length, 0);
    assert.equal(c.certificates, 0);
  }));
test("replay checks current member/entitlement and exact actor/session/module/lesson scope", () =>
  fixture(async ({ c, invoke }) => {
    let result = await invoke(undefined, null);
    assert.equal(result.status, 403);
    assert.equal(c.queries.length, 0);
    c.tables.team_members[0].status = "inactive";
    result = await invoke();
    assert.deepEqual(result.body, { recorded: 0, sessions: {} });
    assert.equal(c.queries.filter((q) => q.table === "team_lesson_sessions").length, 0);
    c.tables.team_members[0].status = "active";
    c.tables.team_members[0].role = "admin";
    result = await invoke();
    assert.equal(result.body.recorded, 0);
    c.tables.team_members[0].role = "learner";
    c.tables.team_entitlements[0].status = "expired";
    result = await invoke();
    assert.equal(result.body.recorded, 0);
    c.tables.team_entitlements[0].status = "active";
    for (const patch of [
      { user_id: "b" },
      { module_id: "landscaper" },
      { lesson_number: 2 },
      { id: "33333333-3333-4333-8333-333333333333" },
    ]) {
      const original = { ...c.tables.team_lesson_sessions[0] };
      Object.assign(c.tables.team_lesson_sessions[0], patch);
      result = await invoke();
      assert.equal(result.status, 403);
      Object.assign(c.tables.team_lesson_sessions[0], original);
    }
    assert.equal(c.writes.length, 0);
    assert.equal(c.certificates, 0);
  }));
test("new completion still needs authentic elapsed time and active-time evidence", () =>
  fixture(async ({ c, invoke }) => {
    c.tables.team_lesson_sessions[0].completed_at = null;
    c.tables.team_lesson_sessions[0].started_at = new Date().toISOString();
    let result = await invoke();
    assert.equal(result.status, 400);
    assert.match(result.body.error, /little more time/);
    assert.equal(c.writes.length, 0);
    c.tables.team_lesson_sessions[0].started_at = new Date(Date.now() - 120000).toISOString();
    c.tables.team_activity_intervals = [];
    result = await invoke();
    assert.equal(result.status, 400);
    assert.match(result.body.error, /30 active seconds/);
    assert.equal(c.writes.length, 0);
  }));
test("first accepted completion followed by lost-response replay makes one completion and leaves its timestamp stable", () =>
  fixture(async ({ c, invoke }) => {
    c.tables.team_lesson_sessions[0].completed_at = null;
    c.tables.team_lesson_completions = [];
    let result = await invoke();
    assert.equal(result.status, 200);
    assert.equal(c.tables.team_lesson_completions.length, 1);
    const timestamp = c.tables.team_lesson_sessions[0].completed_at;
    const writes = c.writes.length,
      certificates = c.certificates;
    result = await invoke();
    assert.equal(result.status, 200);
    assert.equal(result.body.recorded, 1);
    assert.equal(c.writes.length, writes);
    assert.equal(c.certificates, certificates);
    assert.equal(c.tables.team_lesson_sessions[0].completed_at, timestamp);
  }));
test("retry of a multi-team partial completion skips accepted organization and continues the remaining one", () =>
  fixture(async ({ c, invoke, scope }) => {
    const second = "33333333-3333-4333-8333-333333333333",
      secondSession = "44444444-4444-4444-8444-444444444444";
    c.tables.team_assignments.push({ ...c.tables.team_assignments[0], organization_id: second });
    c.tables.team_members.push({ ...c.tables.team_members[0], organization_id: second });
    c.tables.team_entitlements.push({ organization_id: second, status: "active" });
    c.tables.team_lesson_sessions.push({
      ...c.tables.team_lesson_sessions[0],
      organization_id: second,
      id: secondSession,
      completed_at: null,
    });
    c.tables.team_activity_intervals.push({
      ...c.tables.team_activity_intervals[0],
      organization_id: second,
    });
    let result = await invoke({
      action: "lesson",
      moduleId: "roofing",
      lessonNumber: 1,
      sessions: { [org]: session, [second]: secondSession },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.recorded, 2);
    assert.ok(
      c.writes.every(
        (q) =>
          q.value.organization_id === second ||
          q.filters.some(([k, v]) => k === "id" && v === secondSession),
      ),
    );
    const writes = c.writes.length;
    result = await invoke({
      action: "lesson",
      moduleId: "roofing",
      lessonNumber: 1,
      sessions: { [org]: session, [second]: secondSession },
    });
    assert.equal(result.body.recorded, 2);
    assert.equal(c.writes.length, writes);
  }));
