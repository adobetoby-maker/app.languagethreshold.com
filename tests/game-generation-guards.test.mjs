import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
const board = (count = 6) => ({
  pairs: Array.from({ length: count }, (_, i) => ({
    target: `palabra-${i}`,
    english: `meaning-${i}`,
    xp: 999,
  })),
  topic: "Synthetic QA",
  cefr: "A2",
  xp: 999,
});
const question = () => ({
  phrase: "QA escucho uno.",
  englishTranslation: "QA I hear one.",
  cefr: "A2",
  topic: "Synthetic QA",
  options: ["QA escucho dos.", "QA escucho uno.", "QA escucho tres.", "QA escucho seis."],
  correctIndex: 0,
  listenFor: "Listen for the number.",
  xp: 999,
});
for (const [name, exported, valid, invalid] of [
  [
    "word-match",
    "generateWordMatchBoard",
    board,
    [
      () => ({ ...board(), pairs: board().pairs.slice(1) }),
      () => ({ ...board(), pairs: board().pairs.map((x) => ({ ...x, target: "same" })) }),
      () => ({ ...board(), pairs: board().pairs.map((x) => ({ ...x, english: "same" })) }),
      () => ({ ...board(), pairs: board().pairs.map((x) => ({ ...x, target: "x".repeat(161) })) }),
      () => ({ ...board(), topic: "" }),
      () => ({ ...board(), cefr: "C2" }),
    ],
  ],
  [
    "listening-drill",
    "generateListeningDrill",
    question,
    [
      () => ({ ...question(), options: [] }),
      () => ({ ...question(), options: question().options.map(() => question().phrase) }),
      () => ({ ...question(), phrase: "Absent from options" }),
      () => ({ ...question(), correctIndex: 0.5 }),
      () => ({ ...question(), englishTranslation: "x".repeat(1001) }),
      () => ({ ...question(), listenFor: "" }),
      () => ({ ...question(), cefr: "C2" }),
    ],
  ],
])
  test(`${name}: actual handler guards paid misses, preserves safe warm reuse and validates output`, async () => {
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
      loaded = await loadPaidFunction(name, exported);
      const { handler, controls } = loaded;
      const input = { language: "Spanish", level: 1 };
      let budgets = 0,
        logged = "";
      console.error = (...values) => {
        logged += values.join(" ");
      };
      controls.output = valid();
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
        budgets++;
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
      assert.ok(!JSON.stringify(result.data).includes("999"));
      if (name === "listening-drill") assert.equal(result.data.correctIndex, 1);
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      controls.abort.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      controls.abort = new AbortController();
      assert.equal(controls.headers["Cache-Control"], "no-store");
      const beforeWarm = { calls: controls.calls, budgets };
      delete process.env.ANTHROPIC_API_KEY;
      const warm = await handler({ data: input });
      assert.equal(warm.cached, true);
      assert.equal(controls.calls, beforeWarm.calls);
      assert.equal(budgets, beforeWarm.budgets);
      controls.origin = "https://outside.invalid";
      assert.equal((await handler({ data: input })).data, null);
      assert.equal(controls.status, 403);
      controls.origin = "https://owned-preview.invalid";
      process.env.ANTHROPIC_API_KEY = "fixture-only";
      let seq = 0;
      for (const bad of [() => null, () => ({}), ...invalid]) {
        const data = { ...input, avoid: [`synthetic-miss-${seq++}`] };
        controls.output = bad();
        assert.equal((await handler({ data })).data, null);
        const before = controls.calls;
        controls.output = valid();
        assert.ok((await handler({ data })).data);
        assert.equal(controls.calls, before + 1, "invalid output must never populate cache");
      }
      if (name === "word-match") {
        controls.output = board(8);
        assert.equal(
          (await handler({ data: { ...input, level: 2 } })).data,
          null,
          "wrong requested CEFR is rejected",
        );
        controls.output = { ...board(8), cefr: "B1" };
        assert.equal((await handler({ data: { ...input, level: 2 } })).data.pairs.length, 8);
        controls.output = { ...board(10), cefr: "B2" };
        assert.equal((await handler({ data: { ...input, level: 3 } })).data.pairs.length, 10);
        controls.output = board();
        const privateInput = { ...input, userWords: ["QA-private"] };
        const before = controls.calls;
        await handler({ data: privateInput });
        await handler({ data: privateInput });
        assert.equal(
          controls.calls,
          before + 2,
          "personal vocabulary must not read or write shared cache",
        );
      }
      controls.fail = true;
      const failed = await handler({ data: { ...input, avoid: ["failed-request"] } });
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
