// Built by TAC — 2026-10-20
// When the chunk of a listed Core 60 stage fails to load on the server, the readers answer
// "temporarily unavailable, try again" (503) for the 2 s STAGE_RETRY_BACKOFF_MS, not a user error
// ("Unknown lesson"). /api/tutor is covered in tests/core60-server-readers.test.mjs; this file covers
// the lesson-words server function and /api/team-activity. The stage chunks only exist under a
// bundler, so `import.meta.glob` is replaced by a loader map the tests control (a cold registry).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { build } from "esbuild";

const readStage = (id) => JSON.parse(readFileSync(`src/data/core60/es/${id}.json`, "utf8"));
const define = { "import.meta.glob": "globalThis.__core60Glob" };

/** Cold chunk loaders; `failures[id]` = how many times that chunk fails before it loads. */
function coldLoaders(failures = {}) {
  const calls = {};
  const left = { ...failures };
  const loaders = {};
  for (const id of ["foundation-electrician", "foundation-nursing"]) {
    loaders[`./core60/es/${id}.json`] = async () => {
      calls[id] = (calls[id] ?? 0) + 1;
      if (left[id] > 0) {
        left[id] -= 1;
        throw new Error("Failed to fetch dynamically imported module");
      }
      return readStage(id);
    };
  }
  globalThis.__core60Glob = () => loaders;
  return calls;
}

