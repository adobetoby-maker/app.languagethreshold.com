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
  const dir = mkdtempSync(resolve("node_modules/.cache/ai-allowance-"));
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
        contents: `export {proposeWritingReview} from '@/lib/assessments/ai-server';export {teamAdminClient} from '@/lib/team-server';export {controls} from 'fixture-controls';`,
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
            if (process.env.LT_AI_ALLOWANCE_BASELINE)
              b.onLoad({ filter: /\/assessments\/ai-server\.ts$/ }, (args) => ({
                contents: execFileSync(
                  "git",
                  [
                    "show",
                    `${process.env.LT_AI_ALLOWANCE_BASELINE}:src/lib/assessments/ai-server.ts`,
                  ],
                  { encoding: "utf8" },
                ),
                loader: "ts",
                resolveDir: resolve(args.path, ".."),
              }));
            b.onResolve(
              {
                filter:
                  /^(fixture-controls|@tanstack\/react-router|@tanstack\/react-start\/server-only)$/,
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
                  contents: `export {AssessmentAccessError} from '@/lib/assessments/errors';export {assessmentBudget} from '@/lib/assessments/budget';import {controls} from 'fixture-controls';export const attemptAccess=async()=>controls.context;export const pilotAllowed=()=>false;export const rpc=async(db,name,args)=>{controls.rpcs.push({name,args});const result=await db.rpc(name,args);if(result.error)throw new Error("Synthetic RPC failure");return result.data;};`,
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
    c.db = api.teamAdminClient();
    let quotaCalls = 0;
    globalThis.fetch = async (input, init) => {
      const u = new URL(String(input)),
        path = u.pathname;
      if (path === "/rest/v1/assessment_responses")
        return Response.json([
          {
            id: response,
            item_id: "writing",
            answer: { inputMethod: "typed", text: "Synthetic writing" },
          },
        ]);
      if (path === "/rest/v1/assessment_score_events") return Response.json([]);
      if (path === "/rest/v1/assessment_enrollments") {
        events.push({ path, url: u, init });
        return hooks.enrollments?.(init) ?? Response.json([{ id: actor }]);
      }
      if (path === "/rest/v1/assessment_events") {
        events.push({ path, url: u, init });
        return (
          hooks.allowance?.(init) ?? new Response(null, { headers: { "Content-Range": "*/0" } })
        );
      }
      if (path === "/rest/v1/rpc/assessment_claim_grading") return Response.json(false);
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

function noClaim(a) {
  assert.equal(a.c.rpcs.length, 0);
  assert.equal(a.c.provider.length, 0);
  assert.equal(a.events.includes("ai.requested"), false);
}

const unavailable = (e) => e.status === 503 && e.message === "AI review allowance is unavailable.";
const cancelled = (e) => e.status === 499 && e.message === "Assessment request cancelled.";
const countReply = (count) => new Response(null, { headers: { "Content-Range": "*/" + count } });
const allowanceReads = (a) => a.events.filter((x) => typeof x === "object");
test("owned allowance wait settles on departure before ignored enrollment headers", () =>
  fixture(async (a) => {
    let begin,
      release,
      signal,
      disposed = 0;
    const started = new Promise((r) => (begin = r));
    a.hooks.enrollments = (init) => {
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
            c.enqueue(new TextEncoder().encode(JSON.stringify([{ id: actor }])));
            c.close();
          },
          cancel() {
            disposed++;
            return new Promise(() => {});
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    await pending;
    await tick(a);
    if (process.env.LT_AI_ALLOWANCE_BASELINE)
      console.log(
        JSON.stringify({
          settledBeforeLateHeaders: settled,
          selectedSignalPresent: !!signal,
          claims: a.c.rpcs.length,
          outcome: outcome.v?.state ?? outcome.e?.status,
        }),
      );
    assert.equal(
      settled,
      true,
      "allowance read must settle without waiting for late enrollment headers",
    );
    assert.ok(cancelled(outcome.e));
    assert.equal(signal.aborted, true);
    assert.equal(disposed, 1);
    assert.equal(a.c.rpcs.length, 0);
    assert.equal(allowanceReads(a).length, 1);
  }));
test("allowance SDK reads preserve actor IDs, exact rolling HEAD count and daily denial without provider writes", async () => {
  for (const count of [0, 29, 30])
    await fixture(async (a) => {
      a.hooks.allowance = () => countReply(count);
      if (count >= 30)
        await assert.rejects(
          a.invoke(),
          (e) =>
            e.status === 429 &&
            e.message ===
              "Today's AI writing review allowance is used. Human review remains available.",
        );
      else assert.equal((await a.invoke()).state, "already_requested");
      const reads = allowanceReads(a);
      assert.equal(reads.length, 2);
      const [en, head] = reads;
      assert.equal(en.url.searchParams.get("user_id"), "eq." + actor);
      assert.equal(en.url.searchParams.get("limit"), "1000");
      assert.equal(en.url.searchParams.get("select"), "id");
      assert.equal(head.init.method, "HEAD");
      assert.equal(head.url.searchParams.get("enrollment_id"), "in.(" + actor + ")");
      assert.equal(head.url.searchParams.get("action"), "eq.ai.requested");
      assert.equal(head.url.searchParams.get("select"), "id");
      assert.match(head.url.searchParams.get("created_at"), /^gte\.\d{4}-/);
      assert.equal(new Headers(head.init.headers).get("prefer"), "count=exact");
      for (const read of reads) {
        assert.equal(read.init.cache, "no-store");
        assert.equal(read.init.redirect, "error");
        assert.ok(read.init.signal);
      }
      assert.equal(a.c.rpcs.length, count >= 30 ? 0 : 1);
      assert.equal(a.c.provider.length, 0);
    });
});
test("allowance enrollment sentinel and empty owned set preserve count boundaries", async () => {
  await fixture(async (a) => {
    a.hooks.enrollments = () => Response.json([]);
    assert.equal((await a.invoke()).state, "already_requested");
    assert.equal(allowanceReads(a)[1].url.searchParams.get("enrollment_id"), "in.()");
  });
  await fixture(async (a) => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      id: "11111111-1111-4111-8111-" + String(i).padStart(12, "0"),
    }));
    a.hooks.enrollments = () => Response.json(rows);
    await assert.rejects(a.invoke(), unavailable);
    assert.equal(allowanceReads(a).length, 1);
    assert.equal(a.c.rpcs.length, 0);
  });
});
test("owned shared allowance deadline covers both headers and enrollment body without waiting for cancellation", async () => {
  for (const phase of ["enrollments", "allowance", "body"])
    await fixture(async (a) => {
      let begin,
        release,
        disposed = 0;
      const started = new Promise((r) => (begin = r));
      a.hooks[phase === "body" ? "enrollments" : phase] = () => {
        if (phase === "body")
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
            { headers: { "Content-Type": "application/json" } },
          );
        begin();
        return new Promise((r) => (release = r));
      };
      const pending = assert.rejects(a.invoke(), unavailable);
      await started;
      assert.equal(a.timers.size, 1);
      [...a.timers.values()][0]();
      await pending;
      assert.equal(a.c.rpcs.length, 0);
      if (phase !== "body") {
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
      }
      assert.equal(disposed, 1);
    });
});
test("allowance SDK enrollment replies enforce wire bytes, strict UTF8/projection and unique UUIDs before claim", async () => {
  for (const make of [
    () => new Response("[]", { headers: { "Content-Length": "65537" } }),
    () => new Response("[]" + " ".repeat(65536)),
    () => new Response(new Uint8Array([255])),
    () => new Response("{"),
    () => Response.json([{ id: actor, privateExtra: "PRIVATE" }]),
    () => Response.json([{ id: "wrong" }]),
    () => Response.json([{ id: actor }, { id: actor }]),
  ])
    await fixture(async (a) => {
      a.hooks.enrollments = make;
      await assert.rejects(a.invoke(), unavailable);
      assert.equal(allowanceReads(a).length, 1);
      assert.equal(a.c.rpcs.length, 0);
    });
});
test("allowance count HEAD requires a finite exact count and never accepts malformed headers as a free allowance", async () => {
  for (const range of [null, "*/*", "*/-1", "*/9007199254740992", "malformed", "*/1suffix"])
    await fixture(async (a) => {
      a.hooks.allowance = () =>
        new Response(null, { headers: range ? { "Content-Range": range } : {} });
      await assert.rejects(a.invoke(), unavailable);
      assert.equal(a.c.rpcs.length, 0);
      assert.equal(allowanceReads(a).length, 2);
    });
  await fixture(async (a) => {
    let disposed = 0;
    a.hooks.allowance = () =>
      new Response(
        new ReadableStream({
          cancel() {
            disposed++;
            return new Promise(() => {});
          },
        }),
        { headers: { "Content-Range": "0-29/30" } },
      );
    await assert.rejects(a.invoke(), (e) => e.status === 429);
    assert.equal(disposed, 1);
    assert.equal(a.c.rpcs.length, 0);
  });
});
test("allowance service errors use one installed-SDK attempt per selected GET or HEAD", async () => {
  for (const phase of ["enrollments", "allowance"])
    await fixture(async (a) => {
      a.hooks[phase] = () => Response.json({ message: "PRIVATE" }, { status: 503 });
      await assert.rejects(a.invoke(), unavailable);
      assert.equal(
        allowanceReads(a).filter((r) =>
          r.path.endsWith("/assessment_" + (phase === "enrollments" ? "enrollments" : "events")),
        ).length,
        1,
      );
      assert.equal(a.c.rpcs.length, 0);
    });
});
test("allowance requests isolate cancellation, clean request listeners and stop preaborted claims", () =>
  fixture(async (a) => {
    const owners = [new AbortController(), new AbortController()],
      requests = owners.map((o) => new Request(a.request.url, { signal: o.signal }));
    const listeners = new Set(),
      signal = requests[1].signal,
      add = signal.addEventListener.bind(signal),
      remove = signal.removeEventListener.bind(signal);
    signal.addEventListener = (k, f, o) => {
      if (k === "abort") listeners.add(f);
      add(k, f, o);
    };
    signal.removeEventListener = (k, f, o) => {
      if (k === "abort") listeners.delete(f);
      remove(k, f, o);
    };
    let begin;
    const started = new Promise((r) => (begin = r)),
      releases = [];
    a.hooks.enrollments = (init) =>
      new Promise((r) => {
        releases.push({ r, signal: init.signal });
        if (releases.length === 2) begin();
      });
    const first = assert.rejects(a.invoke(requests[0]), cancelled),
      second = a.invoke(requests[1]);
    await started;
    owners[0].abort();
    await first;
    const dead = releases.filter((r) => r.signal.aborted),
      live = releases.filter((r) => !r.signal.aborted);
    assert.equal(dead.length, 1);
    assert.equal(live.length, 1);
    live[0].r(Response.json([{ id: actor }]));
    assert.equal((await second).state, "already_requested");
    dead[0].r(Response.json([{ id: actor }]));
    await tick(a);
    assert.equal(listeners.size, 0);
    assert.equal(a.c.rpcs.length, 1);
    a.owner.abort();
    const reads = allowanceReads(a).length;
    await assert.rejects(a.invoke(), cancelled);
    assert.equal(allowanceReads(a).length, reads);
  }));
