import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
});

/**
 * A single segment of the analyzed sentence — the Chinese mirror of
 * FuriganaSegment.
 *  - `base`   : the original characters (one hanzi, or a run of non-hanzi)
 *  - `pinyin` : toned pinyin for that hanzi (only present for hanzi segments)
 *
 * Concatenating every `base` in order MUST equal the original input verbatim.
 */
export interface PinyinSegment {
  base: string;
  pinyin?: string;
}

export interface PinyinResult {
  segments: PinyinSegment[];
}

const SYSTEM = `You are a precise Mandarin Chinese reading-aid generator. You split a Chinese sentence into segments and add pinyin for EACH INDIVIDUAL hanzi character.

Rules — follow EXACTLY:
1. Split the sentence into ordered segments. Each hanzi character is its OWN segment with its OWN pinyin. Even when characters form a compound word (e.g. 学生, 医院, 打电话), emit ONE segment per hanzi so the reading sits directly above each character.
   - Example: 学生 → [{base:"学", pinyin:"xué"}, {base:"生", pinyin:"shēng"}]
   - Example: 我去医院。 → [{base:"我", pinyin:"wǒ"}, {base:"去", pinyin:"qù"}, {base:"医", pinyin:"yī"}, {base:"院", pinyin:"yuàn"}, {base:"。"}]
2. Punctuation, numbers, Latin letters, and spaces are segments WITHOUT pinyin — leave the pinyin field empty/undefined. Group consecutive non-hanzi characters into ONE segment.
3. Write pinyin with TONE DIACRITICS, lowercase: mā má mǎ mà ma. Never use tone numbers (ma1), never use "v" for ü — write ǖ ǘ ǚ ǜ or plain ü as appropriate (e.g. 女 → "nǚ", 绿 → "lǜ").
4. Polyphonic characters (多音字) MUST use the reading that is correct IN THIS CONTEXT:
   - 行: "xíng" (to go / OK) vs "háng" (row, profession — 银行 yínháng)
   - 了: "le" (aspect particle) vs "liǎo" (to finish — 了解 liǎojiě)
   - 长: "cháng" (long) vs "zhǎng" (to grow, elder)
   - 还: "hái" (still) vs "huán" (to return something)
   - 得: "de" (structural particle) vs "děi" (must) vs "dé" (to obtain)
   - 重: "zhòng" (heavy) vs "chóng" (again)
   - 觉: "jué" (to feel — 觉得) vs "jiào" (sleep — 睡觉)
   - 银行 is "yín háng", 不行 is "bù xíng".
5. Neutral-tone particles and suffixes take no tone mark: 吗 "ma", 呢 "ne", 吧 "ba", 的 "de", 地 "de", 得 "de", 了 "le", 子 in 儿子 "zi", 们 "men".
6. Write the CITATION tone for 不 and 一 (不 "bù", 一 "yī") rather than the sandhi-shifted tone, so learners see the dictionary form.
7. Concatenating every "base" in order must reproduce the input EXACTLY — same characters, same order, same punctuation, same spaces.

Always respond by calling the provided tool.`;

export const addPinyin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data }): Promise<{ data: PinyinResult | null; error: string | null }> => {
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { data: null, error: "AI is not configured" };

    // Fast path: no hanzi → nothing to analyze. One plain segment.
    if (!/[一-鿿]/.test(data.text)) {
      return { data: { segments: [{ base: data.text }] }, error: null };
    }

    try {
      const client = new Anthropic({ apiKey: KEY });
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: `Analyze this Chinese sentence:\n\n${data.text}` }],
        tools: [
          {
            name: "return_pinyin",
            description:
              "Return ordered segments of the sentence with toned pinyin on each hanzi character.",
            input_schema: {
              type: "object" as const,
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      base: { type: "string" },
                      pinyin: { type: "string" },
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
        tool_choice: { type: "tool", name: "return_pinyin" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No pinyin returned." };
      }
      const parsed = toolUse.input as PinyinResult;
      if (!Array.isArray(parsed.segments)) {
        return { data: null, error: "Invalid pinyin response." };
      }
      return { data: parsed, error: null };
    } catch (e) {
      console.error("addPinyin failed", e);
      return { data: null, error: "Pinyin request failed." };
    }
  });
