import { conjugationItems, type LessonVerb } from "./lesson-content-core.ts";
export type LessonVerbGame = "infinitives" | "conjugations";
export interface VerbGameQuestion {
  prompt: string;
  meaning: string;
  answer: string;
  choices: string[];
  explanation: string;
}
/** Only the lesson's authored forms; ambiguous infinitives are never distractors. */
export function lessonVerbQuestions(
  verbs: readonly LessonVerb[],
  language: string,
  mode: LessonVerbGame,
): VerbGameQuestion[] {
  return conjugationItems(verbs, language).flatMap((item) => {
    const answer = mode === "infinitives" ? item.verb.infinitive : item.expected;
    const candidates =
      mode === "infinitives"
        ? verbs
            .filter((verb) => !Object.values(verb.forms).includes(item.expected))
            .map((verb) => verb.infinitive)
        : [...Object.values(item.verb.forms), ...verbs.map((verb) => verb.forms[item.key])];
    const alternatives = [...new Set(candidates)]
      .filter((value) => value && value !== answer)
      .slice(0, 3);
    if (!alternatives.length) return [];
    const choices = [...alternatives, answer].sort((a, b) => a.localeCompare(b));
    return [
      {
        prompt:
          mode === "infinitives"
            ? `${item.pronoun} · ${item.expected}`
            : `${item.pronoun} · ${item.verb.infinitive}`,
        meaning: item.verb.native,
        answer,
        choices,
        explanation: `${item.pronoun} + ${item.verb.infinitive} → ${item.expected}`,
      },
    ];
  });
}
