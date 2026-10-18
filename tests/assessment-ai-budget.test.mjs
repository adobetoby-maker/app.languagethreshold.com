import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const actor = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const response = "44444444-4444-4444-8444-444444444444";
async function fixture(run) {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/ai-budget-"));
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];
  const old = {
    fetch: globalThis.fetch,
    set: setTimeout,
    clear: clearTimeout,
    env: keys.map((k) => process.env[k]),
  };
  const timers = new Map();
  try {
    await build({
      stdin: {
        contents: `export {proposeWritingReview} from '@/lib/assessments/ai-server';export {Route} from '@/routes/api.exams';export {controls} from 'fixture-controls';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "api.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      logLevel: "silent",
      plugins: [
        {
          name: "synthetic-ai-boundaries",
          setup(b) {
            if (process.env.LT_AI_BUDGET_BASELINE)
              b.onLoad({ filter: /\/assessments\/ai-server\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  ["show", `${process.env.LT_AI_BUDGET_BASELINE}:src/lib/assessments/ai-server.ts`],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve(
              {
                filter:
                  /^(fixture-controls|@anthropic-ai\/sdk|@tanstack\/react-router|@tanstack\/react-start\/server-only|@\/lib\/team-server)$/,
              },
              (args) => ({ path: args.path, namespace: "fixture" }),
            );
            b.onResolve({ filter: /^\.\/(server|routing-path-server)$/ }, (args) =>
              args.importer.endsWith("/ai-server.ts")
                ? { path: args.path, namespace: "fixture" }
                : null,
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
              const base = { resolveDir: process.cwd() };
              if (args.path === "fixture-controls")
                return {
                  ...base,
                  contents: `export const controls={db:null,context:null,items:[],provider:[],rpcs:[],claim:true};`,
                };
              if (args.path === "@tanstack/react-start/server-only") return { contents: "" };
              if (args.path === "@tanstack/react-router")
                return { contents: "export const createFileRoute=()=>config=>config;" };
              if (args.path === "./server")
                return {
                  ...base,
                  contents: `export {AssessmentAccessError} from '@/lib/assessments/errors';export {assessmentBudget} from '@/lib/assessments/budget';import {controls} from 'fixture-controls';export const attemptAccess=async()=>controls.context;export const pilotAllowed=()=>false;export const rpc=async(db,name,args)=>{controls.rpcs.push({name,args});return db.rpc(name,args);};`,
                };
              if (args.path === "./routing-path-server")
                return {
                  ...base,
                  contents: `import {controls} from 'fixture-controls';export const selectedAttemptPath=async()=>({items:controls.items});`,
                };
              if (args.path === "@/lib/team-server")
                return {
                  ...base,
                  contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {teamAdminClient as realAdmin} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {controls} from 'fixture-controls';export const teamAdminClient=(fetcher,request)=>fetcher?realAdmin(fetcher,request):controls.db;export const authenticatedAssessmentUser=async()=>({id:${JSON.stringify(actor)}});`,
                };
              return {
                ...base,
                contents: `import {controls} from 'fixture-controls';export default class Anthropic{constructor(options){this.messages={create:async input=>{controls.provider.push({options,input});return {model:'synthetic-only',stop_reason:'tool_use',usage:{input_tokens:0,output_tokens:0},content:[{type:'tool_use',name:'propose_writing_review',input:{dimensions:{task:1},confidence:0.6,reason:'Synthetic proposal only'}}]};}};}}`,
              };
            });
          },
        },
      ],
    });
    const api = await import(join(dir, "api.mjs"));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
    process.env.ANTHROPIC_API_KEY = "synthetic-stub-only";
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== 8000) return old.set(fn, ms, ...args);
      const timer = { unref() {} };
      timers.set(timer, fn);
      return timer;
    };
    globalThis.clearTimeout = (timer) => {
      if (!timers.delete(timer)) old.clear(timer);
    };
    const events = [],
      c = api.controls;
    c.context = {
      attempt: {
        submitted_at: "2026-10-18T00:00:00Z",
        form_snapshot: {
          calibrated: true,
          definition: { status: "verified", rubricVersion: "fixture-v1" },
        },
      },
      enrollment: {
        id: "enrollment",
        user_id: actor,
        target_language: "Spanish",
        instruction_language: "English",
      },
      checkpoint: { enrollment_id: "enrollment" },
    };
    c.items = [
      {
        id: "writing",
        type: "production",
        skill: "writing",
        maximum: 1,
        prompt: "Synthetic fixture",
        rubric: { dimensions: [{ id: "task", maximum: 1 }] },
      },
    ];
    const hooks = {};
    c.db = {
      from(table) {
        events.push(table);
        const q = {
          select: () => q,
          eq: () => q,
          in: () => q,
          maybeSingle: async () => ({
            data: {
              id: response,
              item_id: "writing",
              answer: { inputMethod: "typed", text: "Synthetic writing" },
            },
            error: null,
          }),
          limit: async () =>
            table === "assessment_score_events"
              ? { data: hooks.human ? [{ id: "human" }] : [], error: null }
              : (hooks.enrollments?.() ?? { data: [{ id: "enrollment" }], error: null }),
          gte: async () => hooks.allowance?.() ?? { count: 0, error: null },
          insert: async (value) => {
            events.push(value.action);
            return { error: null };
          },
        };
        return q;
      },
      rpc: async (name) => (name === "assessment_claim_grading" ? c.claim : "synthetic-score"),
    };
    let quotaCalls = 0;
    globalThis.fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === "/rest/v1/assessment_enrollments") {
        events.push("assessment_enrollments");
        const result = (await hooks.enrollments?.()) ?? { data: [{ id: actor }], error: null };
        return result.error
          ? Response.json({ message: "Synthetic failure" }, { status: 503 })
          : Response.json(result.data ?? []);
      }
      if (path === "/rest/v1/assessment_events") {
        events.push("assessment_events");
        const result = (await hooks.allowance?.()) ?? { count: 0, error: null };
        return result.error
          ? Response.json({ message: "Synthetic failure" }, { status: 503 })
          : new Response(null, { headers: { "Content-Range": "*/" + result.count } });
      }
      assert.equal(String(input), "https://fixture.invalid/rest/v1/rpc/consume_speaking_request");
      quotaCalls++;
      assert.equal(init.method, "POST");
      assert.equal(init.cache, "no-store");
      const body = JSON.parse(init.body);
      assert.equal(body.p_request_limit, hooks.outer && quotaCalls === 1 ? 30 : 3);
      assert.equal(body.p_window_seconds, 60);
      assert.match(body.p_bucket_hash, /^[0-9a-f]{64}$/);
      return hooks.quota?.(init, quotaCalls) ?? Response.json(true);
    };
    const owner = new AbortController();
    const request = new Request("https://app.invalid/api/exams", {
      method: "POST",
      headers: { Origin: "https://app.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ai_writing",
        attemptId: attempt,
        responseId: response,
        consentVersion: "assessment-ai-writing-v1",
      }),
      signal: owner.signal,
    });
    const invoke = (r = request) => api.proposeWritingReview(c.db, actor, attempt, response, r);
    await run({
      ...api,
      c,
      events,
      hooks,
      owner,
      request,
      invoke,
      timers,
      old,
      calls: () => quotaCalls,
    });
    assert.equal(timers.size, 0);
  } finally {
    globalThis.fetch = old.fetch;
    globalThis.setTimeout = old.set;
    globalThis.clearTimeout = old.clear;
    keys.forEach((key, i) => {
      if (old.env[i] === undefined) delete process.env[key];
      else process.env[key] = old.env[i];
    });
    rmSync(dir, { recursive: true, force: true });
  }
}
const tick = (a) => new Promise((r) => a.old.set(r, 0));
const unavailable = (e) =>
  e.status === 503 && e.message === "Assessment request controls are unavailable.";
