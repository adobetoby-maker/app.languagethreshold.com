import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurriculum } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import type { NativeLanguage } from "@/state/app-state";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { cleanModuleDeck, type ModuleDeckPair } from "@/lib/module-deck-core";
import {
  moduleDeckDraftKey,
  claimModuleDeck,
  completeModuleDeck,
  releaseModuleDeck,
  type ModuleDeckClaim,
} from "@/lib/shared-module-decks";
import { cacheReceipt, usageReceipt } from "@/lib/usage-cost";
export type { ModuleDeckPair } from "@/lib/module-deck-core";

const Input = z.object({
  moduleId: z.string().min(1).max(80),
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

const CARD_SCHEMA = {
  type: "object",
  properties: {
    english: { type: "string" },
    translation: { type: "string" },
  },
  required: ["english", "translation"],
  additionalProperties: false,
};

export const generateModuleDeck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ pairs: ModuleDeckPair[] | null; error: string | null; cached?: boolean }> => {
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(getRequest());
      if (originError) {
        setResponseStatus(originError.status);
        return { pairs: null, error: originError.error };
      }
      const module = getModule(data.moduleId);
      if (!module) return { pairs: null, error: "Unknown module" };
      const nativeLanguage: NativeLanguage =
        data.nativeLanguage ?? (data.language === "English" ? "Spanish" : "English");
      if (!moduleSupportsLearningPair(module, data.language, nativeLanguage)) {
        return { pairs: null, error: "This language is not available for this module" };
      }
      const curriculum = getCurriculum(module.id);
      const request = {
        model: "claude-haiku-5-5",
        max_tokens: 8000,
        system: `You create practical bilingual flashcards for language learners. Return 20 distinct field terms and 20 short things the learner would actually say in the field. The learner's native language is ${nativeLanguage}; the language they are learning is ${data.language}. In each card, "english" is the native-language source text and "translation" is the ${data.language} practice text. For English learners, this means "english" must contain ${nativeLanguage} (such as Spanish), and "translation" must contain English. Translate every card naturally into the requested target language. Keep source and target text paired exactly. Phrases should be learner utterances, not instructions about what to practice. Cover the full range of provided lesson themes, not only the first lesson. For medical or safety topics, teach communication and verification, never an unsupported procedure, dose, measurement, or universal specification. Avoid stereotypes and culturally insensitive assumptions. Return only the requested tool data.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              module: module.name,
              targetLanguage: data.language,
              nativeLanguage,
              learnerRole: module.userRole,
              description: module.blurb,
              vocabulary: module.vocabFocus,
              scenarios: module.challengePrompts,
              lessonThemes:
                curriculum?.lessons.map((lesson) => `${lesson.title}: ${lesson.objective}`) ?? [],
            }),
          },
        ],
        tools: [
          {
            name: "return_cards",
            description: "Return bilingual field vocabulary and utterances",
            input_schema: {
              type: "object" as const,
              properties: {
                terms: {
                  type: "array",
                  description: "Exactly 20 distinct field terms.",
                  minItems: 20,
                  maxItems: 20,
                  items: CARD_SCHEMA,
                },
                phrases: {
                  type: "array",
                  description:
                    "Exactly 20 short things the learner would actually say in the field.",
                  minItems: 20,
                  maxItems: 20,
                  items: CARD_SCHEMA,
                },
              },
              required: ["terms", "phrases"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_cards" },
      } satisfies Anthropic.MessageCreateParamsNonStreaming;
      let draft: ModuleDeckClaim;
      try {
        draft = await claimModuleDeck(await moduleDeckDraftKey(module.id, request));
      } catch {
        setResponseStatus(503);
        setResponseHeader("Retry-After", "60");
        return {
          pairs: null,
          error: "New practice content is temporarily unavailable. Saved cards still work.",
        };
      }
      if (draft.status === "hit") {
        setResponseHeader("X-LT-AI-Usage", JSON.stringify(cacheReceipt()));
        return { pairs: draft.pairs, error: null, cached: true };
      }
      if (draft.status === "pending") {
        setResponseStatus(202);
        setResponseHeader("Retry-After", "3");
        return { pairs: null, error: "This module’s cards are being prepared. Try again shortly." };
      }
      let sharedSaved = false;
      try {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) return { pairs: null, error: "AI is not configured" };
        const budgetError = await learningGenerationError();
        if (budgetError) return { pairs: null, error: budgetError };
        const client = new Anthropic({ apiKey: key, timeout: 45000, maxRetries: 0 });
        const response = await client.messages.create(request);
        setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
        const tool = response.content.find((item) => item.type === "tool_use");
        if (!tool || tool.type !== "tool_use")
          return { pairs: null, error: "Card generation failed" };
        // Separate term and phrase lists: with one mixed list, Haiku 5.5 often stopped
        // after the terms and returned too few phrases to pass the check below.
        const input = tool.input as { terms?: unknown; phrases?: unknown };
        const raw = [
          ...(Array.isArray(input.terms)
            ? input.terms.map((card) => ({ ...card, kind: "term" }))
            : []),
          ...(Array.isArray(input.phrases)
            ? input.phrases.map((card) => ({ ...card, kind: "phrase" }))
            : []),
        ];
        const pairs = cleanModuleDeck(raw, data.language);
        if (!pairs) return { pairs: null, error: "Could not create enough field cards" };
        try {
          sharedSaved = await completeModuleDeck(draft.lease, pairs);
        } catch {
          console.warn(
            "Shared module deck draft was not stored; caller still has its generated copy.",
          );
        }
        return { pairs, error: null, cached: false };
      } catch {
        console.error("generateModuleDeck failed");
        return { pairs: null, error: "Card generation failed" };
      } finally {
        if (!sharedSaved) {
          try {
            await releaseModuleDeck(draft.lease);
          } catch {
            console.warn("Module deck lease will expire before another generation can start.");
          }
        }
      }
    },
  );
