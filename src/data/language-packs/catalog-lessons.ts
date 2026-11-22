// Built by TAC — 2026-11-21
// Catalog v2 lessons rendered by the existing lesson screens (language-pack model sections 2 and 5).
// A bundled pack without legacy ids (fr and it, QA builds only) has no hand-written curriculum and no
// /lesson-content file: its lessons come from its catalog. This adapter turns one catalog module into
// what the Core 30 screens already read, per stage:
//   <base>                    the 30 "working" lessons (the Core 30 course)
//   foundation-<base>-<code>  the 10 "foundation" lessons
//   master-<base>-<code>      the 20 "master" lessons
// as a ModuleCurriculum (titles, objectives) and a LessonContentFile (passage, words, verbs), both
// keyed by the lesson's place in its stage (1-based). Nothing here falls back to another language:
// a pack, module or stage the catalog does not have resolves to null.

import { isBundledPack, packFor, type LanguagePack } from "./registry.ts";
import {
  catalogHasModule,
  loadCatalogModule,
  type CatalogLesson,
  type CatalogModule,
} from "./catalog.ts";
import { nativeLanguageName } from "../languages.ts";
import { r, sp, wm } from "../curriculum-helpers.ts";
import type { LessonWord, ModuleCurriculum } from "../curriculum.ts";
import type {
  LessonContentFile,
  LessonContentLesson,
  LessonVerb,
} from "../../lib/lesson-content-core.ts";

export type CatalogStage = "foundation" | "working" | "master";

/** True when a language's lessons come from its pack catalog (not hand-written curricula). */
export function catalogLessonPack(language: string | null | undefined): LanguagePack | null {
  const pack = packFor(language);
  return pack && isBundledPack(pack) && !pack.ids.legacyUnscopedStorage ? pack : null;
}

/** The catalog module and stage an app module id stands for, for this pack. */
export function catalogStageOf(
  moduleId: string,
  pack: LanguagePack,
): { base: string; stage: CatalogStage } | null {
  const suffix = `-${pack.code}`;
  const staged = moduleId.match(/^(foundation|master)-(.+)$/);
  if (!staged) {
    // A Core 30 module whose id another module already uses carries the code: "grammar-fr".
    const unsuffixed = moduleId.endsWith(suffix) ? moduleId.slice(0, -suffix.length) : null;
    return {
      base: unsuffixed && catalogHasModule(pack, unsuffixed) ? unsuffixed : moduleId,
      stage: "working",
    };
  }
  if (!staged[2].endsWith(suffix)) return null;
  return {
    base: staged[2].slice(0, -suffix.length),
    stage: staged[1] as CatalogStage,
  };
}

function stageLessons(module: CatalogModule, stage: CatalogStage): CatalogLesson[] {
  return module.lessons
    .filter((lesson) => lesson.stage === stage)
    .sort((a, b) => a.number - b.number);
}

/** A sentence (it ends with sentence punctuation) is practised as a phrase; anything else as a term. */
function wordKind(target: string): LessonWord["kind"] {
  return /[.?!…]["»”)]?\s*$/u.test(target.trim()) ? "phrase" : "term";
}

function lessonContent(lesson: CatalogLesson): LessonContentLesson {
  const words: LessonWord[] = lesson.items
    .filter((item) => item.target.trim() && item.native.trim())
    .map((item) => {
      const word: LessonWord = { es: item.target, en: item.native, kind: wordKind(item.target) };
      if (item.note) word.note = item.note;
      return word;
    });
  const verbs: LessonVerb[] = (lesson.verbs ?? [])
    .filter((verb) => verb.example?.target && verb.example.native)
    .map((verb) => {
      const out: LessonVerb = {
        infinitive: verb.infinitive,
        native: verb.native,
        forms: { ...verb.forms },
        example: { target: verb.example!.target, native: verb.example!.native },
      };
      if (verb.note) out.note = verb.note;
      return out;
    });
  const content: LessonContentLesson = { verbs };
  if (words.length > 0) content.words = words;
  const passage = (lesson.passage ?? []).filter((line) => line.target.trim() && line.native.trim());
  if (passage.length > 0)
    content.passage = {
      title: lesson.title,
      target: passage.map((line) => line.target),
      native: passage.map((line) => line.native),
    };
  return content;
}

/** The stage's lessons as a lesson content file for `language` (the stored name, e.g. "French"). */
export function catalogContentFile(
  module: CatalogModule,
  stage: CatalogStage,
  moduleId: string,
  language: string,
  pack: LanguagePack,
): LessonContentFile | null {
  const lessons = stageLessons(module, stage);
  const nativeLanguage = nativeLanguageName(pack.native.default);
  if (lessons.length === 0 || !nativeLanguage) return null;
  return {
    version: 1,
    module: moduleId,
    language,
    nativeLanguage,
    reviewed: lessons.every((lesson) => lesson.reviewed === true),
    lessons: Object.fromEntries(lessons.map((lesson, i) => [String(i + 1), lessonContent(lesson)])),
  };
}

/** The stage's lessons as a curriculum (titles and objectives; the practice ways need no steps). */
export function catalogCurriculum(
  module: CatalogModule,
  stage: CatalogStage,
  moduleId: string,
): ModuleCurriculum | null {
  const lessons = stageLessons(module, stage);
  if (lessons.length === 0) return null;
  return {
    moduleId,
    headline: module.title,
    threshold: lessons[lessons.length - 1]?.objective ?? "",
    // The same Reader, Word Match and Say it steps (and minutes) as the Spanish Core 60 stages.
    lessons: lessons.map((lesson, i) => {
      const [read, drill, say] = stage === "foundation" ? [5, 5, 6] : [12, 8, 12];
      const terms = lesson.items
        .filter((item) => item.target.trim() && wordKind(item.target) === "term")
        .map((item) => item.target)
        .join(", ");
      return {
        n: i + 1,
        title: lesson.title,
        objective: lesson.objective,
        steps: [
          r(`Read the ${lesson.title} passage.`, read),
          wm(`Drill and pronounce: ${terms}.`, drill),
          sp(lesson.objective, say),
        ],
      };
    }),
  };
}

// ─── Course practice (grammar checks and ten-verb pattern models) ──────────────

/** One exact cloze gap of a course lesson's check (the BasicsCheck shape). */
export interface CatalogCheck {
  prompt: string;
  hint: string;
  answer: string;
  explanation: string;
}

/** A lesson's ten-verb pattern. `isImperative`: the forms are commands, for the persons listed. */
export interface CatalogPattern {
  id: string;
  title: string;
  isImperative: boolean;
  verbs: { infinitive: string; native: string; forms: Record<string, string> }[];
}

/** The practice a catalog course lesson carries, as its Spanish twin's course lessons do. */
export interface CatalogPractice {
  checks: CatalogCheck[];
  pattern?: CatalogPattern;
}

const text = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

function practiceChecks(raw: unknown): CatalogCheck[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const check = entry as Record<string, unknown>;
    return check &&
      text(check.prompt) &&
      text(check.answer) &&
      typeof check.hint === "string" &&
      typeof check.explanation === "string"
      ? [
          {
            prompt: check.prompt,
            hint: check.hint,
            answer: check.answer,
            explanation: check.explanation,
          },
        ]
      : [];
  });
}

