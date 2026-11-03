import assert from "node:assert/strict";
import { test } from "node:test";
import {
  placementBlocks,
  placementBlockScore,
  placementResult,
  placementCorrect,
  placementCloze,
} from "../src/lib/module-placement.ts";
import { applyPlacementCredit } from "../src/lib/module-placement-credit.ts";
import { mergeCore30Log } from "../src/lib/core30-plan.ts";
import { core30ScopeKey } from "../src/lib/core30-scope.ts";

const lessons = Array.from({ length: 15 }, (_, i) => ({
  moduleId: i < 10 ? "foundation-demo" : "demo",
  stage: i < 10 ? "foundation" : "core",
  n: i < 10 ? i + 1 : i - 9,
  title: `Lesson ${i + 1}`,
  words: ["one", "two", "three", "four"].map((w, j) => ({
    en: `${w} ${i}`,
    es: `palabra ${i} ${j}`,
    kind: "phrase",
  })),
  checks: [{ prompt: `Yo ____ ${i}.`, hint: `I speak ${i}.`, answer: "hablo" }],
}));
const blocks = placementBlocks(lessons, "test-seed");
const answers = (bs) =>
  Object.fromEntries(bs.flatMap((b) => b.questions.map((q) => [q.id, q.answer])));
test("checks cover every lesson and keep stage-local numbers, stable draw and shuffled options", () => {
  assert.equal(blocks.length, 3);
  assert.equal(blocks.flatMap((b) => b.questions).length, 30);
  assert.equal(blocks[2].lessons[0].n, 1);
  assert.deepEqual(placementBlocks(lessons, "test-seed"), blocks);
  assert.notDeepEqual(placementBlocks(lessons, "other-seed"), blocks);
  for (const b of blocks)
    for (const q of b.questions.filter((q) => q.type === "choice")) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.options.includes(q.answer));
    }
});
test("incomplete block cannot pass and supplies no credit", () => {
  assert.equal(placementBlockScore(blocks[0], {}).passed, false);
  assert.equal(placementResult(blocks, {}).credit.length, 0);
});
test("80% total with fewer than 80% typed fails; do not rely on lucky choices", () => {
  const response = answers([blocks[0]]);
  for (const q of blocks[0].questions.filter((q) => q.type === "typed").slice(0, 2))
    response[q.id] = "wrong";
  assert.equal(placementBlockScore(blocks[0], response).correct, 8);
  assert.equal(placementBlockScore(blocks[0], response).passed, false);
});
test("80% overall and typed passes; do not credit later strong blocks over an earlier gap", () => {
  const response = answers(blocks);
  response[blocks[0].questions[0].id] = "wrong";
  response[blocks[0].questions[1].id] = "wrong";
  assert.equal(placementBlockScore(blocks[0], response).passed, true);
  for (const q of blocks[1].questions) response[q.id] = "";
  const result = placementResult(blocks, response);
  assert.equal(result.credit.length, 5);
  assert.equal(result.start.n, 6);
  assert.equal(result.complete, false);
});
test("all-pass credits full path, no fabricated next lesson", () => {
  const result = placementResult(blocks, answers(blocks));
  assert.equal(result.credit.length, 15);
  assert.equal(result.start, null);
  assert.equal(result.complete, true);
});
test("missing lesson material halts coverage instead of jumping forward", () => {
  const source = structuredClone(lessons);
  source[5].checks = [];
  assert.equal(placementBlocks(source, "seed").flatMap((b) => b.lessons).length, 5);
});
test("cloze masks a whole word and respects accents", () => {
  const checks = placementCloze(
    [{ es: "techo", en: "roof", kind: "term" }],
    [{ target: "El techo está limpio.", native: "The roof is clean." }],
  );
  assert.deepEqual(checks, [
    { prompt: "El ____ está limpio.", hint: "The roof is clean.", answer: "techo" },
  ]);
  assert.equal(placementCorrect({ answer: "llegué" }, " Llegué! "), true);
  assert.equal(placementCorrect({ answer: "sí" }, "si"), false);
});
test("credit is explicit, idempotent, pair-scoped, cloud-merged and preserves practice history", () => {
  const context = { targetLanguage: "Spanish", instructionLanguage: "English" };
  const key = core30ScopeKey("foundation-demo", context);
  const initial = { [key]: { lessons: { 1: { visits: { "way:see": "2026-01-01T00:00:00Z" } } } } };
  const input = {
    lessons: lessons.slice(0, 5),
    context,
    at: "2026-11-02T12:00:00Z",
    attemptId: "attempt-a",
  };
  const result = applyPlacementCredit(initial, input);
  assert.equal(Object.keys(initial[key].lessons).length, 1);
  assert.equal(Object.keys(result[key].lessons).length, 5);
  assert.equal(result[key].lessons["1"].visits["way:see"], "2026-01-01T00:00:00Z");
  assert.equal(result[key].lessons["2"].wayVisits, undefined);
  assert.equal(result[key].lessons["2"].placementCredit.attemptId, "attempt-a");
  assert.equal(applyPlacementCredit(result, input), result);
  assert.equal(
    result[core30ScopeKey("foundation-demo", { ...context, targetLanguage: "French" })],
    undefined,
  );
  const merged = mergeCore30Log(initial, result);
  assert.deepEqual(merged[key].lessons["2"], result[key].lessons["2"]);
  assert.deepEqual(
    merged[key].lessons["1"].placementCredit,
    result[key].lessons["1"].placementCredit,
  );
  assert.equal(merged[key].lessons["1"].wayVisits.see, "2026-01-01T00:00:00Z");
  assert.equal(
    applyPlacementCredit(initial, {
      ...input,
      context: { ...context, enrollmentId: "managed-plan" },
    }),
    initial,
  );
});