const cancelled = (e) => e.status === 499 && e.message === "Assessment request cancelled.";
function noClaim(a) {
  assert.equal(a.c.rpcs.length, 0);
  assert.equal(a.c.provider.length, 0);
  assert.equal(a.events.includes("ai.requested"), false);
}
test("internal AI quota settles on request departure before a late permit can release a claim", () =>
  fixture(async (a) => {
    let begin,
      release,
      signal,
      disposed = 0;
    const started = new Promise((r) => (begin = r));
    a.hooks.quota = (init) => {
      signal = init.signal;
      begin();
      return new Promise((r) => (release = r));
    };
    let outcome;
    const pending = a.invoke().then(
      (v) => (outcome = { v }),
      (e) => (outcome = { e }),
    );
    await started;
    a.owner.abort();
    await new Promise((r) => a.old.set(r, 20));
    const settled = !!outcome;
    release(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode("true"));
            c.close();
          },
          cancel() {
            disposed++;
            return new Promise(() => {});
          },
        }),
      ),
    );
    await pending;
    await tick(a);
    if (process.env.LT_AI_BUDGET_BASELINE)
      console.log(
        JSON.stringify({
          settledBeforeLateHeaders: settled,
          mockClaims: a.c.rpcs.filter((r) => r.name === "assessment_claim_grading").length,
          mockProviderCalls: a.c.provider.length,
          outcome: outcome.v?.state ?? outcome.e?.status,
        }),
      );
    assert.equal(settled, true, "internal quota must settle before ignored late headers");
    assert.ok(cancelled(outcome.e));
    assert.equal(signal.aborted, true);
    assert.equal(disposed, 1);
    assert.equal(a.calls(), 1);
    noClaim(a);
    assert.equal(a.events.includes("assessment_enrollments"), false);
  }));
