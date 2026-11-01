/** Public practice download allowlist, not reviewed curriculum releases. */
export const OFFLINE_LESSON_TRACKS = {
  "roofing-es-en": {
    moduleId: "roofing",
    label: "Roofing",
    target: "Spanish",
    native: "English",
    lessons: 30,
  },
  "landscaper-es-en": {
    moduleId: "landscaper",
    label: "Landscaper",
    target: "Spanish",
    native: "English",
    lessons: 30,
  },
  "construction-foreman-es-en": {
    moduleId: "construction-foreman",
    label: "Construction Foreman",
    target: "Spanish",
    native: "English",
    lessons: 30,
  },
  "foundation-military-en-es": {
    moduleId: "foundation-military",
    label: "Military Foundation",
    target: "English",
    native: "Spanish",
    lessons: 10,
  },
  "military-en-es": {
    moduleId: "military",
    label: "Military Core",
    target: "English",
    native: "Spanish",
    lessons: 30,
  },
  "master-military-en-es": {
    moduleId: "master-military",
    label: "Military Master",
    target: "English",
    native: "Spanish",
    lessons: 20,
  },
} as const;
export type OfflineLessonPackId = keyof typeof OFFLINE_LESSON_TRACKS;
export function offlineLessonPackId(
  moduleId: string,
  target: string,
  native: string,
): OfflineLessonPackId | null {
  return (
    (Object.entries(OFFLINE_LESSON_TRACKS).find(
      ([, track]) =>
        track.moduleId === moduleId && track.target === target && track.native === native,
    )?.[0] as OfflineLessonPackId | undefined) ?? null
  );
}
