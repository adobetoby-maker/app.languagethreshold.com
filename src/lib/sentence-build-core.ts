// Built by TAC — 2026-10-23
// Pure rules for a Sentence Builder question, shared by the live server function
// (src/fns/sentence-build.functions.ts), the trade-pack loader (src/lib/trade-packs.ts) and the
// offline pack generator (scripts/build-trade-packs.mts), so "a valid question" has one
// definition. No React, no network, no path aliases: node runs this file directly.

import { z } from "zod";

// Difficulty levels for the Sentence Builder game.
// 1 = short sentences (4-6 tokens) at A1/A2 — pure word order
// 2 = medium (6-9 tokens) at B1 — adds prepositions, adjective agreement
// 3 = long (9-13 tokens) at B2/C1 — clauses, time/place phrases, subjunctive
export type SentenceBuildLevel = 1 | 2 | 3;

export type SentenceBuildCefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface SentenceBuildQuestion {
  targetSentence: string; // canonical target-language sentence
  englishTranslation: string; // English translation
  tokens: string[]; // sentence split into ordered tokens (the "correct" order)
  scrambled: string[]; // same tokens shuffled (what the user starts with)
  topic: string; // short topic label (e.g. "café", "weather", "directions")
  cefr: SentenceBuildCefr;
  explanation: string; // 1 sentence on why this order is right (focus on the tricky part)
}

/** A question without its scrambled order: what a trade pack stores (scrambled is made at pick time). */
export type SentenceBuildItem = Omit<SentenceBuildQuestion, "scrambled">;

export const SENTENCE_BUILD_LEVELS: readonly SentenceBuildLevel[] = [1, 2, 3];

export function isSentenceBuildLevel(value: unknown): value is SentenceBuildLevel {
  return value === 1 || value === 2 || value === 3;
}

/** The CEFR label a question of this level carries. */
export function sentenceBuildCefr(level: SentenceBuildLevel): "A2" | "B1" | "B2" {
  return level === 1 ? "A2" : level === 2 ? "B1" : "B2";
}

/** How many tokens a sentence of this level has. */
export function sentenceBuildTokenRange(level: SentenceBuildLevel): { min: number; max: number } {
  return {
    min: level === 1 ? 4 : level === 2 ? 6 : 9,
    max: level === 1 ? 6 : level === 2 ? 9 : 13,
  };
}

/** The sentence as a learner reads it: NFC, single spaces (none for Japanese / Chinese). */
export function sentenceBuildCanonical(value: string, language: string): string {
  return value
    .normalize("NFC")
    .replace(/\s+/g, /japanese|chinese/i.test(language) ? "" : " ")
    .trim();
}

const token = z.string().trim().min(1).max(120);

function itemShape(level: SentenceBuildLevel) {
  const { min, max } = sentenceBuildTokenRange(level);
  return {
    targetSentence: z.string().trim().min(1).max(1600),
    englishTranslation: z.string().trim().min(1).max(1600),
    tokens: z.array(token).min(min).max(max),
    topic: z.string().trim().min(1).max(80),
    cefr: z.literal(sentenceBuildCefr(level)),
    explanation: z.string().trim().min(1).max(1200),
  };
}

/** The shape a live answer (with its scrambled order) must have at a level. */
export function sentenceBuildQuestionSchema(level: SentenceBuildLevel) {
  const { min, max } = sentenceBuildTokenRange(level);
  const { targetSentence, englishTranslation, tokens, topic, cefr, explanation } = itemShape(level);
  // Same fields, in the same order, as the live function has always parsed.
  return z.object({
    targetSentence,
    englishTranslation,
    tokens,
    scrambled: z.array(token).min(min).max(max),
    topic,
    cefr,
    explanation,
  });
}

/** The shape a stored question (no scrambled order) must have at a level. */
export function sentenceBuildItemSchema(level: SentenceBuildLevel) {
  return z.object(itemShape(level));
}

/** The tokens rebuild the sentence and are not all the same word. */
export function sentenceBuildTokensMatch(
  item: { tokens: readonly string[]; targetSentence: string },
  language: string,
): boolean {
  return (
    sentenceBuildCanonical(item.tokens.join(" "), language) ===
      sentenceBuildCanonical(item.targetSentence, language) && new Set(item.tokens).size >= 2
  );
}

function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * A scrambled order for the tokens that is not the correct order (needs at least two distinct
 * tokens, which every valid question has). Shuffled once; when that lands on the correct order,
 * the first token is swapped with the first one that differs.
 */
export function scrambleSentenceTokens(
  tokens: readonly string[],
  random: () => number = Math.random,
): string[] {
  const scrambled = shuffle([...tokens], random);
  if (JSON.stringify(scrambled) === JSON.stringify(tokens)) {
    const different = scrambled.findIndex((value) => value !== scrambled[0]);
    if (different > 0) {
      [scrambled[0], scrambled[different]] = [scrambled[different], scrambled[0]];
    }
  }
  return scrambled;
}

export type SentenceBuildCheck<T> = { ok: true; question: T } | { ok: false; error: string };

/**
 * The live server function's checks on a model answer, in its order and with its messages:
 * shape for the level, tokens rebuild the sentence, scrambled is a permutation of the tokens.
 * A scrambled order equal to the correct one is reshuffled (never returned as is).
 */
export function checkSentenceBuildQuestion(
  raw: unknown,
  level: SentenceBuildLevel,
  language: string,
): SentenceBuildCheck<SentenceBuildQuestion> {
  const parsed = sentenceBuildQuestionSchema(level).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Sentence content came back incomplete." };
  const q = parsed.data;
  if (!sentenceBuildTokensMatch(q, language))
    return { ok: false, error: "Sentence tokens do not match the question." };

  // Defensive: ensure scrambled is a permutation of tokens. Re-shuffle
  // ourselves if the model returned the same order or a non-permutation.
  if (
    !Array.isArray(q.tokens) ||
    !Array.isArray(q.scrambled) ||
    q.tokens.length !== q.scrambled.length
  ) {
    return { ok: false, error: "Token/scrambled mismatch." };
  }
  const sortedT = JSON.stringify([...q.tokens].sort());
  const sortedS = JSON.stringify([...q.scrambled].sort());
  if (sortedT !== sortedS) {
    return { ok: false, error: "Scrambled is not a permutation of tokens." };
  }
  // If the model returned scrambled identical to tokens, shuffle defensively.
  if (JSON.stringify(q.scrambled) === JSON.stringify(q.tokens)) {
    q.scrambled = scrambleSentenceTokens(q.tokens);
  }
  return { ok: true, question: q };
}

/** A stored question (no scrambled order) checked by the same rules as a live answer. */
export function checkSentenceBuildItem(
  raw: unknown,
  level: SentenceBuildLevel,
  language: string,
): SentenceBuildCheck<SentenceBuildItem> {
  const parsed = sentenceBuildItemSchema(level).safeParse(raw);
  if (!parsed.success) {
    const where = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "question"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: `Sentence content came back incomplete (${where}).` };
  }
  if (!sentenceBuildTokensMatch(parsed.data, language))
    return { ok: false, error: "Sentence tokens do not match the question." };
  return { ok: true, question: parsed.data };
}
