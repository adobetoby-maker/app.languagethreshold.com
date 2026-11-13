/** Inspection-only pack identities. No learner route or worker imports this file. */
export const JAPANESE_TRAVEL_LUNCH_OFFLINE_RELEASED = false as const;

export const PRIVATE_JAPANESE_TRAVEL_LUNCH_OFFLINE_TRACKS = {
  "foundation-travel-lunch-ja-en": { moduleId: "foundation-travel-lunch", lessons: 10 },
  "travel-lunch-ja-en": { moduleId: "travel-lunch", lessons: 30 },
  "master-travel-lunch-ja-en": { moduleId: "master-travel-lunch", lessons: 20 },
} as const;

export function releasedJapaneseTravelLunchOfflinePackIds(): readonly string[] {
  return JAPANESE_TRAVEL_LUNCH_OFFLINE_RELEASED
    ? Object.keys(PRIVATE_JAPANESE_TRAVEL_LUNCH_OFFLINE_TRACKS)
    : [];
}
