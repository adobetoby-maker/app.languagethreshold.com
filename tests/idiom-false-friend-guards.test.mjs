import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
const idiom = () => ({
  idiom: "estar en las ___",
  fullIdiom: "estar en las nubes",
  literalGloss: "to be in the clouds",
  figurativeMeaning: "to daydream",
  culturalNote: "Synthetic fixture, not reviewed content.",
  options: ["nubes", "mesas", "casas", "sillas"],
  correctAnswer: "nubes",
  cefr: "A2",
  xp: 999,
});
const friend = () => ({
  word: "embarazada",
  englishLookAlike: "embarrassed",
  contextSentence: "Ella está embarazada.",
  contextTranslation: "She is pregnant.",
  candidateMeaning: "embarrassed",
  isTrueFriend: false,
  actualMeaning: "pregnant",
  trapExplanation: "Synthetic fixture, not reviewed content.",
  cefr: "A2",
  xp: 999,
});
for (const [name, exported, valid, badOutputs] of [
  [
    "idiom-master",
    "generateIdiomQuestion",
    idiom,
    [
      () => ({ ...idiom(), options: [] }),
      () => ({ ...idiom(), options: ["nubes", "NUBES", "mesas", "casas"] }),
      () => ({ ...idiom(), correctAnswer: "absent" }),
      () => ({ ...idiom(), idiom: "estar en las ____" }),
      () => ({ ...idiom(), idiom: "___ en las ___" }),
      () => ({ ...idiom(), fullIdiom: "unrelated phrase" }),
      () => ({ ...idiom(), culturalNote: "" }),
      () => ({ ...idiom(), fullIdiom: "x".repeat(201) }),
      () => ({ ...idiom(), cefr: "C2" }),
    ],
  ],
  [
    "false-friends",
    "generateFalseFriend",
    friend,
    [
      () => ({ ...friend(), isTrueFriend: "false" }),
      () => ({ ...friend(), candidateMeaning: "PREGNANT" }),
      () => ({ ...friend(), word: "x".repeat(121) }),
      () => ({ ...friend(), contextSentence: "" }),
      () => ({ ...friend(), contextTranslation: null }),
      () => ({ ...friend(), trapExplanation: "x".repeat(1001) }),
      () => ({ ...friend(), cefr: "C2" }),
    ],
  ],
])
  test(`${name}: actual paid miss is guarded; invalid question cannot reach the public cache`, async () => {
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
      globalThis.fetch = async () => {
        budgets++;
        return Response.json(true);
      };
      controls.output = valid();
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
        throw Error("Synthetic budget failure");
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
      assert.equal(controls.headers["Cache-Control"], "no-store");
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      assert.equal(controls.callOptions.signal.aborted, false);
      controls.abort.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      controls.abort = new AbortController();
      const beforeWarm = { calls: controls.calls, budgets };
      delete process.env.ANTHROPIC_API_KEY;
      assert.equal((await handler({ data: input })).cached, true);
      assert.equal(controls.calls, beforeWarm.calls);
      assert.equal(budgets, beforeWarm.budgets);
      controls.origin = "https://outside.invalid";
      assert.equal((await handler({ data: input })).data, null);
      assert.equal(controls.status, 403);
      controls.origin = "https://owned-preview.invalid";
      assert.equal((await handler({ data: { ...input, topic: "keyless cache miss" } })).data, null);
      assert.equal(controls.calls, beforeWarm.calls);
      process.env.ANTHROPIC_API_KEY = "fixture-only";
      let sequence = 0;
      for (const bad of [() => null, () => ({}), ...badOutputs]) {
        const data = { ...input, avoid: [`Synthetic miss ${sequence++}`] };
        controls.output = bad();
        assert.equal((await handler({ data })).data, null);
        const before = controls.calls;
        controls.output = valid();
        assert.equal((await handler({ data })).cached, false);
        assert.equal(controls.calls, before + 1);
      }
      if (name === "false-friends") {
        controls.output = {
          ...friend(),
          isTrueFriend: true,
          candidateMeaning: "expecting a child",
        };
        assert.ok(
          (await handler({ data: { ...input, topic: "synonym fixture" } })).data,
          "different true glosses may be synonyms; do not invent a semantic equality rule",
        );
      }
      controls.output = valid();
      for (const patch of [
        { topic: "QA private learner topic" },
        { avoid: ["QA private previous result"] },
        { language: "Spanish private fixture context" },
      ]) {
        const before = controls.calls;
        for (let i = 0; i < 2; i++) {
          const generated = await handler({ data: { ...input, ...patch } });
          assert.equal(generated.cached, false);
          assert.ok(generated.data);
        }
        assert.equal(controls.calls, before + 2);
      }
      assert.equal((await handler({ data: input })).cached, true);
      controls.fail = true;
      const failed = await handler({ data: { ...input, topic: "provider failure fixture" } });
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
