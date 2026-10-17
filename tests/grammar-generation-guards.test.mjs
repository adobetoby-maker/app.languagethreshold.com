import assert from "node:assert/strict";
import test from "node:test";
import { loadPaidFunction } from "./helpers/paid-function-fixture.mjs";
const titles = () => ({
  lessons: Array.from({ length: 6 }, (_, i) => ({
    id: `lesson-${i}`,
    title: `QA ${i}`,
    concept: `QA concept ${i}`,
    xp: 999,
  })),
});
const content = () => ({
  explanation: "Synthetic explanation",
  examples: Array.from({ length: 3 }, () => ({ target: "QA", english: "QA translation" })),
  keyRule: "QA rule",
  privateExtra: "omit",
});
const quiz = () => ({
  questions: [
    {
      type: "multiple_choice",
      question: "QA choice",
      options: ["uno", "dos", "tres"],
      answer: "dos",
      explanation: "QA explanation",
      xp: 999,
    },
    { type: "fill_blank", question: "QA ___", answer: "uno", explanation: "QA explanation" },
    { type: "fill_blank", question: "QA ___", answer: "dos", explanation: "QA explanation" },
  ],
});
for (const [name, input, valid, invalid] of [
  [
    "generateLessonTitles",
    { language: "Spanish", level: "A1" },
    titles,
    [
      () => ({ lessons: titles().lessons.slice(1) }),
      () => ({ lessons: titles().lessons.map((x) => ({ ...x, id: "same" })) }),
      () => ({ lessons: titles().lessons.map((x) => ({ ...x, concept: "x".repeat(201) })) }),
    ],
  ],
  [
    "generateLessonContent",
    { language: "Spanish", level: "A1", concept: "QA" },
    content,
    [
      () => ({ ...content(), examples: [] }),
      () => ({ ...content(), explanation: "x".repeat(12001) }),
      () => ({ ...content(), morphology: { summary: "QA", base: {}, table: [] } }),
    ],
  ],
  [
    "generateLessonQuiz",
    { language: "Spanish", concept: "QA" },
    quiz,
    [
      () => ({ questions: [] }),
      () => ({ questions: quiz().questions.map((x) => ({ ...x, answer: "absent" })) }),
      () => ({
        questions: quiz().questions.map((x) =>
          x.type === "multiple_choice" ? { ...x, options: ["uno", "¡Uno!", "dos"] } : x,
        ),
      }),
      () => ({ questions: quiz().questions.map((x) => ({ ...x, question: "missing blank" })) }),
      () => ({ questions: quiz().questions.map((x) => ({ ...x, explanation: "x".repeat(2001) })) }),
    ],
  ],
])
  test(`${name}: actual handler bounds paid requests and rejects unusable model practice`, async () => {
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
      loaded = await loadPaidFunction("grammar", name);
      const { handler, controls } = loaded;
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
      globalThis.fetch = async () => Response.json(true);
      const result = await handler({ data: input });
      assert.equal(result.error, null);
      assert.ok(result.data);
      assert.ok(!JSON.stringify(result.data).includes("999"));
      assert.equal(result.data.privateExtra, undefined);
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      assert.equal(controls.callOptions.signal.aborted, false);
      controls.abort.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      controls.abort = new AbortController();
      assert.equal(controls.headers["Cache-Control"], "no-store");
      for (const bad of invalid) {
        controls.output = bad();
        assert.equal((await handler({ data: input })).data, null);
      }
      controls.fail = true;
      assert.equal((await handler({ data: input })).error, "Request failed.");
      assert.ok(!logged.includes("PRIVATE"));
      const before = controls.constructed;
      delete process.env.ANTHROPIC_API_KEY;
      assert.equal((await handler({ data: input })).data, null);
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
