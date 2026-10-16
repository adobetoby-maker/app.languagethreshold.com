import {
  getLessonDefinition,
  ROOFING_PRACTICE_VERSION,
  type LessonDefinition,
} from "./lesson-definition.ts";

/** Public lesson practice only. Exam banks and learner drafts are never pack inputs. */
export function roofingOfflinePack(
  definitions: LessonDefinition[] = Array.from({ length: 30 }, (_, index) =>
    getLessonDefinition({
      moduleId: "roofing",
      lessonNumber: index + 1,
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      contentVersion: ROOFING_PRACTICE_VERSION,
    }),
  ).filter((lesson): lesson is LessonDefinition => lesson !== null),
) {
  if (
    definitions.length !== 30 ||
    definitions.some(
      (lesson, index) =>
        lesson.moduleId !== "roofing" ||
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
    throw new Error(
      "Roofing pack requires thirty ordered, complete Spanish/English lesson drafts.",
    );
  return {
    schema: 1,
    moduleId: "roofing",
    targetLanguage: "Spanish",
    instructionLanguage: "English",
    contentVersion: ROOFING_PRACTICE_VERSION,
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
