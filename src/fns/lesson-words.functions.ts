// Built by TAC — 2026-10-15
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurriculum } from "@/data/curriculum";
import type { LessonWord } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import { buildLessonWordsRequest, lessonWordsFromResponse } from "@/lib/lesson-words-prompt";
import type { NativeLanguage } from "@/state/app-state";
import { learningGenerationError } from "@/lib/learning-generation-server";

const Input = z.object({
  moduleId: z.string().min(1).max(80),
  lessonNumber: z.number().int().min(1).max(60),
  language: z.enum([
    "Spanish",
    "French",
    "German",
    "Italian",
    "Japanese",
    "Chinese",
    "Korean",
    "Portuguese",
    "Pashto",
    "English",
  ]),
  nativeLanguage: z
    .enum([
      "English",
      "Spanish",
      "French",
      "German",
      "Italian",
      "Portuguese",
      "Dutch",
      "Polish",
      "Russian",
      "Turkish",
      "Arabic",
      "Hindi",
      "Chinese (Simplified)",
      "Japanese",
      "Korean",
    ])
    .optional(),
});

/**
 * Field meaning (same as LessonWord, whose names were written for Spanish):
 *   `en` = text in the learner's NATIVE language
 *   `es` = text in the language being LEARNED (the target language)
 * `lang` echoes the target language so the client can label the list.
 */
export interface LessonWordsResult {
  words: LessonWord[] | null;
  lang?: string;
  error: string | null;
}

export const generateLessonWords = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonWordsResult> => {
    const module = getModule(data.moduleId);
    if (!module) return { words: null, error: "Unknown module" };
    const nativeLanguage: NativeLanguage =
      data.nativeLanguage ?? (data.language === "English" ? "Spanish" : "English");
    if (!moduleSupportsLearningPair(module, data.language, nativeLanguage)) {
      return { words: null, error: "This language is not available for this module" };
    }
    // The lesson is looked up here, never taken from the client, so a caller cannot make the
    // model write about arbitrary text.
    const lesson = getCurriculum(module.id)?.lessons.find((item) => item.n === data.lessonNumber);
    if (!lesson) return { words: null, error: "Unknown lesson" };
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { words: null, error: "AI is not configured" };
    const budgetError = await learningGenerationError();
    if (budgetError) return { words: null, error: budgetError };

    try {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create(
        buildLessonWordsRequest({
          module,
          lesson,
          targetLanguage: data.language,
          nativeLanguage,
        }),
      );
      if (!response.content.some((item) => item.type === "tool_use")) {
        return { words: null, error: "Word list failed" };
      }
      const words = lessonWordsFromResponse(response.content);
      if (!words) return { words: null, error: "Could not create enough words for this lesson" };
      return { words, lang: data.language, error: null };
    } catch (error) {
      console.error("generateLessonWords failed", error);
      return { words: null, error: "Word list failed" };
    }
  });
