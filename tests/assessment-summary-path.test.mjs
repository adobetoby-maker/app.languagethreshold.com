import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
import { assessedProgressRows } from "../src/lib/assessments/export.ts";
const stubs = [/^@tanstack\/react-start\/server-only$/];
const { selectedSummaries } = await loadModule("src/lib/assessments/server.ts", { stubs });
const { evaluateRouting } = await loadModule("src/lib/assessments/routing.ts", { stubs });
const { summarizedAttempt } = await loadModule("src/lib/assessments/reporting.ts");

/** Fictional calibrated/equivalent records for math tests; never hosted approvals. */
async function fixture(count = 2, longitudinal = false) {
  const f = await supportCheckFixture();
  f.enrollment.program_scope = "full_module";
  f.rows.assessment_attempts = [];
  f.rows.assessment_attempt_routes = [];
  f.raw = [];
  for (let index = 0; index < count; index++) {
    const { form, answers } = routingFixture();
    const id = `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const checkpoint = longitudinal && index === 1 ? f.checkpoints[2] : f.checkpoints[0];
    form.id = `fixture-form-${index}`;
    form.checkpoint = checkpoint.checkpoint;
    // Deliberately overlapping authored anchor on the branch: it must still be excluded.
    form.items.find((i) => i.id === "branch-band-b").objectiveId = form.items[0].objectiveId;
    form.items.find((i) => i.id === "branch-band-b").comparisonGroup =
      form.items[0].comparisonGroup;
    const attempt = {
      id,
      checkpoint_id: checkpoint.id,
      form_id: form.id,
      revision: 5,
      status: "completed",
      submitted_at: "2026-10-17T16:00:00Z",
      attempt_number: index + 1,
      form_snapshot: {
        definition: form,
        version: form.version,
        rubricVersion: form.rubricVersion,
        calibrated: true,
        equivalenceApproved: true,
        equivalenceGroup: "fictional-reviewed-equivalence",
      },
    };
    f.rows.assessment_attempts.push(attempt);
    f.rows.assessment_attempt_routes.push({
      attempt_id: id,
      source_revision: 4,
      decision_revision: 5,
      decision: evaluateRouting(form, id, 4, answers).decision,
    });
    f.raw.push({
      attemptId: id,
      checkpoint: checkpoint.checkpoint,
      calibrated: true,
      equivalenceApproved: true,
      equivalenceGroup: "fictional-reviewed-equivalence",
      evidence: form.items
        .filter((i) => form.routing.coreItemIds.includes(i.id) || i.id === "branch-band-b")
        .map((item) => ({
          itemId: item.id,
          objectiveId: item.objectiveId,
          skill: item.skill,
          maximum: item.maximum,
          coverage: item.coverage,
          comparisonGroup: item.comparisonGroup,
          state: "scored",
          source: "human",
          points: item.id === "branch-band-b" ? index % 2 : 0.5,
        })),
    });
  }
  f.db.rpc = async (name, args) => {
    assert.equal(name, "assessment_selected_summaries");
    f.rpcs.push({ name, args: structuredClone(args) });
    if (args.p_actor !== "learner" || (f.revoke && args.p_attempts.length === 0))
      return { data: null, error: { code: "P0001", message: "Assessment report access required" } };
    return { data: args.p_attempts.length ? structuredClone(f.raw) : [], error: null };
  };
  return f;
}
const run = (f) =>
  selectedSummaries(
    f.db,
    "learner",
    [f.enrollment.id],
    f.raw.map((s) => s.attemptId),
  );

test("shared summary boundary retains selected branch scores but removes branch comparison anchors", async () => {
  const f = await fixture(),
    original = structuredClone(f.raw),
    values = await run(f);
  assert.equal(values.length, 2);
  assert.equal(values[0].evidence.length, 19);
  assert.equal(values[0].evidence.at(-1).comparisonGroup, undefined);
  assert.equal(values[0].evidence[0].comparisonGroup, "core-recognition-1");
  assert.equal(values[1].evidence.at(-1).points, 1);
  assert.deepEqual(f.raw, original);
  for (const marker of [
    "private-fixture-answer",
    "audioText",
    "routing",
    "coreItemIds",
    "sourceDigest",
    "form_snapshot",
    "decision",
  ])
    assert.ok(!JSON.stringify(values).includes(marker), marker);
  assert.deepEqual(f.rpcs.at(-1).args, {
    p_actor: "learner",
    p_enrollments: [f.enrollment.id],
    p_attempts: [],
  });
  assert.ok(!f.queries.some((q) => q.table === "assessment_responses"));
});

test("longitudinal results and CSV compare only fixed core even when a branch shares its authored anchor", async () => {
  const f = await fixture(2, true),
    before = f.raw[0],
    after = f.raw[1],
    attempt = f.rows.assessment_attempts[1];
  const unsafe = summarizedAttempt("day90", attempt, after, before).comparisons.find(
    (r) => r.skill === "recognition",
  );
  assert.notEqual(unsafe.change, 0);
  const values = await run(f),
    summary = summarizedAttempt("day90", attempt, values[1], values[0]);
  const growth = summary.comparisons.find((r) => r.skill === "recognition");
  assert.equal(growth.change, 0);
  assert.equal(growth.before, 50);
  assert.equal(growth.after, 50);
  assert.equal(growth.objectives.length, 3);
  const rows = assessedProgressRows(
    [
      {
        ...f.enrollment,
        checkpoints: [
          {
            checkpoint: "day90",
            due_date: "2026-10-17",
            status: "scheduled",
            ready: true,
            attempts: [summary],
          },
        ],
      },
    ],
    { learner: () => "Controlled learner", module: (id) => id, skill: (id) => id },
  );
  const column = rows[0].indexOf("Change on comparable objectives"),
    skillColumn = rows[0].indexOf("Skill");
  const recognition = rows.slice(1).find((row) => row[skillColumn] === "recognition");
  assert.equal(recognition[column], 0);
});

test("missing selected grades are pending; unused branches never become denominator rows", async () => {
  const f = await fixture();
  f.raw[0].evidence = [];
  const values = await run(f);
  assert.equal(values[0].evidence.length, 19);
  assert.ok(values[0].evidence.every((e) => e.state === "pending" && e.points === null));
  assert.ok(
    !values[0].evidence.some((e) => ["branch-band-a", "branch-more-evidence"].includes(e.itemId)),
  );
  assert.equal(values[0].evidence.at(-1).comparisonGroup, undefined);
});

test("core anchors never manufacture calibration or equivalent-form approval", async () => {
  const f = await fixture(2, true);
  for (let index = 0; index < 2; index++) {
    Object.assign(f.rows.assessment_attempts[index].form_snapshot, {
      calibrated: false,
      equivalenceApproved: false,
      equivalenceGroup: null,
    });
    Object.assign(f.raw[index], {
      calibrated: false,
      equivalenceApproved: false,
      equivalenceGroup: null,
    });
  }
  f.raw[0].evidence[0].state = "not_assessed";
  f.raw[0].evidence[0].points = null;
  const values = await run(f),
    summary = summarizedAttempt("day90", f.rows.assessment_attempts[1], values[1], values[0]);
  assert.equal(values[0].evidence[0].state, "not_assessed");
  assert.equal(values[0].evidence[0].points, null);
  assert.ok(summary.comparisons.every((row) => row.change === null));
  assert.ok(summary.profiles[0].skills.every((row) => row.provisional));
});

test("SQL-null absent anchors and default module coverage cannot create a comparison", async () => {
  const f = await fixture(2, true);
  for (let index = 0; index < 2; index++) {
    const attempt = f.rows.assessment_attempts[index],
      form = attempt.form_snapshot.definition;
    for (const item of form.items) {
      delete item.comparisonGroup;
      delete item.coverage;
    }
    for (const row of f.raw[index].evidence) {
      row.comparisonGroup = null;
      row.coverage = "module";
    }
    f.rows.assessment_attempt_routes[index].decision = evaluateRouting(
      form,
      attempt.id,
      4,
      routingFixture().answers,
    ).decision;
  }
  const values = await run(f),
    summary = summarizedAttempt("day90", f.rows.assessment_attempts[1], values[1], values[0]);
  assert.ok(
    values[0].evidence.every(
      (row) => row.comparisonGroup === undefined && row.coverage === "module",
    ),
  );
  assert.ok(summary.comparisons.every((row) => row.change === null));
});

test("legacy flat summaries retain original evidence/order and do not download private flat definitions", async () => {
  const f = await fixture();
  for (const row of f.rows.assessment_attempts) delete row.form_snapshot.definition.routing;
  assert.deepEqual(await run(f), f.raw);
  assert.equal(f.rpcs.length, 1);
  assert.deepEqual(
    f.queries.map((q) => [q.table, q.columns]),
    [["assessment_attempts", "id"]],
  );
});

test("actor denial precedes discovery; access revoked during enrichment prevents output", async () => {
  const f = await fixture();
  await assert.rejects(
    selectedSummaries(
      f.db,
      "foreign",
      [f.enrollment.id],
      f.raw.map((s) => s.attemptId),
    ),
    { status: 403 },
  );
  assert.equal(f.queries.length, 0);
  f.revoke = true;
  await assert.rejects(run(f), { status: 403 });
  assert.equal(f.rpcs.at(-1).args.p_attempts.length, 0);
});

test("malformed routing, missing routes, foreign scopes and corrupt scored metadata fail closed", async () => {
  for (const change of [
    (f) => (f.rows.assessment_attempts[0].form_snapshot.definition.routing = null),
    (f) => f.rows.assessment_attempt_routes.pop(),
    (f) => (f.rows.assessment_checkpoints[0].enrollment_id = "foreign-enrollment"),
    (f) => (f.raw[0].checkpoint = "day45"),
    (f) => (f.raw[0].calibrated = false),
    (f) => f.raw[0].evidence.push({ ...f.raw[0].evidence[0], itemId: "branch-band-a" }),
    (f) => (f.raw[0].evidence[0].maximum = 99),
    (f) => (f.raw[0].evidence[0].comparisonGroup = "foreign-anchor"),
    (f) => (f.raw[0].evidence[0].objectiveId = "foreign-objective"),
    (f) => (f.raw[0].evidence[0].points = 99),
    (f) => (f.errors.assessment_attempt_routes = { message: "Controlled storage outage" }),
  ]) {
    const f = await fixture();
    change(f);
    await assert.rejects(run(f), { status: 503 });
    assert.equal(f.rpcs.length, 1);
  }
});

test("adaptive frozen snapshots/routes are processed in bounded batches and no partial later-page result escapes", async () => {
  const f = await fixture(25),
    values = await run(f);
  assert.equal(values.length, 25);
  const reads = f.queries.filter(
    (q) => q.table === "assessment_attempts" && q.columns.includes("form_snapshot"),
  );
  assert.deepEqual(
    reads.map((q) => q.filters.find(([key]) => key === "id")[1].length),
    [10, 10, 5],
  );
  assert.ok(reads.every((q) => q.maximum === 11));
  const bad = await fixture(25);
  bad.rows.assessment_attempt_routes.at(-1).decision.sourceDigest = "bad";
  await assert.rejects(run(bad), { status: 503 });
  assert.equal(bad.rpcs.length, 1);
});

test("empty and over-limit reports preserve authorization/limits without unbounded discovery", async () => {
  const f = await fixture(0);
  assert.deepEqual(await run(f), []);
  assert.equal(f.queries.length, 0);
  await assert.rejects(selectedSummaries(f.db, "learner", Array(51).fill(f.enrollment.id), []), {
    status: 400,
  });
  await assert.rejects(
    selectedSummaries(f.db, "learner", [f.enrollment.id], Array(601).fill("controlled")),
    { status: 400 },
  );
  assert.equal(f.rpcs.length, 1);
});
