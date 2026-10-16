import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";
import {
  MAX_SPEECH_BYTES,
  speechPolicyEnabled,
  speechSignatureMatches,
  speechObjectPath,
} from "../src/lib/assessments/speech.ts";
const learner = "10000000-0000-4000-8000-000000000001",
  evidenceId = "30000000-0000-4000-8000-000000000001";
const bytes = new Uint8Array(64);
bytes.set([0x1a, 0x45, 0xdf, 0xa3]);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const load = () =>
  loadModule("src/lib/assessments/speech-server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
function fixture({ withdrawn = false, publicBucket = false, corrupt = false } = {}) {
  const calls = [];
  const row = {
    id: evidenceId,
    attempt_id: "attempt",
    enrollment_id: "enrollment",
    learner_id: learner,
    item_id: "spoken",
    state: "ready",
    delete_requested_at: withdrawn ? "2026-10-16" : null,
    mime: "audio/webm",
    bytes: 64,
    sha256,
  };
  const tables = {
    assessment_speech_evidence: row,
    assessment_attempts: { id: "attempt", checkpoint_id: "cp", submitted_at: "2026-10-16" },
    assessment_checkpoints: { id: "cp", enrollment_id: "enrollment" },
    assessment_enrollments: { id: "enrollment", scope: "personal", user_id: learner },
    assessment_responses: {
      answer: { inputMethod: "speech_transcript", mediaEvidenceId: evidenceId },
    },
  };
  const db = {
    from(name) {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        single: async () => ({ data: tables[name] ?? null, error: null }),
        maybeSingle: async () => ({ data: tables[name] ?? null, error: null }),
      };
      return q;
    },
    storage: {
      getBucket: async () => ({
        data: { public: publicBucket, file_size_limit: MAX_SPEECH_BYTES },
        error: null,
      }),
      from: () => ({
        download: async (path) => {
          calls.push(path);
          return { data: new Blob([corrupt ? new Uint8Array(64) : bytes]), error: null };
        },
      }),
    },
  };
  return { db, calls, tables };
}
test("speech policy requires enabled collection, actual approval identity/date and bounded retention", () => {
  const policy = {
    collection_enabled: true,
    cleanup_enabled: true,
    approved_at: "2026-10-16",
    approved_by: learner,
    retention_days: 30,
  };
  assert.equal(speechPolicyEnabled(policy), true);
  for (const patch of [
    { collection_enabled: false },
    { cleanup_enabled: false },
    { approved_at: null },
    { approved_by: null },
    { retention_days: null },
    { retention_days: 0 },
    { retention_days: 91 },
    { retention_days: 1.5 },
  ])
    assert.equal(speechPolicyEnabled({ ...policy, ...patch }), false);
  assert.equal(speechPolicyEnabled(null), false);
});
test("speech IDs cannot address arbitrary objects or external URLs", () => {
  assert.equal(speechObjectPath(evidenceId), `evidence/${evidenceId}`);
  for (const value of ["../object", "https://example.com", "", evidenceId + "/extra"])
    assert.throws(() => speechObjectPath(value));
});
test("recording file signatures and minimum length reject mislabeled or incomplete content", () => {
  assert.equal(speechSignatureMatches(bytes, "audio/webm"), true);
  for (const mime of ["audio/ogg", "audio/mp4", "audio/wav", "text/html"])
    assert.equal(speechSignatureMatches(bytes, mime), false);
  assert.equal(speechSignatureMatches(bytes.slice(0, 8), "audio/webm"), false);
});
test("chunked speech bodies are bounded even without content-length", async () => {
  const { boundedSpeechBody } = await load();
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(MAX_SPEECH_BYTES));
      c.enqueue(new Uint8Array(1));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    () =>
      boundedSpeechBody(
        new Request("https://example.com", { method: "POST", body: stream, duplex: "half" }),
      ),
    /exceeds 4 MiB/,
  );
  assert.equal(cancelled, true);
});
test("invalid declared length and empty speech bodies cannot be attached", async () => {
  const { boundedSpeechBody } = await load();
  await assert.rejects(
    () =>
      boundedSpeechBody(
        new Request("https://example.com", {
          method: "POST",
          headers: { "content-length": String(MAX_SPEECH_BYTES + 1) },
          body: "x",
        }),
      ),
    /exceeds/,
  );
  await assert.rejects(
    () => boundedSpeechBody(new Request("https://example.com", { method: "POST", body: "small" })),
    /empty or incomplete/,
  );
});
test("learner playback verifies bytes and returns no-store media without paths", async () => {
  const { readAssessmentSpeech } = await load();
  const f = fixture();
  const response = await readAssessmentSpeech(f.db, learner, evidenceId);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("content-type"), "audio/webm");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get("location"), null);
});
test("unrelated account cannot trigger recording storage reads", async () => {
  const { readAssessmentSpeech } = await load();
  const f = fixture();
  await assert.rejects(
    () => readAssessmentSpeech(f.db, "unrelated", evidenceId),
    /access required/,
  );
  assert.equal(f.calls.length, 0);
});
test("withdrawn or detached evidence never reaches playback", async () => {
  const { readAssessmentSpeech } = await load();
  const withdrawn = fixture({ withdrawn: true });
  await assert.rejects(
    () => readAssessmentSpeech(withdrawn.db, learner, evidenceId),
    /unavailable/,
  );
  assert.equal(withdrawn.calls.length, 0);
  const detached = fixture();
  detached.tables.assessment_responses.answer.mediaEvidenceId = "another";
  await assert.rejects(
    () => readAssessmentSpeech(detached.db, learner, evidenceId),
    /not the submitted response/,
  );
  assert.equal(detached.calls.length, 0);
});
test("public storage and corrupted recording fail closed", async () => {
  const { readAssessmentSpeech } = await load();
  for (const options of [{ publicBucket: true }, { corrupt: true }]) {
    const f = fixture(options);
    await assert.rejects(
      () => readAssessmentSpeech(f.db, learner, evidenceId),
      /unavailable|verification failed/,
    );
  }
});
test("withdrawal during storage fetch prevents a response from being served", async () => {
  const { readAssessmentSpeech } = await load();
  const f = fixture();
  f.db.storage.from = () => ({
    download: async () => {
      f.tables.assessment_speech_evidence.delete_requested_at = "now";
      return { data: new Blob([bytes]), error: null };
    },
  });
  await assert.rejects(() => readAssessmentSpeech(f.db, learner, evidenceId), /unavailable/);
});