function practicePattern(raw: unknown): CatalogPattern | undefined {
  const pattern = raw as Record<string, unknown> | null;
  if (!pattern || !text(pattern.id) || !text(pattern.title) || !Array.isArray(pattern.verbs))
    return undefined;
  const verbs = pattern.verbs.flatMap((entry) => {
    const verb = entry as Record<string, unknown>;
    const forms = verb?.forms as Record<string, unknown> | undefined;
    if (!verb || !text(verb.infinitive) || typeof verb.native !== "string" || !forms) return [];
    const kept = Object.fromEntries(
      Object.entries(forms).filter((pair): pair is [string, string] => text(pair[1])),
    );
    return Object.keys(kept).length > 0
      ? [{ infinitive: verb.infinitive, native: verb.native, forms: kept }]
      : [];
  });
  return verbs.length > 0
    ? { id: pattern.id, title: pattern.title, isImperative: pattern.isImperative === true, verbs }
    : undefined;
}

const practices = new Map<string, CatalogPractice[]>();

function rememberPractice(key: string, module: CatalogModule, stage: CatalogStage): void {
  practices.set(
    key,
    stageLessons(module, stage).map((lesson) => {
      const practice: CatalogPractice = { checks: practiceChecks(lesson.grammarChecks) };
      const pattern = practicePattern(lesson.conjugationPattern);
      if (pattern) practice.pattern = pattern;
      return practice;
    }),
  );
}

/**
 * The grammar or cognate check and pattern models of a catalog course lesson (French 101, French
 * Frequent Verbs, …, any stage), once its curriculum has loaded. Null for a language whose lessons
 * do not come from its catalog, and for a lesson with no check.
 */
export function catalogLessonPractice(
  moduleId: string,
  lessonNumber: number,
  language: string,
): CatalogPractice | null {
  const pack = catalogLessonPack(language);
  if (!pack) return null;
  const practice = practices.get(keyOf(pack, moduleId))?.[lessonNumber - 1];
  return practice && practice.checks.length > 0 ? practice : null;
}

// ─── Registry for the synchronous getCurriculum() callers ─────────────────────

const curricula = new Map<string, ModuleCurriculum | null>();
const pending = new Map<string, Promise<ModuleCurriculum | null>>();
const listeners = new Set<() => void>();
let version = 0;

const keyOf = (pack: LanguagePack, moduleId: string) => `${pack.code}|${moduleId}`;

/** The loaded catalog curriculum, null when absent, undefined when not loaded yet. */
export function loadedCatalogCurriculum(
  moduleId: string,
  pack: LanguagePack,
): ModuleCurriculum | null | undefined {
  const key = keyOf(pack, moduleId);
  return curricula.has(key) ? (curricula.get(key) ?? null) : undefined;
}

/** Loads (once) a module's catalog curriculum for a catalog pack; null when it has none. */
export function loadCatalogCurriculum(
  moduleId: string,
  pack: LanguagePack,
): Promise<ModuleCurriculum | null> {
  const key = keyOf(pack, moduleId);
  if (curricula.has(key)) return Promise.resolve(curricula.get(key) ?? null);
  const existing = pending.get(key);
  if (existing) return existing;
  const where = catalogStageOf(moduleId, pack);
  const promise = (async () => {
    const module = where ? await loadCatalogModule(pack, where.base) : null;
    const curriculum = module && where ? catalogCurriculum(module, where.stage, moduleId) : null;
    if (module && where) rememberPractice(key, module, where.stage);
    // A failed fetch is not remembered (loadCatalogModule retries); a missing module is.
    if (curriculum || !where || module) curricula.set(key, curriculum);
    version += 1;
    for (const listener of listeners) listener();
    return curriculum;
  })().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

/** Loads a module's catalog content file for a catalog pack; null when it has none. */
export async function loadCatalogContent(
  moduleId: string,
  language: string,
  pack: LanguagePack,
): Promise<LessonContentFile | null> {
  const where = catalogStageOf(moduleId, pack);
  if (!where) return null;
  const module = await loadCatalogModule(pack, where.base);
  return module ? catalogContentFile(module, where.stage, moduleId, language, pack) : null;
}

export function subscribeCatalogCurricula(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function catalogCurriculaVersion(): number {
  return version;
}
