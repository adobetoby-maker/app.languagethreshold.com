import { assessmentAuditSummary } from "./audit";
import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, enrollmentAccess, rpc } from "./server";
import { summarizedAttempt, type AttemptSummary, type RawExamAttempt } from "./reporting";
import type { Checkpoint } from "./core";
/** Keyset-paged attempts; preserve the original entrance baseline for every comparison. */
export async function checkpointAttemptHistory(
  db: TeamDb,
  actor: string,
  checkpointId: string,
  before?: number,
) {
  const checkpoint = await db
    .from("assessment_checkpoints")
    .select("id,enrollment_id,checkpoint")
    .eq("id", checkpointId)
    .maybeSingle();
  if (checkpoint.error)
    throw new AssessmentAccessError("Checkpoint history could not be loaded.", 503);
  if (!checkpoint.data) throw new AssessmentAccessError("Checkpoint was not found.", 404);
  const cp = checkpoint.data;
  await enrollmentAccess(db, actor, cp.enrollment_id);
  let query = db
    .from("assessment_attempts")
    .select(
      "id,checkpoint_id,attempt_number,form_id,status,revision,started_at,submitted_at,designated",
    )
    .eq("checkpoint_id", checkpointId)
    .order("attempt_number", { ascending: false })
    .limit(21);
  if (before !== undefined) query = query.lt("attempt_number", before);
  const result = await query;
  if (result.error) throw new AssessmentAccessError("Attempt history could not be loaded.", 503);
  const attempts = (result.data ?? []).slice(0, 20) as RawExamAttempt[];
  const baselineResult = await db
    .from("assessment_attempts")
    .select("id,assessment_checkpoints!inner(enrollment_id,checkpoint)")
    .eq("assessment_checkpoints.enrollment_id", cp.enrollment_id)
    .eq("assessment_checkpoints.checkpoint", "entrance")
    .eq("designated", true)
    .not("submitted_at", "is", null)
    .order("attempt_number")
    .limit(1);
  if (baselineResult.error)
    throw new AssessmentAccessError("The original baseline could not be loaded.", 503);
  const baselineId = baselineResult.data?.[0]?.id;
  const summaries = await rpc<AttemptSummary[]>(db, "assessment_selected_summaries", {
    p_actor: actor,
    p_enrollments: [cp.enrollment_id],
    p_attempts: [
      ...new Set([...attempts.map((row) => row.id), ...(baselineId ? [baselineId] : [])]),
    ],
  });
  const baseline = summaries.find((row) => row.attemptId === baselineId);
  return {
    items: attempts.map((row) =>
      summarizedAttempt(
        cp.checkpoint as Checkpoint,
        row,
        summaries.find((summary) => summary.attemptId === row.id),
        baseline,
      ),
    ),
    hasMore: (result.data?.length ?? 0) > 20,
    nextCursor: attempts.length ? { before: String(attempts.at(-1)!.attempt_number) } : null,
    limit: 20,
  };
}
/** Audit summaries are deliberately whitelisted; payload hashes, drafts and private forms stay server-side. */
export async function assessmentAuditHistory(
  db: TeamDb,
  actor: string,
  enrollmentId: string,
  after?: string,
  afterId?: string,
) {
  await enrollmentAccess(db, actor, enrollmentId);
  if (!!after !== !!afterId)
    throw new AssessmentAccessError("Provide the complete history cursor.", 400);
  let query = db
    .from("assessment_events")
    .select("id,actor_id,action,created_at,detail")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(21);
  if (after && afterId)
    query = query.or(`created_at.lt.${after},and(created_at.eq.${after},id.lt.${afterId})`);
  const result = await query;
  if (result.error) throw new AssessmentAccessError("Plan history could not be loaded.", 503);
  const page = (result.data ?? []).slice(0, 20);
  return {
    items: page.map((row) => assessmentAuditSummary(row, actor)),
    hasMore: (result.data?.length ?? 0) > 20,
    nextCursor: page.length ? { after: page.at(-1)!.created_at, afterId: page.at(-1)!.id } : null,
    limit: 20,
  };
}
