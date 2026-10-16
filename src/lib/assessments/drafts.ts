import { clearExamInk, hasUnconfirmedExamInk } from "./ink.ts";
import { clearOfflineExams } from "./offline.ts";
import type { AssessmentAnswer } from "./form.ts";
const PREFIX = "lt.examDraft.v1.";
const memoryPending = new Map<string, Set<string>>();
export interface PendingAnswer {
  answer: AssessmentAnswer;
  edit: number;
}
export interface DraftFlight {
  requestId: string;
  revision: number;
  updates: { itemId: string; answer: AssessmentAnswer }[];
  edits: Record<string, number>;
}
export interface ExamDeviceDraft {
  formId: string;
  revision: number;
  index: number;
  sequence: number;
  pending: Record<string, PendingAnswer>;
  flight: DraftFlight | null;
  savedAt: string;
}
export interface ExamDraftStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function examDraftKey(userId: string, attemptId: string) {
  return `${PREFIX}${encodeURIComponent(userId)}.${encodeURIComponent(attemptId)}`;
}
export function readExamDraft(
  storage: ExamDraftStorage | null,
  key: string,
): ExamDeviceDraft | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw || raw.length > 400000) return null;
    const value = JSON.parse(raw);
    if (
      !value ||
      typeof value.formId !== "string" ||
      !Number.isInteger(value.revision) ||
      value.revision < 0 ||
      !Number.isInteger(value.index) ||
      value.index < 0 ||
      !Number.isInteger(value.sequence) ||
      !value.pending ||
      typeof value.pending !== "object" ||
      Array.isArray(value.pending) ||
      Object.keys(value.pending).length > 200
    )
      return null;
    for (const [item, entry] of Object.entries(value.pending) as [string, PendingAnswer][]) {
      if (
        item.length > 160 ||
        !entry ||
        !Number.isInteger(entry.edit) ||
        !entry.answer ||
        typeof entry.answer !== "object" ||
        !["choice", "typed", "handwriting", "speech_transcript", "unavailable"].includes(
          entry.answer.inputMethod,
        )
      )
        return null;
    }
    if (
      value.flight !== null &&
      (!value.flight ||
        typeof value.flight.requestId !== "string" ||
        !Number.isInteger(value.flight.revision) ||
        !Array.isArray(value.flight.updates) ||
        value.flight.updates.length > 3 ||
        !value.flight.edits)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function saveExamDraft(
  storage: ExamDraftStorage | null,
  key: string,
  draft: ExamDeviceDraft,
): boolean {
  try {
    if (!storage) return false;
    const raw = JSON.stringify(draft);
    if (raw.length > 400000) return false;
    storage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}
export function registerPendingExam(userId: string, attemptId: string, pending: boolean) {
  const ids = memoryPending.get(userId) ?? new Set<string>();
  if (pending) ids.add(attemptId);
  else ids.delete(attemptId);
  if (ids.size) memoryPending.set(userId, ids);
  else memoryPending.delete(userId);
}
export function hasUnsyncedExamDrafts(storage: ExamDraftStorage | null, userId: string): boolean {
  if (memoryPending.get(userId)?.size || hasUnconfirmedExamInk(storage, userId)) return true;
  try {
    if (!storage) return false;
    const prefix = `${PREFIX}${encodeURIComponent(userId)}.`;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) {
        const draft = readExamDraft(storage, key);
        if (draft && (Object.keys(draft.pending).length || draft.flight)) return true;
      }
    }
  } catch {
    /* Memory registry still protects blocked-storage work. */
  }
  return false;
}
export function clearExamDraftsForUser(storage: ExamDraftStorage | null, userId: string): void {
  memoryPending.delete(userId);
  clearOfflineExams(storage, userId);
  clearExamInk(storage, userId);
  try {
    if (!storage) return;
    const prefix = `${PREFIX}${encodeURIComponent(userId)}.`;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) storage.removeItem(key);
    }
  } catch {
    /* A blocked storage implementation must not prevent sign-out. */
  }
}
/** Only the exact edits acknowledged by this request leave the pending queue. */
export function acknowledgeFlight(draft: ExamDeviceDraft, revision: number): ExamDeviceDraft {
  const pending = { ...draft.pending };
  for (const [item, edit] of Object.entries(draft.flight?.edits ?? {})) {
    if (pending[item]?.edit === edit) delete pending[item];
  }
  return { ...draft, revision, pending, flight: null };
}
export function nextDraftFlight(draft: ExamDeviceDraft, requestId: string): DraftFlight | null {
  if (draft.flight) return draft.flight;
  const entries = Object.entries(draft.pending).slice(0, 3);
  if (!entries.length) return null;
  return {
    requestId,
    revision: draft.revision,
    updates: entries.map(([itemId, entry]) => ({ itemId, answer: entry.answer })),
    edits: Object.fromEntries(entries.map(([itemId, entry]) => [itemId, entry.edit])),
  };
}

export function browserExamStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
