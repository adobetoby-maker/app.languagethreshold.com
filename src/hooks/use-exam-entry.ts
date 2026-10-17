import { useCallback, useEffect, useRef, useState } from "react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import type { ExamAttemptView } from "@/hooks/use-exam-draft";
import { examRequest } from "@/lib/assessments/client";
import { browserExamStorage } from "@/lib/assessments/drafts";
import {
  readOfflineExams,
  recoveryCopiesForScope,
  saveOfflineExam,
} from "@/lib/assessments/offline";
import { attemptMatchesOrganization } from "@/lib/assessments/scope";
export type OpenedExam = { viewer: string; attempt: ExamAttemptView; fromDevice?: boolean };
type OpenCallbacks = {
  onOpened: (selection: OpenedExam) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
};
/** Only the newest mounted attempt read may select or persist its response. */
export function useExamAttemptOpen(
  orgId: string | undefined,
  { onOpened, onLoading, onError }: OpenCallbacks,
) {
  const { actor, capture } = usePracticeLifecycle(orgId ?? "personal");
  const pending = useRef<AbortController | null>(null);
  const cancelOpen = useCallback(() => {
    if (!capture().isCurrent()) return;
    pending.current?.abort();
    pending.current = null;
    onLoading(false);
  }, [capture, onLoading]);
  const open = useCallback(
    async (id: string, review = false) => {
      const lease = capture();
      if (!actor || !lease.isCurrent()) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      const release = lease.own(() => controller.abort());
      const current = () =>
        lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
      onLoading(true);
      onError("");
      try {
        const attempt = await examRequest<ExamAttemptView>(
          `/api/exams?action=attempt&attempt=${encodeURIComponent(id)}${review ? "&review=1" : ""}${orgId ? `&org=${encodeURIComponent(orgId)}` : ""}`,
          controller.signal,
        );
        if (!current()) return;
        if (!attemptMatchesOrganization(attempt, orgId))
          throw new Error("This attempt is outside this team view. Open its own Exams view.");
        saveOfflineExam(browserExamStorage(), actor, attempt);
        if (current()) onOpened({ viewer: actor, attempt, fromDevice: false });
      } catch (err) {
        if (!current()) return;
        const saved =
          navigator.onLine === false || err instanceof TypeError
            ? recoveryCopiesForScope(
                readOfflineExams<ExamAttemptView>(browserExamStorage(), actor),
                orgId,
              ).find((row) => row.id === id)
            : null;
        if (saved && current()) onOpened({ viewer: actor, attempt: saved, fromDevice: true });
        if (current())
          onError(
            saved
              ? "Resumed this device’s saved copy. Check the sync status before submitting."
              : err instanceof Error
                ? err.message
                : "Exam could not be opened.",
          );
      } finally {
        if (current()) onLoading(false);
        if (pending.current === controller) pending.current = null;
        release();
        controller.abort();
      }
    },
    [actor, capture, orgId, onOpened, onLoading, onError],
  );
  return { open, cancelOpen };
}
type Preparation = { preparedForm: string; estimatedMinutes: number | null; provisional: boolean };
/** Start disclosure is read afresh for this actor and pending checkpoint. */
export function useExamPreparation(checkpointId: string | undefined) {
  const { actor, key, capture } = usePracticeLifecycle(checkpointId ?? "none");
  const [snapshot, setSnapshot] = useState<{
    key: string;
    prepared: Preparation | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    const lease = capture();
    setSnapshot(null);
    if (!actor || !checkpointId || !lease.isCurrent()) return;
    const controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const current = () => lease.isCurrent() && !controller.signal.aborted;
    void examRequest<Preparation>({ action: "prepare", checkpointId }, controller.signal)
      .then((prepared) => {
        if (current()) setSnapshot({ key, prepared, error: "" });
      })
      .catch((error) => {
        if (current())
          setSnapshot({
            key,
            prepared: null,
            error: error instanceof Error ? error.message : "Start details could not be loaded.",
          });
      });
    return () => {
      controller.abort();
      release();
    };
  }, [actor, key, capture, checkpointId]);
  return snapshot?.key === key && actor && checkpointId
    ? { prepared: snapshot.prepared, error: snapshot.error }
    : { prepared: null, error: "" };
}
