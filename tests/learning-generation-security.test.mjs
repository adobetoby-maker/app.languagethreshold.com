import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLearningGenerationBudget,
  LEARNING_GENERATION_LIMITS,
  HANDWRITING_CHECK_LIMITS,
  CONVERSATION_LIMITS,
  WORD_LOOKUP_LIMITS,
} from "../src/lib/learning-generation-security.ts";

function request(headers = {}) {
  return new Request("https://owned-preview.invalid/_serverFn/generate", {
    method: "POST",
    headers: {
      Origin: "https://owned-preview.invalid",
      "x-vercel-forwarded-for": "192.0.2.37",
      ...headers,
    },
  });
}
async function fixture(run) {
  const oldFetch = globalThis.fetch,
    keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV", "NODE_ENV"],
    saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.SUPABASE_URL = "https://budget-store.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only-never-real";
  process.env.VERCEL_ENV = "preview";
  process.env.NODE_ENV = "production";
  const calls = [],
    buckets = new Map();
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    assert.ok(init.signal);
    const key = body.p_bucket_hash + ":" + body.p_window_seconds;
    const count = (buckets.get(key) || 0) + 1;
    buckets.set(key, count);
    return Response.json(count <= body.p_request_limit);
  };
  try {
    await run({ calls, buckets });
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("same-origin learning requests use durable hashed minute/IP-hour/global-hour budgets", async () =>
  fixture(async ({ calls }) => {
    assert.equal(await checkLearningGenerationBudget(request()), null);
    assert.equal(calls.length, 3);
    assert.deepEqual(
      calls.map((c) => [c.body.p_request_limit, c.body.p_window_seconds]),
      [
        [8, 60],
        [120, 3600],
        [600, 3600],
      ],
    );
    for (const call of calls) {
      assert.equal(call.url, "https://budget-store.invalid/rest/v1/rpc/consume_speaking_request");
      assert.match(call.body.p_bucket_hash, /^[a-f0-9]{64}$/);
      assert.ok(!JSON.stringify(call.body).includes("192.0.2.37"));
    }
    assert.equal(new Set(calls.map((c) => c.body.p_bucket_hash)).size, 3);
  }));
test("short handwriting checks share their own durable allowance without starving lesson creation", async () =>
  fixture(async ({ calls }) => {
    for (let i = 0; i < HANDWRITING_CHECK_LIMITS.minute; i++)
      assert.equal(await checkLearningGenerationBudget(request(), "handwriting"), null);
    const before = calls.length;
    const rejected = await checkLearningGenerationBudget(request(), "handwriting");
    assert.equal(rejected.status, 429);
    assert.equal(rejected.retryAfter, 60);
    assert.equal(calls.length, before + 1);
    assert.deepEqual(
      calls.slice(0, 3).map((c) => [c.body.p_request_limit, c.body.p_window_seconds]),
      [
        [30, 60],
        [600, 3600],
        [1200, 3600],
      ],
    );
    assert.equal(await checkLearningGenerationBudget(request()), null);
    assert.equal(calls.at(-3).body.p_request_limit, 8);
    assert.notEqual(calls[0].body.p_bucket_hash, calls.at(-3).body.p_bucket_hash);
  }));
test("handwriting hourly budgets deny further paid checks independently of per-minute resets", async () =>
  fixture(async () => {
    for (const rejectLimit of [
      HANDWRITING_CHECK_LIMITS.ipHour,
      HANDWRITING_CHECK_LIMITS.globalHour,
    ]) {
      globalThis.fetch = async (_, init) =>
        Response.json(JSON.parse(init.body).p_request_limit !== rejectLimit);
      const denied = await checkLearningGenerationBudget(request(), "handwriting");
      assert.equal(denied.status, 429);
      assert.equal(denied.retryAfter, 3600);
    }
  }));
test("conversation minute and hourly bounds are independent of handwriting and content", async () =>
  fixture(async ({ calls }) => {
    assert.deepEqual(CONVERSATION_LIMITS, { minute: 30, ipHour: 300, globalHour: 600 });
    for (let i = 0; i < CONVERSATION_LIMITS.minute; i++)
      assert.equal(await checkLearningGenerationBudget(request(), "conversation"), null);
    assert.equal((await checkLearningGenerationBudget(request(), "conversation")).status, 429);
    assert.equal(await checkLearningGenerationBudget(request(), "handwriting"), null);
    const handwritingHash = calls.at(-3).body.p_bucket_hash;
    assert.equal(await checkLearningGenerationBudget(request()), null);
    assert.equal(
      new Set([calls[0].body.p_bucket_hash, handwritingHash, calls.at(-3).body.p_bucket_hash]).size,
      3,
    );
    for (const limit of [300, 600]) {
      globalThis.fetch = async (_, init) =>
        Response.json(JSON.parse(init.body).p_request_limit !== limit);
      const denied = await checkLearningGenerationBudget(request(), "conversation");
      assert.equal(denied.status, 429);
      assert.equal(denied.retryAfter, 3600);
    }
  }));
test("lookup request bounds are independent of the content and conversation pools", async () =>
  fixture(async ({ calls }) => {
    assert.deepEqual(WORD_LOOKUP_LIMITS, { minute: 40, ipHour: 600, globalHour: 1200 });
    for (let i = 0; i < 40; i++)
      assert.equal(await checkLearningGenerationBudget(request(), "lookup"), null);
    assert.equal((await checkLearningGenerationBudget(request(), "lookup")).status, 429);
    const hash = calls[0].body.p_bucket_hash;
    assert.equal(await checkLearningGenerationBudget(request(), "conversation"), null);
    assert.notEqual(hash, calls.at(-3).body.p_bucket_hash);
    assert.equal(await checkLearningGenerationBudget(request()), null);
    assert.notEqual(hash, calls.at(-3).body.p_bucket_hash);
  }));
test("separate requests share the persisted allowance and the ninth minute request is rejected", async () =>
  fixture(async ({ calls }) => {
    for (let i = 0; i < LEARNING_GENERATION_LIMITS.minute; i++)
      assert.equal(await checkLearningGenerationBudget(request()), null);
    const count = calls.length,
      result = await checkLearningGenerationBudget(request());
    assert.equal(result.status, 429);
    assert.equal(result.retryAfter, 60);
    assert.equal(calls.length, count + 1);
  }));
test("cross-origin, absent origin and caller forwarding fallbacks cannot spend a budget", async () =>
  fixture(async ({ calls }) => {
    assert.equal(
      (await checkLearningGenerationBudget(request({ Origin: "https://outside.invalid" }))).status,
      403,
    );
    const absent = request();
    absent.headers.delete("Origin");
    assert.equal((await checkLearningGenerationBudget(absent)).status, 403);
    const forged = request({
      "x-vercel-forwarded-for": "not-an-ip",
      "x-forwarded-for": "192.0.2.90",
      "x-real-ip": "192.0.2.90",
    });
    assert.equal((await checkLearningGenerationBudget(forged)).status, 503);
    assert.equal(calls.length, 0);
  }));
test("IP and global hourly limits fail closed with an hourly retry message", async () =>
  fixture(async () => {
    for (const rejectedLimit of [120, 600]) {
      const calls = [];
      globalThis.fetch = async (_, init) => {
        const body = JSON.parse(init.body);
        calls.push(body);
        return Response.json(body.p_request_limit !== rejectedLimit);
      };
      const denial = await checkLearningGenerationBudget(request());
      assert.equal(denial.status, 429);
      assert.equal(denial.retryAfter, 3600);
      assert.match(denial.error, /hour/);
      assert.equal(calls.length, rejectedLimit === 120 ? 2 : 3);
    }
  }));
test("budget storage errors, invalid JSON, aborted network and missing credentials never allow generation", async () =>
  fixture(async () => {
    for (const fail of [
      async () => new Response("unavailable", { status: 503 }),
      async () => new Response("invalid"),
      async () => {
        throw Error("fixture abort");
      },
    ]) {
      globalThis.fetch = fail;
      assert.equal((await checkLearningGenerationBudget(request())).status, 503);
    }
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal((await checkLearningGenerationBudget(request())).status, 503);
  }));
test("preview and production have different counters; plain production hosts require a platform IP", async () =>
  fixture(async ({ calls }) => {
    await checkLearningGenerationBudget(request());
    const preview = calls.map((c) => c.body.p_bucket_hash);
    process.env.VERCEL_ENV = "production";
    await checkLearningGenerationBudget(request());
    assert.ok(calls.slice(3).every((c) => !preview.includes(c.body.p_bucket_hash)));
    const noIp = request();
    noIp.headers.delete("x-vercel-forwarded-for");
    assert.equal((await checkLearningGenerationBudget(noIp)).status, 503);
  }));
