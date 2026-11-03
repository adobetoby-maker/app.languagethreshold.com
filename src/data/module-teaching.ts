import { soundTeaching, SOUND_PRACTICE_VERSION } from "./sound-like-a-native.ts";
import { spanishBasicsTeaching, SPANISH_BASICS_VERSION } from "./spanish-basics.ts";
import { roofingTeachingSettings } from "./roofing-teaching.ts";
import { LANDSCAPER_LESSON_CONTENT } from "./landscaper-lesson-content.ts";
import { FOREMAN_LESSON_CONTENT } from "./construction-foreman-lesson-content.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
import { militaryTeachingSettings, MILITARY_PRACTICE_VERSION } from "./military-practice.ts";

/** An authored track belongs to its exact target/instruction pair. */
export function moduleTeachingSettings(
  moduleId: string,
  n: number,
  target: string,
  native: string,
) {
  if (target === "English" && native === "Spanish") return militaryTeachingSettings(moduleId, n);
  if (target !== "Spanish" || native !== "English") return null;
  const sound = soundTeaching(moduleId, n);
  if (sound) return sound;
  const basics = spanishBasicsTeaching(moduleId, n);
  if (basics) return basics;
  if (moduleId === "roofing") return roofingTeachingSettings(n);
  const draft =
    moduleId === "landscaper"
      ? LANDSCAPER_LESSON_CONTENT[n]
      : moduleId === "construction-foreman"
        ? FOREMAN_LESSON_CONTENT[n]
        : null;
  return draft ? lessonTeachingSettings(n, draft.objective) : null;
}

export const ROOFING_PRACTICE_VERSION = "roofing-es-en-2026-10-16-draft";
export function modulePracticeVersion(moduleId: string, target: string, native: string) {
  if (target === "English" && native === "Spanish" && militaryTeachingSettings(moduleId, 1))
    return MILITARY_PRACTICE_VERSION;
  if (target === "Spanish" && native === "English") {
    if (soundTeaching(moduleId, 1)) return SOUND_PRACTICE_VERSION;
    if (spanishBasicsTeaching(moduleId, 1))
      return moduleId.includes("spanish-basics")
        ? SPANISH_BASICS_VERSION
        : "spanish-next-es-en-2026-11-01-draft";
    if (moduleId === "roofing") return ROOFING_PRACTICE_VERSION;
    if (moduleId === "landscaper") return "landscaper-es-en-2026-10-16-draft";
    if (moduleId === "construction-foreman") return "construction-foreman-es-en-2026-10-16-draft";
  }
  return "unversioned-app-draft";
}
