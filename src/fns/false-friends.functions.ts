import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { PublicGameGenerationCache } from "@/lib/game-generation-cache";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";

// "False Friends" — cognate-trap drills. Show a target-language word that
// LOOKS like an English word (or a related target-language pair) and ask
// whether it actually means what an English speaker would assume.
//
// Two question shapes per round (both use the same schema):
//   - "true-friend" — the cognate DOES mean the same thing (e.g. ES "natural")
//   - "false-friend" — the cognate trap (e.g. ES "embarazada" ≠ embarrassed)
//
// Each question shows a single short sentence using the word in context,
// gives the English candidate meaning, and asks the player whether the
// candidate meaning is right (true friend) or wrong (false friend).

export type FalseFriendsLevel = 1 | 2 | 3;

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  avoid: z.array(z.string().min(1).max(120)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
});

export interface FalseFriendQuestion {
  word: string; // target-language word (the cognate or look-alike)
  englishLookAlike: string; // the English word it resembles
  contextSentence: string; // short target-language sentence using the word
  contextTranslation: string; // English translation of the sentence
  candidateMeaning: string; // the candidate English meaning being tested
  isTrueFriend: boolean; // true = candidateMeaning IS correct; false = trap
  actualMeaning: string; // the real English meaning (always shown on reveal)
  trapExplanation: string; // 1-sentence note on the trap or true-friend status
  cefr: CefrLevel;
}

const cache = new PublicGameGenerationCache<FalseFriendQuestion>();

const SYSTEM = `You are a precise false-friends drill author for adult language learners.

A "false friend" is a target-language word that LOOKS or SOUNDS like an English word but means something different. A "true friend" is a cognate that DOES mean what an English speaker would assume.

You generate ONE question per call. For variety, mix true-friends and false-friends across calls — when you see no avoid list, prefer false-friends (the more memorable case).

Examples per language (you generate fresh ones each call — these are illustrative):
- Spanish FALSE: "embarazada" looks like "embarrassed" but means "pregnant"
- Spanish TRUE: "natural" — same meaning
- French FALSE: "actuellement" looks like "actually" but means "currently"
- French TRUE: "innovation" — same meaning
- German FALSE: "gift" looks like "gift" but means "poison"
- German TRUE: "Information" — same meaning
- Italian FALSE: "morbido" looks like "morbid" but means "soft"
- Italian TRUE: "pizza" — same meaning
- Portuguese FALSE: "puxe" looks like "push" but means "pull"
- Portuguese TRUE: "natural" — same meaning
- Japanese FALSE-ISH: スマート (sumāto) looks like "smart" but usually means "slim/stylish" not intelligent
- Korean FALSE-ISH: 핸들 (haendeul) looks like "handle" but means "steering wheel"

Rules:
1. The "word" must be a real, current word in the target language.
2. "englishLookAlike" must genuinely resemble the target word visually or phonetically — not contrived.
3. "contextSentence" must use the word naturally in a complete target-language sentence appropriate to the CEFR level.
4. "candidateMeaning" is what an English speaker WOULD probably guess. For true-friends, this matches actualMeaning. For false-friends, it's the wrong (but tempting) guess.
5. "isTrueFriend" is the correct boolean answer.
6. "actualMeaning" is what the word REALLY means in the target language (always — even for true friends, this is the canonical English gloss).
7. "trapExplanation" is one short sentence on the cognate's history or how to remember it.
8. Always respond by calling the provided tool.`;

export const generateFalseFriend = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{ data: FalseFriendQuestion | null; error: string | null; cached?: boolean }> => {
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

      const levelNotes =
        data.level === 1
          ? "Use everyday cognates a beginner could plausibly encounter."
          : data.level === 2
            ? "Use intermediate-frequency cognates that trip up many learners."
            : "Use lower-frequency or more subtle cognates — the kind that catch out advanced learners.";

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nAvoid these recent words: ${data.avoid.join(", ")}.`
          : "";

      const topicLine = data.topic
        ? `\nPrefer a false friend that a "${data.topic}" learner would plausibly encounter — vocabulary from that professional domain.`
        : "";

      const userMsg = `Generate ONE ${data.language} false-friends question at CEFR ${cefr}.\n${levelNotes}${topicLine}${avoidLine}\n\nReturn the structured question via the tool.`;

      try {
        const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
        const response = await client.messages.create(
          {
            model: "claude-haiku-5-5",
            max_tokens: 700,
            system: SYSTEM,
            messages: [{ role: "user", content: userMsg }],
            tools: [
              {
                name: "return_false_friend",
                description: "Return one false-friend / true-friend question.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    word: { type: "string" },
                    englishLookAlike: { type: "string" },
                    contextSentence: { type: "string" },
                    contextTranslation: { type: "string" },
                    candidateMeaning: { type: "string" },
                    isTrueFriend: { type: "boolean" },
                    actualMeaning: { type: "string" },
                    trapExplanation: { type: "string" },
                    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                  },
                  required: [
                    "word",
                    "englishLookAlike",
                    "contextSentence",
                    "contextTranslation",
                    "candidateMeaning",
                    "isTrueFriend",
                    "actualMeaning",
                    "trapExplanation",
                    "cefr",
                  ],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_false_friend" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_false_friend",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const parsed = z
          .object({
            word: z.string().trim().min(1).max(120),
            englishLookAlike: z.string().trim().min(1).max(120),
            contextSentence: z.string().trim().min(1).max(1000),
            contextTranslation: z.string().trim().min(1).max(1000),
            candidateMeaning: z.string().trim().min(1).max(200),
            isTrueFriend: z.boolean(),
            actualMeaning: z.string().trim().min(1).max(200),
            trapExplanation: z.string().trim().min(1).max(1000),
            cefr: z.literal(cefr),
          })
          .safeParse(toolUse.input);
        if (!parsed.success)
          return { data: null, error: "Question content came back incomplete. Please try again." };
        const q = parsed.data;
        // Identical glosses cannot present a false candidate. Different glosses
        // may be synonyms; this check does not certify linguistic correctness.
        const key = (value: string) => value.normalize("NFC").toLowerCase();
        if (!q.isTrueFriend && key(q.candidateMeaning) === key(q.actualMeaning)) {
          return {
            data: null,
            error: "Candidate and revealed meaning were inconsistent. Please try again.",
          };
        }

        cache.set(cacheContext, q);
        return { data: q, error: null, cached: false };
      } catch {
        console.error("False Friends generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
