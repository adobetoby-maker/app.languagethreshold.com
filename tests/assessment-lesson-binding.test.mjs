import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";

const { lessonReviewSnapshot, lessonReviewFingerprint, serializeLessonReviewSnapshot } = await loadModule("src/lib/lesson-review.ts");
const { boundLessonSnapshot, requireCurrentLessonBinding } = await loadModule("src/lib/assessments/lesson-binding.ts", {stubs: [/^@tanstack\/react-start\/server-only$/]});
const { readinessCatalog } = await loadModule("src/lib/assessments/server.ts", {stubs: [/^@tanstack\/react-start\/server-only$/]});

async function fixture() {
  const snapshot = lessonReviewSnapshot("roofing", "Spanish", "English");
  const fingerprint = await lessonReviewFingerprint(snapshot);
  const release = { id: "fixture-release", module_id: "roofing", target_language: "Spanish", instruction_language: "English", status: "verified", lesson_manifest: { reviewed: true, offlineVerified: true, lessonSnapshotFingerprint: fingerprint }, review_records: [{}, {}, {}] };
  const binding = {release_id: release.id, fingerprint, snapshot_text: serializeLessonReviewSnapshot(snapshot), created_at: "2026-10-16T00:00:00Z"};
  const rows = {assessment_releases: release, assessment_lesson_snapshots: binding};
  const errors = {};
  const forms = ["entrance", "day45", "day90"].map((checkpoint) => ({release_id: release.id, checkpoint, status: "verified", calibrated: true}));
  const db = {from(table) {
    const query = {select() {return query;}, eq() {return query;}, in() {return query;}, order() {return query;},
      async maybeSingle() {return {data: rows[table], error: errors[table] ?? null};},
      then(resolve, reject) {return Promise.resolve({data: table === "assessment_forms" ? forms : rows[table] ? [rows[table]] : [], error: errors[table] ?? null}).then(resolve, reject);}};
    return query;
  }};
  return {db, rows, errors, snapshot};
}

test("official eligibility requires the exact frozen material, manifest reference and current app to agree", async () => {
  const f = await fixture();
  const bound = await requireCurrentLessonBinding(f.db, "fixture-release");
  assert.deepEqual(bound.snapshot, f.snapshot);
  const catalog = await readinessCatalog(f.db, "Spanish", "English");
  assert.equal(catalog.find((track) => track.moduleId === "roofing").status, "verified");
  assert.equal(catalog.find((track) => track.moduleId === "roofing").offlineVerified, true);
});

test("edited lesson material remains archived but blocks current approval/exam eligibility and readiness claims", async () => {
  const f = await fixture();
  f.snapshot.lessons[0].words[0].es += " changed";
  const old = f.rows.assessment_lesson_snapshots;
  old.fingerprint = await lessonReviewFingerprint(f.snapshot);
  old.snapshot_text = serializeLessonReviewSnapshot(f.snapshot);
  f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = old.fingerprint;
  assert.deepEqual((await boundLessonSnapshot(f.db, "fixture-release")).snapshot, f.snapshot);
  await assert.rejects(requireCurrentLessonBinding(f.db, "fixture-release"), (error) => error.status === 409);
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find((track) => track.moduleId === "roofing");
  assert.equal(track.status, "upgrade_in_progress");
  assert.equal(track.lessonsReviewed, false);
  assert.equal(track.offlineVerified, false);
});

test("reviewed matching lessons can show progress before the exam release is verified", async () => {
  const f = await fixture();
  f.rows.assessment_releases.status = "draft";
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find((track) => track.moduleId === "roofing");
  assert.equal(track.lessonsReviewed, true);
  assert.equal(track.lessonSnapshotCurrent, true);
  assert.equal(track.status, "upgrade_in_progress");
  assert.equal(track.offlineVerified, false);
});

test("missing binding, substituted manifest reference and corrupted bytes cannot pass the integrity gate", async () => {
  for (const mutate of [
    (f) => {f.rows.assessment_lesson_snapshots = null;},
    (f) => {f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = "0".repeat(64);},
    (f) => {f.rows.assessment_lesson_snapshots.snapshot_text = "{}";},
  ]) {
    const f = await fixture(); mutate(f);
    await assert.rejects(requireCurrentLessonBinding(f.db, "fixture-release"), (error) => [409, 503].includes(error.status));
  }
});

test("snapshot database failures stay unavailable rather than being reported as a successful match", async () => {
  const f = await fixture();
  f.errors.assessment_lesson_snapshots = {message: "fixture unavailable"};
  await assert.rejects(boundLessonSnapshot(f.db, "fixture-release"), (error) => error.status === 503);
  await assert.rejects(readinessCatalog(f.db, "Spanish", "English"), (error) => error.status === 503);
});
