import { getRequest, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";
import { learningGenerationError } from "@/lib/learning-generation-server";
import { learningGenerationOriginError } from "@/lib/learning-generation-security";
import {
  TutorLessonReferenceSchema,
  resolveTutorLesson,
  tutorLessonThread,
  lessonLookupInstructions,
  type TutorLessonReference,
} from "@/lib/lesson-tutor-context";
import { usageReceipt, cacheReceipt } from "@/lib/usage-cost";
import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  word: z.string().min(1).max(100),
  sentence: z.string().min(1).max(2000),
  language: z.string().min(1).max(40),
  nativeLanguage: z.string().min(1).max(40).optional(),
  lesson: TutorLessonReferenceSchema.optional(),
});

export interface RelatedWord {
  word: string;
  reading?: string; // hiragana for Japanese, hangul for Korean, transliteration otherwise
  gloss: string; // short meaning in learner's native language
}

export interface WordCardData {
  headword: string;
  partOfSpeech: string;
  phonetic: string;
  baseDefinition: string;
  conjugationNote: string;
  contextNuance: string; // why THIS word in THIS sentence — register, formality, connotation
  exampleSentence: string;
  exampleTranslation: string;
  // Japanese-only fields (optional for other languages):
  pitchAccent?: string; // e.g. "Heiban (0)" or "Atamadaka (1)" with mora pattern
  alternativeReadings?: string[]; // e.g. ["こ", "しょう"] for 小 — when same kanji takes other readings
  // Universal expansion fields:
  commonCollocations?: string[]; // 3–5 phrases this word frequently appears in
  relatedWords?: RelatedWord[]; // 2–4 synonyms / antonyms / same-root terms
  etymologyNote?: string; // brief origin (e.g. kanji breakdown, Latin root)
}

// ── Server-side cache ──────────────────────────────────────────────────────
// Public-authored lesson sentences only. Private/custom contexts are never retained here.
// Per-instance LRU cache keyed by (language, word, sentence). Reduces Anthropic
// costs on repeat clicks (very common in a reading app — users click the same
// word multiple times to study it). Sentence is part of the key because the
// `conjugationNote` and `contextNuance` are sentence-specific.
//
// On Cloudflare Workers / Fluid Compute, instances are reused across requests,
// so this cache is genuinely warm. Eviction at MAX_ENTRIES keeps memory bounded.
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, WordCardData>();

function cacheKey(
  word: string,
  sentence: string,
  language: string,
  native: string,
  lesson?: TutorLessonReference,
): string {
  // Cheap, stable key. Sentence is included verbatim because click context matters.
  return JSON.stringify([
    language,
    native,
    word,
    sentence,
    lesson ? tutorLessonThread(lesson) : null,
  ]);
}

function cacheGet(key: string): WordCardData | undefined {
  const v = cache.get(key);
  if (v !== undefined) {
    // LRU touch: re-insert to move to end
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, value: WordCardData) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest (first inserted)
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, value);
}

