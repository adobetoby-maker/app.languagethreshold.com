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
  const dir = mkdtempSync(resolve("node_modules/.cache/ai-provider-"));
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
            if (process.env.LT_AI_PROVIDER_BASELINE)
              b.onLoad({ filter: /\/assessments\/ai-server\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  [
                    "show",
                    `${process.env.LT_AI_PROVIDER_BASELINE}:src/lib/assessments/ai-server.ts`,
                  ],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve(
              {
                filter:
                  /^(fixture-controls|@tanstack\/react-router|@tanstack\/react-start\/server-only|@\/lib\/team-server)$/,
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
                  contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {controls} from 'fixture-controls';export const teamAdminClient=()=>controls.db;export const authenticatedAssessmentUser=async()=>({id:${JSON.stringify(actor)}});`,
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
      if (ms !== 25000) return old.set(fn, ms, ...args);
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
      if (new URL(String(input)).hostname === "api.anthropic.com") {
        c.provider.push({ url: String(input), options: init, input: JSON.parse(init.body) });
        return hooks.provider?.(init) ?? Response.json(message);
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

const message = {
  id: "synthetic",
  type: "message",
  role: "assistant",
  model: "claude-haiku-5-5",
  stop_reason: "tool_use",
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
  content: [
    {
      type: "tool_use",
      id: "synthetic-tool",
      name: "propose_writing_review",
      input: { dimensions: { task: 1 }, confidence: 0.6, reason: "Synthetic proposal only" },
    },
  ],
};
const failure = (e) =>
  e.status === 503 &&
  e.message ===
    "AI review did not finish reliably. No final score was assigned and it will not retry automatically. Request human review.";
const encoder = new TextEncoder();
function failedJob(a) {
  assert.equal(a.c.provider.length, 1);
  assert.equal(a.c.rpcs.filter((r) => r.name === "assessment_record_score").length, 0);
  assert.equal(a.c.rpcs.at(-1).name, "assessment_finish_grading");
  assert.equal(a.c.rpcs.at(-1).args.p_succeeded, false);
  assert.equal(a.c.rpcs.at(-1).args.p_error, "provider_outcome_requires_review");
  assert.deepEqual(
    a.events.filter((x) => x.startsWith("ai.")),
    ["ai.requested"],
  );
}
test("actual SDK stalled proposal body keeps an owned deadline after headers and never records a late score", () =>
  fixture(async (a) => {
    let begin,
      body,
      disposed = 0;
    const started = new Promise((r) => (begin = r));
    a.hooks.provider = () =>
      new Response(
        new ReadableStream({
          start(c) {
            body = c;
          },
          pull() {
            begin();
          },
          cancel() {
            disposed++;
            return new Promise(() => {});
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    let outcome;
    const pending = a.invoke().then(
      (v) => (outcome = { v }),
      (e) => (outcome = { e }),
    );
    await started;
    await tick(a);
    const retainedTimers = a.timers.size;
    for (const fn of [...a.timers.values()]) fn();
    await tick(a);
    const settled = !!outcome;
    if (!disposed) {
      body.enqueue(encoder.encode(JSON.stringify(message)));
      body.close();
    }
    await pending;
    if (process.env.LT_AI_PROVIDER_BASELINE)
      console.log(
        JSON.stringify({
          retainedTimers,
          settledAfterDeadline: settled,
          outcome: outcome.v?.state ?? outcome.e?.status,
          mockScoreWrites: a.c.rpcs.filter((r) => r.name === "assessment_record_score").length,
        }),
      );
    assert.ok(retainedTimers > 0, "provider phase timer must outlive response headers");
    assert.equal(settled, true);
    assert.ok(failure(outcome.e));
    assert.equal(disposed, 1);
    failedJob(a);
  }));
test("actual SDK ignored provider headers settle at deadline and dispose the late response without a second request", () =>
  fixture(async (a) => {
    let begin,
      release,
      signal,
      disposed = 0;
    const started = new Promise((r) => (begin = r));
    a.hooks.provider = (init) => {
      signal = init.signal;
      begin();
      return new Promise((r) => (release = r));
    };
    const pending = assert.rejects(a.invoke(), failure);
    await started;
    for (const fn of [...a.timers.values()]) fn();
    await pending;
    assert.equal(signal.aborted, true);
    release(
      new Response(
        new ReadableStream({
          cancel() {
            disposed++;
            return new Promise(() => {});
          },
        }),
      ),
    );
    await tick(a);
    assert.equal(disposed, 1);
    failedJob(a);
  }));
test("actual SDK proposal responses reject advertised/cumulative bytes, invalid UTF8 and JSON before score writes", async () => {
  for (const make of [
    () => new Response(JSON.stringify(message), { headers: { "Content-Type": "text/plain" } }),
    () =>
      new Response("{}", {
        headers: { "Content-Length": "131073", "Content-Type": "application/json" },
      }),
    () =>
      new Response(JSON.stringify(message) + " ".repeat(131072), {
        headers: { "Content-Type": "application/json" },
      }),
    () => new Response(new Uint8Array([255]), { headers: { "Content-Type": "application/json" } }),
    () => new Response("{", { headers: { "Content-Type": "application/json" } }),
  ])
    await fixture(async (a) => {
      a.hooks.provider = make;
      await assert.rejects(a.invoke(), failure);
      failedJob(a);
    });
});
test("actual SDK successful proposal keeps frozen tool, model, token, lease and human-review score semantics", () =>
  fixture(async (a) => {
    const payload = JSON.stringify(message);
    a.hooks.provider = () =>
      new Response(payload + " ".repeat(131072 - encoder.encode(payload).byteLength), {
        headers: { "Content-Type": "application/json" },
      });
    const result = await a.invoke();
    assert.equal(result.state, "needs_review");
    assert.equal(a.c.provider.length, 1);
    const p = a.c.provider[0];
    assert.equal(p.url, "https://api.anthropic.com/v1/messages");
    assert.equal(p.options.method, "POST");
    assert.equal(p.options.cache, "no-store");
    assert.equal(p.options.redirect, "error");
    assert.equal(p.input.max_tokens, 900);
    assert.equal(p.input.model, "claude-haiku-5-5");
    assert.deepEqual(p.input.thinking, { type: "disabled" });
    assert.deepEqual(p.input.tool_choice, { type: "tool", name: "propose_writing_review" });
    assert.equal(p.input.tools[0].input_schema.properties.dimensions.additionalProperties, false);
    const score = a.c.rpcs.find((r) => r.name === "assessment_record_score");
    assert.equal(score.args.p_state, "needs_review");
    assert.equal(score.args.p_source, "ai_proposal");
    assert.equal(score.args.p_points, 1);
    assert.equal(score.args.p_request, a.c.rpcs[0].args.p_lease);
    assert.equal(a.c.rpcs.at(-1).args.p_succeeded, true);
    assert.deepEqual(
      a.events.filter((x) => x.startsWith("ai.")),
      ["ai.requested", "ai.proposal"],
    );
  }));
test("actual SDK transient provider statuses preserve one attempt and fixed uncertain-outcome guidance", async () => {
  for (const status of [429, 500, 503])
    await fixture(async (a) => {
      a.hooks.provider = () =>
        Response.json({ error: { type: "api_error", message: "PRIVATE" } }, { status });
      await assert.rejects(a.invoke(), failure);
      failedJob(a);
    });
});
test("actual SDK malformed or incomplete frozen-rubric proposal cannot create a score", async () => {
  for (const change of [
    (m) => (m.stop_reason = "max_tokens"),
    (m) => (m.content[0].input.dimensions.task = 2),
    (m) => (m.content = []),
    (m) => (m.content[0].input.dimensions.extra = 1),
  ])
    await fixture(async (a) => {
      const m = structuredClone(message);
      change(m);
      a.hooks.provider = () => Response.json(m);
      await assert.rejects(a.invoke(), failure);
      failedJob(a);
    });
});
test("independent claimed proposal phases cannot share deadline cancellation or leases", () =>
  fixture(async (a) => {
    let begin;
    const started = new Promise((r) => (begin = r)),
      releases = [];
    a.hooks.provider = (init) =>
      new Promise((r) => {
        releases.push({ r, signal: init.signal });
        if (releases.length === 2) begin();
      });
    const operations = [a.invoke(), a.invoke()].map((p) =>
      p.then(
        (v) => ({ v }),
        (e) => ({ e }),
      ),
    );
    await started;
    assert.equal(a.timers.size, 4); // one phase timer and one SDK header timer per call
    [...a.timers.values()][0]();
    const failed = await Promise.race(operations);
    assert.ok(failure(failed.e));
    const stopped = releases.filter((r) => r.signal.aborted),
      live = releases.filter((r) => !r.signal.aborted);
    assert.equal(stopped.length, 1);
    assert.equal(live.length, 1);
    live[0].r(Response.json(message));
    const results = await Promise.all(operations);
    assert.equal(results.filter((r) => r.v?.state === "needs_review").length, 1);
    stopped[0].r(Response.json(message));
    await tick(a);
    const leases = a.c.rpcs
      .filter((r) => r.name === "assessment_claim_grading")
      .map((r) => r.args.p_lease);
    assert.equal(new Set(leases).size, 2);
    assert.equal(a.c.provider.length, 2);
    assert.equal(a.c.rpcs.filter((r) => r.name === "assessment_record_score").length, 1);
  }));
test("request departure after provider dispatch retains claimed operation outcome without replay", () =>
  fixture(async (a) => {
    let begin, release, signal;
    const started = new Promise((r) => (begin = r));
    a.hooks.provider = (init) => {
      signal = init.signal;
      begin();
      return new Promise((r) => (release = r));
    };
    const pending = a.invoke();
    await started;
    a.owner.abort();
    assert.equal(signal.aborted, false);
    release(Response.json(message));
    assert.equal((await pending).state, "needs_review");
    assert.equal(a.c.provider.length, 1);
    assert.equal(a.c.rpcs.at(-1).args.p_succeeded, true);
  }));
