/** A lesson conversation belongs to the same learner store as its transcript. */
export interface SpeakingLesson {
  moduleId: string;
  lessonNumber: number;
  title: string;
  nativeLanguage: string;
}

export const OPEN_LESSON_SPEAK = "lt:open-lesson-speak";

export function parseSpeakingLesson(value: unknown): SpeakingLesson | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.moduleId !== "string" ||
    !v.moduleId ||
    v.moduleId.length > 100 ||
    typeof v.lessonNumber !== "number" ||
    !Number.isInteger(v.lessonNumber) ||
    v.lessonNumber < 1 ||
    typeof v.title !== "string" ||
    !v.title.trim() ||
    v.title.length > 300 ||
    typeof v.nativeLanguage !== "string" ||
    !v.nativeLanguage ||
    v.nativeLanguage.length > 40
  )
    return null;
  return {
    moduleId: v.moduleId,
    lessonNumber: v.lessonNumber,
    title: v.title,
    nativeLanguage: v.nativeLanguage,
  };
}
