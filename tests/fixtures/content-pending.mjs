// Lesson plans that exist ahead of their generated lesson content.
//
// The sixteen travel zones (15 → 30) and Sport Fishing (10 → 30) gained their Core 30 lesson plans
// before the matching public/lesson-content files were regenerated. Tests that require generated
// content for every lesson tolerate exactly these plan-only lessons and no others: a module or lesson
// number missing from this list must still have its content. Remove an entry once its content lands.

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

const TRAVEL_ZONES = [
  "travel-breakfast",
  "travel-lunch",
  "travel-dinner",
  "travel-shopping-essentials",
  "travel-daily-life-services",
  "travel-markets-souvenirs",
  "travel-hotels-lodging",
  "travel-taxi-rideshare",
  "travel-trains-transit",
  "travel-scooter-car-rental",
  "travel-roadside-mechanics",
  "travel-guides-attractions",
  "travel-airport-luggage",
  "travel-pharmacy-health",
  "travel-social-dating",
  "travel-problems-services",
];

export const CONTENT_PENDING_LESSONS = Object.freeze({
  ...Object.fromEntries(TRAVEL_ZONES.map((moduleId) => [moduleId, range(16, 30)])),
  "sport-fishing": range(11, 30),
});

/** Lesson numbers of `moduleId` whose plan exists but whose generated content is still pending. */
export const contentPendingFor = (moduleId) => new Set(CONTENT_PENDING_LESSONS[moduleId] ?? []);
