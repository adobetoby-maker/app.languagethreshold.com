/**
 * Server function: generate a full person×tense conjugation table for any verb.
 * Used when a learner saves a verb that isn't in the hand-authored core set.
 * Results are meant to be persisted client-side via conjugation-cache.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ConjugationSet, PersonForms } from "@/data/frequency-conjugations";

const PersonSchema = z.object({
  firstSingular: z.string().min(1).max(80),
  secondSingular: z.string().min(1).max(80),
  thirdSingular: z.string().min(1).max(80),
  firstPlural: z.string().min(1).max(80),
  secondPlural: z.string().min(1).max(80),
  thirdPlural: z.string().min(1).max(80),
});

const Input = z.object({
  language: z.string().min(1).max(40),
  infinitive: z.string().min(1).max(80),
  english: z.string().min(1).max(120).optional(),
});

const MAX_CACHE = 300;
const memCache = new Map<string, ConjugationSet>();

function memKey(language: string, infinitive: string) {
  return `${language}|${infinitive.trim().toLowerCase()}`;
}

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
  .handler(
    async ({
      data,
    }: {
      data: z.infer<typeof Input>;
    }) => {
      const key = memKey(data.language, data.infinitive);
      const cached = memCache.get(key);
      if (cached) {
        return { data: cached, error: null, cached: true };
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { data: null, error: "ANTHROPIC_API_KEY not configured." };
      }

      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
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
        });

        const toolUse = response.content.find((c) => c.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No conjugation returned." };
        }

        const raw = toolUse.input as {
          infinitive: string;
          pronunciation: string;
          presentTense: PersonForms;
          pastTense: PersonForms;
          futureTense: PersonForms;
          conditionalTense: PersonForms;
          gerund: string;
          pastParticiple: string;
          perfectExample: string;
          commonUses: { phrase: string; translation: string }[];
        };

        // Validate person tables
        for (const table of [
          raw.presentTense,
          raw.pastTense,
          raw.futureTense,
          raw.conditionalTense,
        ]) {
          const parsed = PersonSchema.safeParse(table);
          if (!parsed.success) {
            return { data: null, error: "Malformed person table." };
          }
        }

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

        if (memCache.size >= MAX_CACHE) {
          const first = memCache.keys().next().value;
          if (first !== undefined) memCache.delete(first);
        }
        memCache.set(key, set);

        return { data: set, error: null, cached: false };
      } catch (e) {
        console.error("generateVerbConjugation failed", e);
        return { data: null, error: "Generation failed." };
      }
    },
  );