test("internal AI quota header and body deadlines stop before claim and dispose ignored late work", () =>
  fixture(async (a) => {
    for (const body of [false, true]) {
      let begin,
        release,
        signal,
        disposed = 0;
      const started = new Promise((r) => (begin = r));
      a.hooks.quota = (init) => {
        signal = init.signal;
        if (body)
          return new Response(
            new ReadableStream({
              pull() {
                begin();
              },
              cancel() {
                disposed++;
                return new Promise(() => {});
              },
            }),
          );
        begin();
        return new Promise((r) => (release = r));
      };
      const pending = assert.rejects(a.invoke(), unavailable);
      await started;
      assert.equal(a.timers.size, 1);
      [...a.timers.values()][0]();
      await pending;
      assert.equal(signal.aborted, true);
      noClaim(a);
      if (!body) {
        release(
          new Response(
            new ReadableStream({
              cancel() {
                disposed++;
              },
            }),
          ),
        );
        await tick(a);
      }
      assert.equal(disposed, 1);
    }
  }));
test("internal AI quota malformed bytes, oversized responses, service denial and false preserve fixed guidance without claim", () =>
  fixture(async (a) => {
    for (const [make, status] of [
      [() => new Response("true" + " ".repeat(1024)), 503],
      [() => new Response(new Uint8Array([255])), 503],
      [() => new Response("{"), 503],
      [() => Response.json({ error: "PRIVATE" }, { status: 503 }), 503],
      [() => Response.json(false), 429],
    ]) {
      const before = a.calls();
      a.hooks.quota = () => make();
      await assert.rejects(
        a.invoke(),
        (e) => e.status === status && (status !== 503 || unavailable(e)),
      );
      assert.equal(a.calls(), before + 1);
      noClaim(a);
    }
  }));
test("AI preclaim request fences stop late enrollment/allowance reads and preaborted requests without a durable claim", () =>
  fixture(async (a) => {
    for (const phase of ["enrollments", "allowance"]) {
      let begin, release;
      const started = new Promise((r) => (begin = r)),
        owner = new AbortController();
      a.hooks[phase] = () => {
        begin();
        return new Promise((r) => (release = r));
      };
      const pending = assert.rejects(
        a.invoke(new Request(a.request.url, { signal: owner.signal })),
        cancelled,
      );
      await started;
      owner.abort();
      release(
        phase === "enrollments"
          ? { data: [{ id: "enrollment" }], error: null }
          : { count: 0, error: null },
      );
      await pending;
      noClaim(a);
      delete a.hooks[phase];
    }
    const before = a.events.length;
    a.owner.abort();
    await assert.rejects(a.invoke(), cancelled);
    assert.equal(a.events.length, before);
    noClaim(a);
  }));
