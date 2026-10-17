import { useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examHistoryExport } from "@/lib/assessments/client";
import type { AssessmentAuditSummary } from "@/lib/assessments/audit";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { usePrivatePagedReport } from "@/hooks/use-private-paged-report";
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
type Props = { enrollmentId: string; onOpenAttempt: (id: string) => void };
export function AssessmentAuditHistory(props: Props) {
  const { user } = useAuth();
  return (
    <OwnedAssessmentAuditHistory
      key={JSON.stringify([user?.id ?? null, props.enrollmentId])}
      {...props}
    />
  );
}
function OwnedAssessmentAuditHistory({ enrollmentId, onOpenAttempt }: Props) {
  const [open, setOpen] = useState(false),
    page = usePrivatePagedReport<AssessmentAuditSummary>(
      `/api/exam-plans?action=history&enrollment=${encodeURIComponent(enrollmentId)}`,
      open,
    );
  const { actor, capture } = usePracticeLifecycle(enrollmentId);
  const exportFlight = useRef<{ controller: AbortController; dispose: () => void } | null>(null);
  const [exportBusy, setExportBusy] = useState(false),
    [exportNotice, setExportNotice] = useState(""),
    [exportError, setExportError] = useState("");
  async function exportHistory() {
    const lease = capture();
    if (!actor || !lease.isCurrent() || exportFlight.current) return;
    const controller = new AbortController();
    let release = () => {};
    const flight = {
      controller,
      dispose: () => {
        release();
        controller.abort();
        if (exportFlight.current === flight) exportFlight.current = null;
      },
    };
    exportFlight.current = flight;
    release = lease.own(flight.dispose);
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && exportFlight.current === flight;
    setExportBusy(true);
    setExportError("");
    setExportNotice("");
    try {
      const result = await examHistoryExport(enrollmentId, controller.signal);
      if (!current()) return;
      const url = URL.createObjectURL(result.blob);
      let timer: ReturnType<typeof setTimeout> | null = null;
      let released = false,
        releaseUrl = () => {};
      const disposeUrl = () => {
        if (released) return;
        released = true;
        if (timer !== null) clearTimeout(timer);
        URL.revokeObjectURL(url);
        releaseUrl();
      };
      releaseUrl = lease.own(disposeUrl);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = "language-threshold-plan-history.csv";
        link.click();
        timer = setTimeout(disposeUrl, 1000);
      } catch (error) {
        disposeUrl();
        throw error;
      }
      if (current())
        setExportNotice(
          `Prepared ${result.eventCount} recorded event${result.eventCount === 1 ? "" : "s"} for download. Raw responses and media are excluded.`,
        );
    } catch (error) {
      if (current())
        setExportError(
          error instanceof Error
            ? error.message
            : "History could not be exported. No partial file was downloaded.",
        );
    } finally {
      if (current()) setExportBusy(false);
      flight.dispose();
    }
  }
  return (
    <details
      open={open}
      onToggle={(event) => {
        if (capture().isCurrent()) setOpen(event.currentTarget.open);
      }}
      className="rounded-xl border border-border p-4"
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">All plan activity</summary>
      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Newest first. Load older activity to inspect the complete recorded history. Answers and
            private form keys are excluded. Export reads the complete recorded history, including
            assignment decisions and frozen units, independently of the rows loaded here.
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
                      event.previousState
                        ? `${event.previousState} → ${event.state ?? ""}`
                        : event.state?.replaceAll("_", " "),
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
                    onClick={() => {
                      if (capture().isCurrent()) onOpenAttempt(event.attemptId!);
                    }}
                  >
                    View this attempt’s evidence
                  </button>
                )}
              </li>
            ))}
          </ol>
          {exportNotice && (
            <p role="status" className="text-sm">
              {exportNotice}
            </p>
          )}
          {exportError && (
            <p role="alert" className="text-sm">
              {exportError}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className="min-h-11 text-sm text-gold underline"
              disabled={exportBusy || !actor}
              onClick={() => void exportHistory()}
            >
              {exportBusy
                ? "Preparing complete history…"
                : "Export all plan and assignment activity"}
            </button>
            {exportBusy && (
              <button
                className="min-h-11 text-sm text-gold underline"
                onClick={() => {
                  if (!capture().isCurrent() || !exportFlight.current) return;
                  exportFlight.current.dispose();
                  setExportBusy(false);
                  setExportNotice("Export canceled. No file was downloaded.");
                }}
              >
                Cancel export
              </button>
            )}
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
