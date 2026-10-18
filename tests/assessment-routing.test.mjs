import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import {
  routingPolicyIssues,
  hasAdaptiveRouting,
} from "../src/lib/assessments/routing-contract.ts";
import { validateFormDefinition } from "../src/lib/assessments/form.ts";
const { evaluateRouting, routingPublicItems, routingComparisonItems } = await loadModule(
  "src/lib/assessments/routing.ts",
  { stubs: [/^@tanstack\/react-start\/server-only$/] },
);
const attempt = "11111111-2222-4333-8444-555555555555";

test("routing contract keeps legacy forms compatible and validates a bounded complete fixed core", () => {
  const { form } = routingFixture();
  assert.deepEqual(validateFormDefinition(form), []);
  const legacy = structuredClone(form);
  delete legacy.routing;
  assert.deepEqual(validateFormDefinition(legacy), []);
  assert.equal(hasAdaptiveRouting(legacy), false);
  for (const mutate of [
    (f) => (f.routing = null),
    (f) => (f.routing.schema = 2),
    (f) => (f.routing.minimumEvidence = 0),
    (f) => (f.routing.minimumEvidence = 13),
    (f) => (f.routing.minimumObjectives = 4),
    (f) => f.routing.coreItemIds.pop(),
    (f) => f.routing.coreItemIds.push(f.routing.coreItemIds[0]),
    (f) => f.routing.branches[0].itemIds.push("missing-item"),
    (f) => (f.routing.branches[0].itemIds = [f.routing.coreItemIds[0]]),
    (f) => (f.routing.branches[1].itemIds = f.routing.branches[0].itemIds),
    (f) => (f.routing.bands[0].maximumPercent = 51),
    (f) => (f.routing.bands[1].maximumPercent = 99),
    (f) => (f.routing.bands[1].branchId = f.routing.insufficientEvidenceBranchId),
    (f) => (f.routing.hiddenPolicy = "unrecognized"),
  ]) {
    const copy = structuredClone(form);
    mutate(copy);
    assert.ok(routingPolicyIssues(copy).length);
    assert.throws(() => evaluateRouting(copy, attempt, 2, []));
  }
});

test("server routing scores frozen objective keys, including exact 0/50/100 boundaries, without mutation", () => {
  for (const wrongCount of [0, 6, 7, 12]) {
    const { form, answers } = routingFixture();
    let n = 0;
    for (const row of answers)
      if (n < wrongCount && !row.itemId.includes("writing") && !row.itemId.includes("speaking")) {
        if (row.answer.inputMethod === "choice") row.answer.choiceId = "b";
        else row.answer.text = "incorrect fixture response";
        n++;
      }
    const before = JSON.stringify({ form, answers });
    const result = evaluateRouting(form, attempt, 4, answers);
    assert.equal(result.state, "decision");
    assert.equal(result.decision.percent, ((12 - wrongCount) / 12) * 100);
    assert.equal(result.decision.branchId, wrongCount <= 6 ? "band-b" : "band-a");
    assert.deepEqual(evaluateRouting(form, attempt, 4, answers), result);
    assert.equal(JSON.stringify({ form, answers }), before);
  }
});

test("missing, uncertain and unheard listening evidence take a separate diagnostic path, never a low-ability zero", () => {
  for (const replace of [
    () => ({ inputMethod: "unavailable", missingReason: "Audio unavailable" }),
    () => ({ inputMethod: "handwriting", recognitionIssue: true, text: "uncertain" }),
    () => ({ inputMethod: "choice", choiceId: "a", listeningHeard: false }),
  ]) {
    const { form, answers } = routingFixture();
    answers.find((r) => r.itemId === "core-listening-1").answer = replace();
    const result = evaluateRouting(form, attempt, 3, answers);
    assert.equal(result.state, "decision");
    assert.equal(result.decision.branchId, "more-evidence");
    assert.equal(result.decision.percent, null);
    assert.equal(result.decision.reason, "insufficient_evidence");
    assert.equal(result.decision.scoredCount, 11);
  }
  const { form, answers } = routingFixture();
  form.routing.minimumEvidence = 1;
  form.routing.minimumObjectives = 3;
  for (const row of answers)
    if (!row.itemId.endsWith("-1")) row.answer = { inputMethod: "unavailable" };
  assert.equal(evaluateRouting(form, attempt, 3, answers).decision.reason, "insufficient_evidence");
});

