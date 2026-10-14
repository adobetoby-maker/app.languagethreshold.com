import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const Input = z.object({
  language: z.string().min(1).max(40),
  round: z.number().int().min(1).max(99),
  cefr: z.enum(CEFR),
  avoid: z.array(z.string().min(1).max(80)).max(20).optional(),
});

export interface BattleWord {
  word: string;
  correctDefinition: string;
  wrongDefinitions: string[]; // exactly 3
}

export const generateBattleWord = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }): Promise<{ data: BattleWord | null; error: string | null }> => {
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { data: null, error: "AI is not configured" };

    const avoidLine =
      data.avoid && data.avoid.length
        ? ` Do NOT pick any of these already-used words: ${data.avoid.join(", ")}.`
        : "";

    const system =
      "You write vocabulary battle rounds for a competitive language learning game. " +
      "Always respond by calling the provided tool. All definitions are in English. " +
      "Make wrong definitions plausible — same part of speech, same general semantic field — but clearly incorrect on close reading.";

    const user = `Generate ONE ${data.language} vocabulary battle word for round ${data.round} at CEFR level ${data.cefr}.${avoidLine} Return: the word in its native script (with diacritics), the correct English definition, and exactly 3 plausible-but-wrong English definitions.`;

    try {
      const client = new Anthropic({ apiKey: KEY });
      const response = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 384,
        system,
        messages: [{ role: "user", content: user }],
        tools: [
          {
            name: "return_battle_word",
            description: "Return one vocabulary battle word.",
            input_schema: {
              type: "object" as const,
              properties: {
                word: { type: "string" },
                correctDefinition: { type: "string" },
                wrongDefinitions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "string" },
                },
              },
              required: ["word", "correctDefinition", "wrongDefinitions"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_battle_word" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No structured result returned." };
      }
      return { data: toolUse.input as BattleWord, error: null };
    } catch (e) {
      console.error("generateBattleWord failed", e);
      return { data: null, error: "Request failed." };
    }
  });
