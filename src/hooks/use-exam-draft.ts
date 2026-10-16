import { removeExamDeviceValue, isExamDeviceValueVolatile } from "@/lib/assessments/device-store";
import { clearExamInk } from "@/lib/assessments/ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest, ExamRequestError } from "@/lib/assessments/client";
import {
  acknowledgeFlight,
  adoptExternalDraft,
  browserExamStorage,
  examDraftKey,
  nextDraftFlight,
  readExamDraft,
  registerPendingExam,
  saveExamDraft,
  type ExamDeviceDraft,
} from "@/lib/assessments/drafts";
import { clearOfflineExams, saveOfflineExam } from "@/lib/assessments/offline";
import type { AssessmentAnswer } from "@/lib/assessments/form";
import type { readAttempt } from "@/lib/assessments/server";
export type ExamAttemptView = Awaited<ReturnType<typeof readAttempt>>;
type SaveStatus = "synced" | "device" | "unsaved" | "syncing" | "conflict";
const answersFrom = (attempt: ExamAttemptView) =>
  Object.fromEntries(
    attempt.responses.map((response) => [response.item_id, response.answer as AssessmentAnswer]),
  );

/** One authoritative revision and one persisted idempotent save flight at a time. */
export function useExamDraft(attempt: ExamAttemptView) {
  const { user, isCurrentUser } = useAuth();
  const userId = user?.id ?? "",
    key = examDraftKey(userId, attempt.id),
    storage = browserExamStorage();
  const remote = useRef(attempt),
    mounted = useRef(true),
    saving = useRef<Promise<boolean> | null>(null),
    controller = useRef<AbortController | null>(null);
  const initial = useRef<ExamDeviceDraft | null>(null);
  if (!initial.current) {
    const saved = readExamDraft(storage, key);
    initial.current =
      saved?.formId === attempt.form.id
        ? { ...saved, index: Math.min(saved.index, attempt.form.items.length - 1) }
        : {
            formId: attempt.form.id,
            revision: attempt.revision,
            index: 0,
            sequence: 0,
            pending: {},
            flight: null,
            savedAt: attempt.savedAt,
          };
  }
  const current = useRef(initial.current);
  const [draft, setDraft] = useState(initial.current);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>(() => ({
    ...answersFrom(attempt),
    ...Object.fromEntries(
      Object.entries(initial.current!.pending).map(([id, entry]) => [id, entry.answer]),
    ),
  }));
  const [status, setStatus] = useState<SaveStatus>(() =>
    Object.keys(initial.current!.pending).length
      ? initial.current!.revision === attempt.revision
        ? isExamDeviceValueVolatile(key)
          ? "unsaved"
          : "device"
        : "conflict"
      : "synced",
  );
  const conflictBlocked = useRef(status === "conflict");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<ExamAttemptView | null>(() =>
    status === "conflict" ? attempt : null,
  );
  const update = useCallback(
    (next: ExamDeviceDraft, nextStatus?: SaveStatus) => {
      if (!isCurrentUser(userId)) return false;
      current.current = next;
      const pending = Boolean(Object.keys(next.pending).length || next.flight);
      registerPendingExam(userId, attempt.id, pending);
      const saved = saveExamDraft(storage, key, next);
      if (mounted.current) {
        setDraft(next);
        if (nextStatus) setStatus(nextStatus === "device" && !saved ? "unsaved" : nextStatus);
      }
      return saved;
    },
    [attempt.id, isCurrentUser, key, storage, userId],
  );
  const edit = useCallback(
    (itemId: string, answer: AssessmentAnswer) => {
      const seq = current.current.sequence + 1;
      const next = {
        ...current.current,
        sequence: seq,
        pending: { ...current.current.pending, [itemId]: { answer, edit: seq } },
        savedAt: new Date().toISOString(),
      };
      const saved = update(next, conflict ? "conflict" : "device");
      if (mounted.current) {
        setAnswers((previous) => ({ ...previous, [itemId]: answer }));
        setError(
          saved ? "" : "Device storage is unavailable or full. Stay here until your answers sync.",
        );
      }
    },
    [conflict, update],
  );
  const sync = useCallback(
    async (recover = false): Promise<boolean> => {
      if (saving.current) return saving.current;
      if ((conflict || conflictBlocked.current) && !recover) return false;
      if (typeof navigator !== "undefined" && !navigator.onLine) return false;
      const flight = nextDraftFlight(current.current, crypto.randomUUID());
      if (!flight) return true;
      if (recover && !current.current.flight) return false;
      update({ ...current.current, flight }, "syncing");
      const abort = new AbortController();
      controller.current = abort;
      const work = (async () => {
        try {
          const result = await examRequest<{ revision: number; syncedAt: string }>(
            {
              action: "save",
              attemptId: attempt.id,
              revision: flight.revision,
              updates: flight.updates,
              requestId: flight.requestId,
            },
            abort.signal,
          );
          if (!isCurrentUser(userId)) return false;
          const next = acknowledgeFlight(current.current, result.revision);
          const anotherDevice = remote.current.revision > result.revision;
          if (anotherDevice && Object.keys(next.pending).length) {
            update(next, "conflict");
            if (mounted.current) setConflict(remote.current);
            return false;
          }
          next.revision = Math.max(result.revision, remote.current.revision);
          next.savedAt = result.syncedAt;
          update(next, Object.keys(next.pending).length ? "device" : "synced");
          if (mounted.current) {
            if (anotherDevice) setAnswers(answersFrom(remote.current));
            setConflict(null);
            setError(
              anotherDevice
                ? "A newer server copy was loaded. Review the saved responses before continuing."
                : "",
            );
          }
          return true;
        } catch (err) {
          if (!isCurrentUser(userId)) return false;
          if (err instanceof ExamRequestError && err.status === 409) {
            conflictBlocked.current = true;
            try {
              const latest = await examRequest<ExamAttemptView>(
                `/api/exams?action=attempt&attempt=${attempt.id}`,
              );
              remote.current = latest;
              if (mounted.current) setConflict(latest);
            } catch {
              /* Keep the local draft until a current server copy is available. */
            }
            if (mounted.current) {
              setStatus("conflict");
              setError(
                "Another device or request changed this attempt. Review both copies before saving.",
              );
            }
          } else if (mounted.current) {
            setStatus(saveExamDraft(storage, key, current.current) ? "device" : "unsaved");
            setError(
              err instanceof Error ? err.message : "Connection lost. Your device draft is kept.",
            );
          }
          return false;
        } finally {
          saving.current = null;
          if (controller.current === abort) controller.current = null;
        }
      })();
      saving.current = work;
      return work;
    },
    [attempt.id, conflict, isCurrentUser, key, storage, update, userId],
  );
  useEffect(() => {
    mounted.current = true;
    registerPendingExam(
      userId,
      attempt.id,
      Boolean(Object.keys(current.current.pending).length || current.current.flight),
    );
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [attempt.id, userId]);
  useEffect(() => {
    if (!Object.keys(draft.pending).length || conflict || attempt.submittedAt) return;
    const timer = setTimeout(() => void sync(), 700);
    return () => clearTimeout(timer);
  }, [draft.pending, conflict, sync, attempt.submittedAt]);
  useEffect(() => {
    const online = () => void sync(Boolean(current.current.flight));
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
    };
  }, [sync]);
  useEffect(() => {
    if (current.current.flight && current.current.revision !== attempt.revision) void sync(true);
  }, [attempt.revision, sync]);
  useEffect(() => {
    if (!isCurrentUser(userId) || attempt.submittedAt) return;
    saveOfflineExam(storage, userId, {
      ...attempt,
      revision: draft.revision,
      savedAt: draft.savedAt,
      responses: Object.entries(answers).map(([item_id, answer]) => ({
        id: attempt.responses.find((row) => row.item_id === item_id)?.id ?? item_id,
        item_id,
        answer,
        saved_at: draft.savedAt,
      })),
    });
  }, [answers, attempt, draft.revision, draft.savedAt, isCurrentUser, storage, userId]);
  const setIndex = (index: number) =>
    update({
      ...current.current,
      index: Math.max(0, Math.min(attempt.form.items.length - 1, index)),
    });
  const flush = async () => {
    for (let i = 0; i < 12; i++) {
      if (!Object.keys(current.current.pending).length && !current.current.flight) return true;
      if (!(await sync())) return false;
    }
    return false;
  };
  const resolve = async (keepDevice: boolean) => {
    const latest = await examRequest<ExamAttemptView>(
      `/api/exams?action=attempt&attempt=${attempt.id}`,
    );
    remote.current = latest;
    if (latest.submittedAt) {
      setConflict(latest);
      setError(
        "This attempt was already submitted. Your device answers cannot replace its submitted record.",
      );
      return;
    }
    const next = {
      ...current.current,
      revision: latest.revision,
      flight: null,
      pending: keepDevice ? current.current.pending : {},
    };
    update(next, keepDevice && Object.keys(next.pending).length ? "device" : "synced");
    setAnswers({
      ...answersFrom(latest),
      ...Object.fromEntries(Object.entries(next.pending).map(([id, entry]) => [id, entry.answer])),
    });
    conflictBlocked.current = false;
    setConflict(null);
    setError("");
  };
  // Upload attaches a response atomically on the server. Flush first and adopt its
  // current revision without inventing a local answer or overwriting pending edits.
  const reloadAfterExternal = async () => {
    if (!(await flush()))
      throw new Error("Sync answers and resolve conflicts before loading the recording.");
    const latest = await examRequest<ExamAttemptView>(
      `/api/exams?action=attempt&attempt=${attempt.id}`,
    );
    if (!isCurrentUser(userId)) throw new Error("Your session changed.");
    if (Object.keys(current.current.pending).length || current.current.flight)
      throw new Error("Answers changed while loading. Sync them before continuing.");
    if (latest.submittedAt)
      throw new Error(
        "This attempt was submitted on another device. Return to Exams to view its saved result.",
      );
    const adopted = adoptExternalDraft(current.current, latest.revision, latest.savedAt);
    remote.current = latest;
    update(adopted, "synced");
    setAnswers(answersFrom(latest));
    conflictBlocked.current = false;
    setConflict(null);
    setError("");
    return latest;
  };
  const clearSubmitted = () => {
    if (!isCurrentUser(userId)) return;
    try {
      removeExamDeviceValue(storage, key);
    } catch {
      /* The server submission remains authoritative. */
    }
    clearOfflineExams(storage, userId, attempt.id);
    clearExamInk(storage, userId, attempt.id);
    registerPendingExam(userId, attempt.id, false);
  };
  return {
    answers,
    index: draft.index,
    setIndex,
    edit,
    status,
    error,
    conflict,
    sync,
    flush,
    resolve,
    clearSubmitted,
    reloadAfterExternal,
    revision: () => current.current.revision,
    pendingCount: Object.keys(draft.pending).length,
    serverAnswers: conflict ? answersFrom(conflict) : {},
    speechEvidence: remote.current.speechEvidence ?? [],
  };
}
