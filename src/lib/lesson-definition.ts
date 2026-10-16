import { getCurriculum, type Lesson, type LessonWord } from "../data/curriculum.ts";
import { roofingTeachingSettings, type RoofingTeachingSettings } from "../data/roofing-teaching.ts";
import { CORE30_WAYS, type Core30Way } from "./core30-plan.ts";

/** The same objective identity is used by lessons, practice evidence and assessment mappings. */
export function lessonObjectiveId(moduleId: string, lessonNumber: number): string {
  if (
    !/^[a-z][a-z0-9-]{0,79}$/.test(moduleId) ||
    !Number.isInteger(lessonNumber) ||
    lessonNumber < 1
  )
    throw new Error("Invalid lesson identity.");
  return `${moduleId}.lesson.${lessonNumber}`;
}
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
  const words = roofingTrack ? (source.words ?? []) : [];
  const gaps: string[] = [];
  if (!roofingTrack)
    gaps.push(
      "Reviewed vocabulary, contextual passages and teaching settings for this language track are not yet mapped.",
    );
  if (!words.length) gaps.push("No reviewed lesson word list in the shared definition.");
  gaps.push(
    "Activity settings require runtime wiring and review; offline assets and release approval are pending.",
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
    teaching: roofingTrack ? roofingTeachingSettings(lessonNumber) : null,
    readiness: "draft",
    gaps,
  };
}
