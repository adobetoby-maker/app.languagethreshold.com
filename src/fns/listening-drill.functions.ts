import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { PublicGameGenerationCache } from "@/lib/game-generation-cache";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";

// Difficulty levels for the Listening Drill game.
// 1 = A2 — 4-7 words, common vocab.
// 2 = B1 — 7-12 words, may include past or future.
// 3 = B2 — 12-18 words, may include subjunctive or relative clauses.
export type ListeningDrillLevel = 1 | 2 | 3;

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  avoid: z.array(z.string().min(1).max(200)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
});

export interface ListeningDrillQuestion {
  phrase: string; // target-language phrase that will be spoken
  englishTranslation: string;
  cefr: CefrLevel;
  topic: string; // 1-3 word topic
  // 4 short candidate texts; one matches `phrase` exactly
  options: string[]; // length 4
  correctIndex: number; // 0..3
  listenFor: string; // 1-sentence English tip on what to listen for
}

const cache = new PublicGameGenerationCache<ListeningDrillQuestion>();

const SYSTEM = `You are a precise listening-drill author for adult language learners. The learner hears a short target-language phrase via TTS and must pick the matching transcript from 4 multiple-choice options. The point of the drill is to train EAR-LEVEL discrimination.

Rules — non-negotiable:
1. "phrase" MUST be a natural, idiomatic, complete sentence in the target language. No textbook stiffness. Aim for something a real speaker would say.
2. The 3 wrong "options" MUST be plausible mishearings of "phrase". They must share rhythm, length, and sound profile with the correct phrase. They are NOT random sentences.
   - Swap a single word for a phonetic neighbor (e.g. "ll" vs "y" in Spanish, "p" vs "b" in Korean, "shi" vs "chi" in Japanese, geminate vs single consonant in Italian).
   - Or swap a particle / article / pronoun.
   - Or change one number, gender, or tense morpheme.
   - Each distractor must sound believable to a learner who half-heard the audio.
3. Every option (correct AND wrong) MUST be a complete, grammatical sentence in the target language. No fragments. No nonsense.
4. The 4 options MUST all be roughly the same length (within +/- 25% character count) so length doesn't betray the answer.
5. "correctIndex" is the index in "options" whose text equals "phrase" EXACTLY. Verify this before responding — character-for-character match including punctuation.
6. For Japanese: "phrase" uses natural kanji+kana mix (not pure hiragana). Options match the same script style.
7. For Korean: natural hangul, including spacing.
8. "listenFor" is ONE short English sentence calling out the discrimination target — what the learner should listen for to tell the options apart. Examples: "ll vs y in Spanish", "geminate consonant /tt/ vs single /t/ in Italian", "rising vs falling intonation marks the question", "particle ga vs wa changes the subject".
9. "topic" is 1-3 words (e.g. "ordering coffee", "weather", "directions").
10. Always respond by calling the provided tool.`;

export const generateListeningDrill = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{
      data: ListeningDrillQuestion | null;
      error: string | null;
      cached?: boolean;
    }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { data: null, error: originError.error };
      }

      const cefr: CefrLevel = data.level === 1 ? "A2" : data.level === 2 ? "B1" : "B2";

      const cacheContext = { ...data, cefr };
      const hit = cache.get(cacheContext);
      if (hit) return { data: hit, error: null, cached: true };
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { data: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("content");
      if (budgetError) return { data: null, error: budgetError };

      const lengthGuidance =
        data.level === 1
          ? "4-7 words, common everyday vocab, present tense."
          : data.level === 2
            ? "7-12 words, may include past or future tense and prepositional phrases."
            : "12-18 words, may include subjunctive, relative clauses, or conditional.";

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nAvoid these recent phrases or topics: ${data.avoid.join(", ")}.`
          : "";

      const topicLine = data.topic
        ? `\nDomain: the phrase MUST be something heard in a "${data.topic}" context — use vocabulary a ${data.topic} practitioner would actually say.`
        : "";

      const userMsg = `Generate ONE ${data.language} listening-drill question at CEFR ${cefr}.\n${lengthGuidance}${topicLine}${avoidLine}\n\nReturn the structured question via the tool.`;

      try {
        const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
        const response = await client.messages.create(
          {
            model: "claude-haiku-5-5",
            max_tokens: 1000,
            system: SYSTEM,
            messages: [{ role: "user", content: userMsg }],
            tools: [
              {
                name: "return_listening_question",
                description: "Return one listening-drill question.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    phrase: {
                      type: "string",
                      description: "Target-language phrase the learner will hear.",
                    },
                    englishTranslation: {
                      type: "string",
                      description: "English translation of the phrase.",
                    },
                    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                    topic: { type: "string", description: "1-3 word topic label." },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 4,
                      maxItems: 4,
                      description: "Exactly 4 candidate transcripts; one equals phrase exactly.",
                    },
                    correctIndex: {
                      type: "integer",
                      minimum: 0,
                      maximum: 3,
                      description: "Index in options whose text equals phrase exactly.",
                    },
                    listenFor: {
                      type: "string",
                      description: "One short English sentence on the discrimination target.",
                    },
                  },
                  required: [
                    "phrase",
                    "englishTranslation",
                    "cefr",
                    "topic",
                    "options",
                    "correctIndex",
                    "listenFor",
                  ],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_listening_question" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_listening_question",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const parsed = z
          .object({
            phrase: z.string().trim().min(1).max(200),
            englishTranslation: z.string().trim().min(1).max(1000),
            cefr: z.literal(cefr),
            topic: z.string().trim().min(1).max(100),
            options: z.array(z.string().trim().min(1).max(200)).length(4),
            correctIndex: z.number().int().min(0).max(3),
            listenFor: z.string().trim().min(1).max(1000),
          })
          .safeParse(toolUse.input);
        if (!parsed.success)
          return { data: null, error: "Question content came back incomplete. Please try again." };
        const q = parsed.data;
        if (new Set(q.options.map((option) => option.normalize("NFC").toLowerCase())).size !== 4) {
          return { data: null, error: "Options must be four distinct transcripts." };
        }
        // Preserve the existing exact-match recovery when the model mislabels the index.
        const found = q.options.indexOf(q.phrase);
        if (found < 0) return { data: null, error: "Phrase not present in options." };
        q.correctIndex = found;

        cache.set(cacheContext, q);
        return { data: q, error: null, cached: false };
      } catch {
        console.error("Listening Drill generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
