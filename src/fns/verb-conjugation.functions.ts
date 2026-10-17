import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
/**
 * Server function: generate a full person×tense conjugation table for any verb.
 * Used when a learner saves a verb that isn't in the hand-authored core set.
 * Callers must retain results only in an account-owned cache. No shared server reuse.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ConjugationSet } from "@/data/frequency-conjugations";

const PersonSchema = z.object({
  firstSingular: z.string().trim().min(1).max(80),
  secondSingular: z.string().trim().min(1).max(80),
  thirdSingular: z.string().trim().min(1).max(80),
  firstPlural: z.string().trim().min(1).max(80),
  secondPlural: z.string().trim().min(1).max(80),
  thirdPlural: z.string().trim().min(1).max(80),
});

const Input = z.object({
  language: z.string().min(1).max(40),
  infinitive: z.string().trim().min(1).max(80),
  english: z.string().min(1).max(120).optional(),
});

function pastLabelFor(language: string): string {
  const l = language.toLowerCase();
  if (l.includes("spanish") || l.includes("español")) return "Preterite";
  if (l.includes("german") || l.includes("deutsch")) return "Simple past";
  return "Imperfect";
}

const SYSTEM = `You are a precise conjugation table author for adult language learners.
Return COMPLETE, accurate conjugation tables — never invent forms.

Rules:
1. presentTense / pastTense / futureTense / conditionalTense each have exactly the six person forms.
2. pastTense meaning by language:
   - Spanish / Portuguese: simple preterite (pretérito)
   - Italian / French: imperfect
   - German: Präteritum (simple past)
3. German future uses "werde/wirst/wird/werden/werdet/werden + infinitive".
4. German conditional uses Konjunktiv II or "würde + infinitive" when that is the natural form.
5. gerund and pastParticiple are the non-finite forms.
6. perfectExample shows the past participle in a short perfect-tense phrase (e.g. "ho fatto", "he hecho", "j'ai fait").
7. commonUses: exactly 2 short, high-frequency example phrases with English translations.
8. pronunciation is a simple phonetic guide for beginners (not strict IPA).
9. Always respond by calling the provided tool.`;

export const generateVerbConjugation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }: { data: z.infer<typeof Input> }) => {
    const request = getRequest();
    setResponseHeader("Cache-Control", "no-store");
    const originError = learningGenerationOriginError(request);
    if (originError) {
      setResponseStatus(originError.status);
      return { data: null, error: originError.error };
    }
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { data: null, error: "ANTHROPIC_API_KEY not configured." };
    }
    if (signal.aborted) return { data: null, error: "Request cancelled." };
    const budgetError = await learningGenerationError("content");
    if (budgetError) return { data: null, error: budgetError };
    if (signal.aborted) return { data: null, error: "Request cancelled." };

    try {
      const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 30_000 });
      const response = await client.messages.create(
        {
          model: "claude-sonnet-5-5",
          max_tokens: 2800,
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: `Language: ${data.language}\nInfinitive: ${data.infinitive}${data.english ? `\nEnglish: ${data.english}` : ""}\n\nReturn the full conjugation table via the tool.`,
            },
          ],
          tools: [
            {
              name: "return_conjugation_table",
              description: "Return a complete conjugation table for the given verb.",
              input_schema: {
                type: "object",
                properties: {
                  infinitive: { type: "string" },
                  pronunciation: { type: "string" },
                  presentTense: {
                    type: "object",
                    properties: {
                      firstSingular: { type: "string" },
                      secondSingular: { type: "string" },
                      thirdSingular: { type: "string" },
                      firstPlural: { type: "string" },
                      secondPlural: { type: "string" },
                      thirdPlural: { type: "string" },
                    },
                    required: [
                      "firstSingular",
                      "secondSingular",
                      "thirdSingular",
                      "firstPlural",
                      "secondPlural",
                      "thirdPlural",
                    ],
                  },
                  pastTense: {
                    type: "object",
                    properties: {
                      firstSingular: { type: "string" },
                      secondSingular: { type: "string" },
                      thirdSingular: { type: "string" },
                      firstPlural: { type: "string" },
                      secondPlural: { type: "string" },
                      thirdPlural: { type: "string" },
                    },
                    required: [
                      "firstSingular",
                      "secondSingular",
                      "thirdSingular",
                      "firstPlural",
                      "secondPlural",
                      "thirdPlural",
                    ],
                  },
                  futureTense: {
                    type: "object",
                    properties: {
                      firstSingular: { type: "string" },
                      secondSingular: { type: "string" },
                      thirdSingular: { type: "string" },
                      firstPlural: { type: "string" },
                      secondPlural: { type: "string" },
                      thirdPlural: { type: "string" },
                    },
                    required: [
                      "firstSingular",
                      "secondSingular",
                      "thirdSingular",
                      "firstPlural",
                      "secondPlural",
                      "thirdPlural",
                    ],
                  },
                  conditionalTense: {
                    type: "object",
                    properties: {
                      firstSingular: { type: "string" },
                      secondSingular: { type: "string" },
                      thirdSingular: { type: "string" },
                      firstPlural: { type: "string" },
                      secondPlural: { type: "string" },
                      thirdPlural: { type: "string" },
                    },
                    required: [
                      "firstSingular",
                      "secondSingular",
                      "thirdSingular",
                      "firstPlural",
                      "secondPlural",
                      "thirdPlural",
                    ],
                  },
                  gerund: { type: "string" },
                  pastParticiple: { type: "string" },
                  perfectExample: { type: "string" },
                  commonUses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phrase: { type: "string" },
                        translation: { type: "string" },
                      },
                      required: ["phrase", "translation"],
                    },
                  },
                },
                required: [
                  "infinitive",
                  "pronunciation",
                  "presentTense",
                  "pastTense",
                  "futureTense",
                  "conditionalTense",
                  "gerund",
                  "pastParticiple",
                  "perfectExample",
                  "commonUses",
                ],
                additionalProperties: false,
              },
            },
          ],
          tool_choice: { type: "tool", name: "return_conjugation_table" },
        },
        { signal },
      );
      signal.throwIfAborted();

      const toolUse = response.content.find(
        (c) => c.type === "tool_use" && c.name === "return_conjugation_table",
      );
      if (!toolUse || toolUse.type !== "tool_use") {
        return { data: null, error: "No conjugation returned." };
      }

      const parsed = z
        .object({
          infinitive: z.string().trim().min(1).max(80),
          pronunciation: z.string().trim().min(1).max(240),
          presentTense: PersonSchema,
          pastTense: PersonSchema,
          futureTense: PersonSchema,
          conditionalTense: PersonSchema,
          gerund: z.string().trim().min(1).max(240),
          pastParticiple: z.string().trim().min(1).max(240),
          perfectExample: z.string().trim().min(1).max(600),
          commonUses: z
            .array(
              z.object({
                phrase: z.string().trim().min(1).max(600),
                translation: z.string().trim().min(1).max(600),
              }),
            )
            .length(2),
        })
        .safeParse(toolUse.input);
      if (!parsed.success)
        return { data: null, error: "Conjugation content came back incomplete." };
      const raw = parsed.data;
      if (
        raw.infinitive.normalize("NFC").toLowerCase() !==
        data.infinitive.trim().normalize("NFC").toLowerCase()
      )
        return { data: null, error: "Conjugation does not match the requested verb." };

      const set: ConjugationSet = {
        infinitive: raw.infinitive || data.infinitive,
        pronunciation: raw.pronunciation ?? "",
        presentTense: raw.presentTense,
        pastTense: raw.pastTense,
        pastLabel: pastLabelFor(data.language),
        futureTense: raw.futureTense,
        conditionalTense: raw.conditionalTense,
        gerund: raw.gerund,
        pastParticiple: raw.pastParticiple,
        perfectExample: raw.perfectExample,
        commonUses: raw.commonUses.slice(0, 2),
      };

      return { data: set, error: null, cached: false };
    } catch {
      console.error("Verb conjugation generation failed");
      return { data: null, error: "Generation failed." };
    }
  });
