import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
const stubs = [/^@tanstack\/react-start\/server-only$/];
const { readAttempt, initializeScores, attemptAccess } = await loadModule(
  "src/lib/assessments/server.ts",
  { stubs },
);
const { evaluateRouting } = await loadModule("src/lib/assessments/routing.ts", { stubs });
const { initialItemEvidence } = await loadModule("src/lib/assessments/form.ts");
const attemptId = "11111111-2222-4333-8444-555555555555";

async function fixture({ selected = false, submitted = false } = {}) {
  const f = await supportCheckFixture(),
    { form, answers } = routingFixture();
  for (const item of form.items.filter((i) => i.id.startsWith("branch-"))) {
    item.prompt = `Synthetic private question for ${item.id}`;
    item.accepted = [`Synthetic private key for ${item.id}`];
  }
  f.enrollment.program_scope = "full_module";
  const attempt = {
    id: attemptId,
    checkpoint_id: f.checkpoints[0].id,
    form_id: form.id,
    attempt_number: 1,
    status: submitted ? "submitted" : "in_progress",
    revision: selected ? 5 : 4,
    submitted_at: submitted ? "2026-10-17T16:00:00Z" : null,
    form_snapshot: {
      definition: form,
      version: form.version,
      rubricVersion: form.rubricVersion,
      pilot: false,
      calibrated: false,
    },
  };
  f.rows.assessment_attempts = [attempt];
  f.rows.assessment_attempt_routes = selected
    ? [
        {
          attempt_id: attemptId,
          source_revision: 4,
          decision_revision: 5,
          decision: evaluateRouting(form, attemptId, 4, answers).decision,
        },
      ]
    : [];
  f.rows.assessment_responses = [
    ...answers,
    ...(selected
      ? [{ itemId: "branch-band-b", answer: { inputMethod: "choice", choiceId: "a" } }]
      : []),
  ].map(({ itemId, answer }, index) => ({
    id: `controlled-response-${index}`,
    attempt_id: attemptId,
    item_id: itemId,
    answer: structuredClone(answer),
  }));
  f.scores = f.rows.assessment_responses.map((response) => {
    const item = form.items.find((i) => i.id === response.item_id),
      value = initialItemEvidence(item, response.answer);
    return {
      response_id: response.id,
      objective_id: item.objectiveId,
      skill: item.skill,
      state: value.state === "pending" ? "needs_review" : value.state,
      points: value.points,
      maximum: value.maximum,
      source: value.source,
      comparison_group: item.comparisonGroup,
      coverage: item.coverage,
      rationale: "Synthetic score rationale",
    };
  });
  f.db.rpc = async (name, args) => {
    f.rpcs.push({ name, args: structuredClone(args) });
    if (name === "assessment_latest_scores") return { data: f.scores, error: null };
    if (name === "assessment_record_score") {
      if (f.failResponse === args.p_response)
        return { data: null, error: { code: "controlled", message: "Synthetic storage error" } };
      return { data: "controlled-score", error: null };
    }
    throw new Error("Unexpected controlled RPC");
  };
  return Object.assign(f, { form, attempt });
}

test("adaptive reads expose only fixed core before selection, without keys or unused branch content", async () => {
  const f = await fixture();
  f.rows.assessment_responses = f.rows.assessment_responses.slice(0, 3);
  const value = await readAttempt(f.db, "learner", attemptId);
  assert.equal(value.form.items.length, 18);
  assert.equal(value.responses.length, 3);
  assert.deepEqual(value.routing, { state: "core", coreItemCount: 18 });
  assert.equal(value.feedback, undefined);
  assert.deepEqual(value.profiles, []);
  assert.equal(value.aiWritingAvailable, false);
  assert.equal(value.canReview, false);
  for (const item of value.form.items)
    for (const key of [
      "accepted",
      "correctOptionId",
      "audioText",
      "audioAsset",
      "rubric",
      "routing",
    ])
      assert.equal(Object.hasOwn(item, key), false, key);
  assert.ok(!JSON.stringify(value).includes("Synthetic private question for branch-"));
  await assert.rejects(attemptAccess(f.db, "learner", attemptId), { status: 503 });
});

