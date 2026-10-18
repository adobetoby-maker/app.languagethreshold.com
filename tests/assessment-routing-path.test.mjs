import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";
import { supportCheckFixture } from "./helpers/support-check-fixture.mjs";
import { routingFixture } from "./helpers/routing-fixture.mjs";
const stubs = [/^@tanstack\/react-start\/server-only$/];
const { selectedAttemptPath } = await loadModule("src/lib/assessments/routing-path-server.ts", {
  stubs,
});
const { evaluateRouting } = await loadModule("src/lib/assessments/routing.ts", { stubs });
const { readAssessmentListening } = await loadModule("src/lib/assessments/audio-server.ts", {
  stubs,
});
const { readAssessmentSpeech, uploadAssessmentSpeech } = await loadModule(
  "src/lib/assessments/speech-server.ts",
  { stubs },
);
const attemptId = "11111111-2222-4333-8444-555555555555";
const evidenceId = "30000000-0000-4000-8000-000000000001";
const bytes = new Uint8Array(64);
bytes.set(new TextEncoder().encode("RIFF"));
bytes.set(new TextEncoder().encode("WAVE"), 8);
const sha256 = createHash("sha256").update(bytes).digest("hex");

async function fixture(mode = "listening", selected = false) {
  const f = await supportCheckFixture(),
    { form, answers } = routingFixture();
  // Fictional branch media questions. No clips, policy or forms are published.
  for (const branch of form.routing.branches) {
    const index = form.items.findIndex((i) => i.id === branch.itemIds[0]);
    const original = form.items[index];
    form.items[index] = {
      ...structuredClone(form.items.find((i) => i.skill === mode)),
      id: original.id,
      objectiveId: original.objectiveId,
      comparisonGroup: original.id,
      ...(mode === "listening"
        ? { audioAsset: { mime: "audio/wav", bytes: bytes.length, sha256 } }
        : {}),
    };
  }
  const attempt = {
    id: attemptId,
    form_id: form.id,
    checkpoint_id: f.checkpoints[0].id,
    status: "in_progress",
    submitted_at: null,
    revision: selected ? 5 : 4,
    form_snapshot: { definition: form, version: form.version, rubricVersion: form.rubricVersion },
  };
  f.enrollment.program_scope = "full_module";
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
  const calls = [];
  f.db.storage = {
    getBucket: async (bucket) => {
      calls.push(["bucket", bucket]);
      return { data: { public: false, file_size_limit: 4194304 }, error: null };
    },
    from: (bucket) => ({
      download: async (path) => {
        calls.push(["download", bucket, path]);
        await f.onDownload?.();
        return { data: new Blob([bytes]), error: null };
      },
    }),
  };
  const context = { attempt, checkpoint: f.checkpoints[0], enrollment: f.enrollment };
  return Object.assign(f, { form, attempt, context, calls });
}

test("selected paths preserve flat order, hide branches before selection and require a route for submit", async () => {
  const flat = await fixture();
  delete flat.form.routing;
  const path = await selectedAttemptPath(flat.db, flat.context);
  assert.equal(path.items, flat.form.items);
  assert.equal(path.routing, undefined);
  assert.equal(flat.queries.length, 0);
  const core = await fixture(),
    value = await selectedAttemptPath(core.db, core.context);
  assert.deepEqual(
    value.items.map((i) => i.id),
    core.form.routing.coreItemIds,
  );
  assert.deepEqual(value.routing, { state: "core", coreItemCount: 18 });
  await assert.rejects(selectedAttemptPath(core.db, core.context, true), { status: 409 });
  assert.equal(core.queries[0].columns, "attempt_id,source_revision,decision_revision,decision");
  assert.ok(!core.queries.some((q) => q.table === "assessment_responses"));
});

test("selected path reads only the immutable decision and keeps the branch after later core revisions", async () => {
  const f = await fixture("listening", true);
  const path = await selectedAttemptPath(f.db, f.context, true);
  assert.equal(path.items.length, 19);
  assert.equal(path.items.at(-1).id, "branch-band-b");
  assert.equal(path.routing.state, "selected");
  f.attempt.revision = 12;
  f.rows.assessment_responses = [
    {
      attempt_id: attemptId,
      item_id: f.form.items[0].id,
      answer: { inputMethod: "unavailable", missingReason: "Later edit" },
    },
  ];
  assert.deepEqual((await selectedAttemptPath(f.db, f.context, true)).items, path.items);
  assert.ok(f.queries.every((q) => q.table === "assessment_attempt_routes"));
});

