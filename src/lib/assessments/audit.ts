export interface RawAssessmentAudit {
  id: string;
  actor_id: string | null;
  action: string;
  created_at: string;
  detail: Record<string, unknown>;
}
/** Shared screen/export whitelist: never return arbitrary event detail, form data or answer payloads. */
export function assessmentAuditSummary(row: RawAssessmentAudit, actor: string) {
  const detail = row.detail,
    result = detail.result as Record<string, unknown> | null;
  const text = (value: unknown, maximum = 160) =>
    typeof value === "string" ? value.slice(0, maximum) : null;
  const ways = new Set(["see", "recall", "hear", "type", "say", "write"]);
  return {
    id: row.id,
    actor: row.actor_id === actor ? "You" : "Authorized plan participant",
    action: row.action,
    createdAt: row.created_at,
    reason: text(detail.reason, 2000),
    change: text(detail.change),
    decision: text(result?.decision),
    attemptId: text(detail.attemptId ?? detail.sourceAttemptId),
    state: text(detail.state ?? detail.status),
    previousState: text(detail.before),
    source: text(detail.source),
    revision:
      typeof detail.revision === "number" && Number.isInteger(detail.revision)
        ? detail.revision
        : null,
    recommendationId: text(detail.recommendationId ?? result?.recommendationId),
    assignmentId: text(detail.assignmentId ?? result?.assignmentId),
    suggestedLesson:
      typeof detail.suggestedLesson === "number" &&
      Number.isInteger(detail.suggestedLesson) &&
      detail.suggestedLesson >= 1 &&
      detail.suggestedLesson <= 60
        ? detail.suggestedLesson
        : null,
    focusWays: Array.isArray(detail.focusWays)
      ? detail.focusWays
          .filter((v): v is string => typeof v === "string" && ways.has(v))
          .slice(0, 6)
      : [],
  };
}
export type AssessmentAuditSummary = ReturnType<typeof assessmentAuditSummary>;
