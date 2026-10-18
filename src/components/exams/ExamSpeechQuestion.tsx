import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest, uploadExamSpeech, ExamRequestError } from "@/lib/assessments/client";
import { MAX_SPEECH_BYTES, MAX_SPEECH_MS, type SpeechMime } from "@/lib/assessments/speech";
import {
  readSpeechTake,
  saveSpeechTake,
  clearSpeechTake,
  registerSpeechCapture,
  isSpeechCaptureCurrent,
  subscribeSpeechDrafts,
  type SpeechDeviceTake,
} from "@/lib/assessments/speech-device";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { LocalExamTakeAudio } from "./LocalExamTakeAudio";
import { SpeechEvidencePlayback } from "./SpeechEvidencePlayback";
type Policy = {
  enabled: boolean;
  version: string | null;
  notice: string;
  retentionDays: number | null;
};
const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50";
type Props = {
  attemptId: string;
  itemId: string;
  scope: "personal" | "team";
  evidenceId?: string;
  evidenceAvailable?: boolean;
  flush: () => Promise<boolean>;
  revision: () => number;
  reload: () => Promise<unknown>;
  onWorkingChange: (busy: boolean) => void;
};
export function ExamSpeechQuestion(props: Props) {
  const { user } = useAuth();
  return (
    <OwnedExamSpeechQuestion
      key={JSON.stringify([user?.id ?? null, props.attemptId, props.itemId, props.scope])}
      {...props}
    />
  );
}
function OwnedExamSpeechQuestion({
  attemptId,
  itemId,
  scope,
  evidenceId,
  evidenceAvailable,
  flush,
  revision,
  reload,
  onWorkingChange,
}: Props) {
  const { user, isCurrentUser } = useAuth();
  const userId = user?.id ?? "";
  const { capture: captureLease } = usePracticeLifecycle(
    JSON.stringify([attemptId, itemId, scope]),
  );
  const startAbort = useRef<AbortController | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null),
    [consent, setConsent] = useState(false);
  const take = useSyncExternalStore(
    subscribeSpeechDrafts,
    () => readSpeechTake(userId, attemptId, itemId),
    () => undefined,
  );
  const [recording, setRecording] = useState(false),
    [requesting, setRequesting] = useState(false),
    [uploading, setUploading] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(false);
  const mounted = useRef(true),
    capture = useRef<{ stop: () => void; discard: () => void } | null>(null),
    uploadAbort = useRef<AbortController | null>(null);
  const policyPath = `/api/exams?action=speech_status&attempt=${encodeURIComponent(attemptId)}`;
  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    void examRequest<Policy>(policyPath, abort.signal, {
      userId,
      isCurrent: () => mounted.current && isCurrentUser(userId),
    })
      .then((p) => {
        if (mounted.current && !abort.signal.aborted && isCurrentUser(userId)) setPolicy(p);
      })
      .catch((e) => {
        if (mounted.current && !abort.signal.aborted && isCurrentUser(userId)) setError(e.message);
      });
    return () => {
      mounted.current = false;
      abort.abort();
      startAbort.current?.abort();
      uploadAbort.current?.abort();
      capture.current?.stop();
    };
  }, [policyPath, userId, isCurrentUser]);
  useEffect(() => {
    onWorkingChange(recording || requesting || uploading);
    return () => onWorkingChange(false);
  }, [recording, requesting, uploading, onWorkingChange]);
  const remember = (value: SpeechDeviceTake | undefined) => {
    if (!isCurrentUser(userId)) return;
    if (value) saveSpeechTake(userId, attemptId, itemId, value);
    else clearSpeechTake(userId, attemptId, itemId);
  };
  const start = async () => {
    const lease = captureLease();
    if (
      !lease.isCurrent() ||
      !consent ||
      !policy?.enabled ||
      !policy.version ||
      take ||
      capture.current ||
      startAbort.current ||
      uploadAbort.current
    )
      return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record here. You can leave this input not assessed.");
      return;
    }
    const abort = new AbortController();
    startAbort.current = abort;
    const release = lease.own(() => abort.abort());
    const currentStart = () =>
      lease.isCurrent() && !abort.signal.aborted && startAbort.current === abort;
    setError("");
    setMessage("");
    setRequesting(true);
    let stream: MediaStream | null = null;
    try {
      const current = await examRequest<Policy>(policyPath, abort.signal, {
        userId,
        isCurrent: currentStart,
      });
      if (!currentStart()) return;
      if (!current.enabled || current.version !== policy.version) {
        setPolicy(current);
        setConsent(false);
        throw new Error("The recording policy changed. Review it before recording.");
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!currentStart()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const format = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      if (!format)
        throw new Error(
          "This browser has no supported recording format. Leave this input not assessed.",
        );
      const mime = format.split(";")[0] as SpeechMime,
        recorder = new MediaRecorder(stream, { mimeType: format });
      const started = performance.now(),
        chunks: Blob[] = [];
      let size = 0,
        dropped = false,
        ended = false;
      const stop = () => {
        if (!ended && recorder.state !== "inactive") recorder.stop();
        stream?.getTracks().forEach((t) => t.stop());
      };
      const discard = () => {
        dropped = true;
        stop();
      };
      const unregister = registerSpeechCapture(userId, attemptId, itemId, discard);
      const timer = setTimeout(stop, MAX_SPEECH_MS);
      capture.current = { stop, discard };
      setRecording(true);
      recorder.ondataavailable = (e) => {
        if (ended || dropped || !isCurrentUser(userId)) return;
        if (e.data.size) {
          size += e.data.size;
          if (size > MAX_SPEECH_BYTES) {
            dropped = true;
            if (mounted.current && isCurrentUser(userId))
              setError("Recording exceeded 4 MiB. Please record a shorter answer.");
            stop();
          } else chunks.push(e.data);
        }
      };
      recorder.onerror = () => {
        if (ended || !isCurrentUser(userId)) return;
        dropped = true;
        if (mounted.current && isCurrentUser(userId))
          setError(
            "Recording failed. No speaking score was assigned. Try again or leave it not assessed.",
          );
        stop();
      };
      recorder.onstop = () => {
        if (ended) return;
        ended = true;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        clearTimeout(timer);
        stream?.getTracks().forEach((t) => t.stop());
        capture.current = null;
        const durationMs = Math.min(MAX_SPEECH_MS, Math.round(performance.now() - started));
        if (
          !dropped &&
          size >= 32 &&
          durationMs >= 250 &&
          isCurrentUser(userId) &&
          isSpeechCaptureCurrent(userId, attemptId, itemId, discard)
        )
          remember({
            blob: new Blob(chunks, { type: mime }),
            mime,
            durationMs,
            policyVersion: current.version!,
          });
        else if (!dropped && mounted.current && isCurrentUser(userId))
          setError("Recording was too short or incomplete. Try again or leave it not assessed.");
        chunks.length = 0;
        unregister();
        if (mounted.current && isCurrentUser(userId)) setRecording(false);
      };
      try {
        recorder.start(250);
      } catch (e) {
        ended = true;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        unregister();
        clearTimeout(timer);
        capture.current = null;
        setRecording(false);
        throw e;
      }
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      if (currentStart())
        setError(
          e instanceof Error
            ? e.message
            : "Microphone access failed. You can leave speaking not assessed.",
        );
    } finally {
      if (currentStart()) setRequesting(false);
      if (startAbort.current === abort) startAbort.current = null;
      release();
      abort.abort();
    }
  };
  const upload = async () => {
    const lease = captureLease();
    if (
      !lease.isCurrent() ||
      !take ||
      !consent ||
      !policy?.enabled ||
      !policy.version ||
      uploadAbort.current ||
      startAbort.current ||
      capture.current ||
      conflict
    )
      return;
    setUploading(true);
    setError("");
    setMessage("");
    const abort = new AbortController();
    uploadAbort.current = abort;
    const release = lease.own(() => abort.abort());
    const currentUpload = () =>
      lease.isCurrent() && !abort.signal.aborted && uploadAbort.current === abort;
    try {
      if (!(await flush()))
        throw new Error("Sync other answers and resolve any conflict before uploading.");
      if (!currentUpload()) return;
      const next: SpeechDeviceTake =
        take.policyVersion === policy.version
          ? { ...take }
          : { ...take, policyVersion: policy.version, upload: undefined };
      next.upload ??= { requestId: crypto.randomUUID(), revision: revision() };
      remember(next);
      await uploadExamSpeech(
        {
          attemptId,
          itemId,
          revision: next.upload.revision,
          requestId: next.upload.requestId,
          consent: true,
          policyVersion: next.policyVersion,
          mime: next.mime,
          durationMs: next.durationMs,
        },
        next.blob,
        abort.signal,
        { userId, isCurrent: currentUpload },
      );
      if (!currentUpload()) return;
      await reload();
      if (!currentUpload()) return;
      remember(undefined);
      setMessage("Recording synced privately. Speaking awaits a review after submission.");
    } catch (e) {
      if (currentUpload()) {
        setError(
          e instanceof Error
            ? e.message
            : "Recording upload could not finish. Keep this page open to retry.",
        );
        if (e instanceof ExamRequestError && e.status === 409) setConflict(true);
      }
    } finally {
      if (currentUpload()) setUploading(false);
      if (uploadAbort.current === abort) uploadAbort.current = null;
      release();
      abort.abort();
    }
  };
  const loadSaved = async (discard: boolean) => {
    const lease = captureLease();
    if (!lease.isCurrent() || !take || uploadAbort.current || startAbort.current || capture.current)
      return;
    const abort = new AbortController();
    uploadAbort.current = abort;
    const release = lease.own(() => abort.abort());
    const current = () =>
      lease.isCurrent() && !abort.signal.aborted && uploadAbort.current === abort;
    setUploading(true);
    setError("");
    if (discard) {
      remember(undefined);
      setConflict(false);
      setMessage("Local take discarded. Checking whether an earlier upload reached your account…");
    }
    try {
      await reload();
      if (!current()) return;
      if (discard) {
        setMessage(
          "Local take discarded. Any synced recording stays attached; withdraw that copy separately if you want it removed.",
        );
      } else {
        const latestPolicy = await examRequest<Policy>(policyPath, abort.signal, {
          userId,
          isCurrent: current,
        });
        if (!current()) return;
        setPolicy(latestPolicy);
        setConsent(false);
        remember({ ...take, upload: undefined });
        setConflict(false);
        setMessage(
          "Latest saved answers loaded. Review them before retrying this recording upload.",
        );
      }
    } catch (e) {
      if (current())
        setError(
          discard
            ? "Local take discarded, but the saved copy could not be checked. Reopen this attempt to inspect or withdraw any earlier upload."
            : e instanceof Error
              ? e.message
              : "Saved answers could not be loaded.",
        );
    } finally {
      if (current()) setUploading(false);
      if (uploadAbort.current === abort) uploadAbort.current = null;
      release();
      abort.abort();
    }
  };
  return (
    <div className="my-4 space-y-3">
      <p className="text-sm">
        Speak your answer. Typed text does not produce a speaking score. Recording and upload need a
        connection; you may leave this input not assessed.
      </p>
      {!policy ? (
        <p role="status">
          {error ? "Recording controls are unavailable." : "Checking recording availability…"}
        </p>
      ) : !policy.enabled ? (
        <p className="rounded-xl border border-border p-3 text-sm">{policy.notice}</p>
      ) : (
        <>
          <div className="rounded-xl border border-border p-3 text-sm space-y-2">
            <p>{policy.notice}</p>
            <p>
              {scope === "team"
                ? "Your authorized team reviewers can listen after submission."
                : "Your personal recording stays private until you explicitly share this attempt with an independent reviewer."}{" "}
              No AI transcription is requested here.
            </p>
            <p>
              Raw recordings are scheduled for deletion {policy.retentionDays} days after final
              scoring or dispute resolution. You can withdraw a recording earlier; playback stops
              immediately while deletion is queued. Uploading a replacement withdraws the earlier
              recording.
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                disabled={recording || requesting || uploading}
                onChange={(e) => {
                  if (
                    captureLease().isCurrent() &&
                    !capture.current &&
                    !startAbort.current &&
                    !uploadAbort.current
                  )
                    setConsent(e.target.checked);
                }}
              />
              <span>I agree to record and upload this answer under the notice above.</span>
            </label>
          </div>
          {!take && !recording && (
            <button
              type="button"
              className={button}
              disabled={!consent || requesting || uploading}
              onClick={() => void start()}
            >
              {requesting
                ? "Waiting for microphone permission…"
                : evidenceId
                  ? "Record a replacement answer"
                  : "Record my answer"}
            </button>
          )}
          {recording && (
            <div className="flex flex-wrap gap-2">
              <p role="status" className="w-full text-sm">
                Recording · stops at two minutes. Only the microphone is used.
              </p>
              <button
                type="button"
                className={button}
                onClick={() => {
                  if (captureLease().isCurrent()) capture.current?.stop();
                }}
              >
                Stop recording
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  if (captureLease().isCurrent()) capture.current?.discard();
                }}
              >
                Cancel recording
              </button>
            </div>
          )}
        </>
      )}
      {take && (
        <div className="rounded-xl border border-amber-500/40 p-3 space-y-3">
          <p className="text-sm">
            Recording held in this page’s memory — not synced. Refreshing or closing this site loses
            it. It stays here if you visit another question. Listen before uploading.
          </p>
          <LocalExamTakeAudio blob={take.blob} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={uploading || !consent || !policy?.enabled || conflict}
              onClick={() => void upload()}
            >
              {uploading
                ? "Uploading and verifying…"
                : take.upload
                  ? "Retry recording upload"
                  : "Upload this recording"}
            </button>
            <button
              type="button"
              className={button}
              disabled={uploading}
              onClick={() => void loadSaved(true)}
            >
              Discard unsaved recording
            </button>
          </div>
          {conflict && (
            <button
              type="button"
              className={button}
              disabled={uploading}
              onClick={() => void loadSaved(false)}
            >
              Load latest saved answers before retry
            </button>
          )}
        </div>
      )}
      {evidenceId && (
        <SpeechEvidencePlayback
          evidenceId={evidenceId}
          available={evidenceAvailable}
          learner
          onChanged={reload}
        />
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
