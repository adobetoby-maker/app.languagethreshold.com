import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest, ExamRequestError } from "@/lib/assessments/client";
import { LessonReviewSnapshotView, type LessonReviewPayload } from "./LessonReviewSnapshotView";
import { FreezeLessonSnapshot } from "./FreezeLessonSnapshot";

export function LessonContentReview({
  releaseId,
  onAccessLost,
  onBound,
}: {
  releaseId: string;
  onAccessLost: () => void;
  onBound: () => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const [open, setOpen] = useState(false),
    [epoch, setEpoch] = useState(0);
  const [data, setData] = useState<LessonReviewPayload | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open || !user) return;
    const actor = user.id,
      controller = new AbortController();
    setData(null);
    setError("");
    void examRequest<LessonReviewPayload>(
      `/api/exam-content?lessons=${encodeURIComponent(releaseId)}`,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) setData(result);
      })
      .catch((err) => {
        if (controller.signal.aborted || !isCurrentUser(actor)) return;
        if (err instanceof ExamRequestError && (err.status === 401 || err.status === 403))
          onAccessLost();
        else setError(err instanceof Error ? err.message : "Lesson materials could not be loaded.");
      });
    return () => controller.abort();
  }, [open, epoch, releaseId, user, isCurrentUser, onAccessLost]);
  return (
    <section className="space-y-4 rounded-2xl border border-border p-4">
      <h2 className="text-xl font-semibold">Lesson materials for curriculum review</h2>
      <p className="text-sm">
        Inspect the current words, usage, passages and teaching progression before reviewing this
        module. Inspecting materials does not record a review approval.
      </p>
      <button
        type="button"
        className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Hide lesson materials" : "Inspect lesson materials"}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="min-h-11 text-sm text-gold underline"
            onClick={() => setEpoch((value) => value + 1)}
          >
            Refresh lesson snapshot
          </button>
          {error ? (
            <p role="alert">{error}</p>
          ) : data ? (
            <div className="space-y-4">
              {data.bound && (
                <section className="space-y-3 rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Frozen release lesson reference</h3>
                  <p className="text-sm">
                    Saved {new Date(data.bound.createdAt).toLocaleString()}.{" "}
                    {data.matchesStoredSnapshot
                      ? "The current app material matches this frozen copy."
                      : "Current app lessons differ from this frozen release. Approval and new official exam starts are blocked until a current release is reviewed."}
                  </p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3">
                      Inspect frozen release lessons
                    </summary>
                    <LessonReviewSnapshotView
                      data={{
                        ...data,
                        snapshot: data.bound.snapshot,
                        fingerprint: data.bound.fingerprint,
                        matchesStoredSnapshot: true,
                        materialKind: "frozen",
                      }}
                    />
                  </details>
                </section>
              )}
              <FreezeLessonSnapshot
                key={JSON.stringify([data.releaseId, data.fingerprint, data.releaseManifest])}
                data={data}
                onBound={onBound}
                onAccessLost={onAccessLost}
              />
              <LessonReviewSnapshotView data={data} />
            </div>
          ) : (
            <p role="status">Loading current lesson materials…</p>
          )}
        </>
      )}
    </section>
  );
}
