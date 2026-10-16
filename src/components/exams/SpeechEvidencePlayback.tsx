import { useState } from "react";
import { examRequest } from "@/lib/assessments/client";
import { PrivateExamAudio } from "./PrivateExamAudio";
/** No recording is loaded until Play; every playback reauthorizes through the proxy. */
export function SpeechEvidencePlayback({
  evidenceId,
  learner = false,
  available,
  onChanged,
  onReviewReady,
}: {
  evidenceId: string;
  learner?: boolean;
  available?: boolean;
  onChanged?: () => void | Promise<unknown>;
  onReviewReady?: (ready: boolean) => void;
}) {
  const [heard, setHeard] = useState(false),
    [acknowledged, setAcknowledged] = useState(false),
    [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false),
    [withdrawn, setWithdrawn] = useState(false),
    [error, setError] = useState("");
  const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50";
  if (available === false)
    return (
      <p className="text-sm">
        Recording is withdrawn or no longer available. A new speaking score cannot use unavailable
        evidence.
      </p>
    );
  if (withdrawn)
    return (
      <p className="text-sm">
        Recording withdrawn. Playback is blocked and deletion is queued. Historical review decisions
        remain in the audit history.
      </p>
    );
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
      <PrivateExamAudio
        path={`/api/exams?action=speech_playback&evidence=${encodeURIComponent(evidenceId)}`}
        label="Play learner’s recorded answer"
        onEnded={() => setHeard(true)}
        onAccessLost={() => {
          setHeard(false);
          setAcknowledged(false);
          onReviewReady?.(false);
        }}
      />
      {onReviewReady && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            disabled={!heard || busy || acknowledged}
            checked={acknowledged}
            onChange={() => {
              setBusy(true);
              setError("");
              void examRequest({
                action: "speech_reviewed",
                evidenceId,
                listened: true,
                requestId: crypto.randomUUID(),
              })
                .then(() => {
                  setAcknowledged(true);
                  onReviewReady(true);
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          />
          <span>
            {heard
              ? "I listened to the full recording and will apply the frozen speaking rubric."
              : "Listen to the full recording before acknowledging and scoring."}
          </span>
        </label>
      )}
      {learner &&
        (!confirm ? (
          <button type="button" className={button} onClick={() => setConfirm(true)}>
            Withdraw this recording
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              Withdraw access to this answer’s recording and queue it for deletion? It cannot be
              used for a new speaking score.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError("");
                  void examRequest({
                    action: "speech_withdraw",
                    evidenceId,
                    requestId: crypto.randomUUID(),
                  })
                    .then(() => {
                      setWithdrawn(true);
                      onReviewReady?.(false);
                      return onChanged?.();
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                Confirm withdrawal
              </button>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep recording
              </button>
            </div>
          </div>
        ))}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
