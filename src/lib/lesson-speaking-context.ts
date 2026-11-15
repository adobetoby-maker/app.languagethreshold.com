import { getLessonDefinition } from "./lesson-definition.ts";

/** Resolve teaching content on the server; the browser sends only the lesson number. */
export function lessonSpeakingContext(
  moduleId: string,
  lessonNumber: number,
  target: string,
  native: string,
): string | null {
  const lesson = getLessonDefinition({
    moduleId,
    lessonNumber,
    targetLanguage: target,
    instructionLanguage: native,
    contentVersion: "current",
  });
  if (!lesson) return null;
  const instruction =
    lesson.teaching?.speaking.context ??
    lesson.source.steps.find((step) => step.tab === "speak")?.instruction;
  return [
    `This conversation practises lesson ${lessonNumber}: ${lesson.title}.`,
    `Lesson goal: ${lesson.objective}`,
    instruction ? `Speaking task: ${instruction}` : "",
    lesson.words.length
      ? `Lesson vocabulary (${target} — ${native}): ${lesson.words
          .slice(0, 24)
          .map((word) => `${word.es} — ${word.en}`)
          .join("; ")}`
      : "",
    "Act as the lesson's patient teacher. Start with one short question or role-play prompt tied to the speaking task. Guide the learner toward the lesson goal through give-and-take, one question at a time. Use the lesson words naturally and help when they get stuck. After they demonstrate the goal, acknowledge what they accomplished and offer to continue or return to Study. Do not claim the app has recorded completion or mastery.",
  ]
    .filter(Boolean)
    .join("\n");
}
