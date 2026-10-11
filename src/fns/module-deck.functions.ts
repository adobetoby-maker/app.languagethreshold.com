import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurriculum } from "@/data/curriculum";
import { getModule } from "@/data/modules";

const Input = z.object({
  moduleId: z.string().min(1).max(80),
  language: z.enum([
    "Spanish",
    "French",
    "German",
    "Italian",
    "Japanese",
    "Chinese",
    "Korean",
    "Portuguese",
    "Pashto",
    "English",
  ]),
});

export interface ModuleDeckPair {
  english: string;
  translation: string;
  kind: "term" | "phrase";
}

export const generateModuleDeck = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ pairs: ModuleDeckPair[] | null; error: string | null }> => {
    const module = getModule(data.moduleId);
    if (!module) return { pairs: null, error: "Unknown module" };
    if (
      module.learnDirection === "en-target"
        ? data.language !== "English"
        : data.language === "English" ||
          (module.languages && !module.languages.includes(data.language))
    ) {
      return { pairs: null, error: "This language is not available for this module" };
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { pairs: null, error: "AI is not configured" };

    const curriculum = getCurriculum(module.id);
    try {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 6000,
        system: `You create practical bilingual flashcards for language learners. Return 20 distinct field terms and 20 short things the learner would actually say in the field. Translate every card naturally into the requested target language. Keep English and target text paired exactly. Phrases should be learner utterances, not instructions about what to practice. Cover the full range of provided lesson themes, not only the first lesson. For medical or safety topics, teach communication and verification, never an unsupported procedure, dose, measurement, or universal specification. Avoid stereotypes and culturally insensitive assumptions. Return only the requested tool data.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              module: module.name,
              targetLanguage: data.language,
              learnerRole: module.userRole,
              description: module.blurb,
              vocabulary: module.vocabFocus,
              scenarios: module.challengePrompts,
              lessonThemes:
                curriculum?.lessons.map((lesson) => `${lesson.title}: ${lesson.objective}`) ?? [],
            }),
          },
        ],
        tools: [
          {
            name: "return_cards",
            description: "Return bilingual field vocabulary and utterances",
            input_schema: {
              type: "object" as const,
              properties: {
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      english: { type: "string" },
                      translation: { type: "string" },
                      kind: { type: "string", enum: ["term", "phrase"] },
                    },
                    required: ["english", "translation", "kind"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["cards"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_cards" },
      });
      const tool = response.content.find((item) => item.type === "tool_use");
      if (!tool || tool.type !== "tool_use")
        return { pairs: null, error: "Card generation failed" };
      const raw = (tool.input as { cards?: ModuleDeckPair[] }).cards ?? [];
      const seen = new Set<string>();
      const pairs = raw
        .filter((pair) => {
          const english = pair?.english?.trim();
          const translation = pair?.translation?.trim();
          const id = english?.toLocaleLowerCase("en");
          if (
            !english ||
            !translation ||
            english.length > 180 ||
            translation.length > 240 ||
            (pair.kind !== "term" && pair.kind !== "phrase") ||
            !id ||
            seen.has(id) ||
            translation.toLocaleLowerCase() === data.language.toLocaleLowerCase()
          )
            return false;
          seen.add(id);
          return true;
        })
        .slice(0, 40);
      const terms = pairs.filter((pair) => pair.kind === "term").length;
      const phrases = pairs.filter((pair) => pair.kind === "phrase").length;
      if (terms < 16 || phrases < 16) {
        return { pairs: null, error: "Could not create enough field cards" };
      }
      return { pairs, error: null };
    } catch (error) {
      console.error("generateModuleDeck failed", error);
      return { pairs: null, error: "Card generation failed" };
    }
  });
