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
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import {
  lessonDraftKey,
  claimLessonDraft,
  completeLessonDraft,
  releaseLessonDraft,
  type LessonDraftClaim,
} from "@/lib/shared-lesson-drafts";
import { usageReceipt, cacheReceipt } from "@/lib/usage-cost";

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
  cached?: boolean;
}

export const generateLessonWords = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonWordsResult> => {
    setResponseHeader("Cache-Control", "no-store");
    const originError = learningGenerationOriginError(getRequest());
    if (originError) {
      setResponseStatus(originError.status);
      return { words: null, error: originError.error };
    }
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
    const request = buildLessonWordsRequest({
      module,
      lesson,
      targetLanguage: data.language,
      nativeLanguage,
    });
    let draft: LessonDraftClaim;
    try {
      draft = await claimLessonDraft(await lessonDraftKey(module.id, lesson.n, request));
    } catch {
      setResponseStatus(503);
      setResponseHeader("Retry-After", "60");
      return {
        words: null,
        error: "New practice content is temporarily unavailable. Saved lessons still work.",
      };
    }
    if (draft.status === "hit") {
      setResponseHeader("X-LT-AI-Usage", JSON.stringify(cacheReceipt()));
      return { words: draft.words, lang: data.language, error: null, cached: true };
    }
    if (draft.status === "pending") {
      setResponseStatus(202);
      setResponseHeader("Retry-After", "3");
      return {
        words: null,
        error: "This lesson’s word list is being prepared. Try again shortly.",
      };
    }
    let sharedSaved = false;

    try {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return { words: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError();
      if (budgetError) return { words: null, error: budgetError };
      // Finish within the 120s lease even after the three bounded budget RPCs.
      const client = new Anthropic({ apiKey: key, timeout: 45000, maxRetries: 0 });
      const response = await client.messages.create(request);
      setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
      if (!response.content.some((item) => item.type === "tool_use")) {
        return { words: null, error: "Word list failed" };
      }
      const words = lessonWordsFromResponse(response.content);
      if (!words) return { words: null, error: "Could not create enough words for this lesson" };
      try {
        sharedSaved = await completeLessonDraft(draft.lease, words);
      } catch {
        console.warn(
          "Shared lesson word draft was not stored; caller still has its generated copy.",
        );
      }
      return { words, lang: data.language, error: null, cached: false };
    } catch {
      console.error("generateLessonWords failed");
      return { words: null, error: "Word list failed" };
    } finally {
      if (!sharedSaved) {
        try {
          await releaseLessonDraft(draft.lease);
        } catch {
          console.warn("Lesson draft lease will expire before another generation can start.");
        }
      }
    }
  });
