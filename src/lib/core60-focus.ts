import type { LessonWord } from "@/data/curriculum";
import type { PracticeMode } from "@/components/core30/LessonPracticeKit";

export const CORE60_FOCUS_MODES = [
  "flashcards",
  "match",
  "listen",
  "type",
] as const satisfies readonly PracticeMode[];

export type Core60FocusMode = (typeof CORE60_FOCUS_MODES)[number];

/** Matching needs at least two terms; the other games can use terms or phrases. */
export function core60FocusModes(words: LessonWord[]): Core60FocusMode[] {
  const termCount = words.reduce((count, word) => count + (word.kind === "term" ? 1 : 0), 0);
  return CORE60_FOCUS_MODES.filter((mode) => mode !== "match" || termCount >= 2);
}

/** A small, centered slice of the lesson road map for the checkpoint screen. */
export function core60LessonWindow(current: number, total: number, radius = 2): number[] {
  if (!Number.isInteger(current) || !Number.isInteger(total) || total < 1) return [];
  const safeCurrent = Math.min(Math.max(current, 1), total);
  const size = Math.min(total, radius * 2 + 1);
  const start = Math.min(Math.max(safeCurrent - radius, 1), total - size + 1);
  return Array.from({ length: size }, (_, index) => start + index);
}
