// Lesson plans that exist ahead of, or have outgrown, their generated lesson content.
//
// The sixteen travel zones (15 → 30) and Sport Fishing (10 → 30) gained their Core 30 lesson plans
// before the matching public/lesson-content files were regenerated. Two lists record that state:
//
// - CONTENT_PENDING_LESSONS: plan-only lessons with no generated content yet (travel 16–30,
//   fishing 11–30). Tests tolerate exactly these missing lessons and no others: a module or lesson
//   number missing from this list must still have its content.
// - STALE_REGENERATE: lessons whose generated content exists and is structurally valid, but was
//   written for an older plan (travel 15 and fishing 10 were the threshold capstone; they are now
//   the midpoint review). They are NOT missing: tests still require and validate their content.
//   They must be regenerated against the current plan.
//
// The generation ticket regenerates exactly CONTENT_PENDING_LESSONS ∪ STALE_REGENERATE, using
// GENERATOR_LESSON_ARGS as the generator's `--lessons` value per module:
//
//   travel-* (all sixteen zones)  --lessons 15-30
//   sport-fishing                 --lessons 10-30
//
// When content lands, remove its entries from both lists (empty objects are fine). Nothing else
// needs to change: GENERATOR_LESSON_ARGS is derived from the lists and empties with them.

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

export const STALE_REGENERATE = Object.freeze({
  ...Object.fromEntries(TRAVEL_ZONES.map((moduleId) => [moduleId, [15]])),
  "sport-fishing": [10],
});

/** Lesson numbers of `moduleId` whose plan exists but whose generated content is still pending. */
export const contentPendingFor = (moduleId) => new Set(CONTENT_PENDING_LESSONS[moduleId] ?? []);

/** Lesson numbers of `moduleId` whose generated content exists but predates the current plan. */
export const staleRegenerateFor = (moduleId) => new Set(STALE_REGENERATE[moduleId] ?? []);

/**
 * Generator `--lessons` value per module: the contiguous span of pending ∪ stale lessons
 * ("15-30", "10-30"), or a comma list if the set ever stops being contiguous.
 */
export const GENERATOR_LESSON_ARGS = Object.freeze(
  Object.fromEntries(
    [...new Set([...Object.keys(CONTENT_PENDING_LESSONS), ...Object.keys(STALE_REGENERATE)])]
      .map((moduleId) => {
        const lessons = [...new Set([...contentPendingFor(moduleId), ...staleRegenerateFor(moduleId)])]
          .sort((a, b) => a - b);
        if (lessons.length === 0) return null;
        const first = lessons[0];
        const last = lessons[lessons.length - 1];
        const contiguous = lessons.length === last - first + 1;
        const span = first === last ? String(first) : `${first}-${last}`;
        return [moduleId, contiguous ? span : lessons.join(",")];
      })
      .filter(Boolean),
  ),
);
