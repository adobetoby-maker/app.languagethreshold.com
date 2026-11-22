import type { LanguagePack } from "../data/language-packs/types.ts";
import { normalizeKey } from "./language-pack-text.ts";

/**
 * Language-neutral key for a displayed grammar option (the server uses it to spot duplicate
 * options; it never grades a learner).
 */
export function normalizeGrammarAnswer(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?¿¡«»"'()[\]]+$/g, "")
    .replace(/^[¿¡«"'([]+/g, "");
}

/**
 * Comparison form for a quiz answer in this pack: the pack's own normalization (Unicode form,
 * curly and straight apostrophes, no-break and thin spaces, locale lowercase, trailing and leading
 * punctuation) and nothing else. Marks stay significant: a quiz answer is graded as written.
 */
export function grammarAnswerKey(s: string, pack: LanguagePack): string {
  return normalizeKey(s, pack)
    .replace(/[.,;:!?¿¡«»"“”()[\]]+$/gu, "")
    .replace(/^[¿¡«"“”([]+/gu, "")
    .trim();
}

export function isCorrectGrammarAnswer(input: string, answer: string, pack: LanguagePack): boolean {
  return grammarAnswerKey(input, pack) === grammarAnswerKey(answer, pack);
}
