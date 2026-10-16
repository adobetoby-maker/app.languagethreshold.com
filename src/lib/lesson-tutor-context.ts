import { getLessonDefinition } from "./lesson-definition.ts";
import { modulePracticeVersion } from "../data/module-teaching.ts";
import { getModule, moduleSupportsLearningPair } from "../data/modules.ts";
import { LANGUAGES, NATIVE_LANGUAGES } from "../data/languages.ts";

export interface TutorLessonReference {
  moduleId: string;
  lessonNumber: number;
  targetLanguage: string;
  instructionLanguage: string;
  contentVersion: string;
}
export function resolveTutorLesson(reference: TutorLessonReference) {
  const module = getModule(reference.moduleId);
  const target = LANGUAGES.find((value) => value === reference.targetLanguage);
  const native = NATIVE_LANGUAGES.find((value) => value === reference.instructionLanguage);
  if (!module || !target || !native || !moduleSupportsLearningPair(module, target, native))
    return null;
  if (
    reference.contentVersion !==
    modulePracticeVersion(
      reference.moduleId,
      reference.targetLanguage,
      reference.instructionLanguage,
    )
  )
    return null;
  return getLessonDefinition(reference);
}
export function tutorLessonThread(reference: TutorLessonReference) {
  return JSON.stringify([
    "core30-tutor",
    reference.moduleId,
    reference.targetLanguage,
    reference.instructionLanguage,
    reference.lessonNumber,
    reference.contentVersion,
  ]);
}
export function currentTutorLesson(
  search: string,
  selection: {
    currentTab: string;
    activeModuleId: string | null;
    selectedLanguage: string;
    nativeLanguage: string;
  },
): TutorLessonReference | null {
  if (selection.currentTab !== "core30" || !selection.activeModuleId) return null;
  const params = new URLSearchParams(search),
    number = params.get("lesson");
  if (!number || !/^\d{1,2}$/.test(number)) return null;
  for (const [key, value] of [
    ["module", selection.activeModuleId],
    ["target", selection.selectedLanguage],
    ["native", selection.nativeLanguage],
  ])
    if (params.has(key) && params.get(key) !== value) return null;
  const reference = {
    moduleId: selection.activeModuleId,
    lessonNumber: Number(number),
    targetLanguage: selection.selectedLanguage,
    instructionLanguage: selection.nativeLanguage,
    contentVersion: modulePracticeVersion(
      selection.activeModuleId,
      selection.selectedLanguage,
      selection.nativeLanguage,
    ),
  };
  return resolveTutorLesson(reference) ? reference : null;
}
export function lessonTutorInstructions(reference: TutorLessonReference) {
  const lesson = resolveTutorLesson(reference);
  if (!lesson) return null;
  const teaching = lesson.teaching;
  return [
    "CURRENT CORE 30 LESSON — keep tutoring inside this objective:",
    `Module: ${lesson.moduleId}; lesson ${lesson.lessonNumber}: ${lesson.title}`,
    `Objective: ${lesson.objective}`,
    `Target language: ${lesson.targetLanguage}; instruction language: ${lesson.instructionLanguage}`,
    teaching
      ? `Teaching stage: ${teaching.stage}. Suggest about ${teaching.response.suggestedSentences} sentence(s) in a practice response.`
      : "No shared teaching-stage settings exist for this language track. Keep help brief and anchored to the objective; do not invent a level.",
    teaching?.stage === "supported"
      ? "Use simple words, one modeled phrase at a time, and a translation when helpful. Invite one short attempt."
      : teaching?.stage === "connected"
        ? "Connect two short ideas; offer a hint before a full model response."
        : teaching?.stage === "independent"
          ? "Invite a connected response from memory. Offer a word bank or translation when requested."
          : null,
    lesson.words.length
      ? `Prefer this lesson's vocabulary and phrases: ${lesson.words.map((word) => word.es).join("; ")}`
      : null,
    "Teaching stage describes this lesson's support, not assessed proficiency or CEFR. Do not grant mastery, scores or certificates. Keep trade advice within language practice and defer technical procedures to the learner's approved job instructions.",
  ]
    .filter(Boolean)
    .join("\n");
}