test("selected draft round-trip retains current revision, only selected questions/responses and no private decision", async () => {
  const f = await fixture({ selected: true });
  f.attempt.revision = 9;
  f.rows.assessment_responses[0].answer.choiceId = "b";
  const value = await readAttempt(f.db, "learner", attemptId);
  assert.equal(value.revision, 9);
  assert.equal(value.form.items.length, 19);
  assert.equal(value.responses.length, 19);
  assert.equal(value.form.items.at(-1).id, "branch-band-b");
  assert.deepEqual(value.routing, { state: "selected", coreItemCount: 18 });
  for (const marker of [
    "branch-band-a",
    "branch-more-evidence",
    "sourceDigest",
    "policyVersion",
    "scoredCount",
    "percent",
    "core_snapshot",
    "request_payload",
  ])
    assert.ok(!JSON.stringify(value).includes(marker), marker);
});

test("submitted feedback and profiles use selected items; branch evidence is not a comparison anchor", async () => {
  const f = await fixture({ selected: true, submitted: true });
  const selected = f.rows.assessment_responses.at(-1);
  f.rows.assessment_events = [
    {
      enrollment_id: f.enrollment.id,
      action: "ai.proposal",
      detail: {
        attemptId,
        responseId: selected.id,
        dimensions: { task: 1 },
        confidence: 0.5,
        model: "controlled",
        rubricVersion: f.form.rubricVersion,
        privateMarker: "PRIVATE_INTERNAL_PROPOSAL",
      },
    },
    {
      enrollment_id: f.enrollment.id,
      action: "ai.proposal",
      detail: {
        attemptId,
        responseId: "unselected-response",
        dimensions: { task: 999 },
        privateMarker: "UNSELECTED_PRIVATE_PROPOSAL",
      },
    },
  ];
  f.rows.assessment_grading_jobs = [
    { response_id: selected.id, status: "needs_review" },
    { response_id: "unselected-response", status: "pending" },
  ];
  const value = await readAttempt(f.db, "learner", attemptId);
  assert.equal(value.feedback.length, 19);
  assert.equal(value.evidence.length, 19);
  assert.equal(value.profiles.length, 1);
  assert.equal(value.profiles[0].skills.length, 6);
  assert.equal(value.evidence.at(-1).comparisonGroup, undefined);
  assert.equal(value.evidence[0].comparisonGroup, f.form.items[0].comparisonGroup);
  assert.equal(value.aiProposals.length, 1);
  assert.equal(value.gradingJobs.length, 1);
  assert.ok(value.feedback.find((i) => i.itemId === "branch-band-b").accepted);
  assert.ok(!JSON.stringify(value).includes("branch-band-a"));
  assert.ok(!JSON.stringify(value).includes("UNSELECTED_PRIVATE_PROPOSAL"));
  assert.ok(!JSON.stringify(value).includes("PRIVATE_INTERNAL_PROPOSAL"));
  assert.equal(value.aiWritingAvailable, false);
  assert.equal(value.canReview, false);
});

test("foreign account or explicit wrong-team view fails before private route and response reads", async () => {
  for (const [actor, org] of [
    ["foreign", undefined],
    ["learner", "wrong-team"],
  ]) {
    const f = await fixture({ selected: true });
    await assert.rejects(readAttempt(f.db, actor, attemptId, false, org), { status: 403 });
    assert.ok(
      !f.queries.some((q) =>
        ["assessment_attempt_routes", "assessment_responses"].includes(q.table),
      ),
    );
    assert.equal(f.rpcs.length, 0);
  }
});

test("adaptive read rechecks access after loading score/review state", async () => {
  const f = await fixture({ selected: true, submitted: true }),
    original = f.db.rpc;
  f.db.rpc = async (name, args) => {
    const result = await original(name, args);
    if (name === "assessment_latest_scores") f.enrollment.user_id = "new-owner";
    return result;
  };
  await assert.rejects(readAttempt(f.db, "learner", attemptId), { status: 403 });
});

