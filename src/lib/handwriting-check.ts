// Built by TAC — 2026-10-15
// Pure logic for checking handwritten answers in the Core 30 "Write it" mode (no React, no DOM).
// Imported by src/components/core30/LessonPracticeKit.tsx and unit-tested directly.

import { answerVariants, normalizeAnswer } from "./lesson-practice.ts";
import { isCorrectTypedAnswer, isLatinScript, normalizeScriptAnswer } from "./lesson-words-core.ts";

/** Languages the handwriting reader (src/fns/handwriting-read.functions.ts) accepts. */
export const HANDWRITING_READ_LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Chinese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
] as const;

export type HandwritingReadLanguage = (typeof HANDWRITING_READ_LANGUAGES)[number];

export function isHandwritingReadLanguage(language: string): language is HandwritingReadLanguage {
  return (HANDWRITING_READ_LANGUAGES as readonly string[]).includes(language);
}

/** Levenshtein distance over Unicode code points (so a CJK character or emoji counts once). */
export function editDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  if (x.length === 0) return y.length;
  if (y.length === 0) return x.length;
  let previous = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[y.length];
}

export type HandwritingVerdict = "correct" | "close" | "wrong" | "empty";

export interface HandwritingCheck {
  verdict: HandwritingVerdict;
  /** Edit distance to the nearest accepted form (0 when exact; Infinity when nothing was read). */
  distance: number;
  /** True only for "correct". "close" shows the answer but does not score. */
  accepted: boolean;
}

/** Normalized strings accepted for `expected` in the script it is written in. */
function expectedForms(expected: string): string[] {
  if (isLatinScript(expected)) return answerVariants(expected);
  const forms = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeScriptAnswer(value);
    if (normalized) forms.add(normalized);
  };
  add(expected);
  add(expected.split(/\s*[(（]/)[0]);
  for (const side of expected.split(/\s+\/\s+|／/)) add(side.split(/\s*[(（]/)[0]);
  return [...forms];
}

function normalizeRead(text: string, expected: string): string {
  return isLatinScript(expected) ? normalizeAnswer(text) : normalizeScriptAnswer(text);
}

/**
 * How many edits still count as right (`accept`) or as a near miss (`close`). Single words are
 * held to the typing standard: only an exact (accent-insensitive) match is correct, and one
 * edit in a word of 4+ letters is a near miss. Phrases are longer and read less cleanly from
 * ink, so about one edit per ten letters is accepted and about one per five is a near miss.
 */
export function editBudget(
  kind: "term" | "phrase",
  length: number,
): { accept: number; close: number } {
  if (kind === "term") return { accept: 0, close: length >= 4 ? 1 : 0 };
  return {
    accept: length >= 8 ? Math.max(1, Math.floor(length / 10)) : 0,
    close: length >= 4 ? Math.max(1, Math.floor(length / 5)) : 0,
  };
}

/**
 * Compares the text read from the learner's handwriting with the expected answer.
 * Accent- and case-insensitive for Latin scripts, exact for other scripts (the same rule as
 * typing), with the small phrase leniency from `editBudget`.
 */
export function checkHandwritten(
  recognized: string,
  expected: string,
  kind: "term" | "phrase",
): HandwritingCheck {
  const read = normalizeRead(recognized ?? "", expected);
  if (!read) return { verdict: "empty", distance: Number.POSITIVE_INFINITY, accepted: false };
  if (isCorrectTypedAnswer(recognized, expected)) {
    return { verdict: "correct", distance: 0, accepted: true };
  }

  let best = Number.POSITIVE_INFINITY;
  let bestLength = 0;
  for (const form of expectedForms(expected)) {
    const distance = editDistance(read, form);
    if (distance < best) {
      best = distance;
      bestLength = Array.from(form).length;
    }
  }
  const budget = editBudget(kind, bestLength);
  if (best <= budget.accept) return { verdict: "correct", distance: best, accepted: true };
  if (best <= budget.close) return { verdict: "close", distance: best, accepted: false };
  return { verdict: "wrong", distance: best, accepted: false };
}
