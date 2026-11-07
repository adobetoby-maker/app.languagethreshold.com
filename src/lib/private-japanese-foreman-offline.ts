/** Candidate IDs only. The public client, worker and pack builder do not import this file. */
export const JAPANESE_FOREMAN_OFFLINE_RELEASE_ENABLED = false as const;

export const PRIVATE_JAPANESE_FOREMAN_OFFLINE_TRACKS = {
  "foundation-construction-foreman-ja-en": {
    courseId: "foundation-construction-foreman-ja-en",
    target: "Japanese",
    native: "English",
    lessons: 10,
  },
  "construction-foreman-ja-en": {
    courseId: "construction-foreman-ja-en",
    target: "Japanese",
    native: "English",
    lessons: 30,
  },
  "master-construction-foreman-ja-en": {
    courseId: "master-construction-foreman-ja-en",
    target: "Japanese",
    native: "English",
    lessons: 20,
  },
} as const;

/** A release must deliberately change the gate and register exact-pair public routes. */
export function releasedJapaneseForemanOfflinePackIds(): readonly string[] {
  return JAPANESE_FOREMAN_OFFLINE_RELEASE_ENABLED
    ? Object.keys(PRIVATE_JAPANESE_FOREMAN_OFFLINE_TRACKS)
    : [];
}
