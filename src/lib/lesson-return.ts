// Built by TAC — 2026-10-15
// "Go and auto-return": a Core 30 lesson sends the learner to the Speak tab (or the full Reader)
// and leaves a marker so the learner can come straight back to the same lesson and section.
// Pure and storage-injected so it can be unit tested; the app passes sessionStorage.

import { useEffect, useRef } from "react";

export type LessonReturnSection = "see" | "say";

export interface LessonReturn {
  moduleId: string;
  lesson: number;
  section: LessonReturnSection;
  /** Epoch milliseconds when the marker was written. */
  at: number;
  /** The Reader passage the lesson opened ("see" only). */
  ref?: string;
}

export interface ReturnStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LESSON_RETURN_KEY = "lt.core30.returnTo";
export const LESSON_RETURN_TTL_MS = 2 * 60 * 60 * 1000;

/** Id prefix of the speaking mission that belongs to a lesson. */
export function lessonMissionPrefix(moduleId: string, lesson: number): string {
  return `scenario_version_${moduleId}_lesson_${lesson}_`;
}

/** Parses a stored marker. Null when it is malformed, from the future, or older than the TTL. */
export function parseLessonReturn(raw: string | null, now: number): LessonReturn | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.moduleId !== "string" || !v.moduleId) return null;
  if (typeof v.lesson !== "number" || !Number.isInteger(v.lesson) || v.lesson < 1) return null;
  if (v.section !== "see" && v.section !== "say") return null;
  if (typeof v.at !== "number" || !Number.isFinite(v.at)) return null;
  if (v.at > now + 60_000) return null;
  if (now - v.at > LESSON_RETURN_TTL_MS) return null;
  const marker: LessonReturn = {
    moduleId: v.moduleId,
    lesson: v.lesson,
    section: v.section,
    at: v.at,
  };
  if (typeof v.ref === "string" && v.ref) marker.ref = v.ref;
  return marker;
}

export function writeLessonReturn(storage: ReturnStorage | null, marker: LessonReturn): void {
  if (!storage) return;
  try {
    storage.setItem(LESSON_RETURN_KEY, JSON.stringify(marker));
  } catch {
    // Storage can be blocked; the learner just uses the tab bar to get back.
  }
}

export function clearLessonReturn(storage: ReturnStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(LESSON_RETURN_KEY);
  } catch {
    // ignore
  }
}

/** The active marker, or null. An expired or malformed marker is removed as it is found. */
export function readLessonReturn(storage: ReturnStorage | null, now: number): LessonReturn | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(LESSON_RETURN_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const marker = parseLessonReturn(raw, now);
  if (!marker) clearLessonReturn(storage);
  return marker;
}

export function browserReturnStorage(): ReturnStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The tab each kind of trip goes to: "say" goes to Speak, "see" goes to the full Reader. */
export const LESSON_RETURN_TARGET_TAB: Record<LessonReturnSection, string> = {
  say: "speak",
  see: "reader",
};

/**
 * Whether a marker is stale after the app moved to `currentTab` (from `prevTab`, or undefined on
 * the first look). A marker is valid only while the learner stays on its target tab or is back on
 * Core 30. Landing on the target tab for the first time keeps it; leaving for any other tab ends it.
 * Without a change of tab nothing is cleared, so React StrictMode's repeated effects are harmless.
 */
export function shouldClearMarker(
  marker: Pick<LessonReturn, "section"> | null,
  currentTab: string,
  prevTab?: string | null,
): boolean {
  if (!marker) return false;
  if (currentTab === prevTab) return false;
  if (currentTab === "core30") return false;
  return currentTab !== LESSON_RETURN_TARGET_TAB[marker.section];
}

/** Mounted once at the app level: drops a return marker as soon as the learner wanders off. */
export function useLessonReturnGuard(currentTab: string): void {
  const prevTab = useRef<string | undefined>(undefined);
  useEffect(() => {
    const storage = browserReturnStorage();
    const marker = readLessonReturn(storage, Date.now());
    if (shouldClearMarker(marker, currentTab, prevTab.current)) clearLessonReturn(storage);
    prevTab.current = currentTab;
  }, [currentTab]);
}
