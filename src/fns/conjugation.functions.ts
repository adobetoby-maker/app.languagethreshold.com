import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";

// What grammatical axis is being tested. Level 1 = single axis (just tense, just
// person, just number). Higher levels combine axes.
export type ConjugationAxis =
  | "tense" // present → past / future / conditional
  | "person" // I → you / he / we / they
  | "number" // singular → plural
  | "mood" // indicative → subjunctive
  | "mixed"; // 2+ axes at once (level 3+)

export type ConjugationLevel = 1 | 2 | 3;

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  axis: z.enum(["tense", "person", "number", "mood", "mixed"]).optional(),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  avoid: z.array(z.string().min(1).max(120)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
  userWords: z.array(z.string().min(1).max(80)).max(25).optional(),
});

export interface ConjugationQuestion {
  phrase: string; // target-language sentence with "___" where the verb goes
  phraseTranslation: string; // English translation (uses [verb] for the blank)
  infinitive: string; // base form / lemma of the verb
  infinitiveTranslation: string; // English meaning of the infinitive
  correctConjugation: string; // the right answer
  wrongOptions: string[]; // exactly 3 plausible-but-wrong forms (SAME verb)
  explanation: string; // 1-sentence reason the correct answer is correct
  axisTested: ConjugationAxis; // what axis the question is testing
  cefr: CefrLevel; // difficulty bucket
}

// ── Server-side cache ─────────────────────────────────────────────────────
// Distinct from word-lookup cache: smaller window because each match-up
// changes (avoid set is per-run), and prompts are cheap.
const MAX_CACHE = 200;
const cache = new Map<string, ConjugationQuestion>();

function cacheKey(
  language: string,
  level: number,
  axis: string | undefined,
  cefr: string | undefined,
  avoidHash: string,
): string {
  return `${language}|${level}|${axis ?? "auto"}|${cefr ?? "auto"}|${avoidHash}`;
}

function cacheGet(key: string): ConjugationQuestion | undefined {
  const v = cache.get(key);
  if (v !== undefined) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: ConjugationQuestion) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, value);
}

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
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { data: null, error: "AI is not configured" };

      const cefr: CefrLevel =
        data.cefr ?? (data.level === 1 ? "A2" : data.level === 2 ? "B1" : "B2");
      const axis = data.axis ?? (data.level === 3 ? "mixed" : pickAxis(data.level));

      // Avoid hash so same avoid-set hits cache; small cap on size already.
      const avoidHash = (data.avoid ?? []).slice().sort().join(",");
      const key = cacheKey(data.language, data.level, axis, cefr, avoidHash);
      const hit = cacheGet(key);
      if (hit) return { data: hit, error: null, cached: true };

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
        const client = new Anthropic({ apiKey: KEY });
        const response = await client.messages.create({
          // Sonnet 4.6 — grammar drill quality matters a lot. A bad distractor
          // (e.g. wrong-options that are also grammatically valid for the phrase)
          // breaks the game. Sonnet's much more reliable here than Haiku.
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
                  infinitive: { type: "string", description: "Dictionary base form of the verb." },
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
        });

        const toolUse = response.content.find((c) => c.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const q = toolUse.input as ConjugationQuestion;
        // Defensive: ensure exactly 3 wrong options + correct isn't in wrong list.
        if (!Array.isArray(q.wrongOptions) || q.wrongOptions.length !== 3) {
          return { data: null, error: "Invalid wrongOptions array." };
        }
        if (q.wrongOptions.includes(q.correctConjugation)) {
          // Strip and pad if needed — model occasionally duplicates.
          q.wrongOptions = q.wrongOptions.filter((w) => w !== q.correctConjugation);
          while (q.wrongOptions.length < 3) q.wrongOptions.push(`${q.infinitive}?`);
        }
        cacheSet(key, q);
        return { data: q, error: null, cached: false };
      } catch (e) {
        console.error("generateConjugationQuestion failed", e);
        return { data: null, error: "Generation failed." };
      }
    },
  );

function pickAxis(level: 1 | 2 | 3): ConjugationAxis {
  if (level === 1) {
    // Cycle through the three single-axis options for variety within a run.
    const axes: ConjugationAxis[] = ["tense", "person", "number"];
    return axes[Math.floor(Math.random() * axes.length)];
  }
  const axes: ConjugationAxis[] = ["tense", "person", "mood"];
  return axes[Math.floor(Math.random() * axes.length)];
}
