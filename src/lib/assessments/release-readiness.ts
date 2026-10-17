import { hasAdaptiveRouting } from "./routing-contract";
import {
  lessonReviewSnapshot,
  lessonReviewFingerprint,
  type LessonReviewSnapshot,
} from "@/lib/lesson-review";
import { lessonSourceCoverage } from "@/lib/lesson-source-coverage";

export interface LessonReleaseRecord {
  module_id: string;
  target_language: string;
  instruction_language: string;
  status: string;
  lesson_manifest: { reviewed?: boolean; lessonSnapshotFingerprint?: string } | null;
}

export interface FrozenLessonRecord {
  snapshot_text: string;
  fingerprint: string;
}

/** Shared by the catalog, enrollment availability and new official attempts.
 * Review work and archived attempts intentionally do not require a complete release.
 */
export async function lessonReleaseReadiness(
  release: LessonReleaseRecord,
  binding: FrozenLessonRecord | null | undefined,
) {
  const coverage = lessonSourceCoverage(
    release.module_id,
    release.target_language,
    release.instruction_language,
  );
  let current = false;
  if (binding && binding.fingerprint === release.lesson_manifest?.lessonSnapshotFingerprint) {
    try {
      const frozen = JSON.parse(binding.snapshot_text) as LessonReviewSnapshot;
      const source = lessonReviewSnapshot(
        release.module_id,
        release.target_language,
        release.instruction_language,
      );
      current = !!(
        frozen.schema === 1 &&
        Array.isArray(frozen.lessons) &&
        source &&
        binding.fingerprint === (await lessonReviewFingerprint(frozen)) &&
        binding.fingerprint === (await lessonReviewFingerprint(source))
      );
    } catch {
      // Corrupt or obsolete stored material must never advertise availability.
      current = false;
    }
  }
  const reviewed = current && release.lesson_manifest?.reviewed === true;
  return {
    coverage,
    current,
    reviewed,
    available: release.status === "verified" && reviewed && coverage.structurallyComplete,
  };
}

export function officialFormAvailable(form: {
  status: string;
  calibrated?: boolean;
  definition?: unknown;
}) {
  return (
    form.status === "verified" && form.calibrated === true && !hasAdaptiveRouting(form.definition)
  );
}
