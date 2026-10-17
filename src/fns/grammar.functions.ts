import { normalizeGrammarAnswer } from "@/lib/grammar-quiz";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { usageReceipt } from "@/lib/usage-cost";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasConsistentGrammarMorphology } from "@/lib/grammar-morphology";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

const LevelTitleInput = z.object({
  language: z.string().min(1).max(40),
  level: z.enum(CEFR_LEVELS),
});

const LessonInput = z.object({
  language: z.string().min(1).max(40),
  level: z.enum(CEFR_LEVELS),
  concept: z.string().min(1).max(200),
  nativeLanguage: z.string().min(1).max(40).optional(),
});

const QuizInput = z.object({
  language: z.string().min(1).max(40),
  concept: z.string().min(1).max(200),
});

export interface LessonStub {
  id: string;
  title: string;
  concept: string;
}

export interface LessonExample {
  target: string;
  english: string;
}

/**
 * Splits a word into the unchanging root/stem and the changing ending so
 * learners can SEE what part transforms. E.g. Japanese 行く (iku, "to go"):
 * root "i" (行) + ending "ku".
 */
export interface MorphPart {
  word: string;
  romanization?: string;
  root: string;
  ending: string;
  gloss: string;
}

export interface ConjugationRow {
  form: string; // e.g. "Polite present", "Negative", "Te-form"
  root: string;
  ending: string;
  full: string; // root + ending in target script
  romanization?: string;
  english: string;
}

export interface MorphologyBreakdown {
  summary: string;
  base: MorphPart;
  table: ConjugationRow[];
}

export interface LessonContent {
  explanation: string;
  examples: LessonExample[];
  keyRule: string;
  /**
   * Present whenever the concept involves a word whose ROOT stays fixed
   * while an ending changes (verb conjugation, noun declension, adjective
   * inflection). Omitted for purely syntactic topics like word order.
   */
  morphology?: MorphologyBreakdown;
}

export type QuizQuestionType = "fill_blank" | "multiple_choice";

export interface QuizQuestion {
  type: QuizQuestionType;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

async function callTool<T>(
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  parameters: Record<string, unknown>,
  outputSchema: z.ZodType<T>,
): Promise<{ data: T | null; error: string | null }> {
  const request = getRequest();
  setResponseHeader("Cache-Control", "no-store");
  const originError = learningGenerationOriginError(request);
  if (originError) {
    setResponseStatus(originError.status);
    return { data: null, error: originError.error };
  }
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { data: null, error: "AI is not configured" };

  const budgetError = await learningGenerationError("content");
  if (budgetError) return { data: null, error: budgetError };
  try {
    const client = new Anthropic({ apiKey: KEY, maxRetries: 0, timeout: 30_000 });
    const response = await client.messages.create(
      {
        model: "claude-haiku-5-5",
        max_tokens: 5600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [
          {
            name: toolName,
            description: "Return structured result.",
            input_schema: {
              type: "object" as const,
              ...(parameters as object),
            },
          },
        ],
        tool_choice: { type: "tool", name: toolName },
      },
      { signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]) },
    );

    setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
    const toolUse = response.content.find((c) => c.type === "tool_use" && c.name === toolName);
    if (!toolUse || toolUse.type !== "tool_use") {
      return { data: null, error: "No structured result returned." };
    }
    const parsed = outputSchema.safeParse(toolUse.input);
    if (!parsed.success)
      return { data: null, error: "Practice content came back incomplete. Please try again." };
    return { data: parsed.data, error: null };
  } catch {
    console.error("Grammar generation failed");
    return { data: null, error: "Request failed." };
  }
}

const TitlesSchema = z
  .object({
    lessons: z
      .array(
        z.object({
          id: z
            .string()
            .min(1)
            .max(100)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          title: z.string().trim().min(1).max(200),
          concept: z.string().trim().min(1).max(200),
        }),
      )
      .length(6),
  })
  .refine(({ lessons }) => new Set(lessons.map((lesson) => lesson.id)).size === lessons.length);

const quizTextKey = normalizeGrammarAnswer;
const QuizSchema = z.object({
  questions: z
    .array(
      z
        .object({
          type: z.enum(["fill_blank", "multiple_choice"]),
          question: z.string().trim().min(1).max(2000),
          options: z.array(z.string().trim().min(1).max(500)).min(3).max(4).optional(),
          answer: z.string().trim().min(1).max(500),
          explanation: z.string().trim().min(1).max(2000),
        })
        .refine((question) =>
          question.type === "multiple_choice"
            ? !!question.options &&
              new Set(question.options.map(quizTextKey)).size === question.options.length &&
              question.options.some(
                (option) => quizTextKey(option) === quizTextKey(question.answer),
              )
            : question.options === undefined &&
              (question.question.match(/___/g) ?? []).length === 1,
        ),
    )
    .length(3),
});

export const generateLessonTitles = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => LevelTitleInput.parse(i))
  .handler(async ({ data }) => {
    const system =
      "You are a master language curriculum designer. Always respond by calling the provided tool. Generate exactly 6 lessons that progress logically through the level.";
    const user = `Generate 6 grammar lesson titles for a ${data.language} learner at CEFR level ${data.level}. Each lesson needs a short editorial title and a precise grammar concept (one sentence describing what grammar point is taught).`;
    return callTool<{ lessons: LessonStub[] }>(
      system,
      user,
      "return_lesson_titles",
      {
        type: "object",
        properties: {
          lessons: {
            type: "array",
            minItems: 6,
            maxItems: 6,
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "kebab-case slug" },
                title: { type: "string" },
                concept: { type: "string" },
              },
              required: ["id", "title", "concept"],
              additionalProperties: false,
            },
          },
        },
        required: ["lessons"],
        additionalProperties: false,
      },
      TitlesSchema,
    );
  });

