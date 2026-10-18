import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(1000),
  targetScript: z.enum(["hiragana", "katakana", "kanji-mixed"]),
});

export interface KanaConvertResult {
  output: string;
  breakdown: { original: string; reading: string; meaning: string }[];
}

/**
 * AI-assisted conversion. Used for kanji-mixed output (hiragana → kanji with
 * natural word selection) and as a quality gate for other scripts.
 */
export const convertKana = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ result: KanaConvertResult | null; error: string | null }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { result: null, error: originError.error };
      }
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { result: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("lookup");
      if (budgetError) return { result: null, error: budgetError };

      const scriptLabel =
        data.targetScript === "hiragana"
          ? "hiragana (all kana, no kanji)"
          : data.targetScript === "katakana"
            ? "katakana (all kana, no kanji)"
            : "natural Japanese (kanji + kana mixed)";

      const userPrompt = `Convert this Japanese text to ${scriptLabel}:\n\n"${data.text}"\n\nProvide:\n1. The full converted output\n2. A word-by-word breakdown with reading and English meaning for each word.`;

      try {
        const client = new Anthropic({ apiKey: KEY, timeout: 30_000, maxRetries: 0 });
        const response = await client.messages.create(
          {
            model: "claude-haiku-5-5",
            max_tokens: 1400,
            system:
              "You are a Japanese linguistics expert. Always respond via the convert_kana tool.",
            messages: [{ role: "user", content: userPrompt }],
            tools: [
              {
                name: "convert_kana",
                description: "Return the converted text and a word-level breakdown.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    output: {
                      type: "string",
                      description: "The fully converted text.",
                    },
                    breakdown: {
                      type: "array",
                      description: "Word-by-word breakdown.",
                      items: {
                        type: "object",
                        properties: {
                          original: { type: "string", description: "Original word/chunk." },
                          reading: {
                            type: "string",
                            description: "Hiragana reading of this chunk.",
                          },
                          meaning: { type: "string", description: "Brief English meaning." },
                        },
                        required: ["original", "reading", "meaning"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["output", "breakdown"],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "convert_kana" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "convert_kana",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { result: null, error: "Conversion failed." };
        }
        const result = z
          .object({
            output: z.string().min(1).max(4000),
            breakdown: z
              .array(
                z.object({
                  original: z.string().min(1).max(1000),
                  reading: z.string().max(1000),
                  meaning: z.string().max(500),
                }),
              )
              .max(1000),
          })
          .parse(toolUse.input);
        return { result, error: null };
      } catch {
        console.error("convertKana provider request failed");
        return { result: null, error: "Conversion failed." };
      }
    },
  );
