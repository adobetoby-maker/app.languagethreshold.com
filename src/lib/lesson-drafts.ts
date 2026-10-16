/** Private practice drafts only. Official exam responses use a separate authoritative store. */
const PREFIX = "lt.lessonDraft.v1.";
export interface LessonDraft {
  version: string;
  text: string;
  ink: string | null;
  transcript: string;
  checks: boolean[];
  savedAt: string;
}
interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}
export function lessonDraftKey(userId: string, lessonId: string, mode: "type" | "write"): string {
  return `${PREFIX}${encodeURIComponent(userId)}.${encodeURIComponent(lessonId)}.${mode}`;
}
export function readLessonDraft(storage: DraftStorage | null, key: string): LessonDraft | null {
  try {
    const value = JSON.parse(storage?.getItem(key) ?? "null");
    if (
      !value ||
      typeof value.version !== "string" ||
      typeof value.text !== "string" ||
      value.text.length > 4000 ||
      typeof value.transcript !== "string" ||
      value.transcript.length > 4000
    )
      return null;
    if (
      value.ink !== null &&
      (typeof value.ink !== "string" ||
        value.ink.length > 500000 ||
        !/^[A-Za-z0-9+/=]+$/.test(value.ink))
    )
      return null;
    return {
      version: value.version,
      text: value.text,
      ink: value.ink,
      transcript: value.transcript,
      checks: Array.from({ length: 3 }, (_, i) => value.checks?.[i] === true),
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    };
  } catch {
    return null;
  }
}
export function saveLessonDraft(
  storage: DraftStorage | null,
  key: string,
  draft: LessonDraft,
): boolean {
  try {
    if (!storage) return false;
    if (
      draft.text.length > 4000 ||
      draft.transcript.length > 4000 ||
      (draft.ink?.length ?? 0) > 500000
    )
      return false;
    storage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function clearLessonDraftsForUser(storage: DraftStorage | null, userId: string): void {
  try {
    if (!storage) return;
    const prefix = `${PREFIX}${encodeURIComponent(userId)}.`;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) storage.removeItem(key);
    }
  } catch {
    /* Blocked storage must not prevent sign-out. */
  }
}

export interface LessonPosition {
  lesson: number;
  way: import("./core30-plan.ts").Core30Way;
  at: string;
}
export function lessonPositionKey(
  userId: string,
  moduleId: string,
  target: string,
  native: string,
): string {
  return `${PREFIX}${encodeURIComponent(userId)}.position.${[moduleId, target, native].map(encodeURIComponent).join(".")}`;
}
export function readLessonPosition(
  storage: DraftStorage | null,
  key: string,
): LessonPosition | null {
  try {
    const value = JSON.parse(storage?.getItem(key) ?? "null");
    if (
      !value ||
      !Number.isInteger(value.lesson) ||
      value.lesson < 1 ||
      value.lesson > 1000 ||
      !["see", "recall", "hear", "type", "say", "write"].includes(value.way) ||
      typeof value.at !== "string"
    )
      return null;
    return { lesson: value.lesson, way: value.way, at: value.at };
  } catch {
    return null;
  }
}
export function saveLessonPosition(
  storage: DraftStorage | null,
  key: string,
  position: LessonPosition,
): void {
  try {
    storage?.setItem(key, JSON.stringify(position));
  } catch {
    /* Browsing lessons still works without storage. */
  }
}