test("invalid frozen identity, malformed decision/evidence, unavailable storage and future revisions fail closed", async () => {
  for (const change of [
    (f) => (f.form.routing = null),
    (f) => (f.enrollment.program_scope = "support_units"),
    (f) => (f.attempt.form_id = "foreign"),
    (f) => (f.attempt.form_snapshot.version = "wrong"),
    (f) => (f.attempt.form_snapshot.rubricVersion = "wrong"),
    (f) => (f.rows.assessment_attempt_routes[0].decision = null),
    (f) => (f.rows.assessment_attempt_routes[0].decision.attemptId = evidenceId),
    (f) => (f.rows.assessment_attempt_routes[0].decision.sourceDigest = "bad"),
    (f) => (f.rows.assessment_attempt_routes[0].decision.branchId = "unknown"),
    (f) => (f.rows.assessment_attempt_routes[0].decision.percent = 999),
    (f) => (f.rows.assessment_attempt_routes[0].decision.reason = "unknown"),
    (f) => (f.rows.assessment_attempt_routes[0].decision.scoredCount = 999),
    (f) => (f.rows.assessment_attempt_routes[0].decision.scoredObjectives = 0),
    (f) => f.rows.assessment_attempt_routes[0].decision_revision++,
    (f) => (f.attempt.revision = 4),
    (f) => (f.errors.assessment_attempt_routes = { message: "Controlled outage" }),
  ]) {
    const f = await fixture("listening", true);
    change(f);
    await assert.rejects(selectedAttemptPath(f.db, f.context), { status: 503 });
    assert.equal(f.calls.length, 0);
  }
});

test("listening denies unselected/foreign access before storage and serves only selected frozen clip bytes", async () => {
  const f = await fixture();
  await assert.rejects(readAssessmentListening(f.db, "learner", attemptId, "branch-band-b"), {
    status: 404,
  });
  assert.equal(f.calls.length, 0);
  assert.equal(f.queries.filter((q) => q.table === "assessment_attempt_routes").length, 1);
  f.queries.length = 0;
  await assert.rejects(readAssessmentListening(f.db, "foreign", attemptId, "branch-band-b"), {
    status: 403,
  });
  assert.ok(!f.queries.some((q) => q.table === "assessment_attempt_routes"));
  const selected = await fixture("listening", true);
  await assert.rejects(
    readAssessmentListening(selected.db, "learner", attemptId, "branch-band-a"),
    { status: 404 },
  );
  assert.equal(selected.calls.length, 0);
  const response = await readAssessmentListening(
    selected.db,
    "learner",
    attemptId,
    "branch-band-b",
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test("listening rechecks active learner access after protected storage fetch", async () => {
  const f = await fixture("listening", true);
  f.onDownload = () => {
    f.enrollment.status = "paused";
  };
  await assert.rejects(readAssessmentListening(f.db, "learner", attemptId, "branch-band-b"), {
    status: 403,
  });
  assert.equal(f.calls.length, 2);
});

test("speech upload rejects an unselected item before policy/body/storage; disabled policy still blocks selected upload", async () => {
  for (const selected of [false, true]) {
    const f = await fixture("speaking", selected);
    let bodyRead = false;
    const request = {
      headers: new Headers({
        "X-Assessment-Speech": JSON.stringify({
          attemptId,
          itemId: "branch-band-b",
          revision: 4,
          policyVersion: "fixture-disabled",
          consent: true,
          mime: "audio/wav",
          durationMs: 1000,
          requestId: evidenceId,
        }),
      }),
      get body() {
        bodyRead = true;
        throw new Error("Must not read body");
      },
    };
    await assert.rejects(uploadAssessmentSpeech(f.db, "learner", request), {
      status: selected ? 409 : 400,
    });
    assert.equal(bodyRead, false);
    assert.equal(f.calls.length, 0);
    assert.equal(f.rpcs.length, 0);
    assert.equal(
      f.queries.filter((q) => q.table === "assessment_media_policies").length,
      selected ? 1 : 0,
    );
  }
});

test("speech playback requires attached selected speaking evidence before any storage download", async () => {
  for (const selected of [false, true]) {
    const f = await fixture("speaking", selected);
    const row = {
      id: evidenceId,
      attempt_id: attemptId,
      item_id: "branch-band-b",
      learner_id: "learner",
      state: "ready",
      delete_requested_at: null,
      bytes: bytes.length,
      sha256,
      mime: "audio/wav",
    };
    f.rows.assessment_speech_evidence = [row];
    f.rows.assessment_responses = [
      {
        attempt_id: attemptId,
        item_id: row.item_id,
        answer: { inputMethod: "speech_transcript", mediaEvidenceId: evidenceId },
      },
    ];
    if (!selected) {
      await assert.rejects(readAssessmentSpeech(f.db, "learner", evidenceId), { status: 404 });
      assert.equal(f.calls.length, 0);
    } else {
      const response = await readAssessmentSpeech(f.db, "learner", evidenceId);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
      row.item_id = "branch-band-a";
      f.calls.length = 0;
      await assert.rejects(readAssessmentSpeech(f.db, "learner", evidenceId), { status: 404 });
      assert.equal(f.calls.length, 0);
    }
  }
});
