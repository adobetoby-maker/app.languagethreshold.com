import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { UserVocabItem } from "@/state/app-state";

const QUESTIONS = [
  "What is your job or profession?",
  "What city and country are you from?",
  "What are your top hobbies or interests?",
  "Describe your family briefly.",
  "What topics do you most want to talk about in your target language?",
];

export { QUESTIONS as VOCAB_QUESTIONS };

const Input = z.object({
  language: z.string().min(1).max(40),
  answers: z.array(z.string().min(1).max(300)).min(1).max(5),
  avoid: z.array(z.string().min(1).max(80)).max(50).optional(), // already-known words
  count: z.number().min(5).max(30).optional(), // how many to generate (default 25)
});

const SYSTEM = `You are a vocabulary curator for a language learning app. A learner has told you about their life. Your job is to generate a personalized list of vocabulary words in their target language that directly reflect their life: their job, hobbies, family, location, and goals.

Rules:
1. Generate exactly 25 vocabulary items.
2. Every word must be directly relevant to what the learner wrote — no generic filler.
3. Spread across categories: job (8 words), hobby (6 words), family (4 words), place (4 words), topic (3 words).
4. Each item: { word (target language), translation (English), category }.
5. Words should be practical: nouns, verbs, and key phrases the learner will use in real conversation.
6. For Japanese, use kanji+kana. For Korean, use Hangul. No romanization in the word field.
7. Always respond by calling the provided tool.`;

export const buildPersonalVocab = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }): Promise<{ vocab: UserVocabItem[] | null; error: string | null }> => {
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { vocab: null, error: "AI is not configured" };

    const count = data.count ?? 25;
    const questionLines = QUESTIONS.slice(0, data.answers.length)
      .map((q, i) => `${i + 1}. ${q}\n   Answer: ${data.answers[i]}`)
      .join("\n");
    const avoidLine =
      data.avoid && data.avoid.length
        ? `\nDo NOT include any of these already-known words: ${data.avoid.join(", ")}.`
        : "";

    const userMsg = `Generate a personal vocabulary list in ${data.language} for this learner:\n\n${questionLines}${avoidLine}\n\nReturn exactly ${count} items via the tool.`;

    try {
      const client = new Anthropic({ apiKey: KEY });
      const response = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 1700,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
        tools: [
          {
            name: "return_vocab_list",
            description: "Return a personalized vocabulary list.",
            input_schema: {
              type: "object" as const,
              properties: {
                items: {
                  type: "array",
                  minItems: 20,
                  maxItems: 30,
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      translation: { type: "string" },
                      category: {
                        type: "string",
                        enum: ["job", "hobby", "family", "place", "topic"],
                      },
                    },
                    required: ["word", "translation", "category"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_vocab_list" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { vocab: null, error: "No vocab returned." };
      }
      const { items } = toolUse.input as { items: UserVocabItem[] };
      return { vocab: items, error: null };
    } catch (err) {
      return { vocab: null, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
