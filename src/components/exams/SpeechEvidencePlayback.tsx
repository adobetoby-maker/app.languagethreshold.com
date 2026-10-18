import { useEffect, useRef, useState } from "react";
import { examRequest } from "@/lib/assessments/client";
import { PrivateExamAudio } from "./PrivateExamAudio";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
type Props = {
  evidenceId: string;
  learner?: boolean;
  available?: boolean;
  onChanged?: () => void | Promise<unknown>;
  onReviewReady?: (ready: boolean) => void;
};
/** No recording is loaded until Play; every playback reauthorizes through the proxy. */
export function SpeechEvidencePlayback(props: Props) {
  const { user } = useAuth();
  return (
    <OwnedSpeechEvidencePlayback
      key={JSON.stringify([user?.id ?? null, props.evidenceId, props.learner, props.available])}
      {...props}
    />
  );
}
function OwnedSpeechEvidencePlayback({
  evidenceId,
  learner = false,
  available,
  onChanged,
  onReviewReady,
}: Props) {
  const { actor, capture, cancel } = usePracticeLifecycle(evidenceId);
  const pending = useRef<AbortController | null>(null);
  const readyCallback = useRef(onReviewReady);
  readyCallback.current = onReviewReady;
  useEffect(() => {
    readyCallback.current?.(false);
  }, []);
  const [heard, setHeard] = useState(false),
    [acknowledged, setAcknowledged] = useState(false),
    [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false),
    [withdrawn, setWithdrawn] = useState(false),
    [error, setError] = useState("");
  const run = async (action: "speech_reviewed" | "speech_withdraw") => {
    const lease = capture();
    if (
      !actor ||
      !lease.isCurrent() ||
      pending.current ||
      available === false ||
      withdrawn ||
      (action === "speech_reviewed"
        ? !heard || acknowledged || !onReviewReady
        : !learner || !confirm)
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      await examRequest(
        {
          action,
          evidenceId,
          ...(action === "speech_reviewed" ? { listened: true } : {}),
          requestId: crypto.randomUUID(),
        },
        controller.signal,
        { userId: actor, isCurrent: current },
      );
      if (!current()) return;
      if (action === "speech_reviewed") {
        setAcknowledged(true);
        onReviewReady?.(true);
      } else {
        setWithdrawn(true);
        onReviewReady?.(false);
        await onChanged?.();
      }
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : "Recording action failed.");
    } finally {
      if (current()) {
        pending.current = null;
        setBusy(false);
      }
      release();
      controller.abort();
      if (pending.current === controller) pending.current = null;
    }
  };
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
        onEnded={() => {
          if (capture().isCurrent()) setHeard(true);
        }}
        onAccessLost={() => {
          if (!capture().isCurrent()) return;
          cancel();
          setBusy(false);
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
            onChange={() => void run("speech_reviewed")}
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
          <button
            type="button"
            className={button}
            onClick={() => {
              if (capture().isCurrent()) setConfirm(true);
            }}
          >
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
                onClick={() => void run("speech_withdraw")}
              >
                Confirm withdrawal
              </button>
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  if (capture().isCurrent()) setConfirm(false);
                }}
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
