// Built by TAC — 2026-10-22
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useApp } from "@/state/app-state";
import {
  DEFAULT_GOAL_LESSONS,
  DEFAULT_GOAL_MINUTES,
  DEFAULT_GOAL_TYPE,
  DEFAULT_PRACTICE_DATA,
  PRACTICE_TIME_KEY,
  applyTick,
  clampGoalLessons,
  clampGoalMinutes,
  clampGoalType,
  goalProgress,
  lessonsCompletedOn,
  localDateKey,
  mergeDays,
  pruneDays,
  parsePracticeData,
  secondsToday,
  serializePracticeData,
  shouldSave,
  type GoalType,
  type PracticeProgress,
  type PracticeTimeData,
} from "@/lib/practice-time";

// Device-local store shared by the bar (reads), the ticker (writes seconds) and the settings
// card (writes enabled / goal type / goals). Module-level so all three see one copy of the data.
// Minutes always keep counting; lessons are not stored here but read from the Core 30 log.

export interface PracticeSettings {
  enabled: boolean;
  goalType: GoalType;
  goalMinutes: number;
  goalLessons: number;
}

const SERVER_SETTINGS: PracticeSettings = {
  enabled: true,
  goalType: DEFAULT_GOAL_TYPE,
  goalMinutes: DEFAULT_GOAL_MINUTES,
  goalLessons: DEFAULT_GOAL_LESSONS,
};

let data: PracticeTimeData = { ...DEFAULT_PRACTICE_DATA, days: {} };
let loaded = false;
let dirty = false;
let lastSaveAt = 0;
let settings: PracticeSettings = SERVER_SETTINGS;
let today = 0;
let dayKey = "";
// Module scope so a remount (or the ticker pausing for the paywall) earns no free credit.
let lastInteractionAt: number | null = null;
let blockers = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(PRACTICE_TIME_KEY);
  } catch {
    return null;
  }
}

function writeStorage(): boolean {
  try {
    window.localStorage.setItem(PRACTICE_TIME_KEY, serializePracticeData(data, new Date()));
    return true;
  } catch {
    return false;
  }
}

/** Replaces memory with what storage holds. Returns true when anything visible changed. */
function load(): boolean {
  const now = Date.now();
  const raw = readStorage();
  // Storage that cannot be read (blocked, or nothing written yet after a failed write) must not
  // wipe what this tab already holds in memory.
  if (raw === null && loaded) return refreshDerived(now);
  const stored = parsePracticeData(raw, new Date(now));
  // Merge, never replace: another window's unsaved seconds (and ours) both survive.
  data = loaded ? { ...stored, days: pruneDays(mergeDays(stored.days, data.days), new Date(now)) } : stored;
  if (!loaded) dirty = false;
  loaded = true;
  return refreshDerived(now);
}

function refreshDerived(now: number): boolean {
  let changed = false;
  if (
    settings.enabled !== data.enabled ||
    settings.goalType !== data.goalType ||
    settings.goalMinutes !== data.goalMinutes ||
    settings.goalLessons !== data.goalLessons
  ) {
    settings = {
      enabled: data.enabled,
      goalType: data.goalType,
      goalMinutes: data.goalMinutes,
      goalLessons: data.goalLessons,
    };
    changed = true;
  }
  const key = localDateKey(new Date(now));
  if (key !== dayKey) {
    dayKey = key;
    changed = true;
  }
  const seconds = secondsToday(data, now);
  if (seconds !== today) {
    today = seconds;
    changed = true;
  }
  return changed;
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") load();
}

function flush(force: boolean) {
  const now = Date.now();
  if (shouldSave({ dirty, now, lastSaveAt, force })) {
    // A failed write keeps the data in memory; the next beat tries again.
    if (writeStorage()) dirty = false;
    lastSaveAt = now;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Paywall screens block the bar and the clock; see PracticeBlocker. */
export function usePracticeBlocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => blockers > 0,
    () => false,
  );
}

/** Render while a screen must not earn practice time (paywall, sign-in wall). Renders nothing. */
export function PracticeBlocker(): null {
  useEffect(() => {
    blockers += 1;
    emit();
    return () => {
      blockers -= 1;
      emit();
    };
  }, []);
  return null;
}

