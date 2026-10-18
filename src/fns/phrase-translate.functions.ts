import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { usageReceipt } from "@/lib/usage-cost";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  phrases: z.array(z.string().min(1).max(500)).min(1).max(8),
  targetLanguage: z.string().min(1).max(40),
  context: z.string().min(1).max(200),
});

export interface TranslatedPhrase {
  english: string;
  translation: string;
}

export const translatePhrases = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(
    async ({ data }): Promise<{ phrases: TranslatedPhrase[] | null; error: string | null }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { phrases: null, error: originError.error };
      }
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { phrases: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("lookup");
      if (budgetError) return { phrases: null, error: budgetError };

      try {
        const client = new Anthropic({ apiKey: KEY, timeout: 30_000, maxRetries: 0 });
        const response = await client.messages.create(
          {
            model: "claude-haiku-5-5",
            max_tokens: 1400,
            system: `You are a professional translator for language learners. Translate phrases into ${data.targetLanguage} for a ${data.context} context. Use natural, idiomatic ${data.targetLanguage} that a learner would actually hear or say. Keep translations short and direct — no explanations.`,
            messages: [
              {
                role: "user",
                content: `Translate these English phrases into ${data.targetLanguage}. Return using the provided tool.

${data.phrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
              },
            ],
            tools: [
              {
                name: "return_translations",
                description: "Return translated phrase pairs",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    translations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          english: {
                            type: "string",
                            description: "The original English phrase, copied exactly as given",
                          },
                          translation: {
                            type: "string",
                            description:
                              "The phrase translated INTO the target language — the actual translated words, never the name of the language itself",
                          },
                        },
                        required: ["english", "translation"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["translations"],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_translations" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_translations",
        );
        if (!toolUse || toolUse.type !== "tool_use")
          return { phrases: null, error: "Translation failed" };

        const result = z
          .object({
            translations: z
              .array(
                z.object({
                  english: z.string().min(1).max(500),
                  translation: z.string().trim().min(1).max(1000),
                }),
              )
              .length(data.phrases.length),
          })
          .parse(toolUse.input);
        const remaining = [...result.translations];
        const ordered: TranslatedPhrase[] = [];
        for (const english of data.phrases) {
          const index = remaining.findIndex((pair) => pair.english === english);
          if (
            index < 0 ||
            remaining[index].translation.toLowerCase() === data.targetLanguage.trim().toLowerCase()
          )
            return { phrases: null, error: "Translation failed" };
          ordered.push(remaining.splice(index, 1)[0]);
        }
        return { phrases: ordered, error: null };
      } catch {
        console.error("translatePhrases provider request failed");
        return { phrases: null, error: "Translation failed" };
      }
    },
  );
