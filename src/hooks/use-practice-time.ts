// Built by TAC — 2026-10-22
import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_GOAL_MINUTES,
  DEFAULT_PRACTICE_DATA,
  PRACTICE_TIME_KEY,
  applyTick,
  clampGoalMinutes,
  parsePracticeData,
  secondsToday,
  serializePracticeData,
  shouldSave,
  type PracticeTimeData,
} from "@/lib/practice-time";

// Device-local store shared by the bar (reads), the ticker (writes seconds) and the settings
// card (writes enabled / goal). Module-level so all three see one copy of the data.

export interface PracticeSettings {
  enabled: boolean;
  goalMinutes: number;
}

const SERVER_SETTINGS: PracticeSettings = { enabled: true, goalMinutes: DEFAULT_GOAL_MINUTES };

let data: PracticeTimeData = { ...DEFAULT_PRACTICE_DATA, days: {} };
let loaded = false;
let dirty = false;
let lastSaveAt = 0;
let settings: PracticeSettings = SERVER_SETTINGS;
let today = 0;
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
  data = parsePracticeData(raw, new Date(now));
  loaded = true;
  dirty = false;
  return refreshDerived(now);
}

function refreshDerived(now: number): boolean {
  let changed = false;
  if (settings.enabled !== data.enabled || settings.goalMinutes !== data.goalMinutes) {
    settings = { enabled: data.enabled, goalMinutes: data.goalMinutes };
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

function update(patch: Partial<Pick<PracticeTimeData, "enabled" | "goalMinutes">>) {
  ensureLoaded();
  data = { ...data, ...patch, goalMinutes: clampGoalMinutes(patch.goalMinutes ?? data.goalMinutes) };
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
    let lastInteractionAt = Date.now();
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
