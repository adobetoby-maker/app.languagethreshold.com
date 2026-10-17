import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(1_000_000),
  targetText: z.string().min(1).max(2000),
  language: z.string().min(1).max(40),
  mode: z.enum(["word", "sentence", "free"]),
});

const OutputSchema = z.object({
  correct: z.boolean(),
  recognized: z.string().max(4000),
  feedback: z.string().min(1).max(1200),
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
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { result: null, error: originError.error };
      }
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return { result: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("handwriting");
      if (budgetError) return { result: null, error: budgetError };

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
        const client = new Anthropic({ apiKey: key, timeout: 30_000, maxRetries: 0 });
        const response = await client.messages.create(
          {
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
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");
        const parsed = OutputSchema.parse(JSON.parse(jsonMatch[0]));
        // This is fixed practice credit, never a model-selected proficiency score.
        return { result: { ...parsed, xp: data.mode === "free" ? 10 : 5 }, error: null };
      } catch {
        return { result: null, error: "Could not check your writing — please try again." };
      }
    },
  );
