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
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { phrases: null, error: "AI is not configured" };

      try {
        const client = new Anthropic({ apiKey: KEY });
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
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
        });

        const toolUse = response.content.find((c) => c.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use")
          return { phrases: null, error: "Translation failed" };

        const result = toolUse.input as { translations: TranslatedPhrase[] };
        // Guard against the model echoing the language name (or nothing) instead of a
        // real translation — the exact failure that shipped "Italian" as every card back.
        const langLower = data.targetLanguage.trim().toLowerCase();
        const valid = (result.translations ?? []).filter(
          (t) =>
            typeof t?.translation === "string" &&
            t.translation.trim().length > 0 &&
            t.translation.trim().toLowerCase() !== langLower,
        );
        if (valid.length === 0) return { phrases: null, error: "Translation failed" };
        return { phrases: valid, error: null };
      } catch (e) {
        console.error("translatePhrases failed", e);
        return { phrases: null, error: "Translation failed" };
      }
    },
  );
