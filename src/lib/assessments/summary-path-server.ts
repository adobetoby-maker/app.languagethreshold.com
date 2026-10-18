import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import type { AttemptSummary } from "./reporting";
import { AssessmentAccessError } from "./errors";
import { hasAdaptiveRouting } from "./routing-contract";
import { resolveSelectedAttemptPath, normalizePathEvidence } from "./routing-path-server";

const unavailable = () =>
  new AssessmentAccessError("Selected assessment report could not be checked.", 503);

/** Called only after the authorized selected-summaries RPC. No response answers are read.
 * Discover adaptive snapshots without downloading flat private forms; then process
 * at most ten frozen definitions at a time. Never return a partial report.
 */
export async function normalizeAdaptiveSummaries(
  db: TeamDb,
  summaries: AttemptSummary[],
  enrollmentIds: readonly string[],
  attemptIds: readonly string[],
) {
  if (
    !Array.isArray(summaries) ||
    summaries.length > 600 ||
    new Set(summaries.map((s) => s.attemptId)).size !== summaries.length ||
    summaries.some((s) => !attemptIds.includes(s.attemptId))
  )
    throw unavailable();
  if (!summaries.length) return { summaries, adaptive: false };
  const discovery = await db
    .from("assessment_attempts")
    .select("id")
    .in(
      "id",
      summaries.map((s) => s.attemptId),
    )
    .not("form_snapshot->definition->routing", "is", null)
    .limit(601);
  if (
    discovery.error ||
    !Array.isArray(discovery.data) ||
    discovery.data.length > summaries.length ||
    new Set(discovery.data.map((a) => a.id)).size !== discovery.data.length ||
    discovery.data.some((a) => !summaries.some((s) => s.attemptId === a.id))
  )
    throw unavailable();
  if (!discovery.data.length) return { summaries, adaptive: false };
  const enrollments = await db
    .from("assessment_enrollments")
    .select("id,program_scope")
    .in("id", [...enrollmentIds])
    .limit(51);
  if (
    enrollments.error ||
    !Array.isArray(enrollments.data) ||
    enrollments.data.length > enrollmentIds.length ||
    new Set(enrollments.data.map((e) => e.id)).size !== enrollments.data.length ||
    enrollments.data.some((e) => !enrollmentIds.includes(e.id))
  )
    throw unavailable();
  const normalized = new Map<string, AttemptSummary>();
  for (let offset = 0; offset < discovery.data.length; offset += 10) {
    const ids = discovery.data.slice(offset, offset + 10).map((a) => a.id);
    const attempts = await db
      .from("assessment_attempts")
      .select("id,checkpoint_id,form_id,revision,status,submitted_at,form_snapshot")
      .in("id", ids)
      .limit(11);
    if (
      attempts.error ||
      !Array.isArray(attempts.data) ||
      attempts.data.length !== ids.length ||
      new Set(attempts.data.map((a) => a.id)).size !== ids.length ||
      attempts.data.some((a) => !ids.includes(a.id))
    )
      throw unavailable();
    const cpIds = [...new Set(attempts.data.map((a) => a.checkpoint_id))];
    const [checkpoints, routes] = await Promise.all([
      db
        .from("assessment_checkpoints")
        .select("id,enrollment_id,checkpoint")
        .in("id", cpIds)
        .limit(11),
      db
        .from("assessment_attempt_routes")
        .select("attempt_id,source_revision,decision_revision,decision")
        .in("attempt_id", ids)
        .limit(11),
    ]);
    if (
      checkpoints.error ||
      routes.error ||
      !Array.isArray(checkpoints.data) ||
      !Array.isArray(routes.data) ||
      checkpoints.data.length !== cpIds.length ||
      new Set(checkpoints.data.map((c) => c.id)).size !== cpIds.length ||
      checkpoints.data.some((c) => !cpIds.includes(c.id)) ||
      routes.data.length !== ids.length ||
      new Set(routes.data.map((r) => r.attempt_id)).size !== ids.length ||
      routes.data.some((r) => !ids.includes(r.attempt_id))
    )
      throw unavailable();
    for (const attempt of attempts.data) {
      const summary = summaries.find((s) => s.attemptId === attempt.id)!;
      const checkpoint = checkpoints.data.find((c) => c.id === attempt.checkpoint_id);
      const enrollment = enrollments.data.find((e) => e.id === checkpoint?.enrollment_id);
      if (
        !enrollment ||
        !checkpoint ||
        !attempt.submitted_at ||
        !hasAdaptiveRouting(attempt.form_snapshot?.definition) ||
        checkpoint.checkpoint !== summary.checkpoint ||
        attempt.form_snapshot.definition.checkpoint !== checkpoint.checkpoint ||
        summary.calibrated !== (attempt.form_snapshot.calibrated === true) ||
        summary.equivalenceApproved !== (attempt.form_snapshot.equivalenceApproved === true) ||
        summary.equivalenceGroup !== (attempt.form_snapshot.equivalenceGroup ?? null)
      )
        throw unavailable();
      try {
        const path = resolveSelectedAttemptPath(
          { attempt, checkpoint, enrollment },
          routes.data.find((r) => r.attempt_id === attempt.id)!,
          true,
        );
        normalized.set(attempt.id, {
          ...summary,
          evidence: normalizePathEvidence(path, summary.evidence),
        });
      } catch {
        throw unavailable();
      }
    }
  }
  return { summaries: summaries.map((s) => normalized.get(s.attemptId) ?? s), adaptive: true };
}
