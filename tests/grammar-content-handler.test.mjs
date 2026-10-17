import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
const loaded = await loadPaidFunction("grammar", "generateLessonContent");
const { handler: generateLessonContent, controls } = loaded;
test.after(() => loaded.close());
const base = () => ({
  explanation: "Synthetic QA teaching text.",
  keyRule: "Synthetic QA rule.",
  examples: Array.from({ length: 3 }, () => ({ target: "QA target.", english: "QA translation." })),
});
const request = {
  data: {
    language: "Spanish",
    nativeLanguage: "English",
    level: "A1",
    concept: "Synthetic QA concept",
  },
};
async function withKey(run) {
  const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-no-network",
    SUPABASE_URL: "https://budget.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  globalThis.fetch = async () => Response.json(true);
  try {
    await run();
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}
test("production content handler refuses structurally valid but impossible fixed-stem splits", async () =>
  withKey(async () => {
    controls.output = {
      ...base(),
      morphology: {
        summary: "Synthetic wrong fixed root.",
        base: { word: "ser", root: "s", ending: "er", gloss: "to be" },
        table: [{ form: "tú", root: "s", ending: "eres", full: "eres", english: "you are" }],
      },
    };
    const result = await generateLessonContent(request);
    assert.equal(result.data, null);
    assert.match(result.error, /word forms were inconsistent/);
  }));
test("production content handler accepts complete irregular teaching without a split and exact regular splits", async () =>
  withKey(async () => {
    controls.output = base();
    assert.ok((await generateLessonContent(request)).data);
    controls.output = {
      ...base(),
      morphology: {
        summary: "Synthetic regular pattern.",
        base: { word: "hablar", root: "habl", ending: "ar", gloss: "to speak" },
        table: [{ form: "yo", root: "habl", ending: "o", full: "hablo", english: "I speak" }],
      },
    };
    assert.ok((await generateLessonContent(request)).data);
  }));
