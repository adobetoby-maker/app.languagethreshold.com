import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
});

/**
 * A single segment of the analyzed Korean sentence.
 *  - `base`   : the original characters (one Hangul syllable, a punctuation chunk, etc.)
 *  - `romaja` : Revised Romanization (RR) of the syllable (only for Hangul segments)
 *
 * Concatenating every `base` in order MUST equal the original input verbatim.
 */
export interface RomajaSegment {
  base: string;
  romaja?: string;
}

export interface RomajaResult {
  segments: RomajaSegment[];
}

const HANGUL_SYL_RE = /[가-힯]/;

const SYSTEM = `You are a precise Korean reading-aid generator. You split a Korean sentence into segments and add Revised Romanization (RR) for EACH INDIVIDUAL Hangul syllable block.

Rules — follow EXACTLY:
1. Split the sentence into ordered segments. Each Hangul syllable block (한, 글, 사, etc.) is its OWN segment with its OWN romaja reading. Even when two or more syllables form a word (e.g. 한국, 사람), emit ONE segment per syllable so the reading sits directly above each character.
   - Example: 한국 → [{base:"한", romaja:"han"}, {base:"국", romaja:"guk"}]
   - Example: 안녕하세요 → [{base:"안", romaja:"an"}, {base:"녕", romaja:"nyeong"}, {base:"하", romaja:"ha"}, {base:"세", romaja:"se"}, {base:"요", romaja:"yo"}]
2. Punctuation, numbers, Latin letters, spaces, and any non-Hangul are segments WITHOUT readings — leave romaja undefined. Group consecutive non-Hangul characters into ONE segment.
3. Use Revised Romanization (RR) of Korean — the official South Korean standard. Apply CONTEXTUAL pronunciation rules (linking, assimilation, tensification) as actually pronounced in the word, not letter-by-letter transliteration.
   - 한국말 → han / gung / mal (ㄱ becomes 'g' after ㄴ-linking; second 국 reads as 'gung')
   - 같이 → ga / chi (palatalization)
   - 십니다 → sim / ni / da (ㅂ→m before ㄴ)
4. Concatenating every "base" in order must reproduce the input EXACTLY — same characters, same order, same punctuation, same spaces.
5. Use only basic Latin letters a-z. No diacritics, no IPA. Standard RR digraphs: eo, eu, ae, oe, ui, ya, yo, yu, ye, wa, wae, wo, we, wi, ja, jeo, ji, cha, kk, tt, pp, ss, jj, ng.

Always respond by calling the provided tool.`;

export const addRomaja = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data }): Promise<{ data: RomajaResult | null; error: string | null }> => {
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (!KEY) return { data: null, error: "AI is not configured" };

    // Fast path: no Hangul → nothing to analyze. One plain segment.
    if (!HANGUL_SYL_RE.test(data.text)) {
      return { data: { segments: [{ base: data.text }] }, error: null };
    }

    try {
      const client = new Anthropic({ apiKey: KEY });
      const response = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 1400,
        system: SYSTEM,
        messages: [{ role: "user", content: `Analyze this Korean sentence:\n\n${data.text}` }],
        tools: [
          {
            name: "return_romaja",
            description:
              "Return ordered segments of the sentence with Revised Romanization on each Hangul syllable.",
            input_schema: {
              type: "object" as const,
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      base: { type: "string" },
                      romaja: { type: "string" },
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
        tool_choice: { type: "tool", name: "return_romaja" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No romaja returned." };
      }
      const parsed = toolUse.input as RomajaResult;
      if (!Array.isArray(parsed.segments)) {
        return { data: null, error: "Invalid romaja response." };
      }
      return { data: parsed, error: null };
    } catch (e) {
      console.error("addRomaja failed", e);
      return { data: null, error: "Romaja request failed." };
    }
  });
