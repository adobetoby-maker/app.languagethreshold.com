import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
const vocab = (n) => ({
  items: Array.from({ length: n }, (_, index) => ({
    word: `qa-${index}`,
    translation: `meaning-${index}`,
    category: "job",
    correctCount: 999,
    moduleId: "forged",
  })),
});
for (const [name, exported, field, input, output, limit] of [
  [
    "build-vocab",
    "buildPersonalVocab",
    "vocab",
    { language: "Spanish", answers: ["Synthetic job"], count: 5 },
    vocab(5),
    8,
  ],
  [
    "phrase-translate",
    "translatePhrases",
    "phrases",
    { targetLanguage: "Italian", phrases: ["Water", "Call me"], context: "QA" },
    {
      translations: [
        { english: "Call me", translation: "Chiamami", extra: "omit" },
        { english: "Water", translation: "Acqua" },
      ],
    },
    40,
  ],
  [
    "kana-convert",
    "convertKana",
    "result",
    { text: "にほんご", targetScript: "kanji-mixed" },
    {
      output: "日本語",
      breakdown: [
        { original: "にほんご", reading: "にほんご", meaning: "Japanese", extra: "omit" },
      ],
      privateExtra: "omit",
    },
    40,
  ],
])
  test(`${name}: actual handler fails closed before paid work and returns bounded whitelisted practice`, async () => {
    const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
      saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
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
      let budgets = 0,
        logged = "";
      console.error = (...values) => {
        logged += values.join(" ");
      };
      controls.output = output;
      globalThis.fetch = async () => {
        budgets++;
        return Response.json(true);
      };
      for (const origin of [null, "https://outside.invalid"]) {
        controls.origin = origin;
        assert.equal((await handler({ data: input }))[field], null);
        assert.equal(controls.status, 403);
      }
      assert.equal(budgets, 0);
      assert.equal(controls.constructed, 0);
      controls.origin = "https://owned-preview.invalid";
      globalThis.fetch = async (_, init) => {
        budgets++;
        assert.equal(JSON.parse(init.body).p_request_limit, limit);
        return Response.json(false);
      };
      assert.equal((await handler({ data: input }))[field], null);
      assert.equal(controls.status, 429);
      assert.equal(controls.headers["Retry-After"], "60");
      assert.equal(controls.constructed, 0);
      globalThis.fetch = async () => {
        throw Error("Synthetic budget outage");
      };
      await handler({ data: input });
      assert.equal(controls.status, 503);
      assert.equal(controls.constructed, 0);
      globalThis.fetch = async () => Response.json(true);
      controls.status = 200;
      const result = await handler({ data: input });
      assert.equal(result.error, null);
      assert.ok(result[field]);
      assert.equal(controls.calls, 1);
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      assert.equal(controls.callOptions.signal.aborted, false);
      controls.abort.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      controls.abort = new AbortController();
      assert.equal(controls.headers["Cache-Control"], "no-store");
      if (name === "build-vocab") {
        assert.ok(
          result.vocab.every((item) => item.correctCount === 0 && item.moduleId === undefined),
        );
        assert.equal(controls.body.tools[0].input_schema.properties.items.minItems, 5);
        assert.equal(controls.body.tools[0].input_schema.properties.items.maxItems, 5);
        assert.ok(!controls.body.system.includes("exactly 25"));
        for (const bad of [
          vocab(4),
          { items: Array.from({ length: 5 }, () => vocab(1).items[0]) },
          { items: vocab(5).items.map((item) => ({ ...item, category: "invalid" })) },
        ]) {
          controls.output = bad;
          assert.equal((await handler({ data: input })).vocab, null);
        }
        controls.output = vocab(5);
        assert.equal((await handler({ data: { ...input, avoid: ["QA-0"] } })).vocab, null);
        assert.throws(() => handler({ data: { ...input, count: 5.5 } }));
        controls.output = vocab(15);
        assert.equal((await handler({ data: { ...input, count: 15 } })).vocab.length, 15);
        assert.equal(controls.body.tools[0].input_schema.properties.items.minItems, 15);
      } else if (name === "phrase-translate") {
        assert.deepEqual(result.phrases, [
          { english: "Water", translation: "Acqua" },
          { english: "Call me", translation: "Chiamami" },
        ]);
        for (const bad of [
          { translations: output.translations.slice(0, 1) },
          { translations: output.translations.map((pair) => ({ ...pair, english: "Invented" })) },
          {
            translations: output.translations.map((pair) => ({ ...pair, translation: "Italian" })),
          },
          {
            translations: output.translations.map((pair) => ({
              ...pair,
              translation: "x".repeat(1001),
            })),
          },
        ]) {
          controls.output = bad;
          assert.equal((await handler({ data: input })).phrases, null);
        }
        controls.output = {
          translations: [
            { english: "Water", translation: "Acqua" },
            { english: "Water", translation: "Acqua" },
          ],
        };
        assert.equal(
          (await handler({ data: { ...input, phrases: ["Water", "Water"] } })).phrases.length,
          2,
        );
      } else {
        assert.deepEqual(result.result, {
          output: "日本語",
          breakdown: [{ original: "にほんご", reading: "にほんご", meaning: "Japanese" }],
        });
        for (const bad of [
          { output: "", breakdown: [] },
          { output: "日本語", breakdown: "invalid" },
          {
            output: "日本語",
            breakdown: [{ original: "にほんご", reading: "にほんご", meaning: "x".repeat(501) }],
          },
        ]) {
          controls.output = bad;
          assert.equal((await handler({ data: input })).result, null);
        }
      }
      controls.fail = true;
      const failed = await handler({ data: input });
      assert.equal(failed[field], null);
      assert.ok(!failed.error.includes("PRIVATE"));
      assert.ok(!logged.includes("PRIVATE"));
      const before = controls.constructed;
      delete process.env.ANTHROPIC_API_KEY;
      assert.equal((await handler({ data: input }))[field], null);
      assert.equal(controls.constructed, before);
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
