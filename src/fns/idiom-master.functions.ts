import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import Anthropic from "@anthropic-ai/sdk";
import { PublicGameGenerationCache } from "@/lib/game-generation-cache";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { CefrLevel } from "./grammar.functions";

// Difficulty levels for the Idiom Master game.
// 1 = very common idioms (A2-B1) — every native speaker knows them
// 2 = mid-frequency idioms (B1-B2) — common but not first ones taught
// 3 = advanced / colloquial / regional idioms (B2-C1) — feel like an insider
export type IdiomMasterLevel = 1 | 2 | 3;

const Input = z.object({
  language: z.string().min(1).max(40),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  avoid: z.array(z.string().min(1).max(200)).max(20).optional(),
  topic: z.string().min(1).max(200).optional(),
});

export interface IdiomQuestion {
  idiom: string; // full idiom in target language with one ___ blank
  fullIdiom: string; // the same idiom WITHOUT a blank (for the reveal)
  literalGloss: string; // English literal word-by-word translation
  figurativeMeaning: string; // What the idiom actually means in English
  culturalNote: string; // 1-sentence note on origin/usage
  options: string[]; // exactly 4 options for the blank
  correctAnswer: string; // matches one of options exactly; the missing word(s)
  cefr: CefrLevel;
}

// ── Server-side cache ─────────────────────────────────────────────────────
// 200-entry LRU keyed by language+level+avoid hash. Same shape as the other
// game caches so the cross-game memory footprint is predictable.
const cache = new PublicGameGenerationCache<IdiomQuestion>();

const SYSTEM = `You are a precise cultural-fluency drill author for adult language learners. You generate fill-in-the-blank questions built around REAL native idioms — the kind of expressions native speakers actually use, not literal translations of English idioms.

Rules — non-negotiable:
1. The "fullIdiom" must be a REAL, attested idiom used by native speakers of the target language. Examples of authentic native idioms by language:
   - Spanish: "no hay mal que por bien no venga", "estar en las nubes", "ser pan comido", "tomar el pelo", "echar agua al mar"
   - French: "avoir le cafard", "poser un lapin", "coûter les yeux de la tête", "avoir un chat dans la gorge", "tomber dans les pommes"
   - German: "den Nagel auf den Kopf treffen", "Tomaten auf den Augen haben", "die Daumen drücken", "ins Gras beißen", "Schwein haben"
   - Italian: "in bocca al lupo", "non vedere l'ora", "avere le mani in pasta", "essere al verde", "prendere due piccioni con una fava"
   - Portuguese: "engolir sapos", "pagar o pato", "chutar o balde", "estar com a corda toda", "ficar a ver navios"
   - Japanese: "猫の手も借りたい", "猿も木から落ちる", "石の上にも三年", "花より団子", "出る杭は打たれる"
   - Korean: "발 없는 말이 천 리 간다", "그림의 떡", "식은 죽 먹기", "가는 말이 고와야 오는 말이 곱다", "우물 안 개구리"
   - Chinese: "马马虎虎", "画蛇添足", "对牛弹琴", "塞翁失马", "一石二鸟"
   - English: "raining cats and dogs", "spill the beans", "kick the bucket", "bite the bullet"
   Do NOT invent or translate from English. If unsure, choose a different well-attested idiom.
2. "idiom" is "fullIdiom" with exactly ONE word or short phrase replaced by "___" (three underscores). Pick the most evocative / culturally specific word as the blank — the one that makes the idiom feel native.
3. "literalGloss" is the literal, word-by-word English translation of the FULL idiom (use brackets for the missing piece, e.g. "It is raining [cats and dogs]"). This is the surface-level reading.
4. "figurativeMeaning" is what the idiom ACTUALLY means in everyday English — not the literal reading. One short sentence.
5. "culturalNote" is ONE sentence on origin, register, region, or when natives use it (e.g. "Said before exams or auditions; the listener replies 'crepi il lupo' — may the wolf die.").
6. "options" is exactly 4 strings — the correct missing word/phrase plus 3 plausible distractors. Distractors must:
   - be the SAME part of speech as the correct answer (noun → noun, verb → verb)
   - be roughly the same length / register
   - be real target-language words, not gibberish
   - be wrong but not laughably so — a learner should have to actually know the idiom
7. "correctAnswer" MUST appear EXACTLY in "options" (case-, accent-, and punctuation-identical).
8. Difficulty by level:
   - level 1 (CEFR A2-B1): top-tier idioms every native uses weekly
   - level 2 (CEFR B1-B2): mid-frequency, well-known but not the first ones taught
   - level 3 (CEFR B2-C1): colloquial, regional, or literary idioms — "you sound like a local" tier
9. Always respond by calling the provided tool.`;

