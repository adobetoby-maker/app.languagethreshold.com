import { useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examRequest, ExamRequestError } from "@/lib/assessments/client";
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
  const [outcome, setOutcome] = useState<"sent" | "unknown" | null>(null);
  const latched = useRef(false);
  const pending = useRef<AbortController | null>(null);
  async function requestFeedback() {
    const lease = capture();
    if (!user || jobStatus || !consent || pending.current || latched.current || !lease.isCurrent())
      return;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
    setBusy(true);
    setMessage("");
    try {
      const result = await examRequest<{ state: string; message: string }>(
        {
          action: "ai_writing",
          attemptId,
          responseId,
          consentVersion: "assessment-ai-writing-v1",
        },
        controller.signal,
        { userId: user.id, isCurrent: current },
      );
      if (
        !result ||
        !["needs_review", "already_requested", "already_reviewed"].includes(result.state) ||
        typeof result.message !== "string" ||
        !result.message.trim() ||
        result.message.length > 2000
      )
        throw new Error("AI request acknowledgement unavailable");
      if (current()) {
        latched.current = true;
        setOutcome("sent");
        setMessage(result.message);
        onRefresh();
      }
    } catch (err) {
      if (current()) {
        // These AI-route denials occur before provider work. A 5xx or lost reply is uncertain.
        const denied =
          err instanceof ExamRequestError &&
          [400, 401, 403, 404, 409, 413, 429].includes(err.status);
        latched.current = !denied;
        setOutcome(denied ? null : "unknown");
        setMessage(
          denied
            ? err.message
            : "The AI request outcome could not be confirmed. Check saved status or request human review. This view will not send it again.",
        );
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
      ) : outcome ? (
        <p>
          {outcome === "sent"
            ? "Request acknowledged. Check saved status to see the recorded job."
            : "Request paused while its saved outcome is unconfirmed."}
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
                if (capture().isCurrent() && !pending.current && !latched.current)
                  setConsent(event.target.checked);
              }}
            />
            <span>
              For this answer, I agree to send my typed response, the question and its rubric to
              Anthropic for AI feedback. This is an optional proposal; a human decides the result.
              My profile, other answers, handwriting images and recordings are excluded.
            </span>
          </label>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50"
            disabled={!consent || busy || !user}
            onClick={() => void requestFeedback()}
          >
            {busy ? "Requesting rubric feedback…" : "Request optional AI writing feedback"}
          </button>
        </>
      )}
      {!jobStatus && (busy || outcome) && (
        <button
          type="button"
          className="min-h-11 rounded-xl border border-border px-4 py-2"
          onClick={() => {
            if (user && capture().isCurrent()) onRefresh();
          }}
        >
          Check saved status
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
