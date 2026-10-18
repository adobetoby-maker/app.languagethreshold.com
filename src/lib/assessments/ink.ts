import {
  readExamDeviceValue,
  writeExamDeviceValue,
  removeExamDeviceValue,
  examDeviceKeys,
} from "./device-store.ts";
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
    const value = JSON.parse(readExamDeviceValue(storage, key) ?? "null");
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
    if (value.transcript.length > 4000 || (value.ink?.length ?? 0) > 500000) return false;
    return writeExamDeviceValue(storage, key, JSON.stringify(value), !!value.ink);
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
    const prefix = `${PREFIX}${encodeURIComponent(user)}.${attempt ? encodeURIComponent(attempt) + "." : ""}`;
    for (const k of examDeviceKeys(storage)) {
      if (k.startsWith(prefix)) {
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
    const prefix = `${PREFIX}${encodeURIComponent(user)}.${attempt ? encodeURIComponent(attempt) + "." : ""}`;
    for (const k of examDeviceKeys(storage))
      if (k.startsWith(prefix)) removeExamDeviceValue(storage, k);
  } catch {
    /* Keep sign-out usable. */
  }
}