test("the full core must be attempted or explicitly unavailable; branch answers and client score claims do not drive routing", () => {
  const { form, answers } = routingFixture();
  assert.deepEqual(evaluateRouting(form, attempt, 0, []), {
    state: "core_incomplete",
    remainingCount: 18,
  });
  const blank = structuredClone(answers);
  blank.find((r) => r.itemId === "core-writing-1").answer = { inputMethod: "typed", text: "  " };
  assert.deepEqual(evaluateRouting(form, attempt, 0, blank), {
    state: "core_incomplete",
    remainingCount: 1,
  });
  const expected = evaluateRouting(form, attempt, 2, answers);
  const extended = [
    ...answers,
    {
      itemId: "branch-band-a",
      answer: { inputMethod: "choice", choiceId: "b", points: 999, score: 999 },
    },
  ];
  assert.deepEqual(evaluateRouting(form, attempt, 2, extended), expected);
  const claimed = structuredClone(answers);
  Object.assign(claimed[0].answer, { points: 999, score: 999, correctOptionId: "b" });
  const ignored = evaluateRouting(form, attempt, 2, claimed);
  assert.equal(ignored.decision.percent, 100);
  assert.equal(ignored.decision.branchId, expected.decision.branchId);
  assert.throws(() => evaluateRouting(form, attempt, 2, [...answers, answers[0]]));
  assert.throws(() =>
    evaluateRouting(form, attempt, 2, [
      ...answers,
      { itemId: "not-in-form", answer: { inputMethod: "typed", text: "x" } },
    ]),
  );
});

test("private audit digest binds versions, revision, core response bytes and policy while surviving JSON key reordering", () => {
  const { form, answers } = routingFixture();
  const original = evaluateRouting(form, attempt, 2, answers).decision;
  const reordered = answers.map((r) => ({
    ...r,
    answer: Object.fromEntries(Object.entries(r.answer).reverse()),
  }));
  assert.equal(
    evaluateRouting(form, attempt, 2, reordered).decision.sourceDigest,
    original.sourceDigest,
  );
  assert.notEqual(
    evaluateRouting(form, attempt, 3, answers).decision.sourceDigest,
    original.sourceDigest,
  );
  for (const field of ["version", "rubricVersion"]) {
    const changed = structuredClone(form);
    changed[field] += "-changed";
    assert.notEqual(
      evaluateRouting(changed, attempt, 2, answers).decision.sourceDigest,
      original.sourceDigest,
    );
  }
  const changed = structuredClone(form);
  changed.routing.version += "-changed";
  assert.notEqual(
    evaluateRouting(changed, attempt, 2, answers).decision.sourceDigest,
    original.sourceDigest,
  );
  const edited = structuredClone(answers);
  edited.find((r) => r.itemId === "core-writing-1").answer.text += " edited";
  assert.notEqual(
    evaluateRouting(form, attempt, 2, edited).decision.sourceDigest,
    original.sourceDigest,
  );
});

test("public routing view includes only the fixed core plus the frozen selected branch; growth anchors remain core-only", () => {
  const { form, answers } = routingFixture();
  const decision = evaluateRouting(form, attempt, 2, answers).decision;
  assert.deepEqual(
    routingPublicItems(form, attempt, null).map((i) => i.id),
    form.routing.coreItemIds,
  );
  const view = routingPublicItems(form, attempt, decision);
  assert.equal(view.length, 19);
  assert.equal(view.at(-1).id, "branch-band-b");
  const serialized = JSON.stringify(view);
  for (const privateValue of [
    "private-fixture-answer",
    "Private fixture listening text",
    "correctOptionId",
    "rationale",
    '"routing":',
    "minimumEvidence",
    "sourceDigest",
    "branch-band-a",
    "branch-more-evidence",
  ])
    assert.equal(serialized.includes(privateValue), false, privateValue);
  assert.deepEqual(routingComparisonItems(form), form.routing.coreItemIds);
  for (const change of [
    { attemptId: "99999999-2222-4333-8444-555555555555" },
    { sourceRevision: -1 },
    { formVersion: "old" },
    { policyVersion: "old" },
    { branchId: "outside" },
    { sourceDigest: "invalid" },
  ])
    assert.throws(() => routingPublicItems(form, attempt, { ...decision, ...change }));
});
