/** Private candidate IDs only. The public pack registry and worker never import these. */
export const JAPANESE_TRAVEL_BREAKFAST_OFFLINE_RELEASE_ENABLED = false as const;

export const PRIVATE_JAPANESE_TRAVEL_BREAKFAST_OFFLINE_TRACKS = {
  "foundation-travel-breakfast-ja-en": { stageId: "foundation-travel-breakfast", lessons: 10 },
  "travel-breakfast-ja-en": { stageId: "travel-breakfast", lessons: 30 },
} as const;

export function releasedJapaneseTravelBreakfastOfflinePackIds(): readonly string[] {
  return JAPANESE_TRAVEL_BREAKFAST_OFFLINE_RELEASE_ENABLED
    ? Object.keys(PRIVATE_JAPANESE_TRAVEL_BREAKFAST_OFFLINE_TRACKS)
    : [];
}
