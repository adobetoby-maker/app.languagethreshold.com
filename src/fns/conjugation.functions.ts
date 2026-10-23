import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { PublicGameGenerationCache } from "@/lib/game-generation-cache";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";
import {
  CONJUGATION_REVIEW_PROPERTIES,
  CONJUGATION_REVIEW_REQUIRED,
  CONJUGATION_REVIEW_SYSTEM,
  checkConjugationQuestion,
  conjugationReviewAccepts,
  conjugationReviewInput,
  pickConjugationAxis,
  type ConjugationQuestion,
} from "@/lib/conjugation-core";

// The axes, levels, question shape, structural check and review gate live in
// src/lib/conjugation-core.ts, shared with the trade-pack loader and generator.
export type {
  ConjugationAxis,
  ConjugationLevel,
  ConjugationQuestion,
} from "@/lib/conjugation-core";

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  axis: z.enum(["tense", "person", "number", "mood", "mixed"]).optional(),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  avoid: z.array(z.string().min(1).max(120)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
  userWords: z.array(z.string().min(1).max(80)).max(25).optional(),
});

// ── Server-side cache ─────────────────────────────────────────────────────
// Distinct from word-lookup cache: smaller window because each match-up
// changes (avoid set is per-run), and prompts are cheap.
const cache = new PublicGameGenerationCache<ConjugationQuestion>();

const SYSTEM = `You are a precise grammar drill author for adult language learners. You generate fill-in-the-blank conjugation questions that test ONE clear thing at a time when level=1, two things at level=2, and complex multi-axis transformations at level=3.

Rules — non-negotiable:
1. The "phrase" must contain exactly one "___" (three underscores) where the conjugated verb goes. The phrase MUST give clear contextual cues (subject, time marker, mood signal) so the correct answer is unambiguous.
2. "infinitive" is the dictionary base form of the verb (e.g. "hablar", "manger", "essen", "食べる" → "食べる" stays as the dictionary form).
3. "correctConjugation" is the SINGLE form that fits the phrase grammatically.
4. "wrongOptions" must be exactly 3 OTHER conjugated forms of the SAME verb — not random nouns, not other verbs. They should be plausible (a learner could reasonably pick them) but unambiguously wrong given the phrase context.
5. "explanation" is one short sentence (in English) saying WHY the correct form is correct (e.g. "Past preterite — completed action with explicit time marker 'ayer'.").
6. "axisTested" labels what's being tested:
   - level 1: pick exactly one of "tense" / "person" / "number" / "mood" — the OTHER axes should match between correct and wrong options
   - level 2: still set one primary axis but you can mix two
   - level 3: "mixed" — combine 2+ transformations
7. Pick verbs and tenses appropriate for the requested CEFR level (default to A2 if not given). A1/A2 should use top-100 frequency verbs.
8. Always respond by calling the provided tool.`;

