// A synthetic short curriculum for the review and source-coverage gap paths.
//
// Every shipped module now plans 30 lessons, so no real module exercises "fewer than 30 lesson
// plans" any more. Tests bundle this entry with tests/helpers/bundle.mjs, so the module registered
// below exists only inside that test bundle and never in the app.
import { CURRICULA } from "../../src/data/curriculum.ts";

export { lessonReviewSnapshot } from "../../src/lib/lesson-review.ts";
export { lessonSourceCoverage } from "../../src/lib/lesson-source-coverage.ts";

export const SHORT_MODULE_ID = "fixture-short-curriculum";
export const SHORT_LESSON_COUNT = 15;

const base = CURRICULA["travel-breakfast"];
CURRICULA[SHORT_MODULE_ID] = {
  ...base,
  moduleId: SHORT_MODULE_ID,
  headline: "Fixture: short draft curriculum",
  lessons: base.lessons.slice(0, SHORT_LESSON_COUNT),
};