test("corrupt adaptive response sets fail before serialization or first grading RPC", async () => {
  for (const change of [
    (f) =>
      f.rows.assessment_responses.push({
        id: "unselected",
        attempt_id: attemptId,
        item_id: "branch-band-a",
        answer: { inputMethod: "choice", choiceId: "a" },
      }),
    (f) =>
      f.rows.assessment_responses.push({ ...f.rows.assessment_responses[0], id: "duplicate-item" }),
    (f) => (f.rows.assessment_responses[1].id = f.rows.assessment_responses[0].id),
    (f) => f.rows.assessment_responses.pop(),
    (f) => (f.rows.assessment_responses[0].answer = null),
  ]) {
    const f = await fixture({ selected: true, submitted: true });
    change(f);
    await assert.rejects(readAttempt(f.db, "learner", attemptId), { status: 503 });
    await assert.rejects(initializeScores(f.db, "learner", attemptId), { status: 503 });
    assert.equal(f.rpcs.length, 0);
  }
});

test("submitted adaptive attempts need a durable route; unknown score references fail closed", async () => {
  const noRoute = await fixture({ submitted: true });
  await assert.rejects(readAttempt(noRoute.db, "learner", attemptId), { status: 409 });
  await assert.rejects(initializeScores(noRoute.db, "learner", attemptId), { status: 409 });
  assert.equal(noRoute.rpcs.length, 0);
  const unknown = await fixture({ selected: true, submitted: true });
  unknown.scores.push({ ...unknown.scores[0], response_id: "foreign-response" });
  await assert.rejects(readAttempt(unknown.db, "learner", attemptId), { status: 503 });
  assert.equal(unknown.rpcs.filter((r) => r.name === "assessment_record_score").length, 0);
});

test("initial scoring uses final selected answers, preserves missing states and never grades an unused branch", async () => {
  const f = await fixture({ selected: true, submitted: true });
  f.rows.assessment_responses[0].answer.choiceId = "b";
  await initializeScores(f.db, "learner", attemptId);
  const scores = f.rpcs.filter((r) => r.name === "assessment_record_score");
  assert.equal(scores.length, 19);
  assert.equal(scores[0].args.p_points, 0);
  const speaking = f.rows.assessment_responses.find((r) => r.item_id === "core-speaking-1");
  const missing = scores.find((r) => r.args.p_response === speaking.id).args;
  assert.equal(missing.p_state, "not_assessed");
  assert.equal(missing.p_points, null);
  const written = f.rows.assessment_responses.find((r) => r.item_id === "core-writing-1");
  assert.equal(scores.find((r) => r.args.p_response === written.id).args.p_state, "needs_review");
  assert.equal(f.rows.assessment_attempt_routes[0].decision.branchId, "band-b");
  assert.ok(
    scores.every((r) =>
      f.rows.assessment_responses.some((response) => response.id === r.args.p_response),
    ),
  );
});

test("invalid late answer is found before earlier scores write; partial RPC failures retry with the same per-response identities", async () => {
  const invalid = await fixture({ selected: true, submitted: true });
  invalid.rows.assessment_responses.at(-1).answer.choiceId = "not-a-frozen-option";
  await assert.rejects(initializeScores(invalid.db, "learner", attemptId), { status: 503 });
  assert.equal(invalid.rpcs.length, 0);
  const retry = await fixture({ selected: true, submitted: true });
  retry.failResponse = retry.rows.assessment_responses[2].id;
  await assert.rejects(initializeScores(retry.db, "learner", attemptId), { status: 503 });
  const first = structuredClone(retry.rpcs);
  retry.failResponse = null;
  retry.rpcs.length = 0;
  await initializeScores(retry.db, "learner", attemptId);
  assert.deepEqual(retry.rpcs.slice(0, first.length), first);
  assert.equal(retry.rpcs.length, 19);
});

test("legacy flat frozen form keeps its historical item/feedback order without a routing query", async () => {
  const f = await fixture({ selected: true, submitted: true });
  delete f.form.routing;
  const value = await readAttempt(f.db, "learner", attemptId);
  assert.equal(value.routing, undefined);
  assert.equal(value.form.items.length, 21);
  assert.equal(value.feedback.length, 21);
  assert.ok(!f.queries.some((q) => q.table === "assessment_attempt_routes"));
});
