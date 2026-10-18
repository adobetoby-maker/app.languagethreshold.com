// Built by TAC — 2026-10-15
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { HANDWRITING_READ_LANGUAGES } from "@/lib/handwriting-check";
import { learningGenerationError } from "@/lib/learning-generation-server";

// Reads a short handwritten word or phrase for the Core 30 "Write it" practice mode. This is
// separate from handwriting-recognize.functions.ts (Character Studio, single kanji/hanzi with
// readings): here the answer is plain text, in any script the lesson kit teaches.

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(500_000),
  language: z.enum(HANDWRITING_READ_LANGUAGES),
  // Optional hint only. It never replaces what is written.
  expected: z.string().max(200).optional(),
});

export interface HandwritingReadResult {
  /** The handwriting transcribed literally; null when nothing legible was found. */
  text: string | null;
  error: string | null;
}

const SYSTEM =
  "You transcribe handwriting from images for a language-learning app. Transcribe exactly what is written, " +
  "letter for letter, in the language and script it is written in. Never correct spelling, never add " +
  "missing accents or marks, never complete or replace a word, and never translate. If the writer made a " +
  "mistake, transcribe the mistake. Ignore ruled lines, faint guide text and smudges. If nothing legible is " +
  "written, return an empty string. Always respond using the transcribe_handwriting tool.";

const TOOL = {
  name: "transcribe_handwriting",
  description: "Return the handwritten text exactly as it appears in the image",
  input_schema: {
    type: "object" as const,
    properties: {
      text: {
        type: "string",
        description:
          "The handwritten word or phrase, transcribed literally with no autocorrection. Empty string if nothing legible.",
      },
    },
    required: ["text"],
    additionalProperties: false,
  },
};

export const readHandwriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<HandwritingReadResult> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { text: null, error: "AI is not configured" };
    const budgetError = await learningGenerationError("handwriting");
    if (budgetError) return { text: null, error: budgetError };

    const hint = data.expected?.trim()
      ? ` The writer may have been trying to write "${data.expected.trim()}". Use that only to decide between letters that look alike; if the ink clearly shows something else, transcribe the ink.`
      : "";

    try {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 256,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/png", data: data.imageBase64 },
              },
              {
                type: "text",
                text: `Transcribe the ${data.language} handwriting in this image exactly as written.${hint} Use the transcribe_handwriting tool.`,
              },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
      });

      const toolUse = response.content.find((block) => block.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { text: null, error: "Could not read the handwriting" };
      }
      const text = (toolUse.input as { text?: unknown }).text;
      if (typeof text !== "string") return { text: null, error: "Could not read the handwriting" };
      const trimmed = text.trim().slice(0, 300);
      return { text: trimmed === "" ? null : trimmed, error: null };
    } catch {
      return { text: null, error: "Handwriting reading failed" };
    }
  });