export const lookupWord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ card: WordCardData | null; error: string | null; cached?: boolean }> => {
      setResponseHeader("Cache-Control", "no-store");
      const originError = learningGenerationOriginError(getRequest());
      if (originError) {
        setResponseStatus(originError.status);
        return { card: null, error: originError.error };
      }
      const KEY = process.env.ANTHROPIC_API_KEY;
      if (!KEY) return { card: null, error: "AI is not configured" };

      const native = data.nativeLanguage ?? "English";
      if (
        data.lesson &&
        (!resolveTutorLesson(data.lesson) ||
          data.lesson.targetLanguage !== data.language ||
          data.lesson.instructionLanguage !== native)
      ) {
        setResponseStatus(409);
        return {
          card: null,
          error: "Reopen the lesson in your selected language before looking up this word.",
        };
      }
      const key = cacheKey(data.word, data.sentence, data.language, native, data.lesson);
      // A valid lesson reference alone cannot make arbitrary Reader/transcript text public.
      const publicLesson = data.lesson ? resolveTutorLesson(data.lesson) : null;
      const shareable = Boolean(
        publicLesson &&
        data.sentence.includes(data.word) &&
        (publicLesson.reading?.sentences.some((sentence) => sentence.target === data.sentence) ||
          publicLesson.words.some((word) => word.es === data.sentence)),
      );
      const hit = shareable ? cacheGet(key) : undefined;
      if (hit) {
        setResponseHeader("X-LT-AI-Usage", JSON.stringify(cacheReceipt()));
        return { card: hit, error: null, cached: true };
      }
      const budgetError = await learningGenerationError("lookup");
      if (budgetError) return { card: null, error: budgetError };

      const isJapanese = /japanese|日本/i.test(data.language);
      const isKorean = /korean|한국/i.test(data.language);

      let phoneticInstruction = "For the phonetic field, use IPA notation.";
      if (isJapanese) {
        phoneticInstruction =
          "For the phonetic field, ALWAYS use standard Hepburn romaji (e.g. 'chiisana', 'gakusei', 'tabemasu'). NEVER use IPA symbols like ɕ, ː, ɯ, ɴ. Use only basic Latin letters a-z and apostrophes. Long vowels: write 'ou', 'aa', 'ii' (no macrons).";
      } else if (isKorean) {
        phoneticInstruction =
          "For the phonetic field, ALWAYS use standard Revised Romanization (RR) of Korean (e.g. 'annyeonghaseyo', 'hangugeo', 'gamsahamnida'). NEVER use IPA symbols. Use only basic Latin letters a-z. Apply contextual pronunciation rules (linking, assimilation) as actually pronounced.";
      }

      const japaneseSpecificInstruction = isJapanese
        ? `JAPANESE-SPECIFIC REQUIREMENTS:
- pitchAccent: REQUIRED. Provide the standard Tokyo-dialect pitch accent type AND mora number, e.g. "Heiban (0)", "Atamadaka (1)", "Nakadaka (2)", "Odaka (3)". If the headword is verbal/adjectival, use the dictionary form's pitch.
- alternativeReadings: REQUIRED if the headword contains kanji. List the OTHER common on'yomi/kun'yomi readings of the kanji that the learner is likely to encounter, with a one-word context for each (e.g. ["しょう (in 大小, daishō)", "こ (in 小学校, shōgakkō)"]). If the headword is single-kanji, list 2–4. If multi-kanji, list 1 alternative reading per character.
- etymologyNote: REQUIRED if the headword contains kanji. Brief breakdown of each kanji's component meaning + how the compound's literal meaning maps to its idiomatic meaning.
- commonCollocations: REQUIRED. 3–5 high-frequency collocations in natural Japanese (with brief gloss in ${native}).
- relatedWords: REQUIRED. 3 related lexical items — synonyms, antonyms, or same-root terms — each with reading (hiragana) and a short gloss in ${native}.`
        : `CROSS-LANGUAGE EXPANSION:
- commonCollocations: REQUIRED. 3–5 high-frequency phrases this word appears in.
- relatedWords: REQUIRED. 2–4 related lexical items (synonyms, antonyms, derivations) with brief gloss in ${native}.
- etymologyNote: OPTIONAL. Include a short etymology when it aids memory (e.g. Latin/Greek root for Romance/English, or noteworthy historical shift).
- pitchAccent: OMIT (Japanese-only).
- alternativeReadings: OMIT (Japanese-only).`;

      const systemPrompt = `You are a precise multilingual dictionary for adult learners. You ALWAYS respond by calling the provided tool. Be accurate and concise — every field is one sentence or a short list. Never over-explain.${data.lesson ? `\n\n${lessonLookupInstructions(data.lesson)}` : ""}`;

      const userPrompt = `The user clicked the word "${data.word}" in this sentence:

"${data.sentence}"

Target language: ${data.language}
Learner's native language: ${native}

Write baseDefinition, conjugationNote, exampleTranslation, and all gloss fields IN ${native}.

${phoneticInstruction}

conjugationNote: ONE sentence max. State the grammar role in this sentence only — tense/mood/person for verbs, case/gender for nouns, particle function for Japanese.

contextNuance: ONE sentence max. Only include if there is a meaningful register or synonym distinction worth noting. If the word is the only natural choice, write an empty string.

${japaneseSpecificInstruction}`;

      const properties: Record<string, unknown> = {
        headword: { type: "string", description: "Dictionary base form (lemma)" },
        partOfSpeech: {
          type: "string",
          description: "noun, verb, adjective, adverb, pronoun, particle, etc.",
        },
        phonetic: {
          type: "string",
          description:
            "Pronunciation. Japanese: Hepburn romaji (Latin letters only). Korean: Revised Romanization. Others: IPA.",
        },
        baseDefinition: {
          type: "string",
          description: "Core meaning in the learner's native language. 1 sentence.",
        },
        conjugationNote: {
          type: "string",
          description:
            "How this word is being used in THIS sentence (grammar role, tense, particle function, etc.).",
        },
        contextNuance: {
          type: "string",
          description:
            "Why this word was chosen here vs near-synonyms — register, connotation, stylistic effect. 1–2 sentences.",
        },
        exampleSentence: {
          type: "string",
          description: "One natural example sentence in the target language using this word.",
        },
        exampleTranslation: {
          type: "string",
          description: "Translation of the example sentence in the learner's native language.",
        },
        commonCollocations: {
          type: "array",
          items: { type: "string" },
          description:
            "3–5 high-frequency collocations / fixed phrases this word appears in, each with a brief gloss.",
        },
        relatedWords: {
          type: "array",
          items: {
            type: "object",
            properties: {
              word: { type: "string" },
              reading: { type: "string" },
              gloss: { type: "string" },
            },
            required: ["word", "gloss"],
            additionalProperties: false,
          },
          description: "2–4 related items: synonyms, antonyms, or same-root terms.",
        },
        etymologyNote: {
          type: "string",
          description:
            "Brief origin/breakdown that aids memory — kanji components for Japanese, Latin/Greek roots for Romance, etc.",
        },
      };

      if (isJapanese) {
        (properties as Record<string, unknown>).pitchAccent = {
          type: "string",
          description:
            "Tokyo-dialect pitch accent type + mora number, e.g. 'Heiban (0)', 'Atamadaka (1)'.",
        };
        (properties as Record<string, unknown>).alternativeReadings = {
          type: "array",
          items: { type: "string" },
          description:
            "Other common readings of the kanji(s) in the headword that the learner is likely to encounter.",
        };
      }

      const required = isJapanese
        ? [
            "headword",
            "partOfSpeech",
            "phonetic",
            "baseDefinition",
            "conjugationNote",
            "contextNuance",
            "exampleSentence",
            "exampleTranslation",
            "pitchAccent",
            "alternativeReadings",
            "commonCollocations",
            "relatedWords",
            "etymologyNote",
          ]
        : [
            "headword",
            "partOfSpeech",
            "phonetic",
            "baseDefinition",
            "conjugationNote",
            "contextNuance",
            "exampleSentence",
            "exampleTranslation",
            "commonCollocations",
            "relatedWords",
          ];

      try {
        const client = new Anthropic({ apiKey: KEY });
        const response = await client.messages.create({
          model: "claude-haiku-5-5",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          tools: [
            {
              name: "return_word_card",
              description:
                "Return rich, structured dictionary + grammar + context info for the clicked word.",
              input_schema: {
                type: "object" as const,
                properties: properties as never,
                required,
                additionalProperties: false,
              },
            },
          ],
          tool_choice: { type: "tool", name: "return_word_card" },
        });

        setResponseHeader("X-LT-AI-Usage", JSON.stringify(usageReceipt(response)));
        const toolUse = response.content.find((c) => c.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          return { card: null, error: "No card returned." };
        }
        const card = toolUse.input as WordCardData;
        if (shareable) cacheSet(key, card);
        return { card, error: null, cached: false };
      } catch {
        console.error("lookupWord provider request failed");
        return { card: null, error: "Lookup failed." };
      }
    },
  );