export const generateIdiomQuestion = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(
    async ({
      data,
    }): Promise<{ data: IdiomQuestion | null; error: string | null; cached?: boolean }> => {
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

      const levelGuidance =
        data.level === 1
          ? "Level 1: pick a top-tier idiom every native uses weekly (CEFR A2-B1)."
          : data.level === 2
            ? "Level 2: pick a mid-frequency idiom — common but not the first ones taught (CEFR B1-B2)."
            : "Level 3: pick a colloquial, regional, or literary idiom — 'you sound like a local' tier (CEFR B2-C1).";

      const avoidLine =
        data.avoid && data.avoid.length
          ? `\nDo NOT reuse any of these idioms (already used this run): ${data.avoid.join(", ")}.`
          : "";

      const topicLine = data.topic
        ? `\nPrefer idioms that could naturally appear in a "${data.topic}" conversation — idioms a ${data.topic} professional or student would encounter or use.`
        : "";

      const userMsg = `Generate ONE ${data.language} idiom-master question.\n${levelGuidance}${topicLine}${avoidLine}\n\nReturn the structured question via the tool.`;

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
                name: "return_idiom_question",
                description: "Return one fill-in-the-blank idiom question.",
                input_schema: {
                  type: "object" as const,
                  properties: {
                    idiom: {
                      type: "string",
                      description: 'Target-language idiom with exactly one "___" blank.',
                    },
                    fullIdiom: {
                      type: "string",
                      description: "The same idiom without the blank (for the reveal).",
                    },
                    literalGloss: {
                      type: "string",
                      description: "Literal word-by-word English translation of the full idiom.",
                    },
                    figurativeMeaning: {
                      type: "string",
                      description: "What the idiom actually means in everyday English.",
                    },
                    culturalNote: {
                      type: "string",
                      description: "One-sentence note on origin, register, region, or usage.",
                    },
                    options: {
                      type: "array",
                      minItems: 4,
                      maxItems: 4,
                      items: { type: "string" },
                      description:
                        "Exactly 4 options for the blank — correct + 3 plausible distractors.",
                    },
                    correctAnswer: {
                      type: "string",
                      description:
                        "The correct missing word/phrase. MUST match one of options exactly.",
                    },
                    cefr: {
                      type: "string",
                      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
                      description: "Difficulty bucket of this question.",
                    },
                  },
                  required: [
                    "idiom",
                    "fullIdiom",
                    "literalGloss",
                    "figurativeMeaning",
                    "culturalNote",
                    "options",
                    "correctAnswer",
                    "cefr",
                  ],
                  additionalProperties: false,
                },
              },
            ],
            tool_choice: { type: "tool", name: "return_idiom_question" },
          },
          { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
        );

        const toolUse = response.content.find(
          (c) => c.type === "tool_use" && c.name === "return_idiom_question",
        );
        if (!toolUse || toolUse.type !== "tool_use") {
          return { data: null, error: "No question returned." };
        }
        const parsed = z
          .object({
            idiom: z.string().trim().min(1).max(200),
            fullIdiom: z.string().trim().min(1).max(200),
            literalGloss: z.string().trim().min(1).max(1000),
            figurativeMeaning: z.string().trim().min(1).max(1000),
            culturalNote: z.string().trim().min(1).max(1000),
            options: z.array(z.string().trim().min(1).max(80)).length(4),
            correctAnswer: z.string().trim().min(1).max(80),
            cefr: z.literal(cefr),
          })
          .safeParse(toolUse.input);
        if (!parsed.success)
          return { data: null, error: "Idiom content came back incomplete. Please try again." };
        const q = parsed.data;
        const blanks = q.idiom.match(/_+/g) ?? [];
        if (
          blanks.length !== 1 ||
          blanks[0] !== "___" ||
          !q.options.includes(q.correctAnswer) ||
          new Set(q.options.map((option) => option.normalize("NFC").toLowerCase())).size !== 4 ||
          q.idiom.replace("___", q.correctAnswer).normalize("NFC") !== q.fullIdiom.normalize("NFC")
        ) {
          return {
            data: null,
            error: "Idiom blank, answer and options were inconsistent. Please try again.",
          };
        }

        cache.set(cacheContext, q);
        return { data: q, error: null, cached: false };
      } catch {
        console.error("Idiom Master generation failed");
        return { data: null, error: "Generation failed." };
      }
    },
  );
