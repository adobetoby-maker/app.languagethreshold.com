// Built by TAC — 2026-10-21
// Verb Games: which languages have authored verb content, and the lazy loader for their compiled
// pattern data (each language's file is its own chunk, fetched on first use).
//
// The pattern engine, the daily verbs, the speaking patterns and the conjugation workshop are
// authored per language (src/data/verb-patterns/<code>.json, src/data/verbs-practice-patterns.json,
// src/lib/verb-speaking-practice.ts). This file is the one registry of those languages, like the
// importer's pack list: a screen asks it whether a pack has verb content and hides the area when
// it does not. Add a row only when a language's compiled data ships.

import type { LanguagePack } from "../../data/language-packs/types.ts";
import { packFor } from "../../data/language-packs/registry.ts";
import type { PatternData } from "./types.ts";

const PATTERN_FILES: Record<string, () => Promise<{ default?: unknown }>> = {
  es: () => import("../../data/verb-patterns/es.json"),
};

const cache = new Map<string, Promise<PatternData>>();

/** True when the pack has compiled verb patterns (Bubble Pop, Verb Crush, the series). */
export function hasVerbPatterns(pack: LanguagePack | null | undefined): pack is LanguagePack {
  return Boolean(pack && Object.hasOwn(PATTERN_FILES, pack.code));
}

/** The languages with verb content, as packs (for "available for …" copy). */
export function verbPatternPacks(): LanguagePack[] {
  return Object.keys(PATTERN_FILES)
    .map((code) => packFor(code))
    .filter((pack): pack is LanguagePack => pack !== null);
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
  const load = PATTERN_FILES[pack.code];
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
