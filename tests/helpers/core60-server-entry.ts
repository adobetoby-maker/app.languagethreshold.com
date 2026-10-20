// Built by TAC — 2026-10-20
// One bundle entry for tests/core60-server-readers.test.mjs: the Core 60 stage registry together
// with the server readers that depend on it, so they share one (cold) registry instance.
export {
  ensureStageForModule,
  ensureStagesForModules,
  stageCurriculumStatus,
} from "../../src/data/core60-stages.ts";
export { getCurriculum } from "../../src/data/curriculum.ts";
export { getLessonDefinition } from "../../src/lib/lesson-definition.ts";
export { resolveTutorLesson } from "../../src/lib/lesson-tutor-context.ts";
export { modulePracticeVersion } from "../../src/data/module-teaching.ts";
export {
  findSpeakingMission,
  getSpeakingMissions,
  getSpeakingModules,
  speakingCatalogMissionCount,
} from "../../src/data/speaking-missions.ts";
export { loadCurrentLessonReviewSnapshot } from "../../src/lib/lesson-review-server.ts";
export { readinessCatalog } from "../../src/lib/assessments/server.ts";
export { stageLoadFailed } from "../../src/data/core60-stages.ts";
