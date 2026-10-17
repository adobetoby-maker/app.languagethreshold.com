import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";

test("daily story: actual handler bounds paid requests and refuses missing or unsupported exercise fields", async () => {
  const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch,
    savedLog = console.error;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-only",
    SUPABASE_URL: "https://budget.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  let loaded;
  try {
    loaded = await loadPaidFunction("daily-story", "generateDailyStory");
    const { handler, controls } = loaded;
    const input = {
      language: "Spanish",
      level: "A1",
      vocabWords: ["café"],
      patternName: "",
      patternFormula: "",
      nativeLanguage: "English",
    };
    const output = {
      story: "QA: Ana pide café.",
      vocabHighlights: ["café"],
      comprehensionQ: "What does Ana order?",
      correctAnswer: "café",
      translation: "QA: Ana orders coffee.",
      xp: 999,
      privateExtra: "omit",
    };
    let budgets = 0,
      logged = "";
    console.error = (...values) => {
      logged += values.join(" ");
    };
    globalThis.fetch = async () => {
      budgets++;
      return Response.json(true);
    };
    controls.output = output;
    for (const origin of [null, "https://outside.invalid"]) {
      controls.origin = origin;
      assert.equal((await handler({ data: input })).data, null);
      assert.equal(controls.status, 403);
    }
    assert.equal(budgets, 0);
    assert.equal(controls.constructed, 0);
    controls.origin = "https://owned-preview.invalid";
    globalThis.fetch = async (_, init) => {
      assert.equal(JSON.parse(init.body).p_request_limit, 8);
      return Response.json(false);
    };
    assert.equal((await handler({ data: input })).data, null);
    assert.equal(controls.status, 429);
    assert.equal(controls.headers["Retry-After"], "60");
    assert.equal(controls.constructed, 0);
    globalThis.fetch = async () => {
      throw Error("Synthetic budget outage");
    };
    assert.equal((await handler({ data: input })).data, null);
    assert.equal(controls.status, 503);
    assert.equal(controls.constructed, 0);
    globalThis.fetch = async () => Response.json(true);
    const result = await handler({ data: input });
    assert.equal(result.error, null);
    assert.ok(result.data);
    assert.equal(result.data.xp, undefined);
    assert.equal(result.data.privateExtra, undefined);
    assert.equal(controls.headers["Cache-Control"], "no-store");
    assert.equal(controls.options.maxRetries, 0);
    assert.equal(controls.options.timeout, 30_000);
    assert.equal(controls.callOptions.signal.aborted, false);
    controls.abort.abort();
    assert.equal(controls.callOptions.signal.aborted, true);
    controls.abort = new AbortController();
    for (const bad of [
      null,
      {},
      { ...output, story: "" },
      { ...output, story: "x".repeat(6001) },
      { ...output, translation: "" },
      { ...output, comprehensionQ: "x".repeat(1001) },
      { ...output, correctAnswer: "absent" },
      { ...output, vocabHighlights: ["absent"] },
      { ...output, vocabHighlights: ["café", "CAFÉ"] },
      { ...output, vocabHighlights: "invalid" },
    ]) {
      controls.output = bad;
      assert.equal((await handler({ data: input })).data, null);
    }
    controls.output = { ...output, vocabHighlights: [], correctAnswer: "CAFE\u0301" };
    assert.ok((await handler({ data: input })).data);
    controls.fail = true;
    const failed = await handler({ data: input });
    assert.equal(failed.data, null);
    assert.equal(failed.error, "Story generation failed.");
    assert.ok(!logged.includes("PRIVATE"));
    const before = controls.constructed;
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal((await handler({ data: input })).data, null);
    assert.equal(controls.constructed, before);
    assert.throws(() => handler({ data: { ...input, vocabWords: Array(11).fill("QA") } }));
  } finally {
    globalThis.fetch = savedFetch;
    console.error = savedLog;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    loaded?.close();
  }
});
