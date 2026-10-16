/** Public practice download allowlist, not reviewed curriculum releases. */
export const OFFLINE_LESSON_TRACKS = {
  "roofing-es-en": { moduleId: "roofing", label: "Roofing" },
  "landscaper-es-en": { moduleId: "landscaper", label: "Landscaper" },
} as const;
export type OfflineLessonPackId = keyof typeof OFFLINE_LESSON_TRACKS;
export function offlineLessonPackId(
  moduleId: string,
  target: string,
  native: string,
): OfflineLessonPackId | null {
  if (target !== "Spanish" || native !== "English") return null;
  return (
    (Object.entries(OFFLINE_LESSON_TRACKS).find(([, track]) => track.moduleId === moduleId)?.[0] as
      OfflineLessonPackId | undefined) ?? null
  );
}
