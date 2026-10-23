import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";
import { checkSentenceBuildQuestion } from "@/lib/sentence-build-core";

// Levels, the question shape and its checks live in src/lib/sentence-build-core.ts, shared with
// the trade-pack loader and generator.
export type { SentenceBuildLevel, SentenceBuildQuestion } from "@/lib/sentence-build-core";
import type { SentenceBuildQuestion } from "@/lib/sentence-build-core";

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  avoid: z.array(z.string().min(1).max(200)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
});

const SYSTEM = `You are a precise sentence-builder drill author. You generate natural target-language sentences for adult language learners and decompose each sentence into ordered tokens. The learner gets the tokens shuffled and must reorder them.

Rules — non-negotiable:
1. The "targetSentence" must be natural, idiomatic, and grammatically complete in the target language. No textbook stiffness.
2. "tokens" is the ENTIRE sentence split into discrete reorderable units. The unit IS what the user sees and drags:
   - For Spanish/French/German/Italian/Portuguese/English: split on whitespace; keep punctuation attached to the word it follows (e.g. "Hola,"). Articles + nouns are SEPARATE tokens (so "el café" → ["el", "café"]).
   - For Japanese: split into meaningful chunks (bunsetsu-like), e.g. "私は学生です" → ["私は", "学生", "です"]. Each chunk is one token.
   - For Korean: split on natural spaces, e.g. "저는 학생입니다" → ["저는", "학생입니다"].
3. Concatenating the "tokens" with single spaces (or no separator for Japanese; single spaces for Korean) MUST reproduce the sentence as a learner would expect to read it. Verify before responding.
4. "scrambled" is "tokens" shuffled into a different order. It MUST be a permutation — same elements, different order. Do not include the correct order.
5. "explanation" is ONE short English sentence calling out the most likely sticking point — word-order rule, agreement, particle placement, etc.
6. Keep "topic" to 1-3 words (e.g. "morning routine", "asking directions", "ordering coffee").
7. Always respond by calling the provided tool.`;

export const generateSentenceBuilder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{ data: SentenceBuildQuestion | null; error: string | null; cached?: boolean }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { data: null, error: originError.error };
      }
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { data: null, error: "AI is not configured" };
      if (signal.aborted) return { data: null, error: "Request cancelled." };
      const budgetError = await learningGenerationError("content");
      if (budgetError) return { data: null, error: budgetError };
      if (signal.aborted) return { data: null, error: "Request cancelled." };

      const cefr: CefrLevel = data.level === 1 ? "A2" : data.level === 2 ? "B1" : "B2";

      const lengthGuidance =
        data.level === 1
          ? "4–6 tokens, simple subject-verb-object."
          : data.level === 2
            ? "6–9 tokens, may include prepositional phrases or adjective agreement."
            : "9–13 tokens, may include subordinate clauses, time/place phrases, or subjunctive mood.";

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nAvoid these recent topics or sentence opens: ${data.avoid.join(", ")}.`
          : "";

      const topicLine = data.topic
        ? `\nDomain: the sentence MUST be one a "${data.topic}" practitioner would actually say — use domain-specific vocabulary.`
        : "";

      const userMsg = `Generate ONE ${data.language} sentence-builder question at CEFR ${cefr}.\n${lengthGuidance}${topicLine}${avoidLine}\n\nReturn the structured question via the tool.`;

      try {
        const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
        const response = await client.messages.create(
          {
            // Sonnet 4.6 — same reasoning as conjugation. Bad token splits or
            // a "scrambled" array that doesn't permute "tokens" silently breaks
            // the game. Sonnet is reliable here.
            model: "claude-haiku-5-5",
            max_tokens: 850,
            system: SYSTEM,
            messages: [{ role: "user", content: userMsg }],
            tools: [
              {
                name: "return_sentence_question",
                description: "Return one sentence-builder question.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    targetSentence: {
                      type: "string",
                      description: "Canonical target-language sentence.",
                    },
                    englishTranslation: { type: "string", description: "English translation." },
                    tokens: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 4,
                      maxItems: 16,
                      description: "Sentence split into ordered tokens.",
                    },
                    scrambled: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 4,
                      maxItems: 16,
                      description: "Same tokens, shuffled.",
                    },
                    topic: { type: "string" },
                    cefr: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                    explanation: {
                      type: "string",
                      description: "One-sentence English explanation of the tricky bit.",
                    },
                  },
                  required: [
                    "targetSentence",
                    "englishTranslation",
                    "tokens",
                    "scrambled",
                    "topic",
                    "cefr",
                    "explanation",
                  ],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_sentence_question" },
          },
          { signal },
        );
        signal.throwIfAborted();

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_sentence_question",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const checked = checkSentenceBuildQuestion(toolUse.input, data.level, data.language);
        if (!checked.ok) return { data: null, error: checked.error };
        const q = checked.question;

        return { data: q, error: null, cached: false };
      } catch {
        console.error("Sentence builder generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
