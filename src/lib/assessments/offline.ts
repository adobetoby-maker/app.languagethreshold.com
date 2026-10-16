import {
  readExamDeviceValue,
  writeExamDeviceValue,
  removeExamDeviceValue,
  examDeviceKeys,
} from "./device-store.ts";
import type { ExamDraftStorage } from "./drafts.ts";
const PREFIX = "lt.examSnapshot.v1.";
const MAX_AGE = 24 * 60 * 60 * 1000;
export interface OfflineExamSnapshot {
  id: string;
  submittedAt: string | null;
  isLearner: boolean;
  form: { id: string; items: unknown[] };
  enrollment: { moduleId: string; scope?: "personal" | "team"; organizationId?: string | null };
}
const key = (user: string, attempt: string) =>
  `${PREFIX}${encodeURIComponent(user)}.${encodeURIComponent(attempt)}`;
/** Only the learner's already-authorized, active public form; never answer keys or team lists. */
export function saveOfflineExam<T extends OfflineExamSnapshot>(
  storage: ExamDraftStorage | null,
  user: string,
  attempt: T,
  now = Date.now(),
): boolean {
  try {
    if (!attempt.isLearner || attempt.submittedAt) {
      removeExamDeviceValue(storage, key(user, attempt.id));
      return false;
    }
    const safe = { ...attempt, feedback: undefined, evidence: [], profiles: [], reviews: [] };
    const raw = JSON.stringify({ savedAt: now, attempt: safe });
    if (raw.length > 500000) return false;
    return writeExamDeviceValue(storage, key(user, attempt.id), raw, false);
  } catch {
    return false;
  }
}
export function readOfflineExams<T extends OfflineExamSnapshot>(
  storage: ExamDraftStorage | null,
  user: string,
  now = Date.now(),
): T[] {
  const result: T[] = [];
  try {
    const prefix = `${PREFIX}${encodeURIComponent(user)}.`;
    for (const k of examDeviceKeys(storage)) {
      if (!k.startsWith(prefix)) continue;
      try {
        const raw = readExamDeviceValue(storage, k);
        if (!raw || raw.length > 500000) continue;
        const saved = JSON.parse(raw);
        if (
          !Number.isFinite(saved.savedAt) ||
          now - saved.savedAt > MAX_AGE ||
          saved.savedAt > now ||
          !saved.attempt?.isLearner ||
          saved.attempt.submittedAt ||
          !Array.isArray(saved.attempt.form?.items)
        ) {
          removeExamDeviceValue(storage, k);
          continue;
        }
        result.push(saved.attempt);
      } catch {
        removeExamDeviceValue(storage, k);
      }
    }
  } catch {
    /* Blocked storage does not prevent online use. */
  }
  return result;
}
export function clearOfflineExams(
  storage: ExamDraftStorage | null,
  user: string,
  attempt?: string,
) {
  try {
    if (attempt) {
      removeExamDeviceValue(storage, key(user, attempt));
      return;
    }
    const prefix = `${PREFIX}${encodeURIComponent(user)}.`;
    const guidancePrefix = `lt.examGuidance.v1.${encodeURIComponent(user)}.`;
    for (const k of examDeviceKeys(storage))
      if (k.startsWith(prefix) || k.startsWith(guidancePrefix)) removeExamDeviceValue(storage, k);
  } catch {
    /* Best-effort private device cleanup. */
  }
}

const GUIDANCE_PREFIX = "lt.examGuidance.v1.";
export const examGuidanceKey = (user: string, moduleId: string, target: string, native: string) =>
  `${GUIDANCE_PREFIX}${encodeURIComponent(user)}.${[moduleId, target, native].map(encodeURIComponent).join(".")}`;
export function saveOfflineGuidance(
  storage: ExamDraftStorage | null,
  key: string,
  data: { plans: unknown[]; returnContexts: unknown[]; limit: number },
  now = Date.now(),
) {
  try {
    const raw = JSON.stringify({
      savedAt: now,
      data: { plans: data.plans, returnContexts: data.returnContexts, limit: data.limit },
    });
    if (raw.length > 500000) return false;
    return writeExamDeviceValue(storage, key, raw, false);
  } catch {
    return false;
  }
}
export function readOfflineGuidance<T>(
  storage: ExamDraftStorage | null,
  key: string,
  now = Date.now(),
): T | null {
  try {
    const raw = readExamDeviceValue(storage, key);
    if (!raw || raw.length > 500000) return null;
    const cached = JSON.parse(raw);
    if (
      !Number.isFinite(cached.savedAt) ||
      cached.savedAt > now ||
      now - cached.savedAt > MAX_AGE ||
      !Array.isArray(cached.data?.plans) ||
      !Array.isArray(cached.data?.returnContexts)
    ) {
      removeExamDeviceValue(storage, key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

/** A team view never automatically displays the viewer's personal or other-team device copies. */
export function recoveryCopiesForScope<T extends OfflineExamSnapshot>(
  copies: T[],
  organizationId?: string,
): T[] {
  return organizationId
    ? copies.filter(
        (copy) =>
          copy.enrollment.scope === "team" && copy.enrollment.organizationId === organizationId,
      )
    : copies;
}