const MorphPartSchema = z.object({
  word: z.string().max(1000),
  romanization: z.string().max(1000).optional(),
  root: z.string().max(1000),
  ending: z.string().max(1000),
  gloss: z.string().max(1000),
});

const ConjugationRowSchema = z.object({
  form: z.string().max(1000),
  root: z.string().max(1000),
  ending: z.string().max(1000),
  full: z.string().max(1000),
  romanization: z.string().max(1000).optional(),
  english: z.string().max(1000),
});

// The tool-call input_schema asks the model for this shape, but nothing
// enforces it — a malformed response (e.g. morphology without table) used
// to flow straight into the UI and crash MorphologyCard. Validate before
// returning so the client either gets a complete lesson or a retryable error.
const LessonContentSchema = z.object({
  explanation: z.string().trim().min(1).max(12000),
  examples: z
    .array(
      z.object({
        target: z.string().trim().min(1).max(1000),
        english: z.string().trim().min(1).max(1000),
      }),
    )
    .length(3),
  keyRule: z.string().trim().min(1).max(2000),
  morphology: z
    .object({
      summary: z.string().max(1000),
      base: MorphPartSchema,
      table: z.array(ConjugationRowSchema).min(1).max(6),
    })
    .optional(),
});

export const generateLessonContent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => LessonInput.parse(i))
  .handler(async ({ data }) => {
    const native = data.nativeLanguage ?? "English";
    const system =
      "You are a brilliant private grammar tutor. Write clearly and warmly. Always respond by calling the provided tool. " +
      "Include `morphology` only when a genuine unchanged stem can reconstruct the base and every table form exactly. Use actual target-script letters for root/ending, with no hyphen notation; root + ending must equal word/full. " +
      "For irregular or changing-stem forms (for example Spanish ser: soy, eres, es, somos, sois, son), omit morphology and teach the complete forms in the explanation and examples. Never invent a shared root or force regular endings onto an irregular word. " +
      "For a regular pattern, use the dictionary/base form as morphology.base and provide 4–6 rows with that same actual stem. Japanese 行く may use root 行 with endings く, かない, きます, けば, こう; put romanization in its separate field, never in the target-script split. " +
      "Always include romanization for non-Latin scripts. Omit morphology for purely syntactic topics as well.";
    const user = `Teach this grammar concept: "${data.concept}" for a ${data.language} learner at CEFR ${data.level}. Provide a clear ~150-word explanation IN ${native}, exactly 3 example sentences in ${data.language} each with a ${native} translation (use the field name "english" for the ${native} translation), and one bold key rule (single sentence in ${native}). Include a morphology breakdown only for an exact fixed-stem pattern; otherwise teach whole forms without a split. The "english" field on each morphology row is the ${native} gloss.`;
    const result = await callTool<LessonContent>(
      system,
      user,
      "return_lesson_content",
      {
        type: "object",
        properties: {
          explanation: { type: "string", minLength: 200 },
          examples: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                target: { type: "string" },
                english: { type: "string" },
              },
              required: ["target", "english"],
              additionalProperties: false,
            },
          },
          keyRule: { type: "string" },
          morphology: {
            type: "object",
            description: "Optional. Include when a word's root stays fixed while endings change.",
            properties: {
              summary: {
                type: "string",
                description: "1–3 sentences describing the root/ending pattern.",
              },
              base: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  romanization: { type: "string" },
                  root: { type: "string" },
                  ending: { type: "string" },
                  gloss: { type: "string" },
                },
                required: ["word", "root", "ending", "gloss"],
                additionalProperties: false,
              },
              table: {
                type: "array",
                minItems: 3,
                maxItems: 6,
                items: {
                  type: "object",
                  properties: {
                    form: { type: "string" },
                    root: { type: "string" },
                    ending: { type: "string" },
                    full: { type: "string" },
                    romanization: { type: "string" },
                    english: { type: "string" },
                  },
                  required: ["form", "root", "ending", "full", "english"],
                  additionalProperties: false,
                },
              },
            },
            required: ["summary", "base", "table"],
            additionalProperties: false,
          },
        },
        required: ["explanation", "examples", "keyRule"],
        additionalProperties: false,
      },
      LessonContentSchema,
    );
    if (result.error || !result.data) return { data: null, error: result.error };
    if (result.data.morphology && !hasConsistentGrammarMorphology(result.data.morphology)) {
      return { data: null, error: "This lesson's word forms were inconsistent. Please try again." };
    }
    return { data: result.data, error: null };
  });

export const generateLessonQuiz = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => QuizInput.parse(i))
  .handler(async ({ data }) => {
    const system =
      "You are an exam writer. Always respond by calling the provided tool. Mix fill-in-the-blank and multiple choice. For fill-in-the-blank, write the sentence with a single ___ blank. For multiple choice, provide 3-4 options including the correct answer. Always include a short explanation.";
    const user = `Create exactly 3 quiz questions in English (with target ${data.language} content where natural) for the grammar concept "${data.concept}". Mix types.`;
    return callTool<QuizPayload>(
      system,
      user,
      "return_quiz",
      {
        type: "object",
        properties: {
          questions: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["fill_blank", "multiple_choice"] },
                question: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 4,
                },
                answer: { type: "string" },
                explanation: { type: "string" },
              },
              required: ["type", "question", "answer", "explanation"],
              additionalProperties: false,
            },
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
      QuizSchema,
    );
  });
