import { readProfileSnapshot } from "./profile-device-snapshot.ts";
import type { ExamDraftStorage } from "./assessments/drafts.ts";

const PREFIX = "lt.core30TeamCompletion.v1.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface TeamCompletionRecord {
  schema: 1;
  actor: string;
  id: string;
  progressKey: string;
  moduleId: string;
  lessonNumber: number;
  sessions: Record<string, string>;
  createdAt: number;
  phase: "pending" | "acknowledged";
}
export const teamCompletionPrefix = (actor: string) => PREFIX + encodeURIComponent(actor) + ".";
const keyFor = (record: TeamCompletionRecord) => teamCompletionPrefix(record.actor) + record.id;
const error = () =>
  new Error(
    "Saved team completion could not be read or saved. Keep this lesson open and retry when device storage is available.",
  );
function validSessions(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.length <= 64 &&
    entries.every(([key, id]) => UUID.test(key) && typeof id === "string" && UUID.test(id))
  );
}
function parse(raw: string | null, actor: string, key: string): TeamCompletionRecord {
  if (!raw || raw.length > 32768) throw error();
  let v: TeamCompletionRecord;
  try {
    v = JSON.parse(raw) as TeamCompletionRecord;
  } catch {
    throw error();
  }
  if (
    !v ||
    typeof v !== "object" ||
    v.schema !== 1 ||
    v.actor !== actor ||
    !UUID.test(v.id) ||
    keyFor(v) !== key ||
    typeof v.progressKey !== "string" ||
    !v.progressKey ||
    v.progressKey.length > 1024 ||
    typeof v.moduleId !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.moduleId) ||
    !Number.isInteger(v.lessonNumber) ||
    v.lessonNumber < 1 ||
    v.lessonNumber > 1000 ||
    !Number.isFinite(v.createdAt) ||
    v.createdAt < 0 ||
    !["pending", "acknowledged"].includes(v.phase) ||
    !validSessions(v.sessions)
  )
    throw error();
  return v;
}
function records(storage: ExamDraftStorage, actor: string) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(teamCompletionPrefix(actor))) keys.push(key);
  }
  if (keys.length > 1000) throw error();
  return keys
    .map((key) => parse(storage.getItem(key), actor, key))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function pendingTeamCompletions(storage: ExamDraftStorage | null, actor: string) {
  try {
    const profile = readProfileSnapshot<{ lessonProgress?: Record<string, number> }>(
      storage,
      actor,
    );
    const outstanding = storage
      ? records(storage, actor).filter((record) => {
          const n = profile?.lessonProgress?.[record.progressKey];
          return (
            record.phase !== "acknowledged" ||
            !Number.isInteger(n) ||
            (n ?? -1) < record.lessonNumber
          );
        })
      : [];
    return { count: outstanding.length, unreadable: !storage };
  } catch {
    return { count: 0, unreadable: true };
  }
}
export function clearTeamCompletions(storage: ExamDraftStorage | null, actor: string) {
  try {
    if (!storage) return false;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(teamCompletionPrefix(actor))) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
export function browserTeamCompletionStorage(): ExamDraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
/** Unique immutable request keys preserve concurrent requests rather than replacing another tab's proof.
 * No timer, new session, activity interval or background transport is created here. */
export function createTeamCompletionJournal(
  storage: ExamDraftStorage | null,
  actor: string,
  isCurrent: () => boolean,
) {
  const requireCurrent = () => {
    if (!isCurrent()) throw new DOMException("Team completion cancelled.", "AbortError");
    if (!storage || !actor || actor.length > 200) throw error();
    return storage;
  };
  const write = (record: TeamCompletionRecord) => {
    const target = requireCurrent();
    const raw = JSON.stringify(record);
    if (raw.length > 32768) throw error();
    target.setItem(keyFor(record), raw);
    if (target.getItem(keyFor(record)) !== raw) throw error();
  };
  const list = () => records(requireCurrent(), actor);
  return {
    read(progressKey: string, lessonNumber: number, moduleId: string) {
      const target = requireCurrent();
      // Remove acknowledged receipts only after the atomic owned profile snapshot proves local credit.
      const profile = readProfileSnapshot<{ lessonProgress?: Record<string, number> }>(
        target,
        actor,
      );
      for (const record of records(target, actor)) {
        const n = profile?.lessonProgress?.[record.progressKey];
        if (
          record.phase === "acknowledged" &&
          Number.isInteger(n) &&
          (n ?? -1) >= record.lessonNumber
        )
          target.removeItem(keyFor(record));
      }
      const matching = list().filter(
        (r) => r.progressKey === progressKey && r.lessonNumber === lessonNumber,
      );
      if (matching.some((r) => r.moduleId !== moduleId)) throw error();
      return matching;
    },
    prepare(
      progressKey: string,
      moduleId: string,
      lessonNumber: number,
      sessions: Record<string, string>,
    ) {
      const existing = list();
      const saved = existing.find(
        (r) => r.progressKey === progressKey && r.lessonNumber === lessonNumber,
      );
      if (saved) {
        if (saved.moduleId !== moduleId) throw error();
        return saved;
      }
      if (existing.length >= 50 || !validSessions(sessions)) throw error();
      const record: TeamCompletionRecord = {
        schema: 1,
        actor,
        id: crypto.randomUUID(),
        progressKey,
        moduleId,
        lessonNumber,
        sessions: { ...sessions },
        createdAt: Date.now(),
        phase: "pending",
      };
      parse(JSON.stringify(record), actor, keyFor(record));
      write(record);
      return record;
    },
    acknowledge(record: TeamCompletionRecord) {
      const target = requireCurrent();
      const saved = parse(target.getItem(keyFor(record)), actor, keyFor(record));
      if (
        JSON.stringify({ ...saved, phase: "pending" }) !==
        JSON.stringify({ ...record, phase: "pending" })
      )
        throw error();
      const next: TeamCompletionRecord = { ...saved, phase: "acknowledged" };
      write(next);
      return next;
    },
  };
}
