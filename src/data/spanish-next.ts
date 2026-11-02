import core from "./spanish-next-core.json" with { type: "json" };
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sp } from "./curriculum-helpers.ts";
import { spanishBasicsLesson } from "./spanish-basics.ts";

export const SPANISH_NEXT_IDS = Object.keys(core);
export const SPANISH_NEXT_CURRICULA: Record<string, ModuleCurriculum> = Object.fromEntries(
  Object.entries(core).map(([moduleId, definition]) => [
    moduleId,
    {
      moduleId,
      headline: definition.headline,
      threshold: definition.threshold,
      lessons: definition.lessons.map((lesson) => ({
        n: lesson.n,
        title: lesson.title,
        objective: lesson.objective,
        words: lesson.words as LessonWord[],
        grammar: spanishBasicsLesson(moduleId, lesson.n)!.grammar,
        steps: [
          r(`Read ${lesson.title}, notice the examples, and explain the grammar in English.`, 6),
          wm(
            "Recall the vocabulary and practice the forms without the model. Check errors and retry.",
            6,
          ),
          sp(lesson.speaking, 8),
        ],
      })),
    },
  ]),
);
