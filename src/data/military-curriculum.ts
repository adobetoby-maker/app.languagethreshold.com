import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sb, sp } from "./curriculum-helpers.ts";
import core from "./military-core.json" with { type: "json" };

/** English target / Spanish scaffold, matching the shared lesson-word convention. */
export const MILITARY_CURRICULUM: ModuleCurriculum = {
  moduleId: "military",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((lesson) => ({
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: lesson.words as LessonWord[],
    steps: [
      r(
        `Read ${lesson.title}. Explain the key terms in plain English, then check the Spanish meaning.`,
        7,
      ),
      wm(
        "Match the English terms to their Spanish meanings; read the English definitions aloud.",
        5,
      ),
      sb(
        "Build a clear explanation and a request for clarification using this lesson's phrases.",
        5,
      ),
      sp(lesson.speaking, 7),
    ],
  })),
};
