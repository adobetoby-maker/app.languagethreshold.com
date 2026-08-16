import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// No default. A missed call site must fail loudly rather than silently receive
// Japanese-shaped treatment for a different script — see founder note in
// .foreman/ledger.md (P2).
const SupportedLanguageSchema = z.enum(["Japanese", "Chinese"]);
export type HandwritingLanguage = z.infer<typeof SupportedLanguageSchema>;

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(500_000),
  language: SupportedLanguageSchema,
});

export interface HandwritingResult {
  text: string;
  reading: string;
  meaning: string;
  // Chinese-only. Optional so existing consumers (e.g. Japanese results) keep compiling.
  scriptVariant?: "simplified" | "traditional";
}

// ─── Japanese ─────────────────────────────────────────────────────────────
// Deliberately NOT shared with the Chinese constants below. Each prompt/tool
// pair must be editable on its own without touching the other language.

const JAPANESE_SYSTEM =
  "You are a Japanese language expert. Identify handwritten Japanese characters from images. Always respond using the identify_character tool.";

const JAPANESE_USER_TEXT =
  "Identify the Japanese character(s) drawn in this image. If multiple characters are visible, identify the most prominent one. Use the identify_character tool.";

const JAPANESE_TOOL = {
  name: "identify_character",
  description: "Return the identified Japanese character with its reading and meaning",
  input_schema: {
    type: "object" as const,
    properties: {
      text: {
        type: "string",
        description: "The character(s) in Japanese script (kanji/kana)",
      },
      reading: { type: "string", description: "Hiragana reading (e.g. に ほ ん ご)" },
      meaning: { type: "string", description: "English meaning or translation" },
    },
    required: ["text", "reading", "meaning"],
  },
};

// ─── Chinese ──────────────────────────────────────────────────────────────
// Written for Mandarin on its own terms, not a translation of the Japanese
// prompt above. Explicitly forbids kana/Japanese readings, requires pinyin
// with tone diacritics, and asks for simplified-vs-traditional identification.

const CHINESE_SYSTEM =
  "You are a Mandarin Chinese language expert. Identify handwritten Chinese hanzi (汉字/漢字) from images. " +
  "These are Chinese characters, not Japanese — do NOT return Japanese kana, on'yomi, or kun'yomi readings, " +
  "even if the same character shape also exists in the Japanese kanji set. The reading you return must be " +
  "Mandarin Pinyin written with tone diacritics (e.g. nǐ hǎo), never tone numbers (ni3 hao3) and never kana. " +
  "Some characters exist in both Simplified and Traditional Chinese with different or identical forms — " +
  "identify which script variant was actually written and report it. Always respond using the " +
  "identify_chinese_character tool.";

const CHINESE_USER_TEXT =
  "Identify the Chinese hanzi character(s) drawn in this image. If multiple characters are visible, identify " +
  "the most prominent one. Return the Mandarin Pinyin reading with tone diacritics (not tone numbers, not " +
  "kana), the English meaning, and whether the character as written is Simplified or Traditional Chinese. " +
  "Use the identify_chinese_character tool.";

const CHINESE_TOOL = {
  name: "identify_chinese_character",
  description:
    "Return the identified Chinese hanzi character with its Mandarin Pinyin reading (tone diacritics, " +
    "never tone numbers or Japanese kana), English meaning, and script variant (simplified or traditional).",
  input_schema: {
    type: "object" as const,
    properties: {
      text: {
        type: "string",
        description: "The character(s) in Chinese hanzi exactly as drawn — do not convert to a kanji form",
      },
      reading: {
        type: "string",
        description:
          "Mandarin Pinyin romanization with tone diacritics (e.g. nǐ hǎo) — never tone numbers, never kana " +
          "or Japanese on'yomi/kun'yomi readings",
      },
      meaning: { type: "string", description: "English meaning or translation" },
      scriptVariant: {
        type: "string",
        enum: ["simplified", "traditional"],
        description: "Whether the character(s) as written are Simplified or Traditional Chinese",
      },
    },
    required: ["text", "reading", "meaning", "scriptVariant"],
  },
};

export const recognizeHandwriting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(
    async ({ data }): Promise<{ result: HandwritingResult | null; error: string | null }> => {
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { result: null, error: "AI is not configured" };

      const { system, userText, tool } =
        data.language === "Chinese"
          ? { system: CHINESE_SYSTEM, userText: CHINESE_USER_TEXT, tool: CHINESE_TOOL }
          : { system: JAPANESE_SYSTEM, userText: JAPANESE_USER_TEXT, tool: JAPANESE_TOOL };

      try {
        const client = new Anthropic({ apiKey: KEY });
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 256,
          system,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: data.imageBase64,
                  },
                },
                {
                  type: "text",
                  text: userText,
                },
              ],
            },
          ],
          tools: [tool],
          tool_choice: { type: "tool", name: tool.name },
        });

        const toolUse = response.content.find((b) => b.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          return { result: null, error: "Could not identify the character" };
        }

        const input = toolUse.input as HandwritingResult;
        return { result: input, error: null };
      } catch {
        return { result: null, error: "Recognition failed" };
      }
    },
  );
