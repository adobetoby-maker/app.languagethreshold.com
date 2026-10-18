import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { MAX_CONVERSATION_BODY_BYTES } from "../src/lib/conversation-request.ts";
import { currentTutorLesson } from "../src/lib/lesson-tutor-context.ts";
const routes = [
  [
    "tutor",
    {
      messages: [{ role: "user", content: "Hello" }],
      context: { language: "Spanish", level: "A1" },
    },
  ],
  [
    "field-prep",
    {
      scenarioId: "qa",
      investigatorName: "QA actor",
      investigatorBackground: "Fictional",
      openingSetup: "QA scene",
      language: "Spanish",
      level: "Beginner",
      messages: [],
      requestFeedback: false,
    },
  ],
  [
    "module-field-prep",
    {
      scenarioId: "qa",
      partnerName: "QA actor",
      partnerRole: "Crew lead",
      learnerRole: "Learner",
      openingSetup: "QA scene",
      moduleGroup: "trades",
      language: "Spanish",
      level: "Beginner",
      messages: [],
      requestFeedback: false,
    },
  ],
  [
    "discussion",
    {
      mode: "investigator",
      language: "Spanish",
      investigator: { type: "golden", name: "QA actor", tone: "Curious", questionsPerTopic: 2 },
      lesson: {
        lessonNumber: 1,
        lessonTitle: "QA lesson",
        topicTitle: "QA topic",
        topicKeyConcepts: ["qa"],
        questionsAskedOnTopic: 0,
      },
      messages: [{ role: "user", content: "Hello" }],
    },
  ],
];
async function load(name) {
  const root = mkdtempSync(path.resolve("node_modules/.cache/conversation-test-")),
    file = path.join(root, "route.mjs");
  await build({
    stdin: {
      contents: `export {Route} from ${JSON.stringify(path.resolve(`src/routes/api.${name}.ts`))};export {controls} from 'test-controls';`,
      resolveDir: process.cwd(),
    },
    outfile: file,
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["zod"],
    logLevel: "silent",
    plugins: [
      {
        name: "conversation-boundaries",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-router|\.\.\/lib\/sentry)$/,
            },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `export const controls={calls:0};export const createFileRoute=()=>config=>config;export const initSentry=()=>{};export const Sentry={captureException(error){controls.telemetry=error.message;}};export default class Model{constructor(options){controls.clientOptions=options;}messages={create:async (body, options)=>{controls.calls++;controls.body=body;controls.callOptions=options;if(controls.fail)throw new Error("PRIVATE learner content and provider response");if(!body.stream)return {content:[{type:'text',text:'Fictional QA tip'}]};return (async function*(){yield {type:'content_block_delta',delta:{type:'text_delta',text:'Fictional QA reply'}};yield {type:'message_stop'};})();}};}`,
          }));
        },
      },
    ],
  });
  try {
    return await import(file);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function request(name, body, headers = {}, signal) {
  return new Request(`https://owned-preview.invalid/api/${name}`, {
    method: "POST",
    signal,
    headers: {
      Origin: "https://owned-preview.invalid",
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": "192.0.2.37",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
for (const [name, data] of routes)
  test(`${name}: actual route bounds origin/body/budget and retains allowed response contract`, async () => {
    const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
      saved = Object.fromEntries(keys.map((k) => [k, process.env[k]])),
      oldFetch = globalThis.fetch;
    Object.assign(process.env, {
      ANTHROPIC_API_KEY: "fixture-only",
      SUPABASE_URL: "https://budget-store.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
      VERCEL_ENV: "preview",
    });
    try {
      const { Route, controls } = await load(name),
        handler = Route.server.handlers.POST;
      let budgets = 0,
        limit;
      globalThis.fetch = async (_, init) => {
        budgets++;
        limit = JSON.parse(init.body).p_request_limit;
        return Response.json(false);
      };
      let response = await handler({
        request: request(name, data, { Origin: "https://outside.invalid" }),
      });
      assert.equal(response.status, 403);
      assert.equal(budgets, 0);
      assert.equal(controls.calls, 0);
      response = await handler({
        request: request(name, " ".repeat(MAX_CONVERSATION_BODY_BYTES + 1)),
      });
      assert.equal(response.status, 413);
      assert.equal(budgets, 0);
      response = await handler({ request: request(name, "not JSON") });
      assert.equal(response.status, 400);
      assert.equal(budgets, 0);
      response = await handler({ request: request(name, data) });
      assert.equal(response.status, 429);
      assert.equal(limit, 30);
      assert.equal(response.headers.get("retry-after"), "60");
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => {
        throw Error("QA unavailable store");
      };
      response = await handler({ request: request(name, data) });
      assert.equal(response.status, 503);
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => Response.json(true);
      const disconnect = new AbortController();
      response = await handler({ request: request(name, data, {}, disconnect.signal) });
      assert.equal(controls.clientOptions.timeout, 45_000);
      assert.equal(controls.clientOptions.maxRetries, 0);
      assert.equal(controls.callOptions.signal.aborted, false);
      disconnect.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.match(await response.text(), /Fictional QA reply/);
      assert.equal(controls.calls, 1);
      if (name === "tutor") {
        const lesson = currentTutorLesson("?lesson=1", {
          currentTab: "core30",
          activeModuleId: "roofing",
          selectedLanguage: "Spanish",
          nativeLanguage: "English",
        });
        const originalCalls = controls.calls;
        response = await handler({
          request: request(name, {
            ...data,
            context: { ...data.context, lesson: { ...lesson, contentVersion: "stale-version" } },
          }),
        });
        assert.equal(response.status, 409);
        assert.equal(controls.calls, originalCalls);
        assert.match((await response.json()).error, /Reopen/);
        response = await handler({
          request: request(name, {
            ...data,
            context: { ...data.context, language: "French", lesson },
          }),
        });
        assert.equal(response.status, 400);
        assert.equal(controls.calls, originalCalls);
        response = await handler({
          request: request(name, {
            ...data,
            context: {
              ...data.context,
              level: "C2",
              lesson: { ...lesson, stage: "independent" },
              userVocabWords: ["UnrelatedSpecialistTerm"],
              activePatterns: [
                { name: "UnrelatedAdvancedPattern", pattern: "not from this lesson" },
              ],
            },
          }),
        });
        assert.equal(response.status, 200);
        await response.text();
        assert.match(controls.body.system, /lesson 1: Name the Roof System/);
        assert.match(controls.body.system, /Teaching stage: supported/);
        assert.ok(!controls.body.system.includes("Teaching stage: independent"));
        assert.ok(!controls.body.system.includes("CEFR level: C2"));
        assert.ok(!controls.body.system.includes("UnrelatedSpecialistTerm"));
        assert.ok(!controls.body.system.includes("UnrelatedAdvancedPattern"));
      }
      if (name === "discussion") {
        response = await handler({
          request: request(name, { ...data, mode: "companion", userText: "QA" }),
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).tip, "Fictional QA tip");
        assert.equal(controls.calls, 2);
        assert.equal(controls.clientOptions.maxRetries, 0);
        assert.ok(controls.callOptions.signal instanceof AbortSignal);
      }
      controls.fail = true;
      const callsBeforeFailure = controls.calls;
      response = await handler({ request: request(name, data) });
      assert.equal(response.status, 500);
      assert.equal(controls.calls, callsBeforeFailure + 1);
      assert.equal(controls.telemetry, `${name} provider request failed`);
      assert.ok(!(await response.text()).includes("PRIVATE"));
    } finally {
      globalThis.fetch = oldFetch;
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });
test("chunked bodies without a length header stop reading at the byte bound before parsing", async () => {
  const { prepareConversationRequest } = await import("../src/lib/conversation-request.ts");
  let pulls = 0,
    cancelled = false,
    parsed = false;
  const stream = new ReadableStream({
    pull(c) {
      pulls++;
      c.enqueue(new Uint8Array(16 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://owned-preview.invalid/api/tutor", {
    method: "POST",
    headers: { Origin: "https://owned-preview.invalid" },
    body: stream,
    duplex: "half",
  });
  const result = await prepareConversationRequest(req, {
    parse() {
      parsed = true;
      throw Error("Should not parse");
    },
  });
  assert.equal(result.response.status, 413);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 8);
  assert.equal(parsed, false);
});
const tick = () => new Promise((r) => setImmediate(r));
for (const [name, data] of routes)
  test(`${name}: owned input and admission deadlines reject stalled or departed work before model calls`, async () => {
    const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    const original = { fetch: globalThis.fetch, set: setTimeout, clear: clearTimeout };
    const timers = new Map();
    const controllers = [];
    const operations = [];
    const late = [];
    Object.assign(process.env, {
      ANTHROPIC_API_KEY: "fixture-only",
      SUPABASE_URL: "https://budget-store.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
      VERCEL_ENV: "preview",
    });
    try {
      globalThis.setTimeout = (fn, ms, ...args) => {
        if (ms !== 10000 && ms !== 15000) return original.set(fn, ms, ...args);
        const id = {};
        timers.set(id, { fn, ms });
        return id;
      };
      globalThis.clearTimeout = (id) => {
        if (timers.has(id)) timers.delete(id);
        else original.clear(id);
      };
      const expire = (ms) => {
        for (const v of [...timers.values()]) if (v.ms === ms) v.fn();
      };
      const { Route, controls } = await load(name);
      const invoke = (req) => {
        const p = Route.server.handlers.POST({ request: req });
        operations.push(p);
        return p;
      };
      const headers = (r) => {
        assert.match(r.headers.get("cache-control"), /private.*no-store/);
        assert.equal(r.headers.get("cdn-cache-control"), "no-store");
        assert.equal(r.headers.get("vercel-cdn-cache-control"), "no-store");
        assert.equal(r.headers.get("x-content-type-options"), "nosniff");
      };
      let counters = 0;
      globalThis.fetch = async () => {
        counters++;
        return Response.json(true);
      };
      for (const abort of [false, true]) {
        let cancelled = 0;
        const c = new AbortController();
        controllers.push(c);
        const body = new ReadableStream({
          start(x) {
            x.enqueue(new TextEncoder().encode("{"));
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        });
        const req = new Request(`https://owned-preview.invalid/api/${name}`, {
          method: "POST",
          headers: { Origin: "https://owned-preview.invalid" },
          body,
          duplex: "half",
          signal: c.signal,
        });
        const owned = req.body;
        const p = invoke(req);
        await tick();
        if (abort) c.abort();
        else expire(10000);
        const r = await p;
        assert.equal(r.status, abort ? 499 : 408);
        headers(r);
        assert.equal(cancelled, 1);
        assert.equal(owned.locked, false);
        assert.equal(counters, 0);
        assert.equal(controls.calls, 0);
      }
      const cancelledRequest = new AbortController();
      cancelledRequest.abort();
      const cancelledResponse = await invoke(request(name, data, {}, cancelledRequest.signal));
      assert.equal(cancelledResponse.status, 499);
      assert.equal(counters, 0);
      assert.equal(controls.calls, 0);
      // A source that refuses to settle cancellation must not hold the overflow response.
      let cancelled = 0;
      const req = new Request(`https://owned-preview.invalid/api/${name}`, {
        method: "POST",
        headers: { Origin: "https://owned-preview.invalid" },
        body: new ReadableStream({
          start(x) {
            x.enqueue(new Uint8Array(MAX_CONVERSATION_BODY_BYTES + 1));
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
        }),
        duplex: "half",
      });
      const overflow = await invoke(req);
      assert.equal(overflow.status, 413);
      assert.equal(req.body.locked, false);
      assert.equal(cancelled, 1);
      assert.equal(counters, 0);
      for (const abort of [false, true]) {
        const seen = [];
        globalThis.fetch = (_, init) =>
          new Promise((resolve) => {
            seen.push(init);
            late.push(resolve);
          });
        const c = new AbortController();
        controllers.push(c);
        const p = invoke(request(name, data, {}, c.signal));
        for (let i = 0; i < 100 && !seen.length; i++) await tick();
        assert.equal(seen.length, 1);
        if (abort) c.abort();
        else expire(15000);
        const r = await p;
        assert.equal(r.status, abort ? 499 : 503);
        headers(r);
        assert.equal(seen[0].signal.aborted, true);
        assert.equal(controls.calls, 0);
        late.shift()(Response.json(true));
        await tick();
        assert.equal(seen.length, 1);
        assert.equal(controls.calls, 0);
      }
      globalThis.fetch = async () => Response.json(true);
      const next = await invoke(request(name, data));
      assert.equal(next.status, 200);
      await next.text();
      assert.equal(controls.calls, 1);
      assert.equal(timers.size, 0);
    } finally {
      controllers.forEach((c) => c.abort());
      late.forEach((resolve) => resolve(Response.json(false)));
      await Promise.allSettled(operations);
      globalThis.fetch = original.fetch;
      globalThis.setTimeout = original.set;
      globalThis.clearTimeout = original.clear;
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });
