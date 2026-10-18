import { useEffect, useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
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
  const [epoch, setEpoch] = useState(0);
  const { key, actor, capture } = usePracticeLifecycle(String(epoch));
  const [result, setResult] = useState<{
    key: string;
    status: Status | null;
    error: string;
    checkedAt: string | null;
  } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const { status, error, checkedAt } =
    result?.key === key ? result : { status: null, error: "", checkedAt: null };
  const loading = !status && !error;
  useEffect(() => {
    const lease = capture();
    if (!lease.isCurrent()) return;
    if (!actor) {
      setResult({
        key,
        status: null,
        error: "Sign in with an authorized owner account to load operations status.",
        checkedAt: null,
      });
      return;
    }
    const abort = new AbortController();
    pending.current = abort;
    const release = lease.own(() => {
      abort.abort();
      if (pending.current === abort) pending.current = null;
    });
    const current = () => lease.isCurrent() && !abort.signal.aborted && pending.current === abort;
    setResult({ key, status: null, error: "", checkedAt: null });
    void examRequest<Status>("/api/exam-cleanup?view=status", abort.signal, {
      userId: actor,
      isCurrent: current,
    })
      .then((status) => {
        if (current()) setResult({ key, status, error: "", checkedAt: new Date().toISOString() });
      })
      .catch((e) => {
        if (current())
          setResult({
            key,
            status: null,
            error: e instanceof Error ? e.message : "Operations status could not be loaded.",
            checkedAt: null,
          });
      })
      .finally(() => {
        if (pending.current === abort) pending.current = null;
        release();
      });
    return () => {
      release();
      abort.abort();
      if (pending.current === abort) pending.current = null;
    };
  }, [key, actor, capture]);
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
      {checkedAt && (
        <p className="text-xs text-muted-foreground">
          Status checked {new Date(checkedAt).toLocaleString()}.
        </p>
      )}
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
        disabled={loading || !actor}
        onClick={() => {
          if (actor && capture().isCurrent() && !pending.current) setEpoch((e) => e + 1);
        }}
      >
        Refresh cleanup status
      </button>
    </section>
  );
}
