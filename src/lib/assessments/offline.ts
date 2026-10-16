import type { ExamDraftStorage } from "./drafts.ts";
const PREFIX = "lt.examSnapshot.v1.";
const MAX_AGE = 24 * 60 * 60 * 1000;
export interface OfflineExamSnapshot {
  id: string;
  submittedAt: string | null;
  isLearner: boolean;
  form: { id: string; items: unknown[] };
  enrollment: { moduleId: string };
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
    if (!storage) return false;
    if (!attempt.isLearner || attempt.submittedAt) {
      storage.removeItem(key(user, attempt.id));
      return false;
    }
    const safe = { ...attempt, feedback: undefined, evidence: [], profiles: [], reviews: [] };
    const raw = JSON.stringify({ savedAt: now, attempt: safe });
    if (raw.length > 500000) return false;
    storage.setItem(key(user, attempt.id), raw);
    return true;
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
    if (!storage) return result;
    const prefix = `${PREFIX}${encodeURIComponent(user)}.`;
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (!k?.startsWith(prefix)) continue;
      try {
        const raw = storage.getItem(k);
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
          storage.removeItem(k);
          continue;
        }
        result.push(saved.attempt);
      } catch {
        storage.removeItem(k);
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
    if (!storage) return;
    if (attempt) {
      storage.removeItem(key(user, attempt));
      return;
    }
    const prefix = `${PREFIX}${encodeURIComponent(user)}.`;
    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (k?.startsWith(prefix)) storage.removeItem(k);
    }
  } catch {
    /* Best-effort private device cleanup. */
  }
}
