import { contentLimitsFor } from "./lesson-content-core.ts";
import { OFFLINE_LESSON_TRACKS, type OfflineLessonPackId } from "./offline-lesson-tracks.ts";
import {
  getLessonDefinition,
  modulePracticeVersion,
  type LessonDefinition,
} from "./lesson-definition.ts";

/** Public lesson practice only. Exam banks and learner drafts are never pack inputs. */
export function publicLessonOfflinePack(
  packId: OfflineLessonPackId,
  definitions: LessonDefinition[] = Array.from(
    { length: OFFLINE_LESSON_TRACKS[packId].lessons },
    (_, index) =>
      getLessonDefinition({
        moduleId: OFFLINE_LESSON_TRACKS[packId].moduleId,
        lessonNumber: index + 1,
        targetLanguage: OFFLINE_LESSON_TRACKS[packId].target,
        instructionLanguage: OFFLINE_LESSON_TRACKS[packId].native,
        contentVersion: modulePracticeVersion(
          OFFLINE_LESSON_TRACKS[packId].moduleId,
          OFFLINE_LESSON_TRACKS[packId].target,
          OFFLINE_LESSON_TRACKS[packId].native,
        ),
      }),
  ).filter((lesson): lesson is LessonDefinition => lesson !== null),
) {
  if (
    definitions.length !== OFFLINE_LESSON_TRACKS[packId].lessons ||
    definitions.some(
      (lesson, index) =>
        lesson.moduleId !== OFFLINE_LESSON_TRACKS[packId].moduleId ||
        lesson.lessonNumber !== index + 1 ||
        lesson.targetLanguage !== OFFLINE_LESSON_TRACKS[packId].target ||
        lesson.instructionLanguage !== OFFLINE_LESSON_TRACKS[packId].native ||
        !lesson.teaching ||
        !lesson.reading?.sentences.length ||
        lesson.reading.sentences.some((sentence) => !sentence.target || !sentence.native) ||
        lesson.words.filter((word) => word.kind === "term").length <
          contentLimitsFor(lesson.moduleId).minTerms ||
        lesson.words.filter((word) => word.kind === "phrase").length <
          contentLimitsFor(lesson.moduleId).minPhrases,
    )
  )
    throw new Error(
      `Lesson pack requires ${OFFLINE_LESSON_TRACKS[packId].lessons === 30 ? "thirty" : OFFLINE_LESSON_TRACKS[packId].lessons} ordered, complete ${OFFLINE_LESSON_TRACKS[packId].target}/${OFFLINE_LESSON_TRACKS[packId].native} lesson drafts.`,
    );
  return {
    schema: 1,
    moduleId: OFFLINE_LESSON_TRACKS[packId].moduleId,
    targetLanguage: OFFLINE_LESSON_TRACKS[packId].target,
    instructionLanguage: OFFLINE_LESSON_TRACKS[packId].native,
    contentVersion: modulePracticeVersion(
      OFFLINE_LESSON_TRACKS[packId].moduleId,
      OFFLINE_LESSON_TRACKS[packId].target,
      OFFLINE_LESSON_TRACKS[packId].native,
    ),
    contentStatus: "draft",
    purpose: "lesson-practice",
    audioFilesIncluded: false,
    officialAssessmentsIncluded: false,
    capabilities: {
      see: "downloaded-text",
      recall: "local-cards-and-matching",
      hear: "requires-device-voice",
      type: "local-answer-comparison",
      say: "local-prompts; AI-conversation-requires-connection",
      write: "local-copy-and-compare; recognition-requires-connection",
    },
    lessons: definitions.map((lesson) => ({
      id: lesson.id,
      objectiveId: lesson.objectiveId,
      lessonNumber: lesson.lessonNumber,
      title: lesson.title,
      objective: lesson.objective,
      prerequisites: lesson.prerequisites,
      expectedMinutes: lesson.expectedMinutes,
      words: lesson.words,
      reading: lesson.reading,
      listeningItems: lesson.listeningItems,
      teaching: lesson.teaching,
      modes: lesson.modes,
      ...(lesson.soundPractice ? { soundPractice: lesson.soundPractice } : {}),
    })),
  };
}

/** Preserve the original public API for existing Roofing tooling. */
export function roofingOfflinePack(definitions?: LessonDefinition[]) {
  return publicLessonOfflinePack("roofing-es-en", definitions);
}