test("disabled policy rejects upload before reading a stream or writing storage", async () => {
  const { uploadAssessmentSpeech } = await load();
  const f = fixture();
  f.tables.assessment_attempts.status = "in_progress";
  f.tables.assessment_attempts.submitted_at = null;
  f.tables.assessment_enrollments.status = "active";
  let read = false;
  const fakeRequest = {
    headers: new Headers({
      "X-Assessment-Speech": JSON.stringify({
        attemptId: learner,
        itemId: "spoken",
        revision: 0,
        policyVersion: "assessment-speech-pending-v1",
        consent: true,
        mime: "audio/webm",
        durationMs: 1000,
        requestId: evidenceId,
      }),
    }),
    get body() {
      read = true;
      throw new Error("must not read");
    },
  };
  await assert.rejects(
    () => uploadAssessmentSpeech(f.db, learner, fakeRequest),
    /policy is not enabled/,
  );
  assert.equal(read, false);
  assert.equal(f.calls.length, 0);
});

test("cleanup defaults to dry run and never touches storage", async () => {
  const { cleanupAssessmentSpeech } = await loadModule(
    "src/lib/assessments/speech-cleanup-server.ts",
    { stubs: [/^@tanstack\/react-start\/server-only$/] },
  );
  let storageUsed = false;
  const db = {
    from() {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        not: async () => ({ data: [], error: null }),
      };
      return q;
    },
    get storage() {
      storageUsed = true;
      throw new Error("must not touch storage");
    },
  };
  assert.deepEqual(await cleanupAssessmentSpeech(db), {
    dryRun: true,
    enabledPolicies: 0,
    deleted: 0,
  });
  assert.equal(storageUsed, false);
});
test("failed object deletion leaves a retryable tombstone, never a false deletion record", async () => {
  const { cleanupAssessmentSpeech } = await loadModule(
    "src/lib/assessments/speech-cleanup-server.ts",
    { stubs: [/^@tanstack\/react-start\/server-only$/] },
  );
  const calls = [];
  const db = {
    rpc: async (name) => {
      calls.push(name);
      return { data: [{ id: evidenceId }], error: null };
    },
    storage: {
      getBucket: async () => ({
        data: { public: false, file_size_limit: MAX_SPEECH_BYTES },
        error: null,
      }),
      from: () => ({ remove: async () => ({ error: new Error("retry later") }) }),
    },
  };
  assert.deepEqual(await cleanupAssessmentSpeech(db, true), {
    dryRun: false,
    selected: 1,
    deleted: 0,
  });
  assert.deepEqual(calls, ["assessment_claim_speech_cleanup"]);
});
test("cleanup records deletion only after private object removal succeeds", async () => {
  const { cleanupAssessmentSpeech } = await loadModule(
    "src/lib/assessments/speech-cleanup-server.ts",
    { stubs: [/^@tanstack\/react-start\/server-only$/] },
  );
  const calls = [];
  const db = {
    rpc: async (name) => {
      calls.push(name);
      return {
        data: name === "assessment_claim_speech_cleanup" ? [{ id: evidenceId }] : null,
        error: null,
      };
    },
    storage: {
      getBucket: async () => ({
        data: { public: false, file_size_limit: MAX_SPEECH_BYTES },
        error: null,
      }),
      from: () => ({
        remove: async (paths) => {
          assert.deepEqual(paths, [speechObjectPath(evidenceId)]);
          calls.push("object.removed");
          return { error: null };
        },
      }),
    },
  };
  assert.deepEqual(await cleanupAssessmentSpeech(db, true), {
    dryRun: false,
    selected: 1,
    deleted: 1,
  });
  assert.deepEqual(calls, [
    "assessment_claim_speech_cleanup",
    "object.removed",
    "assessment_finish_speech_cleanup",
  ]);
});
