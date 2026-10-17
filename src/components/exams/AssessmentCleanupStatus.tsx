import { useEffect, useState } from "react";
import { examRequest } from "@/lib/assessments/client";
import type { CleanupRun } from "@/lib/assessments/cleanup-run";
type Status = {
  executionEnabled: boolean;
  health: "not_observed" | "healthy" | "running" | "attention" | "overdue";
  runs: CleanupRun[];
  note: string;
};
const labels = {
  not_observed: "No scheduled endpoint invocation recorded",
  healthy: "Most recent scheduled run succeeded",
  running: "Scheduled cleanup is running",
  attention: "Cleanup needs attention",
  overdue: "Scheduled cleanup is overdue",
};
/** Rendered only after platform-owner registry access; the API independently checks it. */
export function AssessmentCleanupStatus() {
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void examRequest<Status>("/api/exam-cleanup?view=status", abort.signal)
      .then(setStatus)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [epoch]);
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4">
      <h2 className="text-xl font-semibold">Recording cleanup operations</h2>
      <p className="text-sm">
        {status
          ? labels[status.health]
          : error
            ? "Operations status is unavailable"
            : "Loading private operations status…"}
      </p>
      {status && (
        <>
          <p className="text-sm">
            Scheduled execution: {status.executionEnabled ? "enabled" : "disabled"}. This status
            does not approve a retention policy or publish an exam.
          </p>
          <p className="text-xs text-muted-foreground">{status.note}</p>
          {status.runs.length === 0 ? (
            <p className="text-sm">No cleanup runs have been recorded.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {status.runs.map((run, i) => (
                <article
                  key={`${run.started_at}:${i}`}
                  className="rounded-xl border border-border p-3 text-sm"
                >
                  <p className="font-semibold">
                    {run.source === "operator" ? "Operator command" : "Scheduled endpoint"} ·{" "}
                    {run.status}
                  </p>
                  <p>{new Date(run.started_at).toLocaleString()}</p>
                  <p>
                    {run.deleted_count} finalized · {run.failed_count} failed · {run.selected_count}{" "}
                    selected
                  </p>
                  {run.may_have_more && <p>More work may remain. Run again and check the queue.</p>}
                  {run.failure_code && (
                    <p>Run failed or its lease expired. Inspect the operator logs and retry.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <button
        type="button"
        className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm"
        onClick={() => {
          setError("");
          setEpoch((e) => e + 1);
        }}
      >
        Refresh cleanup status
      </button>
    </section>
  );
}
