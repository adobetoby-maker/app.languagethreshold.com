import { conjugationItems, type LessonVerb } from "./lesson-content-core.ts";
import type { SpanishPattern } from "../data/spanish-basics.ts";
export interface LessonGameItem {
  id: string;
  prompt: string;
  answer: string;
  meaning: string;
}
export interface LessonGameBank {
  label: string;
  meanings: LessonGameItem[];
  forms: LessonGameItem[];
}
/** The authored pattern overrides present reference tables, never the other way around. */
export function lessonGameBank(
  verbs: readonly LessonVerb[],
  language: string,
  pattern?: SpanishPattern,
): LessonGameBank {
  const source = pattern?.verbs ?? verbs;
  const meanings = source.map((v) => ({
    id: v.infinitive,
    prompt: v.native,
    answer: v.infinitive,
    meaning: v.native,
  }));
  const forms = pattern
    ? pattern.verbs.flatMap((v) =>
        Object.entries(v.forms).map(([person, answer]) => ({
          id: `${v.infinitive}:${person}`,
          prompt: `${person.replaceAll("_", " / ")} · ${v.infinitive}`,
          answer,
          meaning: v.native,
        })),
      )
    : conjugationItems(verbs, language).map((v) => ({
        id: `${v.verb.infinitive}:${v.key}`,
        prompt: `${v.pronoun} · ${v.verb.infinitive}`,
        answer: v.expected,
        meaning: v.verb.native,
      }));
  return {
    label: pattern?.title ?? "Present tense",
    meanings,
    forms: forms.filter((v) => v.answer.trim()),
  };
}
export function gameAnswer(
  expected: string,
  actual: string,
  subjects: readonly string[] = [],
): boolean {
  const normalize = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase();
  const answer = normalize(actual),
    wanted = normalize(expected);
  if (answer === wanted) return true;
  const alternatives = subjects.flatMap((subject) => [
    subject,
    ...(subject === "nosotros"
      ? ["nosotras"]
      : subject === "vosotros"
        ? ["vosotras"]
        : subject === "ellos"
          ? ["ellas"]
          : []),
  ]);
  return alternatives.some((subject) => {
    const prefix = normalize(subject) + " ";
    return answer.startsWith(prefix) && answer.slice(prefix.length).trim() === wanted;
  });
}

export const GAME_LETTERS = [..."abcdefghijklmnñopqrstuvwxyzáéíóúü"];
export function maskedAnswer(answer: string, guesses: readonly string[]): string {
  return [...answer.normalize("NFC")]
    .map((c) =>
      !GAME_LETTERS.includes(c.toLowerCase()) || guesses.includes(c.toLowerCase()) ? c : "＿",
    )
    .join(" ");
}
/** Matching answers must be distinct: shared forms such as era cannot have two apparent matches. */
export function distinctGameItems(items: readonly LessonGameItem[]): LessonGameItem[] {
  const seen = new Set<string>();
  return items.filter((v) => {
    const key = v.answer.normalize("NFC").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Select one answer per authored verb; callers shuffle first to vary the practiced person. */
export function gameRoundItems(items: readonly LessonGameItem[]): LessonGameItem[] {
  const selected: LessonGameItem[] = [];
  const verbs = new Set(items.map((item) => item.id.split(":")[0]));
  const answers = new Set<string>();
  for (const verb of verbs) {
    const item = items.find(
      (item) =>
        item.id.split(":")[0] === verb && !answers.has(item.answer.normalize("NFC").toLowerCase()),
    );
    if (item) {
      selected.push(item);
      answers.add(item.answer.normalize("NFC").toLowerCase());
    }
  }
  return selected.slice(0, 10);
}
