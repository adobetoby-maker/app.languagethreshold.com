import { readFinanceCourse, type FinancePractice } from "./finance-course-loader.ts";
import type { ModuleCurriculum, LessonWord, LessonGrammar, Lesson } from "./curriculum";
import { r, wm, sb, sp } from "./curriculum-helpers.ts";
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
export const FINANCE_VERSION = "finance-es-en-bidirectional-2026-11-15-draft";

export function financeLesson(
  id: string,
  n: number,
  target: string,
  native: string,
): FinancePractice | null {
  if (!Number.isInteger(n)) return null;
  const lesson = readFinanceCourse(id)?.practice[id]?.[String(n)];
  return lesson?.target === target && lesson.native === native ? lesson : null;
}
export function financeTeaching(id: string, n: number, target: string, native: string) {
  const lesson = financeLesson(id, n, target, native);
  return lesson
    ? lessonTeachingSettings(
        lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n,
        lesson.speaking,
      )
    : null;
}
const curricula = new Map<string, ModuleCurriculum>();
export function getFinanceCurriculum(id: string): ModuleCurriculum | null {
  if (/^(foundation|master)-/.test(id)) return null;
  const c = readFinanceCourse(id)?.core;
  if (!c) return null;
  if (!curricula.has(id))
    curricula.set(id, {
      moduleId: id,
      headline: c.headline,
      threshold: c.threshold,
      lessons: c.lessons.map((l) => ({
        n: l.n,
        title: l.title,
        objective: l.objective,
        words: l.words as LessonWord[],
        readingTemplate: l.readingTemplate,
        grammar: l.grammar as LessonGrammar,
        lessonType: l.lessonType as Lesson["lessonType"],
        block: l.block as Lesson["block"],
        steps: [
          r(`Read ${l.title}. Follow the amounts and the purpose of the exchange.`, 6),
          wm("Match this lesson’s terms and phrases to their meanings.", 5),
          sb("Build a clear question and confirm the amount or next step.", 5),
          sp(l.speaking, 7),
        ],
      })),
    });
  return curricula.get(id)!;
}

export function financeReaderId(
  moduleId: string,
  n: number | undefined,
  target: string,
  native: string,
): string | null {
  return n && financeLesson(moduleId, n, target, native)
    ? `seed-${target === "English" ? "en" : "es"}-${moduleId}-lesson-${n}`
    : null;
}
