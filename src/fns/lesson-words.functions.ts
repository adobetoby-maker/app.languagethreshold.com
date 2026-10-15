// Built by TAC — 2026-10-15
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurriculum } from "@/data/curriculum";
import type { LessonWord } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import { hasEnoughWords, wordsFromModelOutput } from "@/lib/lesson-words-core";
import type { NativeLanguage } from "@/state/app-state";

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

const PAIR_SCHEMA = {
  type: "object",
  properties: {
    native: { type: "string" },
    target: { type: "string" },
    note: { type: "string" },
  },
  required: ["native", "target"],
  additionalProperties: false,
};

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

    try {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 2000,
        system: `You build the word list for ONE language-lesson. The learner's native language is ${nativeLanguage}; the language they are learning is ${data.language}. For every entry, "native" is the ${nativeLanguage} text and "target" is the natural ${data.language} equivalent; keep each pair exactly aligned. Give 8 to 12 job-specific single terms (nouns, tools, parts, short noun phrases, at most 4 words) and 4 to 6 short phrases the learner would actually say in this field (a sentence or question, at most 12 words, spoken by the learner, not instructions about practicing). Choose words this lesson's objective and steps need; prefer any words the step instructions name. No duplicates, no generic filler (hello, thank you) unless the lesson is about it. Add a short "note" only when a usage or register tip helps (formal vs casual, regional variant). For medical or safety topics, teach communication and verification, never an unsupported procedure, dose, measurement or universal specification. Avoid stereotypes. Return only the requested tool data.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              module: module.name,
              moduleDescription: module.blurb,
              learnerRole: module.userRole,
              moduleVocabularyFocus: module.vocabFocus,
              lesson: {
                number: lesson.n,
                title: lesson.title,
                objective: lesson.objective,
                steps: lesson.steps.map((step) => step.instruction),
              },
              targetLanguage: data.language,
              nativeLanguage,
            }),
          },
        ],
        tools: [
          {
            name: "return_lesson_words",
            description: "Return the term and phrase lists for this lesson",
            input_schema: {
              type: "object" as const,
              properties: {
                terms: {
                  type: "array",
                  description: "8 to 12 distinct job-specific terms for this lesson.",
                  minItems: 8,
                  maxItems: 12,
                  items: PAIR_SCHEMA,
                },
                phrases: {
                  type: "array",
                  description: "4 to 6 short things the learner would say, for this lesson.",
                  minItems: 4,
                  maxItems: 6,
                  items: PAIR_SCHEMA,
                },
              },
              required: ["terms", "phrases"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_lesson_words" },
      });
      const tool = response.content.find((item) => item.type === "tool_use");
      if (!tool || tool.type !== "tool_use") return { words: null, error: "Word list failed" };
      // Separate term and phrase lists (as in module-deck): one mixed list made Haiku stop
      // after the terms. The core helper trims, dedupes, caps and assigns kinds.
      const words = wordsFromModelOutput(tool.input);
      if (!hasEnoughWords(words)) {
        return { words: null, error: "Could not create enough words for this lesson" };
      }
      return { words, lang: data.language, error: null };
    } catch (error) {
      console.error("generateLessonWords failed", error);
      return { words: null, error: "Word list failed" };
    }
  });
