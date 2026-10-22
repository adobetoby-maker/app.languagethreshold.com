// Built by TAC — 2026-10-21
// Verb Games: lazy loader for the compiled Spanish pattern data (its own chunk, fetched on first use).

import type { PatternData } from "./types.ts";

let cached: Promise<PatternData> | null = null;

/** Loads `es.json` once; a failed load is not cached, so the next call retries. */
export function loadPatternData(): Promise<PatternData> {
  if (!cached) {
    cached = import("../../data/verb-patterns/es.json")
      .then((mod) => (mod.default ?? mod) as unknown as PatternData)
      .catch((err: unknown) => {
        cached = null;
        throw err;
      });
  }
  return cached;
}
