import { currentLessonReviewSnapshot } from "@/lib/lesson-review-server";
import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { lessonReviewFingerprint, type LessonReviewSnapshot } from "@/lib/lesson-review";
import { AssessmentAccessError } from "./server";
import { lessonReleaseReadiness, type LessonReleaseRecord } from "./release-readiness";

export interface BoundLessonSnapshot {
  snapshot: LessonReviewSnapshot;
  fingerprint: string;
  createdAt: string;
}

export async function boundLessonSnapshot(
  db: TeamDb,
  releaseId: string,
): Promise<BoundLessonSnapshot | null> {
  const result = await db
    .from("assessment_lesson_snapshots")
    .select("snapshot_text,fingerprint,created_at")
    .eq("release_id", releaseId)
    .maybeSingle();
  if (result.error)
    throw new AssessmentAccessError("Frozen lesson material could not be loaded.", 503);
  if (!result.data) return null;
  try {
    const snapshot = JSON.parse(result.data.snapshot_text) as LessonReviewSnapshot;
    if (
      snapshot.schema !== 1 ||
      !Array.isArray(snapshot.lessons) ||
      (await lessonReviewFingerprint(snapshot)) !== result.data.fingerprint
    )
      throw new Error("Invalid snapshot");
    return { snapshot, fingerprint: result.data.fingerprint, createdAt: result.data.created_at };
  } catch {
    throw new AssessmentAccessError("Frozen lesson material failed its integrity check.", 503);
  }
}

export async function requireCurrentLessonBinding(
  db: TeamDb,
  releaseId: string,
  options: { officialStart?: boolean; release?: LessonReleaseRecord & { id: string } } = {},
): Promise<BoundLessonSnapshot> {
  if (options.release && options.release.id !== releaseId)
    throw new AssessmentAccessError("Lesson release changed.", 409);
  const release = options.release
    ? { data: options.release, error: null }
    : await db
        .from("assessment_releases")
        .select("module_id,target_language,instruction_language,status,lesson_manifest")
        .eq("id", releaseId)
        .maybeSingle();
  if (release.error) throw new AssessmentAccessError("Lesson release could not be checked.", 503);
  if (!release.data) throw new AssessmentAccessError("Lesson release was not found.", 404);
  const bound = await boundLessonSnapshot(db, releaseId);
  const current = currentLessonReviewSnapshot(
    release.data.module_id,
    release.data.target_language,
    release.data.instruction_language,
  );
  if (
    !bound ||
    !current ||
    bound.fingerprint !== release.data.lesson_manifest?.lessonSnapshotFingerprint ||
    bound.fingerprint !== (await lessonReviewFingerprint(current))
  ) {
    throw new AssessmentAccessError(
      "Lesson content has changed or has not been frozen for this release. A current reviewed release is required.",
      409,
    );
  }
  if (options.officialStart) {
    const readiness = await lessonReleaseReadiness(release.data, {
      snapshot_text: JSON.stringify(bound.snapshot),
      fingerprint: bound.fingerprint,
    });
    if (!readiness.available)
      throw new AssessmentAccessError(
        "This module needs complete, reviewed lesson material before an official exam can start.",
        409,
      );
  }
  return bound;
}
