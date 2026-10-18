import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";
import {
  assessmentAudioPath,
  validAssessmentAudioAsset,
  MAX_ASSESSMENT_AUDIO_BYTES,
} from "../src/lib/assessments/audio.ts";
import {
  publicAssessmentItem,
  validateFormDefinition,
  officialListeningGaps,
} from "../src/lib/assessments/form.ts";
const bytes = new Uint8Array(64);
bytes.set(new TextEncoder().encode("RIFF"));
bytes.set(new TextEncoder().encode("WAVE"), 8);
const asset = {
  sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: bytes.length,
  mime: "audio/wav",
};
const load = () =>
  loadModule("src/lib/assessments/audio-server.ts", {
    stubs: [/^@tanstack\/react-start\/server-only$/],
  });
function fixture({ publicBucket = false, blob = new Blob([bytes]), error = null } = {}) {
  const calls = [];
  const db = {
    storage: {
      getBucket: async (id) => {
        calls.push(["bucket", id]);
        return { data: { public: publicBucket }, error: null };
      },
      from: (bucket) => ({
        download: async (path) => {
          calls.push(["download", bucket, path]);
          return { data: blob, error };
        },
      }),
    },
  };
  return { db, calls };
}
test("audio references cannot select a URL, arbitrary path, MIME or unbounded file", () => {
  assert.equal(validAssessmentAudioAsset(asset), true);
  assert.match(assessmentAudioPath(asset), /^sha256\/[a-f0-9]{64}\.wav$/);
  for (const patch of [
    { sha256: "../private" },
    { bytes: MAX_ASSESSMENT_AUDIO_BYTES + 1 },
    { bytes: 0 },
    { bytes: 35.1 },
    { mime: "text/html" },
    { url: "https://example.com" },
    { sha256: "F".repeat(64) },
  ]) {
    assert.equal(validAssessmentAudioAsset({ ...asset, ...patch }), false);
    assert.throws(() => assessmentAudioPath({ ...asset, ...patch }));
  }
});
test("official forms require a private audio reference and public projection never reveals it", () => {
  const item = {
    id: "synthetic-audio",
    objectiveId: "fixture.1",
    prompt: "Fixture",
    skill: "listening",
    type: "choice",
    maximum: 1,
    options: [
      { id: "a", text: "a" },
      { id: "b", text: "b" },
      { id: "c", text: "c" },
    ],
    correctOptionId: "a",
    audioText: "Synthetic audio only",
    audioRequired: true,
    inputMethods: ["choice"],
    coverage: "module",
  };
  assert.ok(
    validateFormDefinition({ status: "verified", items: [item] }).some((gap) =>
      gap.includes("private clip"),
    ),
  );
  assert.equal(
    validateFormDefinition({ status: "verified", items: [{ ...item, audioAsset: asset }] }).some(
      (gap) => gap.includes("private clip"),
    ),
    false,
  );
  const visible = publicAssessmentItem({ ...item, audioAsset: asset });
  assert.equal("audioAsset" in visible, false);
  assert.equal("audioText" in visible, false);
  assert.deepEqual(officialListeningGaps({ items: [{ ...item, audioAsset: asset }] }), []);
  assert.deepEqual(
    officialListeningGaps({ items: [{ ...item, skill: "writing", audioRequired: false }] }),
    [],
  );
});
test("proxy requires a private bucket and exact frozen bytes/hash/signature", async () => {
  const { assessmentAudioResponse } = await load();
  const { db, calls } = fixture();
  const response = await assessmentAudioResponse(db, asset);
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(calls[1][2], assessmentAudioPath(asset));
  for (const broken of [
    fixture({ publicBucket: true }),
    fixture({ blob: new Blob([new Uint8Array(63)]) }),
    fixture({ error: { message: "missing" } }),
    fixture({ blob: new Blob([new Uint8Array(64)]) }),
  ])
    await assert.rejects(assessmentAudioResponse(broken.db, asset));
  const changed = bytes.slice();
  changed[50] = 1;
  await assert.rejects(
    assessmentAudioResponse(fixture({ blob: new Blob([changed]) }).db, asset),
    /reviewed version/,
  );
});
test("learner clip access denies admin/foreign/submitted/paused and unknown-item reads before storage", async () => {
  const { readAssessmentListening } = await load();
  const { db, calls } = fixture();
  const item = { id: "item", audioRequired: true, audioText: "Synthetic", audioAsset: asset };
  const attempt = {
    status: "in_progress",
    submitted_at: null,
    form_snapshot: { definition: { items: [item] } },
  };
  const enrollment = {
    user_id: "learner",
    scope: "team",
    status: "active",
    target_language: "Spanish",
  };
  const rows = {
    assessment_attempts: attempt,
    assessment_checkpoints: { enrollment_id: "en" },
    assessment_enrollments: enrollment,
    team_members: { role: "admin", status: "active" },
  };
  db.from = (table) => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: rows[table], error: null }),
      single: async () => ({ data: rows[table], error: null }),
    };
    return query;
  };
  await assert.rejects(readAssessmentListening(db, "admin", "attempt", "item"), /Active learner/);
  enrollment.scope = "personal";
  await assert.rejects(
    readAssessmentListening(db, "foreign", "attempt", "item"),
    /Personal assessment/,
  );
  enrollment.scope = "team";
  attempt.submitted_at = "2026-10-16T12:00:00Z";
  await assert.rejects(readAssessmentListening(db, "learner", "attempt", "item"), /Active learner/);
  attempt.submitted_at = null;
  enrollment.status = "paused";
  await assert.rejects(readAssessmentListening(db, "learner", "attempt", "item"), /Active learner/);
  enrollment.status = "active";
  await assert.rejects(readAssessmentListening(db, "learner", "attempt", "unknown"), /unavailable/);
  assert.equal(calls.length, 0);
  const response = await readAssessmentListening(db, "learner", "attempt", "item");
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  delete item.audioAsset;
  await assert.rejects(
    readAssessmentListening(db, "learner", "attempt", "item"),
    /not been published/,
  );
});
