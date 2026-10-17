import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";

// Real POST handler and readiness/binding logic; auth, billing, budget and final
// attempt serialization are controlled boundaries. No hosted approval/result.
const root = resolve("node_modules/.cache/lle-tests");
mkdirSync(root, { recursive: true });
const directory = mkdtempSync(resolve(root, "routing-api-"));
const outfile = resolve(directory, "handler.mjs");
let route;
try {
  await build({
    stdin: {
      contents: `export {Route} from './src/routes/api.exams.ts';export {controls} from 'test-controls';`,
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
                /^(test-controls|@tanstack\/react-router|@tanstack\/react-start\/server-only|@\/lib\/team-server|@\/lib\/assessments\/server|@\/lib\/assessments\/plans-server)$/,
            },
            (args) => ({ path: args.path, namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
            if (args.path === "test-controls")
              return { contents: "export const controls={db:null,actor:'learner',budgets:[]};" };
            if (args.path === "@tanstack/react-start/server-only") return { contents: "" };
            if (args.path === "@tanstack/react-router")
              return { contents: "export const createFileRoute=()=>options=>options;" };
            if (args.path === "@/lib/team-server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/team-server.ts"))};import {controls} from 'test-controls';export const teamAdminClient=()=>controls.db;export const authenticatedUser=async()=>({id:controls.actor});`,
                resolveDir: process.cwd(),
              };
            if (args.path === "@/lib/assessments/server")
              return {
                contents: `export * from ${JSON.stringify(resolve("src/lib/assessments/server.ts"))};import {controls} from 'test-controls';export const assessmentBudget=async(actor,action)=>{controls.budgets.push({actor,action});};export const readAttempt=async(_db,_actor,id)=>({id,controlledSerialization:true});`,
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
      revision: 4,
      status: "in_progress",
      form_snapshot: { definition: form },
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
