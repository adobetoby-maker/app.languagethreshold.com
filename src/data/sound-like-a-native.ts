import core from "./sound-like-a-native-core.json" with { type: "json" };
import practice from "./sound-like-a-native-practice.json" with { type: "json" };
import families from "./sound-families.json" with { type: "json" };
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";
import type { LessonWord, ModuleCurriculum } from "./curriculum.ts";
import { r, wm, sp } from "./curriculum-helpers.ts";

export interface SoundFamily {
  id: string;
  title: string;
  syllables: string[];
  anchors: string[];
  soundCues?: string[];
  cue: string;
  coaching: {
    zone: string;
    contactOrNarrowing: string;
    tongueAndLips: string;
    airflow: string;
    voicing: string;
    speechExercise: string;
    selfCheck: string;
  };
}
export interface SoundLesson {
  stage: "foundation" | "core" | "master";
  title: string;
  familyId: string;
  familyIds: string[];
  coachingFocus: string;
  reading: { title: string; target: string[]; native: string[] };
  speaking: string;
  openingLine: string;
  partnerRole: string;
  regionalNotes: string[];
  wordAnchors: { target: string; native: string }[];
  phrases: { target: string; native: string }[];
  regionalComparison: boolean;
  recordingStatus: string;
}
export const SOUND_FAMILIES: readonly SoundFamily[] = families;
export const SOUND_PRACTICE_VERSION = "sound-native-es-en-2026-11-02-v1";
const lessons: Record<string, Record<string, SoundLesson>> = practice as Record<
  string,
  Record<string, SoundLesson>
>;
export function soundLesson(
  moduleId: string,
  n: number,
  target = "Spanish",
  native = "English",
): SoundLesson | null {
  if (
    target !== "Spanish" ||
    native !== "English" ||
    !Object.hasOwn(lessons, moduleId) ||
    !Number.isInteger(n)
  )
    return null;
  return lessons[moduleId]?.[String(n)] ?? null;
}
export function soundTeaching(moduleId: string, n: number) {
  const lesson = soundLesson(moduleId, n);
  return lesson
    ? lessonTeachingSettings(
        lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n,
        lesson.speaking,
      )
    : null;
}
export const SOUND_CURRICULUM: ModuleCurriculum = {
  moduleId: "sound-like-a-native",
  headline: core.headline,
  threshold: core.threshold,
  lessons: core.lessons.map((l) => ({
    n: l.n,
    title: l.title,
    objective: l.objective,
    words: l.words as LessonWord[],
    readingTemplate: l.readingTemplate,
    steps: [
      r(l.focus, 5),
      wm(
        "Practise the consonant–vowel patter clearly, then change the pattern and return to real words.",
        5,
      ),
      sp(l.speaking, 7),
    ],
  })),
};
