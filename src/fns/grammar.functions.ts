import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
): Promise<{ data: T | null; error: string | null }> {
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { data: null, error: "AI is not configured" };

  try {
    const client = new Anthropic({ apiKey: KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
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
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { data: null, error: "No structured result returned." };
    }
    return { data: toolUse.input as T, error: null };
  } catch (e) {
    console.error("callTool failed", e);
    return { data: null, error: "Request failed." };
  }
}

export const generateLessonTitles = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => LevelTitleInput.parse(i))
  .handler(async ({ data }) => {
    const system =
      "You are a master language curriculum designer. Always respond by calling the provided tool. Generate exactly 6 lessons that progress logically through the level.";
    const user = `Generate 6 grammar lesson titles for a ${data.language} learner at CEFR level ${data.level}. Each lesson needs a short editorial title and a precise grammar concept (one sentence describing what grammar point is taught).`;
    return callTool<{ lessons: LessonStub[] }>(system, user, "return_lesson_titles", {
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
    });
  });

const MorphPartSchema = z.object({
  word: z.string(),
  romanization: z.string().optional(),
  root: z.string(),
  ending: z.string(),
  gloss: z.string(),
});

const ConjugationRowSchema = z.object({
  form: z.string(),
  root: z.string(),
  ending: z.string(),
  full: z.string(),
  romanization: z.string().optional(),
  english: z.string(),
});

// The tool-call input_schema asks the model for this shape, but nothing
// enforces it — a malformed response (e.g. morphology without table) used
// to flow straight into the UI and crash MorphologyCard. Validate before
// returning so the client either gets a complete lesson or a retryable error.
const LessonContentSchema = z.object({
  explanation: z.string(),
  examples: z.array(z.object({ target: z.string(), english: z.string() })),
  keyRule: z.string(),
  morphology: z
    .object({
      summary: z.string(),
      base: MorphPartSchema,
      table: z.array(ConjugationRowSchema).min(1),
    })
    .optional(),
});

export const generateLessonContent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => LessonInput.parse(i))
  .handler(async ({ data }) => {
    const native = data.nativeLanguage ?? "English";
    const system =
      "You are a brilliant private grammar tutor. Write clearly and warmly. Always respond by calling the provided tool. " +
      "When the concept involves a word whose ROOT stays fixed while an ENDING changes (verb conjugation, noun declension, adjective inflection, etc.), you MUST include the `morphology` field showing the split. " +
      "Use the dictionary / base form as `morphology.base` and provide 4–6 rows in `morphology.table` reusing the SAME root with different endings (e.g. Japanese iku → root 'i' (行), endings ka/ki/ku/ke/kō, full forms 行かない / 行きます / 行く / 行けば / 行こう). " +
      "Always include romanization for non-Latin scripts. Omit `morphology` only for purely syntactic topics like word order or particles that don't inflect.";
    const user = `Teach this grammar concept: "${data.concept}" for a ${data.language} learner at CEFR ${data.level}. Provide a clear ~150-word explanation IN ${native}, exactly 3 example sentences in ${data.language} each with a ${native} translation (use the field name "english" for the ${native} translation), one bold key rule (single sentence in ${native}), and — if the concept involves a word that conjugates/inflects — a morphology breakdown showing the unchanging root and the changing endings (the "english" field on each row should be the ${native} gloss).`;
    const result = await callTool<LessonContent>(system, user, "return_lesson_content", {
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
    });
    if (result.error || !result.data) return { data: null, error: result.error };
    const parsed = LessonContentSchema.safeParse(result.data);
    if (!parsed.success) {
      console.error("generateLessonContent: malformed AI response", parsed.error);
      return { data: null, error: "Lesson content came back incomplete. Please try again." };
    }
    return { data: parsed.data, error: null };
  });

export const generateLessonQuiz = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => QuizInput.parse(i))
  .handler(async ({ data }) => {
    const system =
      "You are an exam writer. Always respond by calling the provided tool. Mix fill-in-the-blank and multiple choice. For fill-in-the-blank, write the sentence with a single ___ blank. For multiple choice, provide 3-4 options including the correct answer. Always include a short explanation.";
    const user = `Create exactly 3 quiz questions in English (with target ${data.language} content where natural) for the grammar concept "${data.concept}". Mix types.`;
    return callTool<QuizPayload>(system, user, "return_quiz", {
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
                minItems: 2,
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
    });
  });
