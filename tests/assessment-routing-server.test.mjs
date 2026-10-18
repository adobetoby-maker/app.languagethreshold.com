import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";

// Real POST handler, readiness/binding and attempt serialization. Auth, billing
// and budgets are controlled boundaries. No hosted approval/result.
const root = resolve("node_modules/.cache/lle-tests");
mkdirSync(root, { recursive: true });
const directory = mkdtempSync(resolve(root, "routing-api-"));
const outfile = resolve(directory, "handler.mjs");
let route;
try {
  await build({
    stdin: {
      contents: `export {Route} from './src/routes/api.exams.ts';export {proposeWritingReview} from './src/lib/assessments/ai-server.ts';export {controls} from 'test-controls';`,
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    external: ["react", "react-dom", "zod"],
    plugins: [
      {
        name: "controlled-handler-boundaries",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-router|@tanstack\/react-start\/server-only|@\/lib\/team-server|@\/lib\/speaking-security|@\/lib\/assessments\/server|@\/lib\/assessments\/plans-server)$/,
            },
            (args) => ({ path: args.path, namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
            if (args.path === "test-controls")
              return {
                contents:
                  "export const controls={db:null,actor:'learner',budgets:[],providerCalls:[]};",
              };
            if (args.path === "@anthropic-ai/sdk")
              return {
                contents: `import {controls} from 'test-controls';export default class Anthropic {messages={create:async input=>{controls.providerCalls.push(input);return {model:'controlled-local-only',usage:{input_tokens:0,output_tokens:0},stop_reason:'tool_use',content:[{type:'tool_use',name:'propose_writing_review',input:{dimensions:{task:1},confidence:0.6,reason:'Synthetic local proposal'}}]};}};}`,
              };
            if (args.path === "@/lib/speaking-security")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/speaking-security.ts"))};export const enforceSpeakingRateLimit=async()=>({allowed:true});`,
                resolveDir: process.cwd(),
              };
            if (args.path === "@tanstack/react-start/server-only") return { contents: "" };
            if (args.path === "@tanstack/react-router")
              return { contents: "export const createFileRoute=()=>options=>options;" };
            if (args.path === "@/lib/team-server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {controls} from 'test-controls';export const teamAdminClient=()=>controls.db;export const authenticatedUser=async()=>({id:controls.actor});export const authenticatedAssessmentUser=authenticatedUser;`,
                resolveDir: process.cwd(),
              };
            if (args.path === "@/lib/assessments/server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/assessments/server.ts"))};import {controls} from 'test-controls';export const assessmentBudget=async(actor,action)=>{controls.budgets.push({actor,action});};`,
                resolveDir: process.cwd(),
              };
            return {
              contents: `export * from ${JSON.stringify(resolve("src/lib/assessments/plans-server.ts"))};export const assessmentContentAccess=async()=>true;`,
              resolveDir: process.cwd(),
            };
          });
        },
      },
    ],
  });
  route = await import(outfile);
} finally {
  rmSync(directory, { recursive: true, force: true });
}

const { selectAttemptRoute } = await loadModule("src/lib/assessments/routing-server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const { preparationKey } = await loadModule("src/lib/assessments/preparation.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const attemptId = "11111111-2222-4333-8444-555555555555";
const requestId = "22222222-2222-4222-8222-222222222222";
const nextRequest = "33333333-3333-4333-8333-333333333333";
const input = { attemptId, revision: 4, requestId };
async function fixture() {
  const f = await supportCheckFixture(),
    { form, answers } = routingFixture();
  f.enrollment.program_scope = "full_module";
  f.rows.assessment_attempts = [
    {
      id: attemptId,
      checkpoint_id: f.checkpoints[0].id,
      form_id: form.id,
      revision: 4,
      status: "in_progress",
      form_snapshot: { definition: form, version: form.version, rubricVersion: form.rubricVersion },
    },
  ];
  f.rows.assessment_responses = answers.map(({ itemId, answer }) => ({
    attempt_id: attemptId,
    item_id: itemId,
    answer,
  }));
  f.rows.assessment_attempt_routes = [];
  const baseRpc = f.db.rpc;
  f.db.rpc = async (name, args) => {
    if (name !== "assessment_select_route") return baseRpc(name, args);
    f.rpcs.push({ name, args: structuredClone(args) });
    if (f.rpcError) return { data: null, error: f.rpcError };
    await f.beforeRpc?.(args);
    let row = f.rows.assessment_attempt_routes[0];
    if (!row) {
      row = {
        attempt_id: args.p_attempt,
        request_id: args.p_request,
        source_revision: args.p_revision,
        decision_revision: args.p_revision + 1,
        decision: structuredClone(args.p_decision),
        core_snapshot: structuredClone(args.p_core),
        request_payload: structuredClone({
          actor: args.p_actor,
          attemptId: args.p_attempt,
          revision: args.p_revision,
          definition: args.p_definition,
          core: args.p_core,
          decision: args.p_decision,
        }),
      };
      f.rows.assessment_attempt_routes.push(row);
      f.rows.assessment_attempts[0].revision++;
    }
    return {
      data: f.receipt ?? {
        decision: row.decision,
        sourceRevision: row.source_revision,
        decisionRevision: row.decision_revision,
        revision: f.rows.assessment_attempts[0].revision,
      },
      error: null,
    };
  };
  return Object.assign(f, { form, answers });
}
async function post(f, overrides = {}, origin = "https://routing.invalid") {
  route.controls.db = f.db;
  route.controls.actor = "learner";
  route.controls.budgets = [];
  return route.Route.server.handlers.POST({
    request: new Request("https://routing.invalid/api/exams", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "route", ...input, ...overrides }),
    }),
  });
}

test("route action computes from saved core and returns only selected public items", async () => {
  const f = await fixture(),
    response = await post(f),
    value = await response.json();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(value.revision, 5);
  assert.deepEqual(value.routing, { state: "selected", coreItemCount: 18 });
  assert.equal(value.items.length, 19);
  assert.equal(value.items.at(-1).id, "branch-band-b");
  const serialized = JSON.stringify(value);
  for (const secret of [
    "private-fixture-answer",
    "audioText",
    "correctOptionId",
    "accepted",
    "sourceDigest",
    "policyVersion",
    "scoredCount",
    "percent",
    "reason",
    "branch-band-a",
    "branch-more-evidence",
  ])
    assert.ok(!serialized.includes(secret), secret);
  assert.deepEqual(route.controls.budgets, [{ actor: "learner", action: "route" }]);
  assert.equal(f.rpcs.length, 1);
  assert.equal(f.rpcs[0].args.p_actor, "learner");
  assert.deepEqual(f.rpcs[0].args.p_core, f.answers);
});

test("route action rejects caller decisions, answers, actor and invalid revision before private reads", async () => {
  for (const fields of [
    { decision: {} },
    { core: [] },
    { actor: "other" },
    { revision: -1 },
    { revision: 2147483648 },
    { requestId: "bad" },
  ]) {
    const f = await fixture(),
      response = await post(f, fields);
    assert.equal(response.status, 400);
    assert.equal(f.queries.length, 0);
    assert.equal(f.rpcs.length, 0);
  }
  const f = await fixture(),
    response = await post(f, {}, "https://foreign.invalid");
  assert.equal(response.status, 403);
  assert.equal(f.queries.length, 0);
});

test("ownership is enforced before reading route audit or core; team report access is insufficient", async () => {
  for (const team of [false, true]) {
    const f = await fixture();
    if (team) {
      f.enrollment.scope = "team";
      f.enrollment.organization_id = "controlled-org";
      f.rows.team_members = [
        { organization_id: "controlled-org", user_id: "outsider", role: "admin", status: "active" },
      ];
    }
    await assert.rejects(selectAttemptRoute(f.db, "outsider", input), { status: 403 });
    assert.equal(
      f.queries.filter((q) =>
        ["assessment_attempt_routes", "assessment_responses"].includes(q.table),
      ).length,
      0,
    );
    assert.equal(f.rpcs.length, 0);
  }
});

test("incomplete/stale/inactive core cannot select and flat or malformed forms fail closed", async () => {
  for (const [change, status] of [
    [(f) => f.rows.assessment_responses.pop(), 409],
    [(f) => f.rows.assessment_attempts[0].revision++, 409],
    [(f) => (f.enrollment.status = "paused"), 409],
    [(f) => (f.checkpoints[0].status = "exempt"), 409],
    [(f) => (f.rows.assessment_attempts[0].status = "submitted"), 409],
    [(f) => delete f.form.routing, 400],
    [(f) => (f.form.routing = null), 503],
    [(f) => (f.enrollment.program_scope = "support_units"), 503],
  ]) {
    const f = await fixture();
    change(f);
    await assert.rejects(selectAttemptRoute(f.db, "learner", input), { status });
    assert.equal(f.rpcs.length, 0);
  }
});

test("unexpected, duplicate or corrupt saved answers and unavailable storage fail without a route", async () => {
  for (const change of [
    (f) =>
      f.rows.assessment_responses.push({
        attempt_id: attemptId,
        item_id: "branch-band-a",
        answer: { inputMethod: "choice", choiceId: "a" },
      }),
    (f) => f.rows.assessment_responses.push(f.rows.assessment_responses[0]),
    (f) => (f.rows.assessment_responses[0].answer = null),
    (f) => (f.errors.assessment_responses = { message: "controlled outage" }),
    (f) => (f.errors.assessment_attempt_routes = { message: "controlled outage" }),
  ]) {
    const f = await fixture();
    change(f);
    await assert.rejects(selectAttemptRoute(f.db, "learner", input), { status: 503 });
    assert.equal(f.rpcs.length, 0);
  }
});

test("unavailable core evidence selects diagnostic questions without a low-ability percentage", async () => {
  const f = await fixture();
  for (const row of f.rows.assessment_responses)
    row.answer = { inputMethod: "unavailable", missingReason: "Controlled fixture unavailable" };
  const value = await selectAttemptRoute(f.db, "learner", input);
  assert.equal(value.items.at(-1).id, "branch-more-evidence");
  assert.equal(f.rpcs[0].args.p_decision.percent, null);
  assert.equal(f.rpcs[0].args.p_decision.reason, "insufficient_evidence");
  assert.ok(!JSON.stringify(value).includes("percent"));
});

test("exact retry uses original source after later edits; new request recovers same immutable path/current revision", async () => {
  const f = await fixture();
  await selectAttemptRoute(f.db, "learner", input);
  const original = structuredClone(f.rpcs[0].args);
  f.rows.assessment_attempts[0].revision = 9;
  for (const row of f.rows.assessment_responses)
    row.answer = { inputMethod: "unavailable", missingReason: "Later edit" };
  f.queries.length = 0;
  const value = await selectAttemptRoute(f.db, "learner", input);
  assert.equal(value.revision, 9);
  assert.deepEqual(f.rpcs[1].args, original);
  assert.equal(f.queries.filter((q) => q.table === "assessment_responses").length, 0);
  const recovered = await selectAttemptRoute(f.db, "learner", {
    ...input,
    revision: 9,
    requestId: nextRequest,
  });
  assert.deepEqual(recovered.items, value.items);
  assert.equal(f.rpcs[2].args.p_revision, 9);
  assert.deepEqual(f.rpcs[2].args.p_decision, original.p_decision);
  await assert.rejects(selectAttemptRoute(f.db, "learner", { ...input, revision: 9 }), {
    status: 409,
  });
  assert.equal(f.rpcs.length, 3);
});

test("existing route retries still reach authoritative RPC for cross-attempt key conflicts and revocation", async () => {
  const f = await fixture();
  await selectAttemptRoute(f.db, "learner", input);
  for (const [message, status] of [
    ["Route request key reused with different payload", 409],
    ["Learner assessment access required", 403],
  ]) {
    f.rpcError = { code: "P0001", message };
    await assert.rejects(
      selectAttemptRoute(f.db, "learner", { ...input, requestId: nextRequest }),
      { status },
    );
  }
  assert.equal(f.rpcs.length, 3);
});

test("stored audit corruption and inconsistent RPC receipts cannot project questions", async () => {
  for (const change of [
    (f) => (f.rows.assessment_attempt_routes[0].core_snapshot[0].answer.choiceId = "b"),
    (f) => (f.rows.assessment_attempt_routes[0].request_payload.actor = "foreign"),
    (f) => (f.rows.assessment_attempt_routes[0].decision.scoredCount = 99),
    (f) => f.rows.assessment_attempt_routes[0].decision_revision++,
    (f) => (f.receipt = { decision: {}, sourceRevision: 4, decisionRevision: 5, revision: 5 }),
    (f) => (f.receipt = { ...f.rows.assessment_attempt_routes[0], revision: 3 }),
  ]) {
    const f = await fixture();
    await selectAttemptRoute(f.db, "learner", input);
    change(f);
    await assert.rejects(selectAttemptRoute(f.db, "learner", input), { status: 503 });
  }
});

test("concurrent winner's original evidence is projected instead of this request's candidate", async () => {
  const winner = await fixture();
  for (const row of winner.rows.assessment_responses) {
    if (row.answer.inputMethod === "choice") row.answer.choiceId = "b";
    if (row.item_id.startsWith("core-recall")) row.answer.text = "Controlled wrong answer";
  }
  await selectAttemptRoute(winner.db, "learner", { ...input, requestId: nextRequest });
  const f = await fixture();
  f.beforeRpc = () => {
    f.rows.assessment_attempt_routes = structuredClone(winner.rows.assessment_attempt_routes);
    f.rows.assessment_attempts[0].revision = 5;
  };
  const value = await selectAttemptRoute(f.db, "learner", input);
  assert.equal(value.revision, 5);
  assert.notEqual(
    f.rpcs[0].args.p_decision.sourceDigest,
    winner.rows.assessment_attempt_routes[0].decision.sourceDigest,
  );
  assert.deepEqual(value.items.at(-1).id, "branch-band-a");
});

test("a save winning the atomic lock yields a conflict without exposing a branch", async () => {
  const f = await fixture();
  const before = structuredClone({ form: f.form, responses: f.rows.assessment_responses });
  f.rpcError = { code: "P0001", message: "Assessment revision conflict" };
  await assert.rejects(selectAttemptRoute(f.db, "learner", input), { status: 409 });
  assert.equal(f.rows.assessment_attempt_routes.length, 0);
  assert.deepEqual({ form: f.form, responses: f.rows.assessment_responses }, before);
});

test("actual save handler permits core and selected branch only; adaptive submit stays gated before mutation", async () => {
  const f = await fixture();
  const save = (itemId) =>
    post(f, {
      action: "save",
      updates: [{ itemId, answer: { inputMethod: "choice", choiceId: "a" } }],
    });
  assert.equal((await save("branch-band-b")).status, 400);
  assert.equal(f.rpcs.length, 0);
  assert.equal((await save(f.form.routing.coreItemIds[0])).status, 200);
  assert.equal(f.rpcs.at(-1).name, "assessment_save_responses");
  await selectAttemptRoute(f.db, "learner", input);
  assert.equal((await save("branch-band-b")).status, 200);
  const before = f.rpcs.length;
  assert.equal((await save("branch-band-a")).status, 400);
  assert.equal(f.rpcs.length, before);
  const submit = await post(f, { action: "submit" });
  assert.equal(submit.status, 503);
  assert.equal(f.rpcs.length, before);
});

// Actual human POST and AI pipeline, using fictional local submitted attempts.
// No hosted review/approval/result or provider request is made.
const responseId = "44444444-4444-4444-8444-444444444444";
async function reviewFixture({ flat = false } = {}) {
  const f = await fixture();
  // Make both selected and unused branches eligible writing, so membership,
  // rather than writing eligibility, must reject the unused branch.
  for (const item of f.form.items.filter((row) => row.id.startsWith("branch-"))) {
    item.skill = "writing";
    item.type = "production";
    item.inputMethods = ["typed"];
  }
  f.form.status = "verified"; // Fictional local fixture, never hosted approval.
  for (const item of f.form.items.filter((row) => row.audioRequired))
    item.audioAsset = { sha256: "a".repeat(64), bytes: 32, mime: "audio/wav" };
  if (flat) delete f.form.routing;
  else await selectAttemptRoute(f.db, "learner", input);
  f.rows.assessment_attempts[0].submitted_at = "2026-10-17T16:00:00Z";
  f.rows.assessment_attempts[0].status = "submitted";
  f.rows.assessment_attempts[0].form_snapshot.calibrated = true;
  f.rows.assessment_responses = [
    {
      id: responseId,
      attempt_id: attemptId,
      item_id: "branch-band-b",
      answer: { inputMethod: "typed", text: "Synthetic selected writing" },
    },
  ];
  f.rows.assessment_review_requests = [
    { id: "local-request", attempt_id: attemptId, reviewer_id: "reviewer", status: "claimed" },
  ];
  f.rows.assessment_reviewers = [
    {
      user_id: "reviewer",
      module_id: f.enrollment.module_id,
      target_language: f.enrollment.target_language,
      instruction_language: f.enrollment.instruction_language,
      active: true,
    },
  ];
  f.rpcs.length = 0;
  f.queries.length = 0;
  route.controls.budgets = [];
  route.controls.providerCalls = [];
  return f;
}
async function reviewPost(f, actor = "reviewer") {
  route.controls.db = f.db;
  route.controls.actor = actor;
  return route.Route.server.handlers.POST({
    request: new Request("https://routing.invalid/api/exams", {
      method: "POST",
      headers: { Origin: "https://routing.invalid", "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "review_score",
        attemptId,
        responseId,
        state: "scored",
        points: 1,
        dimensions: { task: 1 },
        reason: "Synthetic independent review",
        requestId,
      }),
    }),
  });
}

test("human review POST checks selected membership and preserves rubric/RPC retry identity for adaptive and flat forms", async () => {
  for (const flat of [false, true]) {
    const f = await reviewFixture({ flat });
    const response = await reviewPost(f);
    assert.equal(response.status, 200, await response.text());
    const writes = f.rpcs.filter((r) => r.name === "assessment_review_rubric");
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].args, {
      p_actor: "reviewer",
      p_attempt: attemptId,
      p_response: responseId,
      p_state: "scored",
      p_points: 1,
      p_dimensions: { task: 1 },
      p_reason: "Synthetic independent review",
      p_request: requestId,
    });
    assert.equal(
      f.queries.some((q) => q.table === "assessment_attempt_routes"),
      !flat,
    );
  }
});

test("human review denies self, unassigned reviewer, unused/foreign response and missing/corrupt route before score writes", async () => {
  for (const mode of [
    "self",
    "unassigned",
    "unused",
    "foreign",
    "missing-route",
    "corrupt-route",
    "storage",
    "unsubmitted",
  ]) {
    const f = await reviewFixture();
    if (mode === "unassigned") f.rows.assessment_review_requests = [];
    if (mode === "unused") f.rows.assessment_responses[0].item_id = "branch-band-a";
    if (mode === "foreign") f.rows.assessment_responses[0].attempt_id = requestId;
    if (mode === "missing-route") f.rows.assessment_attempt_routes = [];
    if (mode === "corrupt-route") f.rows.assessment_attempt_routes[0].decision.branchId = "unknown";
    if (mode === "storage") f.errors.assessment_responses = { message: "controlled error" };
    if (mode === "unsubmitted") f.rows.assessment_attempts[0].submitted_at = null;
    const response = await reviewPost(f, mode === "self" ? "learner" : "reviewer");
    assert.ok(response.status >= 400, mode);
    assert.equal(f.rpcs.length, 0, mode);
    if (["self", "unassigned"].includes(mode))
      assert.ok(!f.queries.some((q) => q.table === "assessment_attempt_routes"), mode);
  }
});

async function withLocalAiKey(fn) {
  const previous = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "synthetic-local-stub-only";
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  }
}
function allowLocalProposal(f) {
  const baseFrom = f.db.from;
  f.events = [];
  f.db.from = (table) => {
    if (table !== "assessment_events") return baseFrom(table);
    const query = {
      select: () => query,
      in: () => query,
      eq: () => query,
      gte: async () => ({ error: null, count: 0 }),
      insert: async (value) => {
        f.events.push(value);
        return { error: null };
      },
    };
    return query;
  };
  const baseRpc = f.db.rpc;
  f.db.rpc = async (name, args) => {
    if (
      ![
        "assessment_claim_grading",
        "assessment_record_score",
        "assessment_finish_grading",
      ].includes(name)
    )
      return baseRpc(name, args);
    f.rpcs.push({ name, args: structuredClone(args) });
    return { data: name === "assessment_claim_grading" ? true : "local-score", error: null };
  };
}

test("AI selected writing uses only selected rubric/answer and remains a human-review proposal for adaptive and flat", async () => {
  await withLocalAiKey(async () => {
    for (const flat of [false, true]) {
      const f = await reviewFixture({ flat });
      allowLocalProposal(f);
      const result = await route.proposeWritingReview(f.db, "learner", attemptId, responseId);
      assert.equal(result.state, "needs_review");
      assert.equal(route.controls.providerCalls.length, 1);
      const payload = JSON.parse(route.controls.providerCalls[0].messages[0].content);
      assert.equal(payload.response, "Synthetic selected writing");
      assert.deepEqual(payload.rubric, f.form.items.find((i) => i.id === "branch-band-b").rubric);
      assert.ok(!JSON.stringify(payload).includes("branch-band-a"));
      const score = f.rpcs.find((r) => r.name === "assessment_record_score");
      assert.equal(score.args.p_source, "ai_proposal");
      assert.equal(score.args.p_state, "needs_review");
      assert.equal(f.events.length, 2);
      assert.equal(f.rpcs.at(-1).args.p_succeeded, true);
    }
  });
});

test("AI denies unused/foreign responses, non-owner, unsubmitted, missing/corrupt route and storage error before claim/audit/provider", async () => {
  await withLocalAiKey(async () => {
    for (const mode of [
      "unused",
      "foreign",
      "non-owner",
      "unsubmitted",
      "missing-route",
      "corrupt-route",
      "storage",
      "uncalibrated",
    ]) {
      const f = await reviewFixture();
      allowLocalProposal(f);
      if (mode === "unused") f.rows.assessment_responses[0].item_id = "branch-band-a";
      if (mode === "foreign") f.rows.assessment_responses[0].attempt_id = requestId;
      if (mode === "unsubmitted") f.rows.assessment_attempts[0].submitted_at = null;
      if (mode === "missing-route") f.rows.assessment_attempt_routes = [];
      if (mode === "corrupt-route")
        f.rows.assessment_attempt_routes[0].decision.branchId = "unknown";
      if (mode === "storage") f.errors.assessment_responses = { message: "controlled error" };
      if (mode === "uncalibrated") f.rows.assessment_attempts[0].form_snapshot.calibrated = false;
      await assert.rejects(
        route.proposeWritingReview(
          f.db,
          mode === "non-owner" ? "reviewer" : "learner",
          attemptId,
          responseId,
        ),
        undefined,
        mode,
      );
      assert.equal(f.rpcs.length, 0, mode);
      assert.equal(f.events.length, 0, mode);
      assert.equal(route.controls.providerCalls.length, 0, mode);
    }
  });
});

test("selected writing with a final human score never claims or invokes AI; unavailable input remains ineligible", async () => {
  await withLocalAiKey(async () => {
    const f = await reviewFixture();
    allowLocalProposal(f);
    f.rows.assessment_score_events = [
      { id: "local-human-score", response_id: responseId, source: "human" },
    ];
    assert.equal(
      (await route.proposeWritingReview(f.db, "learner", attemptId, responseId)).state,
      "already_reviewed",
    );
    assert.equal(route.controls.providerCalls.length, 0);
    assert.equal(f.rpcs.length, 0);
    assert.equal(f.events.length, 0);
    f.rows.assessment_score_events = [];
    f.rows.assessment_responses[0].answer = {
      inputMethod: "unavailable",
      missingReason: "Synthetic unavailable input",
    };
    await assert.rejects(route.proposeWritingReview(f.db, "learner", attemptId, responseId), {
      status: 400,
    });
    assert.equal(route.controls.providerCalls.length, 0);
    assert.equal(f.rpcs.length, 0);
    assert.equal(f.events.length, 0);
  });
});

test("human review still reaches authoritative rubric authorization, including a late grant revocation", async () => {
  const f = await reviewFixture();
  f.db.rpc = async (name, args) => {
    f.rpcs.push({ name, args });
    return { data: null, error: { code: "P0001", message: "Assessment review access required" } };
  };
  const response = await reviewPost(f);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Assessment review access required" });
  assert.deepEqual(
    f.rpcs.map((r) => r.name),
    ["assessment_review_rubric"],
  );
});

test("AI durable claim refusal prevents repeat audit and provider invocation for selected writing", async () => {
  await withLocalAiKey(async () => {
    const f = await reviewFixture();
    allowLocalProposal(f);
    f.db.rpc = async (name, args) => {
      f.rpcs.push({ name, args });
      assert.equal(name, "assessment_claim_grading");
      return { data: false, error: null };
    };
    const result = await route.proposeWritingReview(f.db, "learner", attemptId, responseId);
    assert.equal(result.state, "already_requested");
    assert.equal(route.controls.providerCalls.length, 0);
    assert.equal(f.events.length, 0);
    assert.equal(f.rpcs.length, 1);
  });
});

async function withAdaptiveCapability(fn, enabled = "true", stage = "preview") {
  const names = ["LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED", "VERCEL_ENV", "LT_EXAMS_PILOT_USER_IDS"],
    previous = names.map((key) => process.env[key]);
  process.env.LT_EXAMS_ADAPTIVE_RUNTIME_ENABLED = enabled;
  process.env.VERCEL_ENV = stage;
  process.env.LT_EXAMS_PILOT_USER_IDS = "learner"; // Must not bypass adaptive official-content checks.
  try {
    return await fn();
  } finally {
    names.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
}
async function adaptiveStartFixture(fresh = false) {
  const f = await reviewFixture();
  f.rows.assessment_attempts[0].submitted_at = null;
  f.rows.assessment_attempts[0].status = "in_progress";
  f.rows.assessment_attempts[0].revision = 4;
  f.rows.assessment_attempts[0].attempt_number = 1;
  f.rows.assessment_attempts[0].form_snapshot.pilot = false;
  f.rows.assessment_attempt_routes = [];
  f.rows.assessment_responses = [];
  f.rows.assessment_forms = [
    {
      id: f.form.id,
      release_id: f.enrollment.release_id,
      checkpoint: "entrance",
      purpose: "module",
      status: "verified",
      calibrated: true,
      version: f.form.version,
      rubric_version: f.form.rubricVersion,
      definition: f.form,
    },
  ];
  const startAttempt = f.rows.assessment_attempts[0];
  if (fresh) f.rows.assessment_attempts = [];
  const base = f.db.rpc;
  f.db.rpc = async (name, args) => {
    if (name === "assessment_start_attempt" || name === "assessment_start_prepared_attempt") {
      if (fresh && !f.rows.assessment_attempts.length)
        f.rows.assessment_attempts.push(startAttempt);
      f.rpcs.push({ name, args });
      return { data: attemptId, error: null };
    }
    return base(name, args);
  };
  f.rpcs.length = 0;
  return f;
}
async function postAction(f, body, actor = "learner") {
  route.controls.db = f.db;
  route.controls.actor = actor;
  return route.Route.server.handlers.POST({
    request: new Request("https://routing.invalid/api/exams", {
      method: "POST",
      headers: { Origin: "https://routing.invalid", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

test("Preview capability coordinates real prepare/start/core read while adaptive pilot bypass stays disabled", async () =>
  withAdaptiveCapability(async () => {
    const f = await adaptiveStartFixture(true);
    const prepared = await postAction(f, { action: "prepare", checkpointId: f.checkpoints[0].id });
    assert.equal(prepared.status, 200, await prepared.clone().text());
    const details = await prepared.json();
    assert.match(details.preparedForm, /^[a-f0-9]{64}$/);
    assert.equal(details.provisional, false);
    assert.equal(f.rpcs.length, 0);
    const response = await postAction(f, {
      action: "start",
      checkpointId: f.checkpoints[0].id,
      requestId,
      preparedForm: details.preparedForm,
    });
    assert.equal(response.status, 200, await response.clone().text());
    const value = await response.json();
    assert.equal(value.id, attemptId);
    assert.deepEqual(value.routing, { state: "core", coreItemCount: 18 });
    assert.equal(value.form.items.length, 18);
    const started = f.rpcs.find((r) => r.name === "assessment_start_prepared_attempt");
    assert.ok(started);
    assert.ok(!("p_allow_pilot" in started.args));
    assert.deepEqual(started.args.p_expected_form, f.rows.assessment_forms[0]);
    assert.deepEqual(started.args.p_expected_release, f.rows.assessment_releases[0]);
    assert.ok(!JSON.stringify(value).includes("branch-band-a"));
    assert.ok(!JSON.stringify(value).includes("private-fixture-answer"));
  }));

test("adaptive capability defaults closed, is Preview-only and never accepts support, unreviewed, malformed or stale forms", async () => {
  for (const mode of [
    "off",
    "production",
    "local",
    "uncalibrated",
    "draft",
    "definition-draft",
    "null-policy",
    "version",
    "pair",
    "support",
    "release",
    "binding",
    "foreign",
    "too-many",
  ]) {
    await withAdaptiveCapability(
      async () => {
        const f = await adaptiveStartFixture(true);
        if (mode === "uncalibrated") f.rows.assessment_forms[0].calibrated = false;
        if (mode === "draft") f.rows.assessment_forms[0].status = "draft";
        if (mode === "definition-draft") f.form.status = "draft";
        if (mode === "null-policy") f.form.routing = null;
        if (mode === "version") f.rows.assessment_forms[0].version = "changed";
        if (mode === "pair") f.form.targetLanguage = "French";
        if (mode === "support") f.enrollment.program_scope = "support_units";
        if (mode === "release") f.rows.assessment_releases[0].lesson_manifest.reviewed = false;
        if (mode === "binding") f.rows.assessment_lesson_snapshots[0].fingerprint = "changed";
        if (mode === "too-many")
          f.rows.assessment_forms = Array.from({ length: 51 }, () => ({
            ...f.rows.assessment_forms[0],
          }));
        const response = await postAction(
          f,
          {
            action: "start",
            checkpointId: f.checkpoints[0].id,
            requestId,
            preparedForm: preparationKey(f.rows.assessment_forms[0]),
          },
          mode === "foreign" ? "other" : "learner",
        );
        assert.ok(response.status >= 400, mode);
        assert.ok(
          !f.rpcs.some((r) =>
            ["assessment_start_attempt", "assessment_start_prepared_attempt"].includes(r.name),
          ),
          mode,
        );
      },
      mode === "off" ? "false" : "true",
      mode === "production" ? "production" : mode === "local" ? "development" : "preview",
    );
  }
});

test("adaptive preparation digest rejects changed private policy before start RPC", async () =>
  withAdaptiveCapability(async () => {
    const f = await adaptiveStartFixture(true);
    const response = await postAction(f, { action: "prepare", checkpointId: f.checkpoints[0].id });
    const prepared = await response.json();
    f.form.routing.version = "changed-reviewed-local-fixture-version";
    const changed = await postAction(f, {
      action: "start",
      checkpointId: f.checkpoints[0].id,
      requestId,
      preparedForm: prepared.preparedForm,
    });
    assert.equal(changed.status, 409);
    assert.ok(
      !f.rpcs.some((r) =>
        ["assessment_start_attempt", "assessment_start_prepared_attempt"].includes(r.name),
      ),
    );
  }));

test("gated adaptive submit validates frozen path before durable RPC and scores only selected saved responses", async () =>
  withAdaptiveCapability(async () => {
    const f = await adaptiveStartFixture();
    f.rows.assessment_responses = f.answers.map(({ itemId, answer }, i) => ({
      id: `core-response-${i}`,
      attempt_id: attemptId,
      item_id: itemId,
      answer,
    }));
    await selectAttemptRoute(f.db, "learner", input);
    f.rows.assessment_responses.push({
      id: responseId,
      attempt_id: attemptId,
      item_id: "branch-band-b",
      answer: { inputMethod: "typed", text: "Selected writing" },
    });
    const prior = f.db.rpc;
    f.db.rpc = async (name, args) => {
      if (name === "assessment_submit_attempt") {
        f.rpcs.push({ name, args });
        f.rows.assessment_attempts[0].submitted_at = "2026-10-17T17:30:00Z";
        return { data: "submitted", error: null };
      }
      if (name === "assessment_record_score") {
        f.rpcs.push({ name, args });
        return { data: "local-score", error: null };
      }
      return prior(name, args);
    };
    f.rpcs.length = 0;
    const response = await postAction(f, { action: "submit", attemptId, revision: 5, requestId });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).scoringPending, undefined);
    const scores = f.rpcs.filter((r) => r.name === "assessment_record_score");
    assert.equal(scores.length, 19);
    assert.ok(scores.some((r) => r.args.p_response === responseId));
    assert.equal(f.rpcs[0].name, "assessment_submit_attempt");
  }));

test("adaptive submit denies missing route, unselected/corrupt response, non-owner, pilot and changed frozen metadata before durable write", async () =>
  withAdaptiveCapability(async () => {
    for (const mode of [
      "missing-route",
      "unselected",
      "corrupt-answer",
      "pilot",
      "uncalibrated",
      "version",
      "foreign",
    ]) {
      const f = await adaptiveStartFixture();
      f.rows.assessment_responses = f.answers.map(({ itemId, answer }, i) => ({
        id: `core-response-${i}`,
        attempt_id: attemptId,
        item_id: itemId,
        answer,
      }));
      await selectAttemptRoute(f.db, "learner", input);
      if (mode === "missing-route") f.rows.assessment_attempt_routes = [];
      if (mode === "unselected") f.rows.assessment_responses[0].item_id = "branch-band-a";
      if (mode === "corrupt-answer") f.rows.assessment_responses[0].answer = null;
      if (mode === "pilot") f.rows.assessment_attempts[0].form_snapshot.pilot = true;
      if (mode === "uncalibrated") f.rows.assessment_attempts[0].form_snapshot.calibrated = false;
      if (mode === "version") f.rows.assessment_attempts[0].form_snapshot.version = "changed";
      f.rpcs.length = 0;
      const response = await postAction(
        f,
        { action: "submit", attemptId, revision: 5, requestId },
        mode === "foreign" ? "other" : "learner",
      );
      assert.ok(response.status >= 400, mode);
      assert.ok(!f.rpcs.some((r) => r.name === "assessment_submit_attempt"), mode);
    }
  }));

test("adaptive Start requires the prepared disclosure identity before its durable RPC", async () =>
  withAdaptiveCapability(async () => {
    const f = await adaptiveStartFixture(true);
    const response = await postAction(f, {
      action: "start",
      checkpointId: f.checkpoints[0].id,
      requestId,
    });
    assert.equal(response.status, 409);
    assert.ok(
      !f.rpcs.some((r) =>
        ["assessment_start_attempt", "assessment_start_prepared_attempt"].includes(r.name),
      ),
    );
  }));
