import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  language: z.string().min(1).max(40),
  patternId: z.string().min(1).max(80),
  patternFormula: z.string().min(1).max(200),
  patternName: z.string().min(1).max(80),
  userVocabWords: z.array(z.string().min(1).max(80)).max(20).optional(),
  count: z.number().int().min(1).max(5).optional(),
});

export interface PatternDrillItem {
  prompt: string; // English sentence the learner must translate
  answer: string; // correct target-language sentence
  hint: string; // structural breakdown, e.g. "Soy [noun] — use present tense"
}

export interface PatternDrillSet {
  items: PatternDrillItem[];
  patternId: string;
}

const SYSTEM = `You are a language drill generator. Your job is to create short translation exercises that help learners practice a specific grammar pattern.

Rules:
1. Each drill item is an English sentence the learner must translate into the target language using the specified pattern.
2. Keep sentences personal, concrete, and relevant to daily life — avoid abstract or formal registers.
3. The hint explains the structural skeleton: which word is the pattern anchor, what form the second element takes.
4. If user vocab words are provided, weave them into the sentences so the learner practices familiar vocabulary inside the new pattern.
5. Sentences must be short — max 10 words in English.
6. All sentences must use the specified grammar pattern.
7. Always respond by calling the provided tool.`;

export const generatePatternDrill = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }): Promise<{ data: PatternDrillSet | null; error: string | null }> => {
    const request = getRequest();
    setResponseHeader("Cache-Control", "no-store");
    const originError = learningGenerationOriginError(request);
    if (originError) {
      setResponseStatus(originError.status);
      return { data: null, error: originError.error };
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { data: null, error: "AI is not configured" };
    if (signal.aborted) return { data: null, error: "Request cancelled." };
    const budgetError = await learningGenerationError("content");
    if (budgetError) return { data: null, error: budgetError };
    if (signal.aborted) return { data: null, error: "Request cancelled." };

    const count = data.count ?? 3;
    const vocabLine = data.userVocabWords?.length
      ? `\nThe learner knows these personal vocabulary words — use as many as you can: ${data.userVocabWords.slice(0, 10).join(", ")}.`
      : "";

    const userMsg = `Generate ${count} translation drill exercises for ${data.language} learners practicing this grammar pattern:

Pattern: ${data.patternName}
Formula: ${data.patternFormula}
${vocabLine}

Each exercise: an English sentence → the correct ${data.language} translation → a structural hint.
Return the exercises via the tool.`;

    try {
      const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
      const response = await client.messages.create(
        {
          model: "claude-haiku-5-5",
          max_tokens: 850,
          system: SYSTEM,
          messages: [{ role: "user", content: userMsg }],
          tools: [
            {
              name: "return_drill_set",
              description: "Return a set of translation drill exercises for a grammar pattern.",
              input_schema: {
                type: "object" as const,
                properties: {
                  items: {
                    type: "array",
                    minItems: count,
                    maxItems: count,
                    items: {
                      type: "object",
                      properties: {
                        prompt: { type: "string", description: "English sentence to translate." },
                        answer: {
                          type: "string",
                          description: "Correct target-language translation.",
                        },
                        hint: { type: "string", description: "1-sentence structural breakdown." },
                      },
                      required: ["prompt", "answer", "hint"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          ],
          tool_choice: { type: "tool", name: "return_drill_set" },
        },
        { signal },
      );
      signal.throwIfAborted();

      const toolUse = response.content.find(
        (c) => c.type === "tool_use" && c.name === "return_drill_set",
      );
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No drill returned." };
      }
      const parsed = z
        .object({
          items: z
            .array(
              z.object({
                prompt: z.string().trim().min(1).max(1200),
                answer: z.string().trim().min(1).max(1200),
                hint: z.string().trim().min(1).max(600),
              }),
            )
            .length(count),
        })
        .safeParse(toolUse.input);
      if (!parsed.success) return { data: null, error: "Drill content came back incomplete." };

      return {
        data: { items: parsed.data.items, patternId: data.patternId },
        error: null,
      };
    } catch {
      console.error("Pattern drill generation failed");
      return { data: null, error: "Generation failed." };
    }
  });
