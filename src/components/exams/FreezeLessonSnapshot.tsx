import { useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examContentRequest, ExamRequestError } from "@/lib/assessments/client";
import type { LessonReviewPayload } from "./LessonReviewSnapshotView";

export function FreezeLessonSnapshot({
  data,
  onBound,
  onAccessLost,
}: {
  data: LessonReviewPayload;
  onBound: () => void;
  onAccessLost: () => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    retry = useRef<{ key: string; id: string } | null>(null);
  async function freeze() {
    if (!user || !data.canBind || !data.releaseManifest || !confirmed || lock.current) return;
    const actor = user.id;
    const body = {
      action: "bind_lessons",
      releaseId: data.releaseId,
      fingerprint: data.fingerprint,
      expectedManifest: data.releaseManifest,
      contentVersion: data.releaseContentVersion,
      confirmDraftSnapshot: true,
    };
    const key = JSON.stringify(body);
    if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await examContentRequest({ ...body, requestId: retry.current.id });
      if (isCurrentUser(actor)) onBound();
    } catch (err) {
      if (isCurrentUser(actor)) {
        if (err instanceof ExamRequestError && (err.status === 401 || err.status === 403))
          onAccessLost();
        else setError(err instanceof Error ? err.message : "Lesson snapshot could not be frozen.");
      }
    } finally {
      lock.current = false;
      if (isCurrentUser(actor)) setBusy(false);
    }
  }
  if (!data.canBind) return null;
  return (
    <form
      className="space-y-3 rounded-xl border border-gold/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void freeze();
      }}
    >
      <h3 className="font-semibold">Freeze these draft lessons for review</h3>
      <p className="text-sm">
        Save an immutable copy of the exact lesson materials displayed below. Later lesson edits
        need a new release version and review. This does not approve lessons, publish exams, or
        verify offline use.
      </p>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>I want this exact draft material attached to this release for human review.</span>
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        type="submit"
        className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 disabled:opacity-50"
        disabled={busy || !confirmed}
      >
        {busy ? "Freezing draft lessons…" : "Freeze draft lesson snapshot"}
      </button>
    </form>
  );
}
