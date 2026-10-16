import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { MAX_CONVERSATION_BODY_BYTES } from "../src/lib/conversation-request.ts";
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
            contents: `export const controls={calls:0};export const createFileRoute=()=>config=>config;export const initSentry=()=>{};export const Sentry={captureException(){}};export default class Model{messages={create:async body=>{controls.calls++;controls.body=body;if(!body.stream)return {content:[{type:'text',text:'Fictional QA tip'}]};return (async function*(){yield {type:'content_block_delta',delta:{type:'text_delta',text:'Fictional QA reply'}};yield {type:'message_stop'};})();}};}`,
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
function request(name, body, headers = {}) {
  return new Request(`https://owned-preview.invalid/api/${name}`, {
    method: "POST",
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
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => {
        throw Error("QA unavailable store");
      };
      response = await handler({ request: request(name, data) });
      assert.equal(response.status, 503);
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => Response.json(true);
      response = await handler({ request: request(name, data) });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.match(await response.text(), /Fictional QA reply/);
      assert.equal(controls.calls, 1);
      if (name === "discussion") {
        response = await handler({
          request: request(name, { ...data, mode: "companion", userText: "QA" }),
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal((await response.json()).tip, "Fictional QA tip");
        assert.equal(controls.calls, 2);
      }
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
