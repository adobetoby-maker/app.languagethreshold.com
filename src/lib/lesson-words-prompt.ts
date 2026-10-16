// Built by TAC — 2026-10-15
// Prompt, tool schema and response parsing for per-lesson word lists. Pure (no React, no
// server-only imports) so the server function (src/fns/lesson-words.functions.ts) and the
// offline deck builder (scripts/build-lesson-decks.mts) send exactly the same request.
//
// FIELD MEANING: the model returns {native, target}; LessonWord stores en = native text and
// es = target text (names are historical, see lesson-words-core.ts).

import type { LessonWord } from "../data/curriculum.ts";
import { hasEnoughWords, wordsFromModelOutput } from "./lesson-words-core.ts";

export const LESSON_WORDS_MODEL = "claude-haiku-5-5";

// Lower-resource target languages where Haiku's word choice proved unreliable (e.g. Pashto
// "hard hat" came back as the word for rifle) get the stronger model.
const STRONGER_MODEL_LANGUAGES = new Set(["Pashto"]);

export function lessonWordsModel(targetLanguage: string): string {
  return STRONGER_MODEL_LANGUAGES.has(targetLanguage) ? "claude-sonnet-5-5" : LESSON_WORDS_MODEL;
}
export const LESSON_WORDS_MAX_TOKENS = 2000;
export const LESSON_WORDS_TOOL_NAME = "return_lesson_words";

/** The slice of an app module the prompt reads. */
export interface PromptModule {
  name: string;
  blurb: string;
  userRole: string;
  vocabFocus: readonly string[];
}

/** The slice of a curriculum lesson the prompt reads. */
export interface PromptLesson {
  n: number;
  title: string;
  objective: string;
  steps: readonly { instruction: string }[];
}

const PAIR_SCHEMA = {
  type: "object",
  properties: {
    native: { type: "string" },
    target: { type: "string" },
    note: { type: "string" },
  },
  required: ["native", "target"],
  additionalProperties: false,
};

export function lessonWordsSystemPrompt(targetLanguage: string, nativeLanguage: string): string {
  return `You build the word list for ONE language-lesson. The learner's native language is ${nativeLanguage}; the language they are learning is ${targetLanguage}. For every entry, "native" is the ${nativeLanguage} text and "target" is the natural ${targetLanguage} equivalent; keep each pair exactly aligned. Give 8 to 12 job-specific single terms (nouns, tools, parts, short noun phrases, at most 4 words) and 4 to 6 short phrases the learner would actually say in this field (a sentence or question, at most 12 words, spoken by the learner, not instructions about practicing). Choose words this lesson's objective and steps need; prefer any words the step instructions name. No duplicates, no generic filler (hello, thank you) unless the lesson is about it. Translate, never convert: numbers, units, times, names and quantities must be identical on both sides (90 centímetros is 90 centimeters, not 36 inches). Use the word people in this trade actually say in ${targetLanguage}, including a common loanword when that is what workers use; never coin a literal word-for-word phrase. If you are not sure of the correct ${targetLanguage} term, leave that entry out rather than guess. Add a short "note" only when a usage or register tip helps (formal vs casual, regional variant). For medical or safety topics, teach communication and verification, never an unsupported procedure, dose, measurement or universal specification. Avoid stereotypes. Return only the requested tool data.`;
}

export function lessonWordsUserContent(args: {
  module: PromptModule;
  lesson: PromptLesson;
  targetLanguage: string;
  nativeLanguage: string;
}): string {
  const { module, lesson, targetLanguage, nativeLanguage } = args;
  return JSON.stringify({
    module: module.name,
    moduleDescription: module.blurb,
    learnerRole: module.userRole,
    moduleVocabularyFocus: module.vocabFocus,
    lesson: {
      number: lesson.n,
      title: lesson.title,
      objective: lesson.objective,
      steps: lesson.steps.map((step) => step.instruction),
    },
    targetLanguage,
    nativeLanguage,
  });
}

export const LESSON_WORDS_TOOLS = [
  {
    name: LESSON_WORDS_TOOL_NAME,
    description: "Return the term and phrase lists for this lesson",
    input_schema: {
      type: "object" as const,
      properties: {
        terms: {
          type: "array",
          description: "8 to 12 distinct job-specific terms for this lesson.",
          minItems: 8,
          maxItems: 12,
          items: PAIR_SCHEMA,
        },
        phrases: {
          type: "array",
          description: "4 to 6 short things the learner would say, for this lesson.",
          minItems: 4,
          maxItems: 6,
          items: PAIR_SCHEMA,
        },
      },
      required: ["terms", "phrases"],
      additionalProperties: false,
    },
  },
];

export const LESSON_WORDS_TOOL_CHOICE = {
  type: "tool" as const,
  name: LESSON_WORDS_TOOL_NAME,
};

/** Everything but the key: the body for `messages.create` (SDK or raw HTTP). */
export function buildLessonWordsRequest(args: {
  module: PromptModule;
  lesson: PromptLesson;
  targetLanguage: string;
  nativeLanguage: string;
}) {
  return {
    model: lessonWordsModel(args.targetLanguage),
    max_tokens: LESSON_WORDS_MAX_TOKENS,
    system: lessonWordsSystemPrompt(args.targetLanguage, args.nativeLanguage),
    messages: [{ role: "user" as const, content: lessonWordsUserContent(args) }],
    tools: LESSON_WORDS_TOOLS,
    // Sonnet 5.5 rejects a forced tool_choice; it is told to use the tool and the parser
    // (plus the validation retry) handles a reply without one.
    tool_choice:
      lessonWordsModel(args.targetLanguage) === LESSON_WORDS_MODEL
        ? LESSON_WORDS_TOOL_CHOICE
        : ({ type: "auto" } as const),
  };
}

/**
 * Reads a `messages.create` response's content blocks. Returns the cleaned words, or null
 * when the tool call is missing or the list is too small (hasEnoughWords). Separate term and
 * phrase lists (as in module-deck): one mixed list made Haiku stop after the terms.
 */
export function lessonWordsFromResponse(
  content: readonly { type: string; input?: unknown }[],
): LessonWord[] | null {
  const tool = content.find((item) => item.type === "tool_use");
  if (!tool) return null;
  const words = wordsFromModelOutput(tool.input);
  return hasEnoughWords(words) ? words : null;
}
