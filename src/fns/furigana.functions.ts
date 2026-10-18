import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { validReadingHints } from "@/lib/reading-hint-cache";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
});

/**
 * A single segment of the analyzed sentence.
 *  - `base`     : the original characters (kanji compound, kana run, punctuation, etc.)
 *  - `hiragana` : hiragana reading (only present for kanji segments)
 *  - `romaji`   : Hepburn romanization (only present for kanji segments)
 *
 * Concatenating every `base` in order MUST equal the original input verbatim.
 */
export interface FuriganaSegment {
  base: string;
  hiragana?: string;
  romaji?: string;
}

export interface FuriganaResult {
  segments: FuriganaSegment[];
}

const SYSTEM = `You are a precise Japanese reading-aid generator. You split a Japanese sentence into segments and add furigana (hiragana reading) AND romaji (Hepburn romanization) for EACH INDIVIDUAL kanji character.

Rules — follow EXACTLY:
1. Split the sentence into ordered segments. Each kanji character is its OWN segment with its OWN hiragana + romaji reading. Even when two or more kanji form a compound word (e.g. 学生, 小村, 飛行機), emit ONE segment per kanji so the reading sits directly above each character.
   - Example: 学生 → [{base:"学", hiragana:"がく", romaji:"gaku"}, {base:"生", hiragana:"せい", romaji:"sei"}]
   - Example: 小さな村 → [{base:"小", hiragana:"ちい", romaji:"chii"}, {base:"さな"}, {base:"村", hiragana:"むら", romaji:"mura"}]
2. Hiragana, katakana, punctuation, numbers, Latin letters, and spaces are segments WITHOUT readings — leave hiragana/romaji fields empty/undefined. Group consecutive non-kanji characters into ONE segment.
3. Use modern, contextually correct readings. Pick the reading each kanji actually contributes inside the word, in context. For inflected verbs like 行きます, the kanji segment is "行" with reading "い" (romaji "i"), and "きます" is a separate kana segment.
4. Concatenating every "base" in order must reproduce the input EXACTLY — same characters, same order, same punctuation, same spaces.
5. Use Hepburn romaji (し→"shi", つ→"tsu", を→"wo", ち→"chi", づ→"zu", じ→"ji"). Long vowels: write the underlying kana (とう→"tou", おお→"oo"). No macrons.

Always respond by calling the provided tool.`;

export const addFurigana = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data }): Promise<{ data: FuriganaResult | null; error: string | null }> => {
    const request = getRequest();
    setResponseHeader("Cache-Control", "no-store");
    const originError = learningGenerationOriginError(request);
    if (originError) {
      setResponseStatus(originError.status);
      return { data: null, error: originError.error };
    }

    // Fast path: no kanji → nothing to analyze. One plain segment.
    if (!/[一-鿿]/.test(data.text)) {
      return { data: { segments: [{ base: data.text }] }, error: null };
    }

    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { data: null, error: "AI is not configured" };
    const budgetError = await learningGenerationError("lookup");
    if (budgetError) return { data: null, error: budgetError };

    try {
      const client = new Anthropic({ apiKey: KEY, timeout: 30_000, maxRetries: 0 });
      const response = await client.messages.create(
        {
          model: "claude-haiku-5-5",
          max_tokens: 1400,
          system: SYSTEM,
          messages: [{ role: "user", content: `Analyze this Japanese sentence:\n\n${data.text}` }],
          tools: [
            {
              name: "return_furigana",
              description:
                "Return ordered segments of the sentence with hiragana + romaji on each kanji character.",
              input_schema: {
                type: "object" as const,
                properties: {
                  segments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        base: { type: "string" },
                        hiragana: { type: "string" },
                        romaji: { type: "string" },
                      },
                      required: ["base"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["segments"],
                additionalProperties: false,
              },
            },
          ],
          tool_choice: { type: "tool", name: "return_furigana" },
        },
        { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
      );

      const toolUse = response.content.find(
        (c) => c.type === "tool_use" && c.name === "return_furigana",
      );
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No furigana returned." };
      }
      const segments = (toolUse.input as { segments?: unknown } | null)?.segments;
      if (!validReadingHints(segments, "furigana", data.text)) {
        return { data: null, error: "Invalid furigana response." };
      }
      return { data: { segments }, error: null };
    } catch {
      console.error("addFurigana provider request failed");
      return { data: null, error: "Furigana request failed." };
    }
  });
