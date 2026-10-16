import type { ExamDraftStorage } from "./drafts.ts";
const PREFIX = "lt.examInk.v1.";
export interface ExamInk {
  ink: string | null;
  transcript: string;
  confirmed: boolean;
}
export const examInkKey = (user: string, attempt: string, item: string) =>
  `${PREFIX}${encodeURIComponent(user)}.${encodeURIComponent(attempt)}.${encodeURIComponent(item)}`;
export function readExamInk(storage: ExamDraftStorage | null, key: string): ExamInk | null {
  try {
    const value = JSON.parse(storage?.getItem(key) ?? "null");
    if (
      !value ||
      typeof value.transcript !== "string" ||
      value.transcript.length > 4000 ||
      typeof value.confirmed !== "boolean" ||
      (value.ink !== null &&
        (typeof value.ink !== "string" ||
          value.ink.length > 500000 ||
          !/^[A-Za-z0-9+/=]+$/.test(value.ink)))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function saveExamInk(storage: ExamDraftStorage | null, key: string, value: ExamInk) {
  try {
    if (!storage || value.transcript.length > 4000 || (value.ink?.length ?? 0) > 500000)
      return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function hasUnconfirmedExamInk(
  storage: ExamDraftStorage | null,
  user: string,
  attempt?: string,
) {
  try {
    if (!storage) return false;
    const prefix = `${PREFIX}${encodeURIComponent(user)}.${attempt ? encodeURIComponent(attempt) + "." : ""}`;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(prefix)) {
        const v = readExamInk(storage, k);
        if (v?.ink && !v.confirmed) return true;
      }
    }
  } catch {
    /* In-memory registry handles blocked storage. */
  }
  return false;
}
export function clearExamInk(storage: ExamDraftStorage | null, user: string, attempt?: string) {
  try {
    if (!storage) return;
    const prefix = `${PREFIX}${encodeURIComponent(user)}.${attempt ? encodeURIComponent(attempt) + "." : ""}`;
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (k?.startsWith(prefix)) storage.removeItem(k);
    }
  } catch {
    /* Keep sign-out usable. */
  }
}
