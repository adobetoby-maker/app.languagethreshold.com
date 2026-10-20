// Built by TAC — 2026-10-19
// Pure core of data-driven Core 60 stages: the stage file format (one JSON file per Foundation or
// Master module, written by the generator), its conversion into the app's ModuleCurriculum, and the
// derivation of a stage's catalog entry (AppModule) from its trade's Core 30 module. No React, no
// network, no file system: the app loader (src/data/core60-stages.ts), the validator
// (src/lib/core60-validate.ts, scripts/validate-core60.mts) and the node tests share it.
// Roofing's two stages stay hand-written in TypeScript (foundation-/master-roofing-curriculum.ts);
// this format reproduces them exactly (tests/core60-stage-data.test.mjs).
// Contract for the generator: docs/core60-architecture.md.

import type { Lesson, LessonGrammar, LessonWord, ModuleCurriculum } from "../data/curriculum.ts";
import type { AppModule } from "../data/modules.ts";
import { r, sp, wm } from "../data/curriculum-helpers.ts";
import { languageTag } from "./lesson-words-core.ts";

export const CORE60_STAGE_FILE_VERSION = 1;

export type Core60StageKind = "foundation" | "master";

/** Lessons per stage file: a Foundation has 10, a Master 20. */
export const CORE60_STAGE_LESSONS: Record<Core60StageKind, number> = { foundation: 10, master: 20 };

export const CORE60_LESSON_TYPES = ["Teach-back", "Case", "People", "Document", "Capstone"] as const;
export const CORE60_BLOCKS = ["A", "B", "C", "D", "E"] as const;

// ─── File format ─────────────────────────────────────────────────────────────

/** One lesson of a stage file. `words` use the LessonWord convention: `es` = target, `en` = native. */
export interface Core60StageLesson {
  n: number;
  title: string;
  objective: string;
  /** Foundation: the sound or grammar focus the Reader step listens for. Master: defaults to grammar.focus. */
  focus?: string;
  words: LessonWord[];
  /** The Say it mission brief (the Speak step's instruction). */
  speaking: string;
  /** Master only (required there). */
  grammar?: LessonGrammar;
  lessonType?: NonNullable<Lesson["lessonType"]>;
  block?: NonNullable<Lesson["block"]>;
}

/** src/data/core60/<langCode>/<stage>-<base>.json */
export interface Core60StageFile {
  version: typeof CORE60_STAGE_FILE_VERSION;
  /** The stage module id: "foundation-<base>" or "master-<base>". */
  module: string;
  /** The trade's Core 30 module id. */
  baseModule: string;
  stage: Core60StageKind;
  /** Target language of the words (the language being learned). */
  language: string;
  nativeLanguage: string;
  headline: string;
  threshold: string;
  /** True only once a native-speaker reviewer signed the content. */
  reviewed: boolean;
  model?: string;
  generatedAt?: string;
  lessons: Core60StageLesson[];
}

// ─── Manifest ────────────────────────────────────────────────────────────────

/** Optional catalog text for one stage; anything left out is derived from the base module. */
export interface Core60ManifestStage {
  blurb?: string;
  userRole?: string;
  challengePrompts?: string[];
  vocabFocus?: string[];
}

/** One trade's stages (src/data/core60/manifest.ts). A missing stage shows "Coming soon" on the path. */
export interface Core60ManifestEntry {
  /** The trade's Core 30 module id ("electrician"). */
  base: string;
  /** Target language of both stage files ("Spanish"); also the only language the stages are offered in. */
  language: string;
  /** Short trade name on the path card and eyebrow; defaults to the base module's name. */
  tradeLabel?: string;
  foundation?: Core60ManifestStage;
  master?: Core60ManifestStage;
}

export function stageModuleId(stage: Core60StageKind, base: string): string {
  return `${stage}-${base}`;
}

/** Path of a stage file relative to the stage data root: "es/foundation-electrician.json". */
export function stageFileRelativePath(language: string, moduleId: string): string {
  return `${languageTag(language)}/${moduleId}.json`;
}

/** The manifest entry and stage a module id belongs to, or null. */
export function findStageEntry(
  manifest: readonly Core60ManifestEntry[],
  moduleId: string | null | undefined,
): { entry: Core60ManifestEntry; stage: Core60StageKind } | null {
  if (!moduleId) return null;
  for (const entry of manifest) {
    if (entry.foundation && moduleId === stageModuleId("foundation", entry.base))
      return { entry, stage: "foundation" };
    if (entry.master && moduleId === stageModuleId("master", entry.base))
      return { entry, stage: "master" };
  }
  return null;
}

// ─── File → curriculum ───────────────────────────────────────────────────────

const termList = (words: readonly LessonWord[]) =>
  words
    .filter((w) => w.kind === "term")
    .map((w) => w.es)
    .join(", ");

/**
 * The lesson the app runs, built exactly like the hand-written roofing stages: Reader, Word Match
 * and Say it steps (Foundation 5/5/6 minutes, Master 12/8/12), plus grammar/type/block for a Master.
 */
export function stageLessonFromFile(stage: Core60StageKind, lesson: Core60StageLesson): Lesson {
  if (stage === "foundation") {
    return {
      n: lesson.n,
      title: lesson.title,
      objective: lesson.objective,
      words: lesson.words,
      steps: [
        r(`Read the ${lesson.title} passage. Listen for ${lesson.focus ?? ""}.`, 5),
        wm(`Drill and pronounce: ${termList(lesson.words)}.`, 5),
        sp(lesson.speaking, 6),
      ],
    };
  }
  const grammar = lesson.grammar ?? { focus: lesson.focus ?? "", examples: [] };
  return {
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: lesson.words,
    grammar: { focus: grammar.focus, examples: grammar.examples },
    lessonType: lesson.lessonType,
    block: lesson.block,
    steps: [
      r(`Read the ${lesson.title} passage. Grammar focus: ${lesson.focus ?? grammar.focus}.`, 12),
      wm(`Drill and pronounce: ${termList(lesson.words)}.`, 8),
      sp(lesson.speaking, 12),
    ],
  };
}