/** Runs `fn` with the clock moved forward past the registry's retry backoff. */
async function afterBackoff(fn) {
  const realNow = Date.now;
  Date.now = () => realNow() + 5_000;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

// ─── lesson-words ────────────────────────────────────────────────────────────

async function lessonWords(failures, run) {
  // The loaders must exist before the bundle is imported: the registry reads them at load time.
  const calls = coldLoaders(failures);
  const root = mkdtempSync(path.resolve("node_modules/.cache/stage-unavailable-"));
  const keys = ["ANTHROPIC_API_KEY", "VERCEL_ENV"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, { ANTHROPIC_API_KEY: "fixture-only", VERCEL_ENV: "preview" });
  const oldFetch = globalThis.fetch;
  try {
    const file = path.join(root, "handler.mjs");
    await build({
      stdin: {
        contents: `export {generateLessonWords as handler} from ${JSON.stringify(path.resolve("src/fns/lesson-words.functions.ts"))};export {controls} from 'test-controls';`,
        resolveDir: process.cwd(),
      },
      outfile: file,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["zod"],
      define,
      logLevel: "silent",
      plugins: [
        {
          name: "boundaries",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server(?:-only)?)?)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
export const controls={status:200,headers:{}};
export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
export const getRequest=()=>new Request('https://qa.invalid/_serverFn/words',{method:'POST',headers:{Origin:'https://qa.invalid','x-vercel-forwarded-for':'192.0.2.37'}});
export const setResponseHeader=(k,v)=>controls.headers[k]=v;
export const setResponseStatus=s=>controls.status=s;
export default class Model{}
`,
            }));
          },
        },
      ],
    });
    // Reaching the draft store or the model would be a fetch: the failing-stage path never gets there.
    let fetches = 0;
    globalThis.fetch = async () => {
      fetches += 1;
      return new Response("unexpected", { status: 500 });
    };
    await run({ ...(await import(file)), fetches: () => fetches, calls });
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys)
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    rmSync(root, { recursive: true, force: true });
  }
}

test("lesson-words: a listed stage that failed to load is 503 try-again, not Unknown lesson", () =>
  lessonWords({ "foundation-electrician": 1 }, async ({ handler, controls, fetches, calls }) => {
    const data = (moduleId, lessonNumber = 1) => ({
      moduleId,
      lessonNumber,
      language: "Spanish",
      nativeLanguage: "English",
    });
    const result = await handler({ data: data("foundation-electrician") });
    assert.equal(result.words, null);
    assert.match(result.error, /temporarily unavailable/);
    assert.doesNotMatch(result.error, /Unknown lesson/);
    assert.equal(controls.status, 503);
    assert.equal(controls.headers["Retry-After"], "2");
    assert.equal(fetches(), 0, "no draft store or model call was made");

    // Inside the backoff window: still 503, and the chunk is not fetched again.
    controls.status = 200;
    const again = await handler({ data: data("foundation-electrician") });
    assert.match(again.error, /temporarily unavailable/);
    assert.equal(controls.status, 503);
    assert.equal(calls["foundation-electrician"], 1);

    // A real unknown lesson of a loaded stage is still "Unknown lesson" (no 503).
    controls.status = 200;
    const unknown = await handler({ data: data("foundation-nursing", 59) });
    assert.deepEqual(unknown, { words: null, error: "Unknown lesson" });
    assert.equal(controls.status, 200);

    // After the backoff the retry loads the stage: the failure state is gone.
    controls.status = 200;
    const retried = await afterBackoff(() => handler({ data: data("foundation-electrician", 59) }));
    assert.deepEqual(retried, { words: null, error: "Unknown lesson" }, "loaded; lesson 59 does not exist");
    assert.equal(calls["foundation-electrician"], 2);
    assert.equal(controls.status, 200);
  }));

// ─── /api/team-activity lesson_start ─────────────────────────────────────────

const org = "11111111-1111-4111-8111-111111111111";

async function teamActivity(failures, run) {
  const calls = coldLoaders(failures);
  const dir = mkdtempSync(path.resolve("node_modules/.cache/stage-unavailable-team-"));
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
      outfile: path.join(dir, "case.mjs"),
      define,
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-team-db",
          setup(b) {
            // The real core60-stages registry stays; only the module list, the curriculum lookup
            // and the team server are replaced.
            b.onResolve(
              {
                filter:
                  /^(fixture|@tanstack\/react-router|@\/data\/(modules|curriculum)|@\/lib\/(team-server|team-certificate))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              loader: "ts",
              contents: `
import {ZodError} from 'zod';
import {stageCurriculum} from '${path.resolve("src/data/core60-stages.ts")}';
export const c={tables:{},writes:[]};
export const createFileRoute=()=>config=>config;
export const getModule=id=>['roofing','foundation-electrician'].includes(id)?{id}:null;
export const getCurriculum=id=>stageCurriculum(id)??(id==='roofing'?{lessons:[{n:1},{n:2}]}:null);
export const maybeIssueRoofingCertificate=async()=>null;
export const authenticatedUser=async request=>({id:request.headers.get('authorization')});export const authenticatedTeamUser=authenticatedUser;
${helpers}
class Query {
 constructor(table){this.table=table;this.filters=[];this.op='read';}
 select(){return this;}eq(key,value){this.filters.push([key,value]);return this;}gte(){return this;}limit(){return this;}not(){return this;}
 insert(value){this.op='insert';this.value=value;return this;}update(value){this.op='update';this.value=value;return this;}upsert(value){this.op='upsert';this.value=value;return this;}
 single(){this.one=true;return this;}maybeSingle(){this.one=true;return this;}
 then(resolve,reject){return Promise.resolve().then(()=>{
 if(this.op!=='read')c.writes.push(this.table+':'+this.op);
 const rows=(c.tables[this.table]??[]).filter(row=>this.filters.every(([k,v])=>row[k]===v));
 return{data:this.one?(rows[0]??null):rows,error:null};}).then(resolve,reject);}
}
export const teamAdminClient=()=>({from:table=>new Query(table)});
`,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(path.join(dir, "case.mjs"));
    c.tables = {
      team_assignments: [
        { organization_id: org, user_id: "a", module_id: "foundation-electrician" },
        { organization_id: org, user_id: "a", module_id: "roofing" },
      ],
      team_members: [{ organization_id: org, user_id: "a", status: "active", role: "learner" }],
      team_entitlements: [{ organization_id: org, status: "active" }],
    };
    const invoke = async (moduleId, lessonNumber = 1) => {
      const response = await Route.server.handlers.POST({
        request: new Request("https://synthetic.invalid/api/team-activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://synthetic.invalid",
            Authorization: "a",
          },
          body: JSON.stringify({ action: "lesson_start", moduleId, lessonNumber }),
        }),
      });
      return { status: response.status, body: await response.json() };
    };
    await run({ invoke, c, calls });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("team-activity lesson_start: a listed stage that failed to load is 503 try-again, not Unknown lesson", () =>
  teamActivity({ "foundation-electrician": 1 }, async ({ invoke, c, calls }) => {
    const failed = await invoke("foundation-electrician");
    assert.equal(failed.status, 503);
    assert.match(failed.body.error, /temporarily unavailable/);
    assert.equal(c.writes.length, 0, "nothing was recorded");

    // Inside the backoff window: still 503 with no second fetch.
    assert.equal((await invoke("foundation-electrician")).status, 503);
    assert.equal(calls["foundation-electrician"], 1);

    // A real unknown lesson of a stage that loads is still the 400 "Unknown lesson." after the retry.
    const afterRetry = await afterBackoff(() => invoke("foundation-electrician", 99));
    assert.equal(afterRetry.status, 400);
    assert.equal(afterRetry.body.error, "Unknown lesson.");
    assert.equal(calls["foundation-electrician"], 2);

    // The loaded stage knows lesson 1: the request goes on past the lesson check.
    const ok = await invoke("foundation-electrician", 1);
    assert.notEqual(ok.status, 503);
    assert.notEqual(ok.body.error, "Unknown lesson.");

    // Roofing (not a data-driven stage) never reports a stage failure.
    const roofing = await invoke("roofing", 99);
    assert.equal(roofing.status, 400);
    assert.equal(roofing.body.error, "Unknown lesson.");
  }));
