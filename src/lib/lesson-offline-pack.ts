import { OFFLINE_LESSON_TRACKS, type OfflineLessonPackId } from "./offline-lesson-tracks.ts";
import {
  getLessonDefinition,
  modulePracticeVersion,
  type LessonDefinition,
} from "./lesson-definition.ts";

/** Public lesson practice only. Exam banks and learner drafts are never pack inputs. */
export function publicLessonOfflinePack(
  packId: OfflineLessonPackId,
  definitions: LessonDefinition[] = Array.from({ length: 30 }, (_, index) =>
    getLessonDefinition({
      moduleId: OFFLINE_LESSON_TRACKS[packId].moduleId,
      lessonNumber: index + 1,
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      contentVersion: modulePracticeVersion(
        OFFLINE_LESSON_TRACKS[packId].moduleId,
        "Spanish",
        "English",
      ),
    }),
  ).filter((lesson): lesson is LessonDefinition => lesson !== null),
) {
  if (
    definitions.length !== 30 ||
    definitions.some(
      (lesson, index) =>
        lesson.moduleId !== OFFLINE_LESSON_TRACKS[packId].moduleId ||
        lesson.lessonNumber !== index + 1 ||
        lesson.targetLanguage !== "Spanish" ||
        lesson.instructionLanguage !== "English" ||
        !lesson.teaching ||
        !lesson.reading?.sentences.length ||
        lesson.reading.sentences.some((sentence) => !sentence.target || !sentence.native) ||
        lesson.words.filter((word) => word.kind === "term").length < 8 ||
        lesson.words.filter((word) => word.kind === "phrase").length < 4,
    )
  )
    throw new Error("Lesson pack requires thirty ordered, complete Spanish/English lesson drafts.");
  return {
    schema: 1,
    moduleId: OFFLINE_LESSON_TRACKS[packId].moduleId,
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    contentVersion: modulePracticeVersion(
      OFFLINE_LESSON_TRACKS[packId].moduleId,
      "Spanish",
      "English",
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
    })),
  };
}

/** Preserve the original public API for existing Roofing tooling. */
export function roofingOfflinePack(definitions?: LessonDefinition[]) {
  return publicLessonOfflinePack("roofing-es-en", definitions);
}
