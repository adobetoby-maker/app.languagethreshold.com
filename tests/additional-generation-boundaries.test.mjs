import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
mkdirSync("node_modules/.cache", { recursive: true });
const person = Object.fromEntries(
  [
    "firstSingular",
    "secondSingular",
    "thirdSingular",
    "firstPlural",
    "secondPlural",
    "thirdPlural",
  ].map((key, i) => [key, `synthetic-form-${i}`]),
);
const fixtures = [
  {
    name: "battle",
    exported: "generateBattleWord",
    input: { language: "Spanish", round: 1, cefr: "A2" },
    output: {
      word: "techo",
      correctDefinition: "roof",
      wrongDefinitions: ["window", "floor", "door"],
    },
    malformed: (value) => {
      value.wrongDefinitions[0] = "ROOF";
    },
  },
  {
    name: "pattern-drill",
    exported: "generatePatternDrill",
    input: {
      language: "Spanish",
      patternId: "fixture",
      patternName: "Synthetic pattern",
      patternFormula: "Subject + verb",
      count: 2,
      userVocabWords: ["private-fixture-A"],
    },
    output: {
      items: [0, 1].map((i) => ({
        prompt: `Synthetic prompt ${i}`,
        answer: `Synthetic answer ${i}`,
        hint: "Synthetic structural hint",
      })),
    },
    malformed: (value) => {
      value.items.pop();
    },
  },
  {
    name: "sentence-build",
    exported: "generateSentenceBuilder",
    input: { language: "Spanish", level: 1, topic: "private-fixture-A", avoid: [] },
    output: {
      targetSentence: "Yo trabajo en casa.",
      englishTranslation: "I work at home.",
      tokens: ["Yo", "trabajo", "en", "casa."],
      scrambled: ["en", "casa.", "trabajo", "Yo"],
      topic: "Synthetic work",
      cefr: "A2",
      explanation: "Synthetic explanation.",
    },
    malformed: (value) => {
      value.targetSentence = "Different source sentence.";
    },
  },
  {
    name: "verb-conjugation",
    exported: "generateVerbConjugation",
    input: { language: "Spanish", infinitive: "qa-verb", english: "private-fixture-A" },
    output: {
      infinitive: "qa-verb",
      pronunciation: "Synthetic guide",
      presentTense: person,
      pastTense: person,
      futureTense: person,
      conditionalTense: person,
      gerund: "synthetic-gerund",
      pastParticiple: "synthetic-participle",
      perfectExample: "Synthetic phrase",
      commonUses: [0, 1].map((i) => ({
        phrase: `Synthetic phrase ${i}`,
        translation: `Synthetic translation ${i}`,
      })),
    },
    malformed: (value) => {
      value.infinitive = "different-verb";
    },
  },
];
async function withHandler(f, run) {
  const names = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
    saved = names.map((name) => process.env[name]),
    originalFetch = globalThis.fetch,
    originalLog = console.error;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-only",
    SUPABASE_URL: "https://budget.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  globalThis.fetch = async () => Response.json(true);
  console.error = () => {};
  let loaded;
  try {
    loaded = await loadPaidFunction(f.name, f.exported);
    loaded.controls.output = structuredClone(f.output);
    await run(loaded);
  } finally {
    loaded?.close();
    globalThis.fetch = originalFetch;
    console.error = originalLog;
    names.forEach((name, i) =>
      saved[i] === undefined ? delete process.env[name] : (process.env[name] = saved[i]),
    );
  }
}
for (const f of fixtures) {
  test(`${f.name}: actual origin/no-store/durable-budget guards precede any provider use`, async () =>
    withHandler(f, async ({ handler, controls }) => {
      let budgets = 0;
      globalThis.fetch = async () => {
        budgets++;
        return Response.json(true);
      };
      for (const origin of [null, "https://outside.invalid"]) {
        controls.origin = origin;
        assert.equal((await handler({ data: f.input })).data, null);
        assert.equal(controls.status, 403);
      }
      assert.equal(budgets, 0);
      assert.equal(controls.constructed, 0);
      assert.equal(controls.headers["Cache-Control"], "no-store");
      controls.origin = "https://owned-preview.invalid";
      globalThis.fetch = async () => Response.json(false);
      assert.equal((await handler({ data: f.input })).data, null);
      assert.equal(controls.status, 429);
      assert.equal(controls.headers["Retry-After"], "60");
      globalThis.fetch = async () => {
        throw Error("Synthetic budget outage");
      };
      assert.equal((await handler({ data: f.input })).data, null);
      assert.equal(controls.status, 503);
      assert.equal(controls.constructed, 0);
      globalThis.fetch = async () => Response.json(true);
      const result = await handler({ data: f.input });
      assert.equal(result.error, null);
      assert.ok(result.data);
      assert.equal(controls.calls, 1);
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      assert.ok(controls.callOptions.signal instanceof AbortSignal);
    }));
  test(`${f.name}: bounded output validation rejects incomplete/wrong-context payloads and strips extra fields`, async () =>
    withHandler(f, async ({ handler, controls }) => {
      const bad = structuredClone(f.output);
      f.malformed(bad);
      controls.output = bad;
      assert.equal((await handler({ data: f.input })).data, null);
      controls.output = {
        ...structuredClone(f.output),
        xp: 999,
        privateProviderDetail: "must-not-return",
      };
      const result = await handler({ data: f.input });
      assert.equal(result.error, null);
      assert.equal(result.data.xp, undefined);
      assert.equal(result.data.privateProviderDetail, undefined);
      controls.output = {};
      assert.equal((await handler({ data: f.input })).data, null);
      controls.fail = true;
      let logged = "";
      console.error = (...values) => {
        logged += values.join(" ");
      };
      assert.match((await handler({ data: f.input })).error, /^(Request|Generation) failed\.$/);
      assert.equal(logged.includes("PRIVATE"), false);
    }));
  test(`${f.name}: cancelled incoming request and late provider completion cannot return generated content`, async () =>
    withHandler(f, async ({ handler, controls }) => {
      let budgets = 0;
      globalThis.fetch = async () => {
        budgets++;
        return Response.json(true);
      };
      controls.abort.abort();
      assert.equal((await handler({ data: f.input })).data, null);
      assert.equal(controls.constructed, 0);
      assert.equal(budgets, 0);
      controls.abort = new AbortController();
      controls.beforeReturn = async () => {
        controls.abort.abort();
      };
      assert.equal((await handler({ data: f.input })).data, null);
      assert.equal(controls.calls, 1);
    }));
}
for (const f of fixtures.filter((f) => ["sentence-build", "verb-conjugation"].includes(f.name)))
  test(`${f.name}: arbitrary private inputs/results never enter cross-request process caches`, async () =>
    withHandler(f, async ({ handler, controls }) => {
      assert.equal((await handler({ data: f.input })).error, null);
      controls.output = structuredClone(f.output);
      if (f.name === "sentence-build") {
        controls.output.targetSentence = "Yo camino en casa.";
        controls.output.tokens = ["Yo", "camino", "en", "casa."];
        controls.output.scrambled = ["en", "Yo", "casa.", "camino"];
      } else controls.output.perfectExample = "Different private fixture B";
      const inputB = { ...f.input, topic: undefined, english: "private-fixture-B" };
      const result = await handler({ data: inputB });
      assert.equal(result.error, null);
      assert.equal(controls.calls, 2);
      assert.notDeepEqual(result.data, f.output);
      await handler({ data: f.input });
      assert.equal(controls.calls, 3);
    }));

test("all four single-call handlers reject results arriving after their total thirty-second signal expires", async () => {
  const timeout = AbortSignal.timeout;
  try {
    for (const f of fixtures) {
      const deadline = new AbortController();
      let requested;
      AbortSignal.timeout = (milliseconds) => {
        if (milliseconds !== 30_000) return timeout(milliseconds);
        requested = milliseconds;
        return deadline.signal;
      };
      await withHandler(f, async ({ handler, controls }) => {
        controls.beforeReturn = async () => {
          deadline.abort();
        };
        assert.equal((await handler({ data: f.input })).data, null);
        assert.equal(requested, 30_000);
        assert.equal(controls.callOptions.signal.aborted, true);
        assert.equal(controls.calls, 1);
      });
    }
  } finally {
    AbortSignal.timeout = timeout;
  }
});
