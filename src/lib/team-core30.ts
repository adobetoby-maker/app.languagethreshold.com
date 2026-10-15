// Team-page helpers for the Core 30 log: server-side extraction and client-side summary text.
import { summarizeCore30, toDateKey, type Core30Log } from "./core30-plan.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pull ONLY the core30Log out of a profiles.data blob. Anything malformed is dropped. */
export function extractCore30Log(profileData: unknown): Core30Log {
  if (!isPlainObject(profileData)) return {};
  const raw = profileData.core30Log;
  if (!isPlainObject(raw)) return {};
  const out: Core30Log = {};
  for (const [moduleId, moduleLog] of Object.entries(raw)) {
    if (!isPlainObject(moduleLog)) continue;
    if (moduleLog.lessons !== undefined && !isPlainObject(moduleLog.lessons)) continue;
    out[moduleId] = {
      ...(moduleLog as object),
      lessons: (moduleLog.lessons ?? {}) as Core30Log[string]["lessons"],
    } as Core30Log[string];
  }
  return out;
}

export interface Core30Display {
  mastered: number;
  total: number;
  opened: number;
  needsPractice: number;
  status: "not-started" | "ahead" | "on-track" | "behind";
  statusLabel: string;
  lastReview?: string;
}

export function core30StatusLabel(status: Core30Display["status"], behindBy: number): string {
  if (status === "ahead") return "Ahead";
  if (status === "on-track") return "On track";
  if (status === "behind") return `Behind by ${behindBy}`;
  return "Not started";
}

/** Local calendar date of an ISO timestamp (same helper the plan uses); undefined if unparseable. */
function lastReviewDateKey(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : toDateKey(new Date(t));
}

/** Summarize one learner's module log for display. `core30` may be missing (older server). */
export function describeCore30(
  core30: Record<string, Core30Log> | undefined,
  userId: string,
  moduleId: string,
  totalLessons: number,
  today: string = toDateKey(new Date()),
): Core30Display {
  const s = summarizeCore30(core30?.[userId]?.[moduleId], totalLessons, today);
  return {
    mastered: s.mastered,
    total: s.totalLessons,
    opened: s.lessonsOpened,
    needsPractice: s.needsPractice,
    status: s.status,
    statusLabel: core30StatusLabel(s.status, s.behindBy),
    lastReview: lastReviewDateKey(s.lastReviewAt),
  };
}
