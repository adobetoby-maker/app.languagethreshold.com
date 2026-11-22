// Built by TAC — 2026-11-21
// Which side of an authored lesson word a speaking mission shows. A curriculum LessonWord has two
// fields, `es` and `en` (src/data/curriculum.ts): the authored source language and its meaning. They
// are the only two columns that exist, so only a mission in one of those two languages can be filled
// from them. A mission in any other language gets no form from here (callers fall back to the
// pack's catalog lines or to nothing); it must never be handed the other side as its own words.

import { historicalCoursePair, packCodeOf, sameLanguage } from "../data/language-packs/registry.ts";
import type { AppModule } from "../data/modules.ts";
import type { LessonWord } from "../data/curriculum.ts";

/**
 * LessonWord's two columns (property names, not language codes): the first holds the authored
 * target text, the second its meaning. Words without an authoredPair are written in the historical
 * course pair, so its target is the first column and its native the second.
 */
type LessonWordField = Extract<keyof LessonWord, "es" | "en">;
const LESSON_WORD_FIELDS: readonly [LessonWordField, LessonWordField] = ["es", "en"];

/** The lesson-word column that holds `language`, or null when no authored column is that language. */
export function lessonWordField(language: string): LessonWordField | null {
  const pair = historicalCoursePair();
  const [targetField, nativeField] = LESSON_WORD_FIELDS;
  if (sameLanguage(language, pair.target)) return targetField;
  return packCodeOf(language) !== null && sameLanguage(language, pair.native) ? nativeField : null;
}

/**
 * The form of `word` a mission in `language` should show for `module`, or null when the lesson
 * words carry no column for that language. A module that names its authored pair shows the first
 * column for its target and the second for its native language; one that does not is read by the
 * two columns above, the authored target taking the first.
 */
export function lessonWordForm(
  module: Pick<AppModule, "authoredPair" | "learnDirection">,
  language: string,
  word: LessonWord,
): string | null {
  const [sourceField, meaningField] = LESSON_WORD_FIELDS;
  if (module.authoredPair) {
    if (sameLanguage(language, module.authoredPair.target)) return word[sourceField];
    return sameLanguage(language, module.authoredPair.native) ? word[meaningField] : null;
  }
  const own = lessonWordField(language);
  if (!own) return null;
  const authoredTarget = module.learnDirection === "en-target" ? meaningField : sourceField;
  return own === authoredTarget ? word[sourceField] : word[meaningField];
}

/**
 * A word as a learner of `language` meets it: its own column as the target and the other column as
 * the meaning. Null when no lesson-word column is that language.
 */
export function lessonWordPair(
  language: string,
  word: LessonWord,
): { target: string; meaning: string } | null {
  const own = lessonWordField(language);
  if (!own) return null;
  const other = LESSON_WORD_FIELDS.find((field) => field !== own) ?? own;
  return { target: word[own], meaning: word[other] };
}
