import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";

test("conjugation: actual two-call path shares one deadline, fails closed and never caches a cancelled or rejected item", async () => {
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
    loaded = await loadPaidFunction("conjugation", "generateConjugationQuestion");
    const { handler, controls } = loaded;
    const input = { language: "Spanish", level: 1, axis: "person" };
    const question = {
      phrase: "Yo ___ cada día.",
      phraseTranslation: "I [verb] every day.",
      infinitive: "hablar",
      infinitiveTranslation: "to speak",
      correctConjugation: "hablo",
      wrongOptions: ["hablas", "hablamos", "hablan"],
      explanation: "Synthetic QA explanation.",
      axisTested: "person",
      cefr: "A2",
      xp: 999,
    };
    const review = {
      acceptableAnswers: ["hablo"],
      unambiguous: true,
      explanationAccurate: true,
      axisAccurate: true,
      levelAppropriate: true,
    };
    controls.outputByTool = {
      return_conjugation_question: question,
      review_conjugation_question: review,
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
    globalThis.fetch = async () => {
      budgets++;
      return Response.json(true);
    };
    const result = await handler({ data: input });
    assert.equal(result.error, null);
    assert.equal(result.cached, false);
    assert.equal(result.data.xp, undefined);
    assert.equal(controls.calls, 2);
    assert.equal(controls.options.maxRetries, 0);
    assert.equal(controls.options.timeout, 30_000);
    assert.equal(controls.headers["Cache-Control"], "no-store");
    assert.equal(
      controls.requests[0].options.signal,
      controls.requests[1].options.signal,
      "the review must not restart the total deadline",
    );
    const reviewItem = JSON.parse(controls.requests[1].body.messages[0].content);
    assert.equal(reviewItem.correctConjugation, undefined);
    assert.equal(reviewItem.correctIndex, undefined);
    const beforeWarm = { calls: controls.calls, budgets };
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal((await handler({ data: input })).cached, true);
    assert.equal(controls.calls, beforeWarm.calls);
    assert.equal(budgets, beforeWarm.budgets);
    controls.origin = "https://outside.invalid";
    assert.equal((await handler({ data: input })).data, null);
    assert.equal(controls.status, 403);
    controls.origin = "https://owned-preview.invalid";
    process.env.ANTHROPIC_API_KEY = "fixture-only";
    const personal = { ...input, userWords: ["QA-private"] };
    const beforePersonal = controls.calls;
    await handler({ data: personal });
    await handler({ data: personal });
    assert.equal(controls.calls, beforePersonal + 4);
    let sequence = 0;
    for (const patch of [
      { cefr: "C2" },
      { axisTested: "tense" },
      { wrongOptions: ["hablo", "hablas", "hablan"] },
    ]) {
      const data = { ...input, avoid: [`invalid-${sequence++}`] },
        before = controls.calls;
      controls.outputByTool.return_conjugation_question = { ...question, ...patch };
      assert.equal((await handler({ data })).data, null);
      assert.equal(controls.calls, before + 1, "invalid draft must not invoke the review");
      controls.outputByTool.return_conjugation_question = question;
      assert.equal((await handler({ data })).cached, false);
      assert.equal(controls.calls, before + 3, "invalid draft must not seed cache");
    }
    controls.outputByTool.review_conjugation_question = {
      ...review,
      acceptableAnswers: ["hablas"],
    };
    const rejectedInput = { ...input, topic: "rejected review" };
    assert.equal((await handler({ data: rejectedInput })).data, null);
    controls.outputByTool.review_conjugation_question = review;
    assert.equal((await handler({ data: rejectedInput })).cached, false);
    for (const cancelledTool of ["return_conjugation_question", "review_conjugation_question"]) {
      const data = { ...input, topic: cancelledTool },
        before = controls.calls;
      controls.beforeReturn = (body) => {
        if (body.tool_choice.name === cancelledTool) controls.abort.abort();
      };
      assert.equal((await handler({ data })).data, null);
      assert.equal(
        controls.calls,
        before + (cancelledTool === "return_conjugation_question" ? 1 : 2),
      );
      controls.beforeReturn = null;
      controls.abort = new AbortController();
      assert.equal(
        (await handler({ data })).cached,
        false,
        "cancelled result must not seed cache even if a transport returns after abort",
      );
    }
    controls.failOnTool = "review_conjugation_question";
    const failed = await handler({ data: { ...input, topic: "provider failure" } });
    assert.equal(failed.data, null);
    assert.equal(failed.error, "Generation failed.");
    assert.ok(!logged.includes("PRIVATE"));
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
