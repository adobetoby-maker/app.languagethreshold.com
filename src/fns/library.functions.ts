import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { learningGenerationError } from "@/lib/learning-generation-server";

const TranslateInput = z.object({
  text: z.string().min(10).max(8000),
  title: z.string().min(1).max(120),
  targetLanguage: z.string().min(1).max(40),
  nativeLanguage: z.string().min(1).max(40).optional(),
});

export interface TranslatedText {
  detectedLanguage: string;
  title: string;
  leftPaneText: string[]; // Native language
  rightPaneText: string[]; // Target language
}

const CultureInput = z.object({
  country: z.string().min(1).max(60),
  targetLanguage: z.string().min(1).max(40),
  nativeLanguage: z.string().min(1).max(40).optional(),
});

export interface CultureEssay {
  countryName: string;
  targetLanguageText: string[];
  englishText: string[]; // Native-language text (kept name for back-compat)
}

// Haiku 5.5 sometimes returns an array field as a JSON-encoded string
// ("[\"...\"]"); decode those so callers always get the declared array.
function decodeStringifiedArrays(input: unknown, parameters: Record<string, unknown>): unknown {
  const properties = parameters.properties as Record<string, { type?: string }> | undefined;
  if (!properties || !input || typeof input !== "object") return input;
  const decoded: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  for (const [key, schema] of Object.entries(properties)) {
    const value = decoded[key];
    if (schema?.type !== "array" || typeof value !== "string") continue;
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) decoded[key] = parsed;
    } catch {
      // leave the value as returned
    }
  }
  return decoded;
}

async function callTool<T>(
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  parameters: Record<string, unknown>,
  model = "claude-haiku-5-5",
): Promise<{ data: T | null; error: string | null }> {
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { data: null, error: "AI is not configured" };

  try {
    const client = new Anthropic({ apiKey: KEY });
    const response = await client.messages.create({
      model,
      max_tokens: 5600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: toolName,
          description: "Return structured result.",
          input_schema: {
            type: "object" as const,
            ...(parameters as object),
          },
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { data: null, error: "No structured result returned." };
    }
    return { data: decodeStringifiedArrays(toolUse.input, parameters) as T, error: null };
  } catch (e) {
    console.error("callTool failed", e);
    return { data: null, error: "Request failed." };
  }
}

const sentenceArraySchema = {
  type: "array",
  items: { type: "string" },
  minItems: 1,
  maxItems: 80,
};

export const translateCustomText = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => TranslateInput.parse(i))
  .handler(async ({ data }) => {
    const native = data.nativeLanguage ?? "English";
    const system =
      "You are a professional literary translator. Always respond by calling the provided tool. Split text into clean, aligned sentences so each native-language sentence pairs index-by-index with its translation.";
    const user = `Here is a text titled "${data.title}":\n\n${data.text}\n\nDetect the source language. Produce a ${native} version (leftPaneText) and a ${data.targetLanguage} version (rightPaneText). Both arrays must have the SAME length so each index pairs together. Keep sentences short and natural.`;
    return callTool<TranslatedText>(system, user, "return_translation", {
      type: "object",
      properties: {
        detectedLanguage: { type: "string" },
        title: { type: "string" },
        leftPaneText: sentenceArraySchema,
        rightPaneText: sentenceArraySchema,
      },
      required: ["detectedLanguage", "title", "leftPaneText", "rightPaneText"],
      additionalProperties: false,
    });
  });

export const generateCultureEssay = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CultureInput.parse(i))
  .handler(async ({ data }) => {
    const budgetError = await learningGenerationError();
    if (budgetError) return { data: null, error: budgetError };
    const native = data.nativeLanguage ?? "English";
    const system =
      "You are a warm, vivid cultural essayist and translator. Always respond by calling the provided tool. Sentences must align index-by-index between the two languages.";
    const user = `Write a ~400-word essay IN ${data.targetLanguage} about ${data.country}, covering geography, culture, food, famous landmarks, and daily life. Make it warm, vivid, and educational. Then provide a ${native} translation (use the field name "englishText" for the ${native} version). Both arrays MUST have the same length so each index pairs together.`;
    return callTool<CultureEssay>(system, user, "return_culture_essay", {
      type: "object",
      properties: {
        countryName: { type: "string" },
        targetLanguageText: sentenceArraySchema,
        englishText: sentenceArraySchema,
      },
      required: ["countryName", "targetLanguageText", "englishText"],
      additionalProperties: false,
    });
  });
