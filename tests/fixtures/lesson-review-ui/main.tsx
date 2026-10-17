import { useState } from "react";
import { createRoot } from "react-dom/client";
import { FreezeLessonSnapshot } from "@/components/exams/FreezeLessonSnapshot";
import {
  LessonReviewSnapshotView,
  type LessonReviewPayload,
} from "@/components/exams/LessonReviewSnapshotView";
import { lessonReviewSnapshot, lessonReviewFingerprint } from "@/lib/lesson-review";
const snapshot = lessonReviewSnapshot("roofing", "Spanish", "English")!;
const initial: LessonReviewPayload = {
  snapshot,
  releaseId: "fictional-local-release",
  releaseContentVersion: "local-fixture",
  fingerprint: await lessonReviewFingerprint(snapshot),
  storedFingerprint: null,
  matchesStoredSnapshot: false,
  canBind: true,
  releaseManifest: { lessonCount: 30 },
};
export function Fixture() {
  const [data, setData] = useState(initial),
    [owner, setOwner] = useState(true),
    [message, setMessage] = useState("");
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Local lesson-freeze UI fixture</h1>
      <p className="rounded-xl border border-gold/40 p-4">
        Fictional permissions and simulated API only. Public Roofing practice drafts; no hosted
        writes, real owner access, review approvals, learner results or certificates.
      </p>
      <button
        className="min-h-11 rounded-xl border border-border px-4"
        onClick={() => setOwner((value) => !value)}
      >
        {owner ? "Show without owner permission" : "Show fictional owner controls"}
      </button>
      {message && <p role="status">{message}</p>}
      <FreezeLessonSnapshot
        data={{ ...data, canBind: owner && !data.bound }}
        onAccessLost={() => setMessage("Local access lost")}
        onBound={() => {
          setMessage(
            "Local simulated freeze succeeded with the same retry key. No hosted write or review approval.",
          );
          setData({
            ...data,
            canBind: false,
            bound: { snapshot, fingerprint: data.fingerprint, createdAt: new Date().toISOString() },
            storedFingerprint: data.fingerprint,
            matchesStoredSnapshot: true,
            materialKind: "frozen",
          });
        }}
      />
      <LessonReviewSnapshotView data={data} />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
