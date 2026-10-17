import { planLocalDay } from "./assessments/plan-timing.ts";
// Team-page helpers for the Core 30 log: server-side extraction and client-side summary text.
import {
  summarizeCore30,
  toDateKey,
  CORE30_WAYS,
  type Core30Log,
  type Core30LessonLog,
} from "./core30-plan.ts";
import { core30ScopeKey } from "./core30-scope.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pull ONLY the core30Log out of a profiles.data blob. Anything malformed is dropped. */
export function extractCore30Log(
  profileData: unknown,
  allowedModuleIds?: readonly string[],
): Core30Log {
  if (!isPlainObject(profileData)) return {};
  const raw = profileData.core30Log;
  if (!isPlainObject(raw)) return {};
  const out: Core30Log = {};
  for (const [moduleId, moduleLog] of Object.entries(raw)) {
    if (allowedModuleIds && !allowedModuleIds.includes(moduleId)) continue;
    if (!isPlainObject(moduleLog)) continue;
    if (moduleLog.lessons !== undefined && !isPlainObject(moduleLog.lessons)) continue;
    const lessons: Record<string, Core30LessonLog> = {};
    for (const [number, value] of Object.entries(moduleLog.lessons ?? {})) {
      if (!/^(?:[1-9]|[12]\d|30)$/.test(number) || !isPlainObject(value)) continue;
      const visits: Record<string, string> = {};
      if (isPlainObject(value.visits))
        for (const [step, at] of Object.entries(value.visits))
          if (
            (/^\d{1,2}$/.test(step) || CORE30_WAYS.some((way) => step === `way:${way}`)) &&
            validTime(at)
          )
            visits[step] = at;
      const wayVisits = Object.fromEntries(
        CORE30_WAYS.flatMap((way) =>
          isPlainObject(value.wayVisits) && validTime(value.wayVisits[way])
            ? [[way, value.wayVisits[way]]]
            : [],
        ),
      );
      lessons[number] = {
        visits,
        wayVisits,
        ...(validTime(value.masteredAt) ? { masteredAt: value.masteredAt } : {}),
        ...(typeof value.needsPractice === "boolean" ? { needsPractice: value.needsPractice } : {}),
      };
    }
    out[moduleId] = {
      lessons,
      ...(typeof moduleLog.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(moduleLog.startDate)
        ? { startDate: moduleLog.startDate }
        : {}),
      ...(validTime(moduleLog.lastReviewAt) ? { lastReviewAt: moduleLog.lastReviewAt } : {}),
    };
  }
  return out;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
}

export interface TeamCore30Track {
  lessonCount?: number;
  studyStartDate?: string;
  timezone?: string;
  status?: string;
  paused_on?: string | null;
  start_date?: string;
  id: string;
  module_id: string;
  target_language: string;
  instruction_language: string;
}

export interface Core30TrackDisplay extends Core30Display {
  startDate?: string;
  enrollmentId: string;
  moduleId: string;
  targetLanguage: string;
  instructionLanguage: string;
}

/** Only tracks authorized by this organization's actual enrollment rows are visible. */
export function describeCore30Tracks(
  profileData: unknown,
  tracks: readonly TeamCore30Track[],
): Core30TrackDisplay[] {
  const keys = tracks.map((track) =>
    core30ScopeKey(track.module_id, {
      targetLanguage: track.target_language,
      instructionLanguage: track.instruction_language,
      enrollmentId: track.id,
    }),
  );
  const logs = extractCore30Log(profileData, keys);
  return tracks.map((track, index) => {
    const log = logs[keys[index]];
    const summary = describeCore30(
      {
        learner: {
          [keys[index]]: {
            ...log,
            lessons: log?.lessons ?? {},
            startDate: track.studyStartDate ?? track.start_date ?? log?.startDate,
          },
        },
      },
      "learner",
      keys[index],
      track.lessonCount ?? 30,
      track.status === "paused" && track.paused_on
        ? track.paused_on
        : (planLocalDay(track.timezone) ?? toDateKey(new Date())),
    );
    return {
      enrollmentId: track.id,
      moduleId: track.module_id,
      targetLanguage: track.target_language,
      instructionLanguage: track.instruction_language,
      startDate: track.start_date,
      ...summary,
      ...(log?.lastReviewAt && track.timezone
        ? { lastReview: planLocalDay(track.timezone, new Date(log.lastReviewAt)) }
        : {}),
      statusLabel:
        track.status === "paused" ? `Plan paused · ${summary.statusLabel}` : summary.statusLabel,
    };
  });
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
