import { useState } from "react";
import { usePrivatePagedReport } from "@/hooks/use-private-paged-report";
import type { ReportedAttempt } from "@/lib/assessments/reporting";
export function CheckpointAttemptHistory({
  checkpointId,
  attemptCount,
  onOpen,
}: {
  checkpointId: string;
  attemptCount?: number;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    page = usePrivatePagedReport<ReportedAttempt>(
      `/api/exams?action=checkpoint_history&checkpoint=${encodeURIComponent(checkpointId)}`,
      open,
    );
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm">
        {attemptCount === undefined
          ? "Attempt history"
          : `${attemptCount} attempt${attemptCount === 1 ? "" : "s"}`}
      </summary>
      {open && (
        <div className="space-y-2">
          {page.loading && (
            <p role="status" className="text-sm">
              Loading attempts…
            </p>
          )}
          {page.error && (
            <p role="alert" className="text-sm">
              {page.error}
            </p>
          )}
          {!page.loading && !page.error && !page.items.length && (
            <p className="text-sm">No attempts yet.</p>
          )}
          {page.items.map((attempt) => (
            <div key={attempt.id}>
              <button
                className="block min-h-11 text-left text-sm text-gold underline"
                onClick={() => onOpen(attempt.id)}
              >
                Attempt {attempt.attempt_number}
                {attempt.designated ? " · original baseline/checkpoint" : " · retake"}
                {attempt.submitted_at
                  ? ` · ${new Date(attempt.submitted_at).toLocaleString()}`
                  : " · in progress"}
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {page.hasMore && (
              <button
                className="min-h-11 text-sm text-gold underline"
                disabled={page.moreBusy}
                onClick={() => void page.loadMore()}
              >
                {page.moreBusy ? "Loading…" : "Load older attempts"}
              </button>
            )}
            <button
              className="min-h-11 text-sm text-gold underline"
              disabled={page.loading || page.moreBusy}
              onClick={page.refresh}
            >
              Refresh history
            </button>
          </div>
        </div>
      )}
    </details>
  );
}
