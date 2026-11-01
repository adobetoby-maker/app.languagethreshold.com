import practice from "./military-practice.json" with { type: "json" };
import { lessonTeachingSettings } from "../lib/teaching-settings.ts";

interface MilitaryPractice {
  stage: "foundation" | "core" | "master";
  reading: { title: string; target: string[]; native: string[] };
  speaking: string;
  openingLine: string;
  partnerRole: string;
}

export const MILITARY_PRACTICE_VERSION = "military-en-es-2026-11-01-draft";

export function militaryLessonPractice(moduleId: string, n: number): MilitaryPractice | null {
  if (!Object.hasOwn(practice, moduleId) || !Number.isInteger(n)) return null;
  const module = practice[moduleId as keyof typeof practice] as Record<string, MilitaryPractice>;
  return module[String(n)] ?? null;
}

export function militaryTeachingSettings(moduleId: string, n: number) {
  const lesson = militaryLessonPractice(moduleId, n);
  if (!lesson) return null;
  // Foundation keeps support visible. Core fades it over three blocks;
  // Master uses connected responses and on-request help from its first lesson.
  const progression = lesson.stage === "foundation" ? 1 : lesson.stage === "master" ? 30 : n;
  return lessonTeachingSettings(progression, lesson.speaking);
}
