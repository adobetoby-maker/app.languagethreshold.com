import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getModule, moduleSupportsLanguage } from "@/data/modules";

const InputSchema = z.object({
  language: z.string().min(1).max(40),
  level: z.string().min(1).max(40),
  vocabWords: z.array(z.string().max(80)).max(10),
  patternName: z.string().max(80),
  patternFormula: z.string().max(200),
  moduleId: z.string().max(80).nullable().optional(),
});

export interface DailyStoryData {
  story: string; // 4-6 sentence story in target language
  vocabHighlights: string[]; // which vocab words appear in the story
  comprehensionQ: string; // question in English
  correctAnswer: string; // expected answer phrase (lenient match)
  translation: string; // English translation of the story
}

export const generateDailyStory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ error: string | null; data: DailyStoryData | null }> => {
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { error: "AI not configured", data: null };

    const client = new Anthropic({ apiKey: KEY });

    const vocabClause = data.vocabWords.length
      ? `Weave these learner vocab words naturally into the story (use 2-3 of them): ${data.vocabWords.join(", ")}.`
      : "";

    const module = getModule(data.moduleId);
    const moduleClause =
      module &&
      moduleSupportsLanguage(module, data.language as Parameters<typeof moduleSupportsLanguage>[1])
        ? `Set this story in a realistic ${module.name} situation. The learner's role is ${module.userRole}. Draw naturally on these themes: ${module.vocabFocus.slice(0, 6).join(", ")}. A possible situation is: ${module.challengePrompts[Math.floor(Math.random() * module.challengePrompts.length)] ?? module.blurb}. Keep it a story, not an instruction manual, and do not present trade or safety specifications as universal facts.`
        : "Use an everyday situation that fits the learner's level.";

    const prompt = `Write a short ${data.language} story for a ${data.level} learner.
Requirements:
- 4 to 6 sentences in ${data.language}, simple and clear
- Use the grammar pattern "${data.patternName}" (${data.patternFormula}) at least once
${vocabClause}
- ${moduleClause}
- Return via the story_output tool only`;

    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        system: `You create short, engaging language-learning stories. Always respond via the story_output tool.`,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            name: "story_output",
            description: "Output the story and its comprehension exercise.",
            input_schema: {
              type: "object" as const,
              properties: {
                story: {
                  type: "string",
                  description: `The 4-6 sentence story in ${data.language}.`,
                },
                vocabHighlights: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Which of the learner's vocab words appear in the story (exact forms used).",
                },
                comprehensionQ: {
                  type: "string",
                  description: "One short comprehension question in English about the story.",
                },
                correctAnswer: {
                  type: "string",
                  description: `A key word or short phrase from the story (in ${data.language}) that correctly answers the question.`,
                },
                translation: {
                  type: "string",
                  description: "Plain English translation of the full story.",
                },
              },
              required: [
                "story",
                "vocabHighlights",
                "comprehensionQ",
                "correctAnswer",
                "translation",
              ],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "story_output" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { error: "No story generated.", data: null };
      }
      return { error: null, data: toolUse.input as DailyStoryData };
    } catch (e) {
      console.error("Daily story error:", e);
      return { error: "Story generation failed.", data: null };
    }
  });
