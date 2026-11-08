import core from "./place-directions-core.json" with { type: "json" };
import practice from "./place-directions-practice.json" with { type: "json" };
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sb, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
export const PLACE_VERSION = "place-directions-es-en-2026-11-08-draft";
export function placeLesson(moduleId: string, n: number, target = "Spanish", native = "English") {
  if (
    target !== "Spanish" ||
    native !== "English" ||
    !Number.isInteger(n) ||
    !Object.hasOwn(practice, moduleId)
  )
    return null;
  return (
    (practice as Record<string, Record<string, (typeof practice)["place-directions"]["1"]>>)[
      moduleId
    ]?.[String(n)] ?? null
  );
}
export function placeTeaching(moduleId: string, n: number) {
  const l = placeLesson(moduleId, n);
  return l
    ? lessonTeachingSettings(
        l.stage === "foundation" ? 1 : l.stage === "master" ? 30 : n,
        l.speaking,
      )
    : null;
}
export const PLACE_CURRICULUM: ModuleCurriculum = {
  moduleId: "place-directions",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((l) => ({
    n: l.n,
    title: l.title,
    objective: l.objective,
    words: l.words as LessonWord[],
    readingTemplate: l.readingTemplate,
    steps: [
      r(`Read the placement exchange and identify the destination: ${l.focus}.`, 5),
      wm("Match the position words and instructions to their English meanings.", 5),
      sb("Build an instruction, then describe the final position.", 5),
      sp(l.speaking, 7),
    ],
  })),
};
