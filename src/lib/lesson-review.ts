import { getCurriculum, type LessonStep } from "../data/curriculum.ts";
import {
  getLessonDefinition,
  modulePracticeVersion,
  type LessonDefinition,
} from "./lesson-definition.ts";

export interface LessonReviewSnapshot {
  schema: 1;
  moduleId: string;
  title: string;
  targetLanguage: string;
  instructionLanguage: string;
  sourceVersion: string;
  status: "current-app-draft";
  requiredLessons: 30;
  gaps: string[];
  lessons: (Pick<
    LessonDefinition,
    | "id"
    | "objectiveId"
    | "lessonNumber"
    | "title"
    | "objective"
    | "prerequisites"
    | "expectedMinutes"
    | "words"
    | "reading"
    | "modes"
    | "teaching"
    | "listeningItems"
    | "gaps"
  > & { instructions: LessonStep[]; speakingMissionReference: string })[];
}

/** Current public practice content only: no exam items, accepted keys or learner records. */
export function lessonReviewSnapshot(
  moduleId: string,
  target: string,
  native: string,
): LessonReviewSnapshot | null {
  const curriculum = getCurriculum(moduleId);
  if (!curriculum) return null;
  const sourceVersion = modulePracticeVersion(moduleId, target, native);
  const lessons = curriculum.lessons.map((lesson) => {
    const definition = getLessonDefinition({
      moduleId,
      lessonNumber: lesson.n,
      targetLanguage: target,
      instructionLanguage: native,
      contentVersion: sourceVersion,
    });
    if (!definition) throw new Error("Lesson definition is missing.");
    return {
      id: definition.id,
      objectiveId: definition.objectiveId,
      lessonNumber: definition.lessonNumber,
      title: definition.title,
      objective: definition.objective,
      prerequisites: [...definition.prerequisites],
      expectedMinutes: definition.expectedMinutes,
      words: definition.words.map((word) => ({ ...word })),
      reading: structuredClone(definition.reading),
      modes: [...definition.modes],
      teaching: structuredClone(definition.teaching),
      listeningItems: definition.listeningItems.map((word) => ({ ...word })),
      gaps: [...definition.gaps],
      instructions: lesson.steps.map((step) => ({ ...step })),
      speakingMissionReference: `scenario_version_${moduleId}_lesson_${lesson.n}_`,
    };
  });
  const gaps = [
    "This is a current app snapshot, not a human review, release approval or runtime/offline verification.",
  ];
  if (lessons.length !== 30)
    gaps.push(`${lessons.length} lesson plans are present; the module standard requires 30.`);
  return {
    schema: 1,
    moduleId,
    title: curriculum.headline,
    targetLanguage: target,
    instructionLanguage: native,
    sourceVersion,
    status: "current-app-draft",
    requiredLessons: 30,
    gaps,
    lessons,
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

/** Identity for the exact displayed material; this hash is not an approval or signature. */
export async function lessonReviewFingerprint(snapshot: LessonReviewSnapshot): Promise<string> {
  const bytes = new TextEncoder().encode(serializeLessonReviewSnapshot(snapshot));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Preserve these exact UTF-8 bytes when freezing a review snapshot. */
export function serializeLessonReviewSnapshot(snapshot: LessonReviewSnapshot): string {
  return JSON.stringify(canonical(snapshot));
}
