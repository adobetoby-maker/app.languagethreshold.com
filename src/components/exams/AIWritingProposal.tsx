import { useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest } from "@/lib/assessments/client";
export function AIWritingProposal({
  attemptId,
  responseId,
  jobStatus,
  onRefresh,
}: {
  attemptId: string;
  responseId: string;
  jobStatus?: string;
  onRefresh: () => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
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
              onChange={(event) => setConsent(event.target.checked)}
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
            onClick={async () => {
              if (!user || busy || !consent) return;
              const actor = user.id;
              setBusy(true);
              setMessage("");
              try {
                const result = await examRequest<{ message: string }>({
                  action: "ai_writing",
                  attemptId,
                  responseId,
                  consentVersion: "assessment-ai-writing-v1",
                });
                if (isCurrentUser(actor)) {
                  setMessage(result.message);
                  onRefresh();
                }
              } catch (err) {
                if (isCurrentUser(actor)) {
                  setMessage(err instanceof Error ? err.message : "AI review could not finish.");
                  onRefresh();
                }
              } finally {
                if (isCurrentUser(actor)) setBusy(false);
              }
            }}
          >
            {busy ? "Requesting rubric feedback…" : "Request optional AI writing feedback"}
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