export function usePracticeSettings(): PracticeSettings {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return settings;
    },
    () => SERVER_SETTINGS,
  );
}

/** Active practice seconds on today's local date. */
export function useTodayPracticeSeconds(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return today;
    },
    () => 0,
  );
}

/** The learner's local calendar date, refreshed by the ticker so lessons roll over at midnight. */
export function useTodayKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return dayKey;
    },
    () => "",
  );
}

/**
 * Distinct lessons mastered on today's local date, from the Core 30 log; null until the app has
 * loaded its saved state (so a late hydration is never mistaken for a lesson finished just now).
 */
export function useLessonsToday(): number | null {
  const { state } = useApp();
  const key = useTodayKey();
  const { hydrated, core30Log } = state;
  return useMemo(
    () => (hydrated && key ? lessonsCompletedOn(core30Log, key) : null),
    [hydrated, core30Log, key],
  );
}

export interface PracticeGoalView {
  settings: PracticeSettings;
  progress: PracticeProgress;
  /** Today's count in the chosen unit (seconds or lessons), for the goal-reached pulse. */
  count: number;
  /** False until the chosen goal's data has loaded; no pulse is judged before then. */
  ready: boolean;
}

/** What the bar and the settings line show: the chosen goal type's progress. */
export function usePracticeGoal(): PracticeGoalView {
  const settings = usePracticeSettings();
  const seconds = useTodayPracticeSeconds();
  const lessons = useLessonsToday();
  const progress = goalProgress({
    goalType: settings.goalType,
    seconds,
    goalMinutes: settings.goalMinutes,
    lessons: lessons ?? 0,
    goalLessons: settings.goalLessons,
  });
  const lessonsGoal = settings.goalType === "lessons";
  return {
    settings,
    progress,
    count: lessonsGoal ? (lessons ?? 0) : seconds,
    ready: !lessonsGoal || lessons !== null,
  };
}

function update(
  patch: Partial<Pick<PracticeTimeData, "enabled" | "goalType" | "goalMinutes" | "goalLessons">>,
) {
  ensureLoaded();
  data = {
    ...data,
    ...patch,
    goalType: clampGoalType(patch.goalType ?? data.goalType),
    goalMinutes: clampGoalMinutes(patch.goalMinutes ?? data.goalMinutes),
    goalLessons: clampGoalLessons(patch.goalLessons ?? data.goalLessons),
  };
  dirty = true;
  flush(true);
  if (refreshDerived(Date.now())) emit();
}

export function setPracticeEnabled(enabled: boolean) {
  update({ enabled });
}

export function setPracticeGoalMinutes(minutes: number) {
  update({ goalMinutes: minutes });
}

export function setPracticeGoalType(goalType: GoalType) {
  update({ goalType });
}

export function setPracticeGoalLessons(lessons: number) {
  update({ goalLessons: lessons });
}

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * The one 1s ticker. Mount it once at shell level. It counts a second only while the tab is
 * visible and the learner acted in the last 60s, saves at most every 10s and on
 * visibilitychange / pagehide, and re-reads storage when the tab returns or another tab writes.
 * Does not count while the bar is switched off.
 */
export function usePracticeTimeTicker(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    ensureLoaded();
    const onInteract = () => {
      lastInteractionAt = Date.now();
    };
    for (const type of INTERACTION_EVENTS) {
      window.addEventListener(type, onInteract, { capture: true, passive: true });
    }

    const visible = () => document.visibilityState === "visible";

    const beat = () => {
      const now = Date.now();
      const next = applyTick(data, { now, visible: visible(), lastInteractionAt });
      if (next !== data) {
        data = next;
        dirty = true;
      }
      flush(false);
      if (refreshDerived(now)) emit();
    };
    const timer = window.setInterval(beat, 1000);

    const onVisibility = () => {
      if (visible()) {
        // Another tab may have counted while this one was hidden.
        lastSaveAt = Date.now();
        if (load()) emit();
      } else {
        flush(true);
      }
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(timer);
      for (const type of INTERACTION_EVENTS) {
        window.removeEventListener(type, onInteract, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
    };
  }, [enabled]);

  // Another tab changed the switch, the goal or the seconds: follow it, even while switched off.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === PRACTICE_TIME_KEY && load()) emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
