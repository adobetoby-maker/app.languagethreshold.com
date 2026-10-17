import { useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examRequest } from "@/lib/assessments/client";
type Props = {
  attemptId: string;
  responseId: string;
  jobStatus?: string;
  onRefresh: () => void;
};
export function AIWritingProposal(props: Props) {
  const { user } = useAuth();
  return (
    <OwnedAIWritingProposal
      key={JSON.stringify([user?.id, props.attemptId, props.responseId, props.jobStatus])}
      {...props}
    />
  );
}
function OwnedAIWritingProposal({ attemptId, responseId, jobStatus, onRefresh }: Props) {
  const { user } = useAuth();
  const { capture } = usePracticeLifecycle(JSON.stringify([attemptId, responseId, jobStatus]));
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  async function requestFeedback() {
    const lease = capture();
    if (!user || jobStatus || !consent || pending.current || !lease.isCurrent()) return;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
    setBusy(true);
    setMessage("");
    try {
      const result = await examRequest<{ message: string }>(
        {
          action: "ai_writing",
          attemptId,
          responseId,
          consentVersion: "assessment-ai-writing-v1",
        },
        controller.signal,
      );
      if (current()) {
        setMessage(result.message);
        onRefresh();
      }
    } catch (err) {
      if (current()) {
        setMessage(err instanceof Error ? err.message : "AI review could not finish.");
        // Observe any durable job outcome even if this request returned an error.
        onRefresh();
      }
    } finally {
      if (current()) setBusy(false);
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border p-3 text-sm">
      {jobStatus ? (
        <p>
          {jobStatus === "completed"
            ? "AI proposal saved for human review."
            : jobStatus === "failed"
              ? "AI review did not finish reliably. Request human review; this answer will not be billed again automatically."
              : "AI review was already requested. If its outcome is uncertain, request human review; it will not retry automatically."}
        </p>
      ) : (
        <>
          <label className="flex items-start gap-3">
            <input
              className="mt-1 h-5 w-5 shrink-0"
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(event) => {
                if (capture().isCurrent() && !pending.current) setConsent(event.target.checked);
              }}
            />
            <span>
              For this answer, I agree to send my typed response, the question and its rubric to
              Anthropic for AI feedback. This is an optional proposal; a human decides the result.
              My profile, other answers, handwriting images and recordings are excluded.
            </span>
          </label>
          <button
            className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50"
            disabled={!consent || busy || !user}
            onClick={() => void requestFeedback()}
          >
            {busy ? "Requesting rubric feedback…" : "Request optional AI writing feedback"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
