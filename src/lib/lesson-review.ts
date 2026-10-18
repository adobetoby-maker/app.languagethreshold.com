import { getCurriculum, type LessonStep } from "../data/curriculum.ts";
import {
  getLessonDefinition,
  modulePracticeVersion,
  type LessonDefinition,
} from "./lesson-definition.ts";
import {
  pickContentWords,
  pickContentPassage,
  pickContentVerbs,
  type LessonContentFile,
  type LessonVerb,
} from "./lesson-content-core.ts";

export interface GeneratedReviewMaterial {
  file: LessonContentFile | null;
  source: { path: string; sha256: string } | null;
}

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
  /** Absent in historical snapshots, which remain inspectable but cannot match current material. */
  generatedMaterial?: {
    version: 1;
    sourcePath: string | null;
    sourceSha256: string | null;
    fileReviewedFlag: boolean | null;
  };
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
  > & {
    instructions: LessonStep[];
    speakingMissionReference: string;
    verbs?: LessonVerb[];
    materialSources?: { words: string; reading: string; verbs: string };
  })[];
}

/** Current public practice content only: no exam items, accepted keys or learner records. */
export function lessonReviewSnapshot(
  moduleId: string,
  target: string,
  native: string,
  generated?: GeneratedReviewMaterial,
): LessonReviewSnapshot | null {
  const curriculum = getCurriculum(moduleId);
  if (!curriculum) return null;
  if (
    generated?.file &&
    (generated.file.module !== moduleId ||
      generated.file.language !== target ||
      generated.file.nativeLanguage !== native ||
      !generated.source)
  )
    throw new Error("Generated lesson review material does not match this track.");
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
    const generatedWords = pickContentWords(generated?.file, lesson.n, native);
    const generatedPassage = pickContentPassage(generated?.file, lesson.n, native);
    const words = definition.words.length ? definition.words : (generatedWords ?? []);
    const reading =
      definition.reading ??
      (generatedPassage
        ? {
            title: generatedPassage.title,
            sentences: generatedPassage.target.map((target, i) => ({
              target,
              native: generatedPassage.native[i] ?? "",
            })),
          }
        : null);
    const verbs = pickContentVerbs(generated?.file, lesson.n, native);
    return {
      id: definition.id,
      objectiveId: definition.objectiveId,
      lessonNumber: definition.lessonNumber,
      title: definition.title,
      objective: definition.objective,
      prerequisites: [...definition.prerequisites],
      expectedMinutes: definition.expectedMinutes,
      words: words.map((word) => ({ ...word })),
      reading: structuredClone(reading),
      modes: [...definition.modes],
      teaching: structuredClone(definition.teaching),
      listeningItems: (definition.teaching && definition.teaching.stage !== "supported"
        ? definition.listeningItems
        : words
      ).map((word) => ({ ...word })),
      gaps: [...definition.gaps],
      instructions: lesson.steps.map((step) => ({ ...step })),
      speakingMissionReference: `scenario_version_${moduleId}_lesson_${lesson.n}_`,
      ...(generated
        ? {
            verbs: structuredClone(verbs ?? []),
            materialSources: {
              words: definition.words.length
                ? "shared-definition"
                : generatedWords
                  ? "generated-content"
                  : "unmapped-fallback",
              reading: definition.reading
                ? "shared-definition"
                : generatedPassage
                  ? "generated-content"
                  : "unmapped-library-fallback",
              verbs: verbs?.length ? "generated-content" : "unmapped",
            },
          }
        : {}),
    };
  });
  const gaps = [
    "This is a current app snapshot, not a human review, release approval or runtime/offline verification.",
  ];
  if (generated)
    gaps.push(
      "Generated materials are draft sources. A file review flag is not curriculum/domain approval, verified audio, runtime acceptance or release verification. Unmapped library, deck and on-demand fallbacks require separate mapping before release.",
    );
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
    ...(generated
      ? {
          generatedMaterial: {
            version: 1 as const,
            sourcePath: generated.source?.path ?? null,
            sourceSha256: generated.source?.sha256 ?? null,
            fileReviewedFlag: generated.file?.reviewed ?? null,
          },
        }
      : {}),
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
