import { getCurriculum, type Lesson, type LessonWord } from "../data/curriculum.ts";
import { roofingTeachingSettings, type RoofingTeachingSettings } from "../data/roofing-teaching.ts";
import { CORE30_WAYS, type Core30Way } from "./core30-plan.ts";
import { authoredLessonReading } from "./lesson-reading.ts";

export const ROOFING_PRACTICE_VERSION = "roofing-es-en-2026-10-16-draft";

import { lessonObjectiveId } from "./learning-identity.ts";
export { lessonObjectiveId } from "./learning-identity.ts";

export interface LessonDefinition {
  id: string;
  objectiveId: string;
  moduleId: string;
  lessonNumber: number;
  title: string;
  objective: string;
  targetLanguage: string;
  instructionLanguage: string;
  contentVersion: string;
  prerequisites: string[];
  expectedMinutes: number;
  source: Lesson;
  words: LessonWord[];
  modes: readonly Core30Way[];
  teaching: RoofingTeachingSettings | null;
  reading: { title: string; sentences: { target: string; native: string }[] } | null;
  listeningItems: LessonWord[];
  /** Structural coverage is not reviewer approval or a claim that the module is complete. */
  readiness: "draft" | "in-review" | "verified";
  gaps: string[];
}

export function getLessonDefinition(input: {
  moduleId: string;
  lessonNumber: number;
  targetLanguage: string;
  instructionLanguage: string;
  contentVersion: string;
}): LessonDefinition | null {
  const { moduleId, lessonNumber, targetLanguage, instructionLanguage, contentVersion } = input;
  const source = getCurriculum(moduleId)?.lessons.find((l) => l.n === lessonNumber);
  if (!source) return null;
  const roofingTrack =
    moduleId === "roofing" && targetLanguage === "Spanish" && instructionLanguage === "English";
  const words =
    targetLanguage === "Spanish" && instructionLanguage === "English" ? (source.words ?? []) : [];
  const teaching = roofingTrack ? roofingTeachingSettings(lessonNumber) : null;
  const passage = authoredLessonReading(
    moduleId,
    lessonNumber,
    targetLanguage,
    instructionLanguage,
  );
  const reading = passage
    ? {
        title: passage.title,
        sentences: passage.sentences.map(({ target, en }) => ({ target, native: en })),
      }
    : null;
  const listeningItems: LessonWord[] = [];
  if (!teaching || teaching.stage === "supported" || !reading) listeningItems.push(...words);
  else if (teaching && reading) {
    const size = teaching.stage === "independent" ? 2 : 1;
    for (let start = 0; start < reading.sentences.length; start += size) {
      const chunk = reading.sentences.slice(start, start + size);
      listeningItems.push({
        kind: "phrase",
        es: chunk.map((s) => s.target).join(" "),
        en: chunk.map((s) => s.native).join(" "),
      });
    }
  }
  const gaps: string[] = [];
  if (!roofingTrack)
    gaps.push(
      "Reviewed vocabulary, contextual passages and teaching settings for this language track are not yet mapped.",
    );
  if (!words.length) gaps.push("No reviewed lesson word list in the shared definition.");
  gaps.push(
    "Activity settings are wired for this draft; teaching review, offline asset verification and release approval are pending.",
  );
  return {
    id: `${moduleId}.${targetLanguage}.${instructionLanguage}.lesson.${lessonNumber}`,
    objectiveId: lessonObjectiveId(moduleId, lessonNumber),
    moduleId,
    lessonNumber,
    title: source.title,
    objective: source.objective,
    targetLanguage,
    instructionLanguage,
    contentVersion,
    prerequisites: lessonNumber > 1 ? [lessonObjectiveId(moduleId, lessonNumber - 1)] : [],
    expectedMinutes: source.steps.reduce((sum, step) => sum + step.durationMin, 0),
    source,
    words,
    modes: CORE30_WAYS,
    teaching,
    reading,
    listeningItems,
    readiness: "draft",
    gaps,
  };
}
