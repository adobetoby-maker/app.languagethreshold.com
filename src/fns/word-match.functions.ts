import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { PublicGameGenerationCache } from "@/lib/game-generation-cache";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";
import {
  checkWordMatchBoard,
  wordMatchCefr,
  wordMatchPairCount,
  type WordMatchBoard,
  type WordMatchLevel,
  type WordMatchPair,
} from "@/lib/word-match-core";

// The board types and the rules that decide whether a board is valid live in
// src/lib/word-match-core.ts, shared with the trade-pack loader and generator.
export type { WordMatchBoard, WordMatchLevel, WordMatchPair };

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  avoid: z.array(z.string().min(1).max(80)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
  userWords: z.array(z.string().min(1).max(80)).max(25).optional(),
});

const cache = new PublicGameGenerationCache<WordMatchBoard>();

const SYSTEM = `You are a precise vocabulary curator for a memory-matching game. The learner sees a board of cards: one face has a target-language word, the matching face has its English translation. Your job is to pick a coherent set of vocabulary pairs.

Rules — non-negotiable:
1. Pick ONE concrete topic (e.g. "kitchen", "weather", "transportation", "body parts", "family", "colors", "food", "animals", "clothing", "school", "office", "emotions", "time", "nature"). All pairs in the board MUST come from that topic.
2. Each pair is { target, english }. The target is the target-language word/short phrase. The english is its translation.
3. All target strings unique within the board. All english strings unique within the board. No empty strings, no duplicates.
4. Keep each card short — 1-3 words max so it fits on a memory card.
5. CEFR-appropriate vocab:
   - A1/A2 (level 1): high-frequency concrete nouns/verbs/adjectives a beginner uses daily
   - B1 (level 2): everyday but slightly less frequent — common verbs, adjectives, abstract-but-familiar nouns
   - B2+ (level 3): advanced, lower-frequency vocabulary including abstractions, formal register
6. Language-specific notes:
   - Japanese: target uses kanji+kana mix appropriate to level; kana-only OK at level 1; do NOT include romaji.
   - Korean: target is hangul; do NOT include romanization.
   - European languages: include articles only when essential to learning the gender (e.g. "der Hund" / "el café"); otherwise bare noun is fine.
7. Always respond by calling the provided tool.`;

export const generateWordMatchBoard = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{ data: WordMatchBoard | null; error: string | null; cached?: boolean }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { data: null, error: originError.error };
      }

      const cefr: CefrLevel = wordMatchCefr(data.level);
      const expectedCount = wordMatchPairCount(data.level);

      const cacheContext = { ...data, cefr };
      const hit = cache.get(cacheContext);
      if (hit) return { data: hit, error: null, cached: true };
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { data: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("content");
      if (budgetError) return { data: null, error: budgetError };

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nAvoid these recently used topics: ${data.avoid.join(", ")}.`
          : "";
      const topicLine = data.topic
        ? `\nDomain: ALL pairs MUST be vocabulary from the "${data.topic}" field — the kind of words a ${data.topic} practitioner uses daily.`
        : "";
      const userWordsLine =
        data.userWords && data.userWords.length
          ? `\nPersonal vocab: The learner has these words they need to practice: ${data.userWords.join(", ")}. Include as many as possible (at least ${Math.min(data.userWords.length, expectedCount - 2)}) and build the board topic around them.`
          : "";

      const userMsg = `Generate ONE Word Match board for ${data.language} learners at CEFR ${cefr}.\nProduce EXACTLY ${expectedCount} pairs, all from a single coherent topic.${topicLine}${userWordsLine}${avoidLine}\n\nReturn the board via the tool.`;

      try {
        const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
        const response = await client.messages.create(
          {
            // Output is validated before it can enter the shared public cache.
            model: "claude-haiku-5-5",
            max_tokens: 1000,
            system: SYSTEM,
            messages: [{ role: "user", content: userMsg }],
            tools: [
              {
                name: "return_word_match_board",
                description: "Return a memory-matching board of target↔english vocabulary pairs.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    pairs: {
                      type: "array",
                      minItems: expectedCount,
                      maxItems: expectedCount,
                      items: {
                        type: "object",
                        properties: {
                          target: {
                            type: "string",
                            description: "Target-language word or short phrase.",
                          },
                          english: { type: "string", description: "English translation." },
                        },
                        required: ["target", "english"],
                        additionalProperties: false,
                      },
                    },
                    topic: {
                      type: "string",
                      description: "1-3 word topic label, e.g. 'kitchen' or 'weather'.",
                    },
                    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                  },
                  required: ["pairs", "topic", "cefr"],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_word_match_board" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_word_match_board",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No board returned." };
        }
        const checked = checkWordMatchBoard(toolUse.input, data.level);
        if (!checked.ok) {
          return {
            data: null,
            error:
              checked.reason === "duplicates"
                ? "Board pairs must have distinct words and meanings."
                : "Board content came back incomplete. Please try again.",
          };
        }
        const board = checked.board;

        cache.set(cacheContext, board);
        return { data: board, error: null, cached: false };
      } catch {
        console.error("Word Match generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