export function stageCurriculumFromFile(file: Core60StageFile): ModuleCurriculum {
  return {
    moduleId: file.module,
    headline: file.headline,
    threshold: file.threshold,
    lessons: file.lessons.map((lesson) => stageLessonFromFile(file.stage, lesson)),
  };
}

const str = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/**
 * Structural check for an untrusted parsed file before the app uses it: the right version, module,
 * stage and language, and lessons that can be rendered. Null when unusable. The full quality rules
 * (counts, word limits, required Master fields) run in validateStageFile, in the CLI and tests.
 */
export function parseStageFile(
  raw: unknown,
  expected: { moduleId: string; stage: Core60StageKind; language: string },
): Core60StageFile | null {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as Record<string, unknown>;
  if (file.version !== CORE60_STAGE_FILE_VERSION) return null;
  if (file.module !== expected.moduleId || file.stage !== expected.stage) return null;
  if (file.language !== expected.language) return null;
  if (!str(file.headline) || !str(file.threshold) || !Array.isArray(file.lessons)) return null;
  const lessons = file.lessons as unknown[];
  if (lessons.length === 0) return null;
  for (const lesson of lessons) {
    if (!lesson || typeof lesson !== "object") return null;
    const l = lesson as Record<string, unknown>;
    if (!Number.isInteger(l.n) || !str(l.title) || !str(l.objective) || !str(l.speaking)) return null;
    if (!Array.isArray(l.words)) return null;
  }
  return raw as Core60StageFile;
}

// ─── Catalog entry derivation ────────────────────────────────────────────────

/**
 * The Master rule already used by master-roofing, worded for any trade: one unannounced
 * complication per mission that the learner must handle in the target language.
 */
export function masterComplicationRule(language: string): string {
  return `In every mission, introduce ONE realistic complication partway through that the learner was not told about (for example a hidden problem on the job, an objection from the other person, a missing material or document, or a safety issue) and expect the learner to handle it in ${language}. Stay in character, keep a normal speaking pace, and ask the learner to clarify when their ${language} is vague.`;
}

/** The patient A1 rule a Foundation persona adds to its trade's persona. */
export function foundationBeginnerRule(language: string): string {
  return `The learner is a true beginner: be patient and speak simple, slow A1 ${language} in short sentences with common words from this work. Offer English help only when the learner is stuck, then return to ${language} right away.`;
}

/**
 * A stage's AppModule, derived from its trade's Core 30 module: "<Base name> Foundation" (free,
 * patient A1 persona) or "<Base name> Master" (base price, base persona + the complication rule).
 * Offered only in the entry's language. Manifest catalog text overrides the derived defaults.
 */
export function deriveStageModule(
  base: AppModule,
  entry: Core60ManifestEntry,
  stage: Core60StageKind,
): AppModule {
  const own = (stage === "foundation" ? entry.foundation : entry.master) ?? {};
  const language = entry.language;
  const foundation = stage === "foundation";
  const derived: AppModule = {
    id: stageModuleId(stage, base.id),
    name: `${base.name} ${foundation ? "Foundation" : "Master"}`,
    emoji: base.emoji,
    category: base.category,
    blurb:
      own.blurb ??
      (foundation
        ? `Ten short, free beginner lessons: sounds, numbers, the verbs you need first, questions and polite requests, taught with ${base.name} words before ${base.name} Lesson 1.`
        : `Twenty advanced ${base.name} lessons for the day that doesn't go as planned: teach, explain, handle a problem and report it in ${language}.`),
    priceCents: foundation ? 0 : base.priceCents,
    languages: [language as NonNullable<AppModule["languages"]>[number]],
    aiPersona: foundation
      ? `${base.aiPersona} ${foundationBeginnerRule(language)}`
      : `${base.aiPersona} Speak natural B1-B2 ${language}. ${masterComplicationRule(language)}`,
    userRole:
      own.userRole ??
      (foundation ? `Beginner learning ${language} for ${base.name}` : `${base.userRole} leading in ${language}`),
    challengePrompts: own.challengePrompts ?? [...base.challengePrompts],
    vocabFocus: own.vocabFocus ?? [...base.vocabFocus],
  };
  if (base.learnDirection) derived.learnDirection = base.learnDirection;
  if (base.nativeLanguages) derived.nativeLanguages = [...base.nativeLanguages];
  return derived;
}

/**
 * The catalog with every manifest stage inserted right after its base module (Foundation, then
 * Master). Ids already in the catalog (hand-written stages such as roofing's) are never replaced,
 * and an entry whose base module is missing is skipped.
 */
export function withDerivedStageModules(
  modules: readonly AppModule[],
  manifest: readonly Core60ManifestEntry[],
): AppModule[] {
  const ids = new Set(modules.map((m) => m.id));
  const out: AppModule[] = [];
  for (const module of modules) {
    out.push(module);
    for (const entry of manifest) {
      if (entry.base !== module.id) continue;
      for (const stage of ["foundation", "master"] as const) {
        if (!entry[stage]) continue;
        const id = stageModuleId(stage, module.id);
        if (ids.has(id)) continue;
        ids.add(id);
        out.push(deriveStageModule(module, entry, stage));
      }
    }
  }
  return out;
}