test("actual AI HTTP route passes its Request to the second quota and stops before a claim", () =>
  fixture(async (a) => {
    a.hooks.outer = true;
    let begin, release;
    const started = new Promise((r) => (begin = r));
    a.hooks.quota = (_, n) => {
      if (n === 1) return Response.json(true);
      begin();
      return new Promise((r) => (release = r));
    };
    const pending = a.Route.server.handlers.POST({ request: a.request });
    const reached = await Promise.race([
      started.then(() => true),
      pending.then(async (r) => {
        throw new Error(`Route ended before second quota: ${r.status} ${await r.clone().text()}`);
      }),
    ]);
    assert.equal(reached, true);
    a.owner.abort();
    const result = await pending;
    assert.equal(result.status, 499);
    assert.deepEqual(await result.json(), { error: "Assessment request cancelled." });
    release(Response.json(true));
    await tick(a);
    noClaim(a);
    assert.equal(a.calls(), 2);
  }));
test("AI normal and legacy callers retain claim, proposal-only score, consent/audit and no-retry provider configuration", () =>
  fixture(async (a) => {
    for (const request of [a.request, undefined]) {
      const result = await a.proposeWritingReview(a.c.db, actor, attempt, response, request);
      assert.equal(result.state, "needs_review");
      const score = a.c.rpcs.find((r) => r.name === "assessment_record_score");
      assert.equal(score.args.p_source, "ai_proposal");
      assert.equal(score.args.p_state, "needs_review");
      assert.equal(score.args.p_points, 1);
      assert.deepEqual(
        a.c.rpcs.slice(-3).map((r) => r.name),
        ["assessment_claim_grading", "assessment_record_score", "assessment_finish_grading"],
      );
      assert.equal(a.c.rpcs.at(-1).args.p_succeeded, true);
      assert.equal(a.c.provider.at(-1).options.maxRetries, 0);
      assert.equal(a.c.provider.at(-1).options.timeout, 25000);
      assert.deepEqual(
        a.events.filter((e) => e.startsWith("ai.")),
        request
          ? ["ai.requested", "ai.proposal"]
          : ["ai.requested", "ai.proposal", "ai.requested", "ai.proposal"],
      );
    }
  }));
test("final human score and refused durable claim still prevent AI provider/audit writes", () =>
  fixture(async (a) => {
    a.hooks.human = true;
    assert.equal((await a.invoke()).state, "already_reviewed");
    assert.equal(a.calls(), 0);
    noClaim(a);
    a.hooks.human = false;
    a.c.claim = false;
    assert.equal((await a.invoke()).state, "already_requested");
    assert.equal(a.c.rpcs.length, 1);
    assert.equal(a.c.provider.length, 0);
    assert.equal(a.events.includes("ai.requested"), false);
  }));
test("an already-dispatched grading claim keeps prior lease/provider bookkeeping semantics on departure", () =>
  fixture(async (a) => {
    let begin, release;
    const started = new Promise((r) => (begin = r));
    a.c.db.rpc = async (name) => {
      if (name === "assessment_claim_grading") {
        begin();
        return new Promise((r) => (release = r));
      }
      return "synthetic-score";
    };
    const pending = a.invoke();
    await started;
    a.owner.abort();
    release(true);
    assert.equal((await pending).state, "needs_review");
    assert.equal(a.c.provider.length, 1);
    assert.equal(a.c.rpcs.filter((r) => r.name === "assessment_claim_grading").length, 1);
    assert.equal(a.c.rpcs.at(-1).args.p_succeeded, true);
  }));
