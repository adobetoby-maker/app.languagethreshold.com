import { roofingTeachingSettings } from "./roofing-teaching.ts";
import { LANDSCAPER_LESSON_CONTENT } from "./landscaper-lesson-content.ts";
import { FOREMAN_LESSON_CONTENT } from "./construction-foreman-lesson-content.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";

/** An authored track belongs to its exact target/instruction pair. */
export function moduleTeachingSettings(
  moduleId: string,
  n: number,
  target: string,
  native: string,
) {
  if (target !== "Spanish" || native !== "English") return null;
  if (moduleId === "roofing") return roofingTeachingSettings(n);
  const draft = moduleId === "landscaper" ? LANDSCAPER_LESSON_CONTENT[n]
    : moduleId === "construction-foreman" ? FOREMAN_LESSON_CONTENT[n] : null;
  return draft ? lessonTeachingSettings(n, draft.objective) : null;
}

export const ROOFING_PRACTICE_VERSION = "roofing-es-en-2026-10-16-draft";
export function modulePracticeVersion(moduleId: string, target: string, native: string) {
  if (target === "Spanish" && native === "English") {
    if (moduleId === "roofing") return ROOFING_PRACTICE_VERSION;
    if (moduleId === "landscaper") return "landscaper-es-en-2026-10-16-draft";
    if (moduleId === "construction-foreman") return "construction-foreman-es-en-2026-10-16-draft";
  }
  return "unversioned-app-draft";
}
