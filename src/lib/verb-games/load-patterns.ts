// Built by TAC — 2026-10-21
// Verb Games: which languages have authored verb content, and the lazy loader for their compiled
// pattern data (each language's file is its own chunk, fetched on first use).
//
// The pattern engine, the daily verbs, the speaking patterns and the conjugation workshop are
// authored per language (src/data/verb-patterns/<code>.json, src/data/verbs-practice-patterns.json,
// src/lib/verb-speaking-practice.ts). This file is the one registry of those languages, like the
// importer's pack list: a screen asks it whether a pack has verb content and hides the area when
// it does not. A language names its compiled file in its app data (app/<code>.json verbPatterns);
// the loaders below are keyed by that file id, never by a language.

import type { LanguagePack } from "../../data/language-packs/types.ts";
import { PACKS } from "../../data/language-packs/registry.ts";
import { appData } from "../../data/language-packs/app-data.ts";
import { verbGameMorphology } from "./morphology.ts";
import type { PatternData } from "./types.ts";

/** Compiled pattern files, by their path under src/data. Each is its own lazy chunk. */
const PATTERN_FILES: Record<string, () => Promise<{ default?: unknown }>> = {
  "verb-patterns/es.json": () => import("../../data/verb-patterns/es.json"),
};

function patternFileOf(pack: LanguagePack): (() => Promise<{ default?: unknown }>) | null {
  const id = appData(pack).verbPatterns;
  return id && Object.hasOwn(PATTERN_FILES, id) ? PATTERN_FILES[id] : null;
}

const cache = new Map<string, Promise<PatternData>>();

/** True when the pack has compiled verb patterns (Bubble Pop, Verb Crush, the series). */
export function hasVerbPatterns(pack: LanguagePack | null | undefined): pack is LanguagePack {
  return Boolean(pack && patternFileOf(pack) && verbGameMorphology(pack));
}

/** The languages with verb content, as packs (for "available for …" copy). */
export function verbPatternPacks(): LanguagePack[] {
  return PACKS.filter((pack) => hasVerbPatterns(pack));
}

/** "Spanish", "Spanish or French": the languages to name when this one has no verb content. */
export function verbPatternLanguageNames(joiner: string): string {
  return verbPatternPacks()
    .map((pack) => pack.name)
    .join(` ${joiner} `);
}

/** "English": the native language(s) those languages are glossed in. */
export function verbPatternNativeNames(joiner: string): string {
  return [
    ...new Set(
      verbPatternPacks().map(
        (pack) => pack.native.names[pack.native.default] ?? pack.native.default,
      ),
    ),
  ].join(` ${joiner} `);
}

/** Loads the pack's pattern file once; a failed load is not cached, so the next call retries. */
export function loadPatternData(pack: LanguagePack): Promise<PatternData> {
  const load = patternFileOf(pack);
  if (!load) return Promise.reject(new Error(`${pack.name} has no verb pattern data`));
  let promise = cache.get(pack.code);
  if (!promise) {
    promise = load()
      .then((mod) => (mod.default ?? mod) as unknown as PatternData)
      .catch((err: unknown) => {
        cache.delete(pack.code);
        throw err;
      });
    cache.set(pack.code, promise);
  }
  return promise;
}
