// Built by TAC — 2026-11-21
// Catalog v2 lesson content for bundled packs (language-pack model sections 2 and 5). The pipeline's
// out/core60_<code>.json is split by scripts/import-language-packs.mjs into one file per module under
// content/language-packs/<code>/, served at /lesson-content/<code>/catalog/<module>.json by
// scripts/vite-language-pack-catalogs.mjs only for packs this build may show (draft packs: QA
// builds only). Every file carries its own pair and pack version and is refused when it does not
// match the pack that asked for it: fail closed, never another language's lessons.

import { isBundledPack, packIndexEntry, type LanguagePack } from "./registry.ts";

export const CATALOG_VERSION = 2;

/** One target/native line (word, phrase or passage sentence) of a catalog lesson. */
export interface CatalogLine {
  id: string;
  target: string;
  native: string;
  note?: string;
  /** Kana reading of a kanji item when pack.script.readingAid is "furigana". */
  reading?: string;
}

export interface CatalogVerb {
  infinitive: string;
  native: string;
  /** Keyed by pack.grammar.verbForms.keys[].key. */
  forms: Record<string, string>;
  example?: { target: string; native: string };
  note?: string;
}

export interface CatalogLesson {
  id: string;
  number: number;
  stage: "foundation" | "working" | "master" | string;
  title: string;
  objective: string;
  explanation?: string;
  speakingPrompt?: string;
  items: CatalogLine[];
  passage?: CatalogLine[];
  verbs?: CatalogVerb[];
  grammarChecks?: unknown[];
  conjugationPattern?: unknown;
  sourceModuleID?: string;
  sourceLessonNumber?: number;
  source?: string;
  /** Only the owner flips this to true (release gate lessonsReviewed). */
  reviewed?: boolean;
}

export interface CatalogModule {
  id: string;
  title: string;
  kind: string;
  symbol?: string;
  group?: string;
  order?: number;
  lessonCount: number;
  lessons: CatalogLesson[];
}

/** One module file: /lesson-content/<code>/catalog/<module>.json. */
export interface CatalogModuleFile {
  version: typeof CATALOG_VERSION;
  languageCode: string;
  nativeCode: string;
  packVersion: string;
  module: CatalogModule;
}

/** Modules a bundled pack's catalog lists (with lesson counts). Empty for a legacy adapter. */
export function catalogModules(pack: LanguagePack): { id: string; lessonCount: number }[] {
  return packIndexEntry(pack)?.modules ?? [];
}

/** True when the pack's catalog lists this module (a module is offered only from its catalog). */
export function catalogHasModule(pack: LanguagePack, moduleId: string): boolean {
  return catalogModules(pack).some((module) => module.id === moduleId);
}

/** Site-relative URL of one catalog module of a bundled pack. */
export function catalogModuleUrl(pack: LanguagePack, moduleId: string): string {
  return `/lesson-content/${encodeURIComponent(pack.code)}/catalog/${encodeURIComponent(moduleId)}.json`;
}

/**
 * Validates an untrusted module file against the pack that asked for it: catalog version 2, the
 * pack's own code and pack version, the requested module, and exactly lessonCount lessons (as the
 * pack index lists). Null when anything differs.
 */
export function parseCatalogModuleFile(
  raw: unknown,
  pack: LanguagePack,
  moduleId: string,
): CatalogModule | null {
  if (!raw || typeof raw !== "object") return null;
  const file = raw as Partial<CatalogModuleFile>;
  const indexEntry = packIndexEntry(pack);
  if (!indexEntry) return null;
  if (file.version !== CATALOG_VERSION) return null;
  if (file.languageCode !== pack.code) return null;
  if (file.packVersion !== indexEntry.packVersion) return null;
  if (typeof file.nativeCode !== "string" || !pack.native.supported.includes(file.nativeCode))
    return null;
  const module = file.module;
  if (!module || module.id !== moduleId || !Array.isArray(module.lessons)) return null;
  const listed = indexEntry.modules.find((entry) => entry.id === moduleId);
  if (!listed || module.lessonCount !== listed.lessonCount) return null;
  if (module.lessons.length !== module.lessonCount) return null;
  for (const lesson of module.lessons) {
    if (!lesson || typeof lesson !== "object") return null;
    if (!Number.isInteger(lesson.number) || typeof lesson.title !== "string") return null;
    if (!Array.isArray(lesson.items)) return null;
  }
  return module;
}

const cache = new Map<string, Promise<CatalogModule | null>>();

/**
 * Loads one catalog module of a bundled pack (once per page). Resolves null for a legacy adapter,
 * a module the catalog does not list, a failed fetch or a file that fails parseCatalogModuleFile.
 * A failed fetch is not cached, so a later call retries.
 */
export function loadCatalogModule(
  pack: LanguagePack,
  moduleId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogModule | null> {
  if (!isBundledPack(pack) || !catalogHasModule(pack, moduleId)) return Promise.resolve(null);
  const key = `${pack.code}/${moduleId}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = (async () => {
    try {
      const response = await fetchImpl(catalogModuleUrl(pack, moduleId));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return parseCatalogModuleFile(await response.json(), pack, moduleId);
    } catch {
      cache.delete(key);
      return null;
    }
  })();
  cache.set(key, pending);
  return pending;
}
