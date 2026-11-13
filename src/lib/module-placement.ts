import type { LessonWord } from "../data/curriculum.ts";
import { normalizeAssessmentAnswer } from "./assessments/core.ts";
import { seededUnit } from "./exams2/hash.ts";

/** Independent study placement, not a supervised exam or a proficiency certificate. */
export const PLACEMENT_VERSION = "module-placement-v1";
export interface PlacementLesson {
  moduleId: string;
  n: number;
  title: string;
  stage: string;
  words: LessonWord[];
  checks: { prompt: string; hint: string; answer: string }[];
}
export interface PlacementQuestion {
  id: string;
  lesson: number;
  type: "choice" | "typed";
  prompt: string;
  hint?: string;
  options?: string[];
  answer: string;
}
export interface PlacementBlock {
  lessons: PlacementLesson[];
  questions: PlacementQuestion[];
}
const normalize = (s: string) =>
  normalizeAssessmentAnswer(s, {
    accents: "required",
    caseSensitive: false,
    punctuation: "ignore",
  });
function shuffled<T>(values: T[], seed: string): T[] {
  return values
    .map((value, i) => ({ value, rank: seededUnit(`${seed}:${i}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map((row) => row.value);
}

/** Fail closed at a coverage gap. Never borrow words from another lesson or language. */
export function placementBlocks(lessons: PlacementLesson[], seed: string): PlacementBlock[] {
  const blocks: PlacementBlock[] = [];
  for (const lesson of lessons) {
    const words = lesson.words.filter(
      (w, i, all) =>
        w.es.trim() &&
        w.en.trim() &&
        all.findIndex(
          (other) =>
            normalize(other.en) === normalize(w.en) || normalize(other.es) === normalize(w.es),
        ) === i,
    );
    const checks = lesson.checks.filter(
      (c) => c.prompt.includes("____") && c.answer.trim() && c.hint.trim(),
    );
    if (!checks.length) break;
    const check = shuffled(checks, `${seed}:${lesson.moduleId}:${lesson.n}:check`)[0];
    const cues = (text: string) => ` ${normalize(text)} `.includes(` ${normalize(check.answer)} `);
    const uncued = words.filter((w) => !cues(w.es) && !cues(w.en));
    const choices = shuffled(
      uncued.filter((w) => w.kind === "phrase"),
      `${seed}:${lesson.moduleId}:${lesson.n}:phrases`,
    );
    const pool =
      choices.length >= 4
        ? choices
        : shuffled(uncued, `${seed}:${lesson.moduleId}:${lesson.n}:words`);
    if (pool.length < 4) break;
    let block = blocks.at(-1);
    if (!block || block.lessons.length === 5 || block.lessons[0].moduleId !== lesson.moduleId) {
      block = { lessons: [], questions: [] };
      blocks.push(block);
    }
    const lessonIndex = block.lessons.length;
    block.lessons.push(lesson);
    const selected = pool[0];
    block.questions.push(
      {
        id: `${lesson.moduleId}.${lesson.n}.meaning`,
        lesson: lessonIndex,
        type: "choice",
        prompt: `Choose the meaning: ${selected.es}`,
        options: shuffled(
          pool.slice(0, 4).map((w) => w.en),
          `${seed}:${lesson.moduleId}:${lesson.n}:options`,
        ),
        answer: selected.en,
      },
      {
        id: `${lesson.moduleId}.${lesson.n}.use`,
        lesson: lessonIndex,
        type: "typed",
        prompt: check.prompt,
        hint: check.hint,
        answer: check.answer,
      },
    );
  }
  return blocks;
}
export function placementCorrect(question: PlacementQuestion, response: string): boolean {
  if (!response.trim()) return false;
  const actual = normalize(response);
  if (actual === normalize(question.answer)) return true;
  // A fully completed cloze sentence is also a correct response. Require the entire
  // expected sentence, never just an answer word appearing inside arbitrary text.
  return (
    question.type === "typed" &&
    question.prompt.includes("____") &&
    actual === normalize(question.prompt.replace("____", question.answer))
  );
}
export function placementBlockScore(block: PlacementBlock, responses: Record<string, string>) {
  const answered = block.questions.every((q) => Object.hasOwn(responses, q.id));
  const correct = block.questions.filter((q) => placementCorrect(q, responses[q.id] ?? "")).length;
  const typed = block.questions.filter((q) => q.type === "typed");
  const typedCorrect = typed.filter((q) => placementCorrect(q, responses[q.id] ?? "")).length;
  return {
    correct,
    total: block.questions.length,
    passed:
      answered && correct / block.questions.length >= 0.8 && typedCorrect / typed.length >= 0.8,
  };
}
/** Only a contiguous prefix of passed blocks earns optional credit. */
export function placementResult(blocks: PlacementBlock[], responses: Record<string, string>) {
  const credit: PlacementLesson[] = [];
  for (const block of blocks) {
    if (!placementBlockScore(block, responses).passed)
      return { credit, start: block.lessons[0], complete: false };
    credit.push(...block.lessons);
  }
  return { credit, start: null, complete: true };
}

/** Cloze a lesson term (including noun phrases), or a content word in its aligned example. */
export function placementCloze(
  words: LessonWord[],
  examples: { target: string; native: string }[],
) {
  const terms = words.filter((w) => w.kind === "term").sort((a, b) => b.es.length - a.es.length);
  const result: PlacementLesson["checks"] = [];
  for (const example of examples) {
    const termsInOrder = terms.flatMap((w) => [
      w.es,
      w.es.replace(/^(?:el|la|los|las|un|una|the|a|an) /i, ""),
    ]);
    let answer: string | undefined;
    for (const term of termsInOrder) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      answer = example.target.match(
        new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, "iu"),
      )?.[0];
      if (answer) break;
    }
    // Some beginners' greetings have no glossary noun. Test contextual recall of an
    // actual word in the aligned sentence rather than inventing a translation key.
    answer ??= (example.target.match(/\p{L}[\p{L}\p{M}'’-]*/gu) ?? [])
      .filter((token) => token.length >= 3)
      .sort((a, b) => b.length - a.length)[0];
    if (!answer) continue;
    const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prompt = example.target.replace(
      new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, "u"),
      "____",
    );
    if (prompt !== example.target) result.push({ prompt, hint: example.native, answer });
  }
  return result;
}
