import { useState } from "react";
import { usePrivatePagedReport } from "@/hooks/use-private-paged-report";
type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
  reason: string | null;
  change: string | null;
  decision: string | null;
  attemptId: string | null;
  state: string | null;
  source: string | null;
  revision: number | null;
};
const labels: Record<string, string> = {
  "enrollment.created": "Plan created",
  "schedule.changed": "Schedule changed",
  "attempt.started": "Attempt started",
  "attempt.saved": "Answers saved",
  "attempt.submitted": "Attempt submitted",
  "scoring.recorded": "Answer evidence recorded",
  "result.reviewed": "Result reviewed",
  "review.rubric": "Rubric decision",
  "review.resolved": "Review closed",
  "plan.revised": "Learning plan revised",
  "goals.changed": "Learner goals changed",
  "recommendation.created": "Supporting work suggested",
  "support.suggested": "Supporting work suggested",
  "support.decision": "Supporting work decision",
  "support.changed": "Supporting work changed",
  "support.acknowledged": "Supporting work acknowledged",
  "ai.requested": "AI writing feedback requested",
  "ai.proposal": "AI feedback proposal",
};
export function AssessmentAuditHistory({
  enrollmentId,
  onOpenAttempt,
}: {
  enrollmentId: string;
  onOpenAttempt: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    page = usePrivatePagedReport<AuditEvent>(
      `/api/exam-plans?action=history&enrollment=${encodeURIComponent(enrollmentId)}`,
      open,
    );
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-xl border border-border p-4"
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">All plan activity</summary>
      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Newest first. Load older activity to inspect the complete recorded history. Answers and
            private form keys are excluded.
          </p>
          {page.loading && <p role="status">Loading activity…</p>}
          {page.error && <p role="alert">{page.error}</p>}
          {!page.loading && !page.error && !page.items.length && (
            <p className="text-sm">No recorded activity.</p>
          )}
          <ol className="space-y-3">
            {page.items.map((event) => (
              <li key={event.id} className="border-t border-border py-3 text-sm">
                <p className="font-semibold">
                  {labels[event.action] ?? event.action.replaceAll(".", " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()} · {event.actor}
                </p>
                {event.reason && <p className="mt-2 whitespace-pre-wrap">{event.reason}</p>}
                {(event.change ||
                  event.decision ||
                  event.state ||
                  event.source ||
                  event.revision !== null) && (
                  <p className="mt-2">
                    {[
                      event.change,
                      event.decision,
                      event.state?.replaceAll("_", " "),
                      event.source?.replaceAll("_", " "),
                      event.revision !== null ? `Revision ${event.revision}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {event.attemptId && (
                  <button
                    className="min-h-11 text-gold underline"
                    onClick={() => onOpenAttempt(event.attemptId!)}
                  >
                    View this attempt’s evidence
                  </button>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            {page.hasMore && (
              <button
                className="min-h-11 text-sm text-gold underline"
                disabled={page.moreBusy}
                onClick={() => void page.loadMore()}
              >
                {page.moreBusy ? "Loading older activity…" : "Load older activity"}
              </button>
            )}
            <button
              className="min-h-11 text-sm text-gold underline"
              disabled={page.loading || page.moreBusy}
              onClick={page.refresh}
            >
              Refresh activity
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