export const generateConjugationQuestion = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{ data: ConjugationQuestion | null; error: string | null; cached?: boolean }> => {
      const request = getRequest();
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(request);
      if (originError) {
        setResponseStatus(originError.status);
        return { data: null, error: originError.error };
      }

      const cefr: CefrLevel =
        data.cefr ?? (data.level === 1 ? "A2" : data.level === 2 ? "B1" : "B2");
      const axis = data.axis ?? pickConjugationAxis(data.level);

      const cacheContext = { ...data, axis, cefr };
      const hit = cache.get(cacheContext);
      if (hit) return { data: hit, error: null, cached: true };
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { data: null, error: "AI is not configured" };
      const budgetError = await learningGenerationError("content");
      if (budgetError) return { data: null, error: budgetError };

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nDo NOT reuse any of these verbs (already used this run): ${data.avoid.join(", ")}.`
          : "";

      const levelGuidance =
        data.level === 1
          ? `Level 1: test exactly ONE axis (${axis}). Wrong options must vary on the SAME axis as the correct answer (e.g. if axis is "tense", wrong options are the same verb in 3 different tenses; person and number stay constant).`
          : data.level === 2
            ? `Level 2: test the ${axis} axis primarily, but you may include one secondary variation across options.`
            : `Level 3: combine 2+ axes ("${axis}"). Wrong options should each get a different transformation wrong.`;

      const topicLine = data.topic
        ? `\nContext: the phrase MUST come from a "${data.topic}" scenario — use verbs a ${data.topic} practitioner would actually say.`
        : "";
      const userWordsLine =
        data.userWords && data.userWords.length
          ? `\nPersonal vocab: try to use one of these learner-specific words as the verb or in the sentence context: ${data.userWords.join(", ")}.`
          : "";

      const userMsg = `Generate ONE ${data.language} conjugation question at CEFR ${cefr}.${topicLine}${userWordsLine}${avoidLine}\n\n${levelGuidance}\n\nReturn the structured question via the tool.`;

      try {
        const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
        // One logical generation uses at most two model calls. Both share this
        // total deadline; the independent check must not restart the clock.
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
        signal.throwIfAborted();
        const response = await client.messages.create(
          {
            // Grammar quality also requires content validation beyond tool shape.
            model: "claude-haiku-5-5",
            max_tokens: 850,
            system: SYSTEM,
            messages: [{ role: "user", content: userMsg }],
            tools: [
              {
                name: "return_conjugation_question",
                description: "Return one fill-in-the-blank conjugation question.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    phrase: {
                      type: "string",
                      description: 'Target-language sentence with exactly one "___" blank.',
                    },
                    phraseTranslation: {
                      type: "string",
                      description: "English translation; use [verb] in place of the blank.",
                    },
                    infinitive: {
                      type: "string",
                      description: "Dictionary base form of the verb.",
                    },
                    infinitiveTranslation: {
                      type: "string",
                      description: "English meaning of the infinitive (1-3 words).",
                    },
                    correctConjugation: {
                      type: "string",
                      description: "The single correct conjugated form.",
                    },
                    wrongOptions: {
                      type: "array",
                      minItems: 3,
                      maxItems: 3,
                      items: { type: "string" },
                      description: "3 plausible-but-wrong forms of the SAME verb.",
                    },
                    explanation: {
                      type: "string",
                      description: "One-sentence English reason the correct form is correct.",
                    },
                    axisTested: {
                      type: "string",
                      enum: ["tense", "person", "number", "mood", "mixed"],
                      description: "Primary grammar axis being tested.",
                    },
                    cefr: {
                      type: "string",
                      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
                      description: "Difficulty bucket of this question.",
                    },
                  },
                  required: [
                    "phrase",
                    "phraseTranslation",
                    "infinitive",
                    "infinitiveTranslation",
                    "correctConjugation",
                    "wrongOptions",
                    "explanation",
                    "axisTested",
                    "cefr",
                  ],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_conjugation_question" },
          },
          { signal },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_conjugation_question",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const checked = checkConjugationQuestion(toolUse.input, { cefr, axis });
        if (!checked.ok) return { data: null, error: checked.error };
        const q = checked.question;
        signal.throwIfAborted();
        // A separate request solves the item without seeing the designated
        // correct choice. Structural validation cannot catch a subject/form
        // contradiction or multiple grammatically acceptable distractors.
        const reviewResponse = await client.messages.create(
          {
            model: "claude-haiku-5-5",
            max_tokens: 450,
            system: CONJUGATION_REVIEW_SYSTEM,
            messages: [
              {
                role: "user",
                content: JSON.stringify(
                  conjugationReviewInput(q, {
                    language: data.language,
                    level: data.level,
                    cefr,
                    axis,
                  }),
                ),
              },
            ],
            tools: [
              {
                name: "review_conjugation_question",
                description:
                  "Independently identify acceptable supplied answers and check question consistency.",
                input_schema: {
                  type: "object" as const,
                  properties: CONJUGATION_REVIEW_PROPERTIES,
                  required: [...CONJUGATION_REVIEW_REQUIRED],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "review_conjugation_question" },
          },
          { signal },
        );
        signal.throwIfAborted();
        const reviewTool = reviewResponse.content.find(
          (c) => c.type === "tool_use" && c.name === "review_conjugation_question",
        );
        if (
          !reviewTool ||
          reviewTool.type !== "tool_use" ||
          !conjugationReviewAccepts(reviewTool.input, q.correctConjugation)
        ) {
          return {
            data: null,
            error:
              "This question did not pass the AI consistency check. Please try another question.",
          };
        }
        cache.set(cacheContext, q);
        return { data: q, error: null, cached: false };
      } catch {
        console.error("Conjugation generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
