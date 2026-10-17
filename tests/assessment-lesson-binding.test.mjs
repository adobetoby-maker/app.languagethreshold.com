import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";

const { lessonReviewSnapshot, lessonReviewFingerprint, serializeLessonReviewSnapshot } =
  await loadModule("src/lib/lesson-review.ts");
const { boundLessonSnapshot, requireCurrentLessonBinding } = await loadModule(
  "src/lib/assessments/lesson-binding.ts",
  { stubs: [/^@tanstack\/react-start\/server-only$/] },
);
const { readinessCatalog, listEnrollments } = await loadModule("src/lib/assessments/server.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});

async function fixture() {
  const snapshot = lessonReviewSnapshot("roofing", "Spanish", "English");
  const fingerprint = await lessonReviewFingerprint(snapshot);
  const release = {
    id: "fixture-release",
    module_id: "roofing",
    target_language: "Spanish",
    instruction_language: "English",
    status: "verified",
    lesson_manifest: {
      reviewed: true,
      offlineVerified: true,
      lessonSnapshotFingerprint: fingerprint,
    },
    review_records: [{}, {}, {}],
  };
  const binding = {
    release_id: release.id,
    fingerprint,
    snapshot_text: serializeLessonReviewSnapshot(snapshot),
    created_at: "2026-10-16T00:00:00Z",
  };
  const rows = { assessment_releases: release, assessment_lesson_snapshots: binding };
  const errors = {};
  const forms = ["entrance", "day45", "day90"].map((checkpoint) => ({
    release_id: release.id,
    checkpoint,
    status: "verified",
    calibrated: true,
  }));
  const page = {
    enrollments: [{ id: "enrollment", release_id: release.id }],
    checkpoints: ["entrance", "day45", "day90"].map((checkpoint) => ({
      id: checkpoint,
      enrollment_id: "enrollment",
      checkpoint,
    })),
    attempts: [],
    hasMore: false,
    nextCursor: null,
  };
  const db = {
    async rpc(name) {
      return { data: name === "assessment_overview_page" ? page : [], error: null };
    },
    from(table) {
      let flatOnly = false;
      const query = {
        select() {
          return query;
        },
        is(column, value) {
          assert.equal(column, "definition->routing");
          assert.equal(value, null);
          flatOnly = true;
          return query;
        },
        eq() {
          return query;
        },
        in() {
          return query;
        },
        order() {
          return query;
        },
        async maybeSingle() {
          return { data: rows[table], error: errors[table] ?? null };
        },
        then(resolve, reject) {
          return Promise.resolve({
            data:
              table === "assessment_forms"
                ? forms.filter(
                    (form) =>
                      !flatOnly ||
                      !Object.prototype.hasOwnProperty.call(form.definition ?? {}, "routing"),
                  )
                : rows[table]
                  ? [rows[table]]
                  : [],
            error: errors[table] ?? null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, rows, errors, snapshot, forms };
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
  await assert.rejects(
    requireCurrentLessonBinding(f.db, "fixture-release"),
    (error) => error.status === 409,
  );
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
    (track) => track.moduleId === "roofing",
  );
  assert.equal(track.status, "upgrade_in_progress");
  assert.equal(track.lessonsReviewed, false);
  assert.equal(track.offlineVerified, false);
});

test("reviewed matching lessons can show progress before the exam release is verified", async () => {
  const f = await fixture();
  f.rows.assessment_releases.status = "draft";
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
    (track) => track.moduleId === "roofing",
  );
  assert.equal(track.lessonsReviewed, true);
  assert.equal(track.lessonSnapshotCurrent, true);
  assert.equal(track.status, "upgrade_in_progress");
  assert.equal(track.offlineVerified, false);
});

test("missing binding, substituted manifest reference and corrupted bytes cannot pass the integrity gate", async () => {
  for (const mutate of [
    (f) => {
      f.rows.assessment_lesson_snapshots = null;
    },
    (f) => {
      f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = "0".repeat(64);
    },
    (f) => {
      f.rows.assessment_lesson_snapshots.snapshot_text = "{}";
    },
  ]) {
    const f = await fixture();
    mutate(f);
    await assert.rejects(requireCurrentLessonBinding(f.db, "fixture-release"), (error) =>
      [409, 503].includes(error.status),
    );
  }
});

test("snapshot database failures stay unavailable rather than being reported as a successful match", async () => {
  const f = await fixture();
  f.errors.assessment_lesson_snapshots = { message: "fixture unavailable" };
  await assert.rejects(
    boundLessonSnapshot(f.db, "fixture-release"),
    (error) => error.status === 503,
  );
  await assert.rejects(
    readinessCatalog(f.db, "Spanish", "English"),
    (error) => error.status === 503,
  );
});

test("a claimed verified release cannot hide missing lesson source mappings", async () => {
  const f = await fixture();
  f.rows.assessment_releases.module_id = "landscaper";
  f.rows.assessment_releases.target_language = "French";
  const snapshot = lessonReviewSnapshot("landscaper", "French", "English");
  const fingerprint = await lessonReviewFingerprint(snapshot);
  f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = fingerprint;
  f.rows.assessment_lesson_snapshots.fingerprint = fingerprint;
  f.rows.assessment_lesson_snapshots.snapshot_text = serializeLessonReviewSnapshot(snapshot);
  const catalog = await readinessCatalog(f.db, "French", "English");
  const land = catalog.find((track) => track.moduleId === "landscaper");
  assert.equal(land.lessonsReviewed, true); // Deliberately fictional DB review claim.
  assert.equal(land.authoredLessonLists, 0);
  assert.equal(land.contextualPassages, 0);
  assert.equal(land.sourceCoverage.lessonsWithTeachingSettings, 0);
  assert.equal(land.sourceCoverage.missingWordLists.length, 30);
  assert.equal(land.status, "upgrade_in_progress");
  assert.equal(land.offlineVerified, false);
});

test("complete reviewed current lessons and a calibrated form agree across enrollment, catalog and official start", async () => {
  const f = await fixture();
  const plans = await listEnrollments(f.db, "actor");
  assert.deepEqual(
    plans.enrollments[0].checkpoints.map((cp) => cp.ready),
    [true, true, true],
  );
  await requireCurrentLessonBinding(f.db, "fixture-release", { officialStart: true });
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
    (row) => row.moduleId === "roofing",
  );
  assert.equal(track.status, "verified");
});

test("missing source coverage blocks new official attempts and enrollment availability but preserves partial review", async () => {
  const f = await fixture();
  f.rows.assessment_releases.module_id = "landscaper";
  f.rows.assessment_releases.target_language = "French";
  const snapshot = lessonReviewSnapshot("landscaper", "French", "English");
  const fingerprint = await lessonReviewFingerprint(snapshot);
  f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = fingerprint;
  Object.assign(f.rows.assessment_lesson_snapshots, {
    fingerprint,
    snapshot_text: serializeLessonReviewSnapshot(snapshot),
  });
  assert.deepEqual((await requireCurrentLessonBinding(f.db, "fixture-release")).snapshot, snapshot);
  await assert.rejects(
    requireCurrentLessonBinding(f.db, "fixture-release", { officialStart: true }),
    (error) => error.status === 409 && /complete, reviewed/.test(error.message),
  );
  const plans = await listEnrollments(f.db, "actor");
  assert.equal(
    plans.enrollments[0].checkpoints.some((cp) => cp.ready),
    false,
  );
});

test("draft, withdrawn review and stale lessons never advertise available checkpoints", async () => {
  for (const mutate of [
    (f) => {
      f.rows.assessment_releases.status = "draft";
    },
    (f) => {
      f.rows.assessment_releases.lesson_manifest.reviewed = false;
    },
    (f) => {
      f.rows.assessment_releases.lesson_manifest.lessonSnapshotFingerprint = "0".repeat(64);
    },
  ]) {
    const f = await fixture();
    mutate(f);
    const plans = await listEnrollments(f.db, "actor");
    assert.equal(
      plans.enrollments[0].checkpoints.some((cp) => cp.ready),
      false,
    );
    await assert.rejects(
      requireCurrentLessonBinding(f.db, "fixture-release", { officialStart: true }),
      (error) => error.status === 409,
    );
  }
});

test("an uncalibrated verified form is unavailable and keeps the full track pending", async () => {
  const f = await fixture();
  f.forms[1].calibrated = false;
  const plans = await listEnrollments(f.db, "actor");
  assert.deepEqual(
    plans.enrollments[0].checkpoints.map((cp) => cp.ready),
    [true, false, true],
  );
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
    (row) => row.moduleId === "roofing",
  );
  assert.equal(track.status, "upgrade_in_progress");
  assert.equal(track.calibrated, false);
  assert.equal(track.offlineVerified, false);
});

test("matching fingerprint labels cannot hide corrupted frozen bytes in the catalog or enrollment", async () => {
  const f = await fixture();
  f.rows.assessment_lesson_snapshots.snapshot_text = "{}";
  const plans = await listEnrollments(f.db, "actor");
  assert.equal(
    plans.enrollments[0].checkpoints.some((cp) => cp.ready),
    false,
  );
  const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
    (row) => row.moduleId === "roofing",
  );
  assert.equal(track.lessonSnapshotCurrent, false);
  assert.equal(track.status, "upgrade_in_progress");
});

test("enrollment binding lookup errors remain unavailable rather than guessed from stored status", async () => {
  const f = await fixture();
  f.errors.assessment_lesson_snapshots = { message: "fixture offline" };
  await assert.rejects(listEnrollments(f.db, "actor"), (error) => error.status === 503);
});

test("a reviewed release cannot advertise an unsupported adaptive form as a complete calibrated track", async () => {
  for (const routing of [null, { schema: 1 }]) {
    const f = await fixture();
    f.forms[1].definition = { routing };
    const plans = await listEnrollments(f.db, "actor");
    assert.deepEqual(
      plans.enrollments[0].checkpoints.map((cp) => cp.ready),
      [true, false, true],
    );
    const track = (await readinessCatalog(f.db, "Spanish", "English")).find(
      (row) => row.moduleId === "roofing",
    );
    assert.equal(track.calibrated, false);
    assert.equal(track.status, "upgrade_in_progress");
  }
});
