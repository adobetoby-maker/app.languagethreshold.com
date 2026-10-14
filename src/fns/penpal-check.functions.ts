import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(1),
  targetText: z.string().min(1),
  language: z.string().min(1),
  mode: z.enum(["word", "sentence", "free"]),
});

export interface PenPalCheckResult {
  correct: boolean;
  recognized: string;
  feedback: string;
  xp: number;
}

export const checkPenPalWriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ result: PenPalCheckResult | null; error: string | null }> => {
      const client = new Anthropic();

      const systemPrompt =
        data.mode === "free"
          ? `You are a warm, encouraging language teacher. The learner wrote a free answer in ${data.language}.
         Evaluate if their handwriting is legible and if the content relates to the prompt: "${data.targetText}".
         Return JSON: { "correct": true/false, "recognized": "<what you can read>", "feedback": "<1 encouraging sentence>", "xp": 10 }`
          : `You are a handwriting checker for a ${data.language} language learning app.
         The learner was asked to copy: "${data.targetText}"
         Look at their handwriting and determine if they copied it correctly (allow minor imperfections).
         Return JSON only: { "correct": true/false, "recognized": "<what you can read>", "feedback": "<1 encouraging sentence>", "xp": 5 }`;

      try {
        const response = await client.messages.create({
          model: "claude-haiku-5-5",
          max_tokens: 300,
          thinking: { type: "disabled" },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/png", data: data.imageBase64 },
                },
                { type: "text", text: "Check this handwriting. Return only valid JSON." },
              ],
            },
          ],
          system: systemPrompt,
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        const parsed = JSON.parse(jsonMatch[0]) as PenPalCheckResult;
        return { result: parsed, error: null };
      } catch {
        return { result: null, error: "Could not check your writing — please try again." };
      }
    },
  );
