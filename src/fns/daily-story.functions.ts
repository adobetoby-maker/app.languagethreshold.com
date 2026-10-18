import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { usageReceipt } from "@/lib/usage-cost";
import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import type { Language, NativeLanguage } from "@/state/app-state";

const InputSchema = z.object({
  language: z.string().min(1).max(40),
  level: z.string().min(1).max(40),
  vocabWords: z.array(z.string().max(80)).max(10),
  patternName: z.string().max(80),
  patternFormula: z.string().max(200),
  moduleId: z.string().max(80).nullable().optional(),
  nativeLanguage: z.string().min(1).max(40).optional(),
});

export interface DailyStoryData {
  story: string; // 4-6 sentence story in target language
  vocabHighlights: string[]; // which vocab words appear in the story
  comprehensionQ: string; // question in the learner's native language
  correctAnswer: string; // expected answer phrase (lenient match)
  translation: string; // native-language translation of the story
}

const storyTextKey = (text: string) => text.normalize("NFC").toLowerCase();
const StorySchema = z
  .object({
    story: z.string().trim().min(1).max(6000),
    vocabHighlights: z.array(z.string().trim().min(1).max(80)).max(10),
    comprehensionQ: z.string().trim().min(1).max(1000),
    correctAnswer: z.string().trim().min(1).max(500),
    translation: z.string().trim().min(1).max(6000),
  })
  .refine(({ story, vocabHighlights, correctAnswer }) => {
    const source = storyTextKey(story);
    return (
      source.includes(storyTextKey(correctAnswer)) &&
      new Set(vocabHighlights.map(storyTextKey)).size === vocabHighlights.length &&
      vocabHighlights.every((word) => source.includes(storyTextKey(word)))
    );
  });

export const generateDailyStory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ error: string | null; data: DailyStoryData | null }> => {
    const request = getRequest();
    setResponseHeader("Cache-Control", "no-store");
    const originError = learningGenerationOriginError(request);
    if (originError) {
      setResponseStatus(originError.status);
      return { data: null, error: originError.error };
    }
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { error: "AI not configured", data: null };

    const budgetError = await learningGenerationError("content");
    if (budgetError) return { data: null, error: budgetError };
    const nativeLanguage = (data.nativeLanguage ?? "English") as NativeLanguage;

    const vocabClause = data.vocabWords.length
      ? `Weave these learner vocab words naturally into the story (use 2-3 of them): ${data.vocabWords.join(", ")}.`
      : "";

    const module = getModule(data.moduleId);
    const moduleClause =
      module && moduleSupportsLearningPair(module, data.language as Language, nativeLanguage)
        ? `Set this story in a realistic ${module.name} situation. The learner's role is ${module.userRole}. Draw naturally on these themes: ${module.vocabFocus.slice(0, 6).join(", ")}. A possible situation is: ${module.challengePrompts[Math.floor(Math.random() * module.challengePrompts.length)] ?? module.blurb}. Keep it a story, not an instruction manual, and do not present trade or safety specifications as universal facts.`
        : "Use an everyday situation that fits the learner's level.";

    const grammarClause =
      data.patternName && data.patternFormula
        ? `Use the grammar pattern "${data.patternName}" (${data.patternFormula}) at least once.`
        : "Use natural, clear grammar appropriate for the learner's level.";
    const prompt = `Write a short ${data.language} story for a ${data.level} learner.
Requirements:
- 4 to 6 sentences in ${data.language}, simple and clear
- The learner's native language is ${nativeLanguage}. Write the comprehension question and full-story translation in ${nativeLanguage}; the answer must be in ${data.language}.
- Use idiomatic ${data.language} a local speaker would use; check noun gender, agreement, and word choice before returning the story
- Keep the scene realistic and avoid invented product names, offers, or details that do not help the learner practice
- ${grammarClause}
${vocabClause}
- ${moduleClause}
- Return via the story_output tool only`;

    try {
      const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
      const response = await client.messages.create(
        {
          model: "claude-haiku-5-5",
          max_tokens: 1100,
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
                    description: `One short comprehension question in ${nativeLanguage} about the story.`,
                  },
                  correctAnswer: {
                    type: "string",
                    description: `A key word or short phrase from the story (in ${data.language}) that correctly answers the question.`,
                  },
                  translation: {
                    type: "string",
                    description: `Plain ${nativeLanguage} translation of the full story.`,
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
        },
        { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
      );

      setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
      const toolUse = response.content.find(
        (c) => c.type === "tool_use" && c.name === "story_output",
      );
      if (!toolUse || toolUse.type !== "tool_use") {
        return { error: "No story generated.", data: null };
      }
      const parsed = StorySchema.safeParse(toolUse.input);
      if (!parsed.success)
        return { data: null, error: "Story content came back incomplete. Please try again." };
      return { error: null, data: parsed.data };
    } catch {
      console.error("Daily story generation failed");
      return { error: "Story generation failed.", data: null };
    }
  });
