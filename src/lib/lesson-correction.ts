import { z } from "zod";

export const lessonCorrectionSchema = z
  .object({
    requestId: z.uuid(),
    moduleId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    lessonNumber: z.number().int().min(1).max(200),
    lessonTitle: z.string().trim().min(1).max(200),
    language: z.string().trim().min(1).max(60),
    nativeLanguage: z.string().trim().min(1).max(60),
    suggestion: z.string().trim().min(5).max(3000),
  })
  .strict();
export type LessonCorrection = z.infer<typeof lessonCorrectionSchema>;
export function correctionText(item: LessonCorrection) {
  return [
    `Course: ${item.moduleId}`,
    `Lesson ${item.lessonNumber}: ${item.lessonTitle}`,
    `Learning language: ${item.language}`,
    `Instruction language: ${item.nativeLanguage}`,
    "",
    "Suggested correction:",
    item.suggestion,
  ].join("\n");
}
