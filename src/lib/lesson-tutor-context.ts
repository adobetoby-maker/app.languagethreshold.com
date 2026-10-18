import { getLessonDefinition } from "./lesson-definition.ts";
import { modulePracticeVersion } from "../data/module-teaching.ts";
import { getModule, moduleSupportsLearningPair } from "../data/modules.ts";
import { LANGUAGES, NATIVE_LANGUAGES } from "../data/languages.ts";
import { z } from "zod";

export const TutorLessonReferenceSchema = z.object({
  moduleId: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  lessonNumber: z.number().int().min(1).max(60),
  targetLanguage: z.string().min(1).max(40),
  instructionLanguage: z.string().min(1).max(40),
  contentVersion: z.string().min(1).max(100),
});
export type TutorLessonReference = z.infer<typeof TutorLessonReferenceSchema>;
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
export function lessonLookupInstructions(reference: TutorLessonReference) {
  const lesson = resolveTutorLesson(reference);
  if (!lesson) return null;
  return [
    `CURRENT LESSON DOMAIN: ${getModule(lesson.moduleId)?.name ?? lesson.moduleId}; lesson ${lesson.lessonNumber}: ${lesson.title}.`,
    `Learning objective: ${lesson.objective}`,
    "Choose the meaning used in this lesson's domain, not a different generic or geographic sense. Examples, collocations and related words must fit this domain too.",
    lesson.words.length
      ? `Authored vocabulary anchors in target/instruction languages: ${lesson.words.map((word) => `${word.es} — ${word.en}`).join("; ")}`
      : null,
    lesson.teaching?.stage === "supported"
      ? "Use plain short explanations suitable for the first supported lessons."
      : lesson.teaching?.stage === "connected"
        ? "Relate the word to a short instruction or exchange in this lesson."
        : "Explain natural use within the lesson task; avoid unnecessary jargon.",
    "Explain language use, not technical trade procedures or safety qualifications.",
  ]
    .filter(Boolean)
    .join("\n");
}
