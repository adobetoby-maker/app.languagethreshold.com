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
  resumeExamDraft,
  registerPendingExam,
  saveExamDraft,
  type ExamDeviceDraft,
} from "@/lib/assessments/drafts";
import { clearOfflineExams, saveOfflineExam } from "@/lib/assessments/offline";
import type { AssessmentAnswer } from "@/lib/assessments/form";
import type { readAttempt } from "@/lib/assessments/server";
import { continueExamRouting } from "@/lib/assessments/routing-client";
export type ExamAttemptView = Awaited<ReturnType<typeof readAttempt>>;
type SaveStatus = "synced" | "device" | "unsaved" | "syncing" | "conflict";
const answersFrom = (attempt: ExamAttemptView) =>
  Object.fromEntries(
    attempt.responses.map((response) => [response.item_id, response.answer as AssessmentAnswer]),
  );

/** One authoritative revision and one persisted idempotent save flight at a time. */
export function useExamDraft(attempt: ExamAttemptView, fromDevice = false) {
  const { user, isCurrentUser } = useAuth();
  const userId = user?.id ?? "",
    key = examDraftKey(userId, attempt.id),
    storage = browserExamStorage();
  const remote = useRef(attempt),
    mounted = useRef(true),
    saving = useRef<Promise<boolean> | null>(null),
    continuing = useRef<Promise<ExamAttemptView> | null>(null),
    continuationAbort = useRef<AbortController | null>(null),
    controller = useRef<AbortController | null>(null);
  const reads = useRef(new Set<AbortController>()),
    readVersion = useRef(0),
    reloading = useRef<Promise<ExamAttemptView> | null>(null);
  const active = useCallback(
    () => mounted.current && !!userId && isCurrentUser(userId),
    [isCurrentUser, userId],
  );
  const readServerCopy = useCallback(
    async <T>(
      signal: AbortSignal | undefined,
      adopt: (latest: ExamAttemptView) => T,
    ): Promise<T> => {
      if (!active() || signal?.aborted) throw new Error("Your session changed.");
      const abort = new AbortController(),
        version = ++readVersion.current;
      const cancel = () => abort.abort();
      reads.current.add(abort);
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        const latest = await examRequest<ExamAttemptView>(
          `/api/exams?action=attempt&attempt=${attempt.id}`,
          abort.signal,
          {
            userId,
            isCurrent: () => active() && version === readVersion.current && !signal?.aborted,
          },
        );
        if (!active() || abort.signal.aborted || signal?.aborted)
          throw new Error("Your session changed.");
        if (version !== readVersion.current)
          throw new Error("A newer server-copy check replaced this one. Retry the current view.");
        if (
          latest.id !== attempt.id ||
          latest.form.id !== attempt.form.id ||
          latest.form.version !== attempt.form.version ||
          latest.form.rubricVersion !== attempt.form.rubricVersion ||
          latest.enrollment.id !== attempt.enrollment.id ||
          !latest.isLearner
        )
          throw new Error("The server copy does not match your active attempt. Reopen Exams.");
        return adopt(latest);
      } finally {
        signal?.removeEventListener("abort", cancel);
        reads.current.delete(abort);
        abort.abort();
      }
    },
    [
      active,
      attempt.id,
      attempt.form.id,
      attempt.form.version,
      attempt.form.rubricVersion,
      attempt.enrollment.id,
      userId,
    ],
  );
  const initial = useRef<ExamDeviceDraft | null>(null);
  if (!initial.current) {
    const saved = readExamDraft(storage, key);
    initial.current = resumeExamDraft(
      saved,
      {
        formId: attempt.form.id,
        revision: attempt.revision,
        savedAt: attempt.savedAt,
        itemCount: attempt.form.items.length,
        routingState: attempt.routing?.state,
        coreItemCount: attempt.routing?.coreItemCount,
      },
      fromDevice,
    );
  }
  const current = useRef(initial.current);
  const [draft, setDraft] = useState(initial.current);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>(() => ({
    ...answersFrom(attempt),
    ...initial.current!.acknowledged,
    ...Object.fromEntries(
      Object.entries(initial.current!.pending).map(([id, entry]) => [id, entry.answer]),
    ),
  }));
  const [status, setStatus] = useState<SaveStatus>(() =>
    Object.keys(initial.current!.pending).length || initial.current!.flight
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
      if (!active()) return false;
      current.current = next;
      const pending = Boolean(Object.keys(next.pending).length || next.flight || next.routeFlight);
      registerPendingExam(userId, attempt.id, pending);
      const saved = saveExamDraft(storage, key, next);
      if (mounted.current) {
        setDraft(next);
        if (nextStatus) setStatus(nextStatus === "device" && !saved ? "unsaved" : nextStatus);
      }
      return saved;
    },
    [active, attempt.id, key, storage, userId],
  );
  const edit = useCallback(
    (itemId: string, answer: AssessmentAnswer) => {
      if (
        !active() ||
        attempt.submittedAt ||
        !attempt.form.items.some((item) => item.id === itemId) ||
        current.current.routeFlight
      )
        return;
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
    [active, attempt.form.items, attempt.submittedAt, conflict, update],
  );
  const sync = useCallback(
    async (recover = false): Promise<boolean> => {
      if (!active() || attempt.submittedAt) return false;
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
            { userId, isCurrent: () => active() && controller.current === abort },
          );
          if (!active() || abort.signal.aborted || controller.current !== abort) return false;
          const next = acknowledgeFlight(current.current, result.revision);
          const anotherDevice = remote.current.revision > result.revision;
          if (anotherDevice && Object.keys(next.pending).length) {
            update(next, "conflict");
            if (mounted.current) setConflict(remote.current);
            return false;
          }
          next.revision = Math.max(result.revision, remote.current.revision);
          next.savedAt = result.syncedAt;
          if (anotherDevice) next.acknowledged = undefined;
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
          if (!active() || abort.signal.aborted || controller.current !== abort) return false;
          if (err instanceof ExamRequestError && err.status === 409) {
            conflictBlocked.current = true;
            const conflictReadVersion = readVersion.current + 1;
            try {
              await readServerCopy(abort.signal, (latest) => {
                remote.current = latest;
                setConflict(latest);
              });
            } catch {
              /* Keep the local draft until a current server copy is available. */
            }
            if (
              active() &&
              !abort.signal.aborted &&
              controller.current === abort &&
              readVersion.current === conflictReadVersion
            ) {
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
          if (controller.current === abort) {
            saving.current = null;
            controller.current = null;
          }
        }
      })();
      saving.current = work;
      return work;
    },
    [
      active,
      attempt.id,
      attempt.submittedAt,
      conflict,
      key,
      readServerCopy,
      storage,
      update,
      userId,
    ],
  );
  useEffect(() => {
    mounted.current = true;
    const ownedReads = reads.current;
    if (active())
      registerPendingExam(
        userId,
        attempt.id,
        Boolean(
          Object.keys(current.current.pending).length ||
          current.current.flight ||
          current.current.routeFlight,
        ),
      );
    return () => {
      mounted.current = false;
      controller.current?.abort();
      continuationAbort.current?.abort();
      for (const read of ownedReads) read.abort();
      ownedReads.clear();
    };
  }, [active, attempt.id, userId]);
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
    // A fresh selected snapshot may have recovered an uncertain route during
    // initialization. Persist that receipt so sign-out checks see the same state.
    if (active() && attempt.routing?.state === "selected" && !current.current.routeFlight)
      saveExamDraft(storage, key, current.current);
  }, [active, attempt.routing?.state, key, storage]);
  useEffect(() => {
    if (current.current.flight && current.current.revision !== attempt.revision) void sync(true);
  }, [attempt.revision, sync]);
  useEffect(() => {
    if (!active() || attempt.submittedAt) return;
    if (remote.current.routing?.state === "selected" && attempt.routing?.state === "core") return;
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
  }, [active, answers, attempt, draft.revision, draft.savedAt, storage, userId]);
  const setIndex = (index: number) =>
    update({
      ...current.current,
      index: Math.max(0, Math.min(attempt.form.items.length - 1, index)),
    });
  const flush = async () => {
    for (let i = 0; i < 12; i++) {
      if (!active()) return false;
      if (!Object.keys(current.current.pending).length && !current.current.flight) return true;
      if (!(await sync()) || !active()) return false;
    }
    return false;
  };
  const resolve = async (keepDevice: boolean, signal?: AbortSignal) => {
    if (!mounted.current || !isCurrentUser(userId) || signal?.aborted)
      throw new Error("Your session changed.");
    if (current.current.routeFlight)
      throw new Error("Recover the saved continuation before changing core answers.");
    const sequence = current.current.sequence;
    return readServerCopy(signal, (latest) => {
      if (current.current.sequence !== sequence)
        throw new Error("Answers changed while checking the server. Review both copies again.");
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
        index:
          attempt.routing?.state === "core" && latest.routing?.state === "selected"
            ? latest.routing.coreItemCount
            : current.current.index,
        flight: null,
        pending: keepDevice ? current.current.pending : {},
        acknowledged: undefined,
      };
      update(next, keepDevice && Object.keys(next.pending).length ? "device" : "synced");
      setAnswers({
        ...answersFrom(latest),
        ...Object.fromEntries(
          Object.entries(next.pending).map(([id, entry]) => [id, entry.answer]),
        ),
      });
      conflictBlocked.current = false;
      setConflict(null);
      setError("");
      saveOfflineExam(storage, userId, latest);
      return latest;
    });
  };
  const continueRouting = (signal?: AbortSignal): Promise<ExamAttemptView> => {
    if (!mounted.current || !isCurrentUser(userId) || signal?.aborted)
      return Promise.reject(new Error("Your session changed."));
    if (continuing.current) return continuing.current;
    const abort = new AbortController();
    continuationAbort.current = abort;
    const owner = {
      userId,
      isCurrent: () => active() && continuationAbort.current === abort,
    };
    const cancel = () => abort.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = (async () => {
      const latest = await continueExamRouting({
        attempt,
        current: () => current.current,
        update: (next) => {
          update(next, "synced");
        },
        flush,
        isCurrent: () => {
          if (!mounted.current || !isCurrentUser(userId)) return false;
          if (abort.signal.aborted)
            throw new DOMException("Exam continuation cancelled.", "AbortError");
          return true;
        },
        online: () => typeof navigator !== "undefined" && navigator.onLine !== false,
        requestId: () => crypto.randomUUID(),
        select: (flight) => {
          timer = setTimeout(() => abort.abort(), 30000);
          return examRequest(
            { action: "route", attemptId: attempt.id, ...flight },
            abort.signal,
            owner,
          );
        },
        read: () =>
          examRequest<ExamAttemptView>(
            `/api/exams?action=attempt&attempt=${attempt.id}`,
            abort.signal,
            owner,
          ),
        conflict: (latest) => {
          remote.current = latest;
          conflictBlocked.current = true;
          setConflict(latest);
          setStatus("conflict");
        },
      });
      if (!mounted.current || !isCurrentUser(userId) || abort.signal.aborted)
        throw new Error("Your session changed.");
      remote.current = latest;
      saveOfflineExam(storage, userId, latest);
      return latest;
    })();
    continuing.current = work;
    void work
      .finally(() => {
        signal?.removeEventListener("abort", cancel);
        if (timer) clearTimeout(timer);
        if (continuationAbort.current === abort) continuationAbort.current = null;
        if (continuing.current === work) continuing.current = null;
      })
      .catch(() => undefined);
    return work;
  };
  // Upload attaches a response atomically on the server. Flush first and adopt its
  // current revision without inventing a local answer or overwriting pending edits.
  const reloadAfterExternal = (): Promise<ExamAttemptView> => {
    if (!active()) return Promise.reject(new Error("Your session changed."));
    if (reloading.current) return reloading.current;
    const abort = new AbortController();
    reads.current.add(abort);
    const work = (async () => {
      if (!(await flush()))
        throw new Error("Sync answers and resolve conflicts before loading the recording.");
      if (!active() || abort.signal.aborted) throw new Error("Your session changed.");
      const sequence = current.current.sequence,
        revision = current.current.revision;
      return readServerCopy(abort.signal, (latest) => {
        if (
          Object.keys(current.current.pending).length ||
          current.current.flight ||
          current.current.sequence !== sequence ||
          current.current.revision !== revision
        )
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
      });
    })();
    reloading.current = work;
    void work
      .finally(() => {
        reads.current.delete(abort);
        abort.abort();
        if (reloading.current === work) reloading.current = null;
      })
      .catch(() => undefined);
    return work;
  };
  const clearSubmitted = () => {
    if (!active()) return;
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
    continueRouting,
    routePending: !!draft.routeFlight,
    revision: () => current.current.revision,
    pendingCount: Object.keys(draft.pending).length,
    serverAnswers: conflict ? answersFrom(conflict) : {},
    speechEvidence: remote.current.speechEvidence ?? [],
  };
}
