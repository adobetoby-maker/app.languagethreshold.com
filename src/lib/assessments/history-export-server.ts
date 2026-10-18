import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, enrollmentAccess } from "./server";
import { assessmentAuditSummary, type AssessmentAuditSummary } from "./audit";
import { assessmentCsv } from "./export";
const PAGE = 500,
  MAX_EVENTS = 10000;
interface FrozenAssignment {
  id: string;
  capability_snapshot: unknown;
  mode: string;
  primary_weekly_minutes: number;
  support_weekly_minutes: number;
  support_cap_percent: number;
}
/** Complete bounded keyset scan. Build no downloadable file until every read and final authorization succeeds. */
export async function assessmentHistoryCsv(
  db: TeamDb,
  actor: string,
  enrollmentId: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const enrollment = await enrollmentAccess(db, actor, enrollmentId);
  const rows: AssessmentAuditSummary[] = [],
    seen = new Set<string>();
  let cursor: { createdAt: string; id: string } | null = null;
  while (true) {
    signal?.throwIfAborted();
    let query = db
      .from("assessment_events")
      .select("id,actor_id,action,created_at,detail")
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE + 1);
    if (cursor)
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    const result = await query;
    if (result.error)
      throw new AssessmentAccessError(
        "Complete plan history could not be exported. No partial file was created.",
        503,
      );
    const page = (result.data ?? []).slice(0, PAGE);
    for (const row of page) {
      if (seen.has(row.id))
        throw new AssessmentAccessError(
          "History changed while exporting. Refresh and retry; no partial file was created.",
          409,
        );
      seen.add(row.id);
      rows.push(assessmentAuditSummary(row, actor));
    }
    if (
      rows.length > MAX_EVENTS ||
      (rows.length === MAX_EVENTS && (result.data?.length ?? 0) > PAGE)
    )
      throw new AssessmentAccessError(
        "This plan exceeds the 10,000-event export limit. No partial file was created.",
        413,
      );
    if ((result.data?.length ?? 0) <= PAGE) break;
    const last = page.at(-1)!;
    cursor = { createdAt: last.created_at, id: last.id };
  }
  const ids = [...new Set(rows.flatMap((row) => (row.assignmentId ? [row.assignmentId] : [])))],
    assignments = new Map<string, FrozenAssignment>();
  for (let start = 0; start < ids.length; start += 100) {
    signal?.throwIfAborted();
    const result = await db
      .from("assessment_support_assignments")
      .select(
        "id,capability_snapshot,mode,primary_weekly_minutes,support_weekly_minutes,support_cap_percent",
      )
      .eq("enrollment_id", enrollmentId)
      .in("id", ids.slice(start, start + 100));
    if (result.error)
      throw new AssessmentAccessError(
        "Assignment history could not be exported. No partial file was created.",
        503,
      );
    for (const row of result.data ?? []) assignments.set(row.id, row as FrozenAssignment);
  }
  signal?.throwIfAborted();
  await enrollmentAccess(db, actor, enrollmentId);
  signal?.throwIfAborted();
  const header = [
    "Enrollment ID",
    "Module",
    "Scope",
    "Organization ID",
    "Language pair",
    "Timezone",
    "History through UTC",
    "Event ID",
    "Recorded UTC",
    "Action",
    "Actor",
    "Reason",
    "Change",
    "Decision",
    "Previous state",
    "State",
    "Source",
    "Revision",
    "Attempt ID",
    "Recommendation ID",
    "Assignment ID",
    "Supporting module",
    "Frozen assignment title",
    "Selected lesson units",
    "Assignment mode",
    "Primary minutes/week",
    "Support minutes/week",
    "Support cap percent",
    "Assignment record",
    "Suggested lesson",
    "Focus ways",
  ];
  const lines = rows.map((row) => {
    const assignment = row.assignmentId ? assignments.get(row.assignmentId) : null;
    const frozen = assignment?.capability_snapshot as {
      moduleId?: unknown;
      title?: unknown;
      lessonIds?: unknown;
    } | null;
    const module = typeof frozen?.moduleId === "string" ? frozen.moduleId.slice(0, 80) : "";
    const title = typeof frozen?.title === "string" ? frozen.title.slice(0, 300) : "";
    const units = Array.isArray(frozen?.lessonIds)
      ? frozen.lessonIds
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              id.length <= 100 &&
              /^[a-z][a-z0-9-]*\.lesson\.[1-9]\d?$/.test(id),
          )
          .slice(0, 60)
          .join("; ")
      : "";
    return [
      enrollmentId,
      enrollment.module_id,
      enrollment.scope,
      enrollment.organization_id,
      `${enrollment.instruction_language} → ${enrollment.target_language}`,
      enrollment.timezone,
      rows[0]?.createdAt ?? "",
      row.id,
      row.createdAt,
      row.action,
      row.actor,
      row.reason,
      row.change,
      row.decision,
      row.previousState,
      row.state,
      row.source,
      row.revision,
      row.attemptId,
      row.recommendationId,
      row.assignmentId,
      module,
      title,
      units,
      assignment?.mode,
      assignment?.primary_weekly_minutes,
      assignment?.support_weekly_minutes,
      assignment?.support_cap_percent,
      row.assignmentId
        ? assignment
          ? "Frozen approval snapshot"
          : "Unavailable in this plan"
        : "",
      row.suggestedLesson,
      row.focusWays.join("; "),
    ];
  });
  // A header-only file is explicit empty history, not an invented plan event.
  return {
    csv: assessmentCsv([header, ...lines]),
    eventCount: rows.length,
    through: rows[0]?.createdAt ?? null,
  };
}
