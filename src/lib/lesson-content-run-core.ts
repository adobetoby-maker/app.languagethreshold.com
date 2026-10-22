// Built by TAC — 2026-10-20
// The pure run rules of scripts/build-lesson-content.mts: the --provider choice, parsing and
// checking --lessons, and which lessons a run calls. No I/O, so tests can exercise them directly.

import {
  CORE60_DEFAULT_PROVIDER,
  resolveModel,
  type Core60Provider,
} from "./core60-generator-core.ts";

// ─── Provider ────────────────────────────────────────────────────────────────

/** A bad command-line flag value; the script prints the message and exits 2 before any work. */
export class RunFlagError extends Error {}

export interface RunProvider {
  provider: Core60Provider;
  /** The model id for this run (cli default Opus, api default Sonnet). */
  model: string;
  /** Only the api provider reads ANTHROPIC_API_KEY; the cli provider uses the subscription login. */
  requiresApiKey: boolean;
}

/** `--provider cli|api` (default cli) and `--model sonnet|opus|<id>`; throws on a bad provider. */
export function resolveRunProvider(rawProvider: string | undefined, rawModel: string | undefined): RunProvider {
  const provider: Core60Provider =
    rawProvider === undefined ? CORE60_DEFAULT_PROVIDER : (rawProvider as Core60Provider);
  if (provider !== "cli" && provider !== "api") {
    throw new RunFlagError('--provider must be "cli" or "api"');
  }
  return { provider, model: resolveModel(rawModel || undefined, provider), requiresApiKey: provider === "api" };
}

// ─── --lessons ───────────────────────────────────────────────────────────────

export class LessonSelectionError extends RunFlagError {}

/**
 * The largest lesson number --lessons accepts. No module comes near it (the longest has 30
 * lessons); the cap is checked before a range is expanded, so "1-999999999" is rejected at once
 * instead of filling a huge Set. The per-module check is checkLessonSelection.
 */
export const MAX_LESSON_NUMBER = 1000;

/**
 * Parses a `--lessons` list such as "11-15" or "3,7,11-15" into sorted, unique lesson numbers.
 * Rejects an empty list, non-numeric items, numbers below 1 and reversed ranges.
 */
export function parseLessonSelection(raw: string | undefined): number[] {
  if (raw === undefined || raw.trim() === "") {
    throw new LessonSelectionError('--lessons needs a list of lesson numbers, e.g. "11-15" or "3,7,11-15"');
  }
  const numbers = new Set<number>();
  for (const item of raw.split(",")) {
    const text = item.trim();
    const single = /^(\d+)$/.exec(text);
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(text);
    if (!single && !range) {
      throw new LessonSelectionError(
        `--lessons: "${text}" is not a lesson number or range (use e.g. 7 or 11-15)`,
      );
    }
    const from = Number(single ? single[1] : range![1]);
    const to = Number(single ? single[1] : range![2]);
    if (from < 1 || to < 1) {
      throw new LessonSelectionError(`--lessons: lesson numbers start at 1 ("${text}")`);
    }
    if (to < from) {
      throw new LessonSelectionError(`--lessons: reversed range "${text}" (write ${to}-${from})`);
    }
    if (to > MAX_LESSON_NUMBER) {
      throw new LessonSelectionError(
        `--lessons: "${text}" is beyond any module (the highest lesson number is ${MAX_LESSON_NUMBER})`,
      );
    }
    for (let n = from; n <= to; n++) numbers.add(n);
  }
  return [...numbers].sort((a, b) => a - b);
}

/** Throws when a requested lesson number is beyond the module's lesson count. */
export function checkLessonSelection(selection: readonly number[], lessonCount: number, label: string): void {
  const beyond = selection.filter((n) => n > lessonCount);
  if (beyond.length > 0) {
    throw new LessonSelectionError(
      `--lessons: ${label} has ${lessonCount} lessons; ${beyond.join(", ")} ${beyond.length === 1 ? "is" : "are"} beyond it (narrow the run with --module)`,
    );
  }
}

// ─── Plan selection ──────────────────────────────────────────────────────────

/** The slice of a Pair that picks its lessons. */
export interface SelectablePair<L extends { n: number }> {
  lessons: readonly L[];
  /** lesson number (string) -> validated saved content */
  done: Record<string, unknown>;
}

/**
 * The lessons of a pair this run calls. Without a selection: the missing ones (no valid saved
 * content). With a selection: exactly those lessons, even when valid saved content exists, and no
 * others.
 */
export function selectLessons<L extends { n: number }>(
  pair: SelectablePair<L>,
  selection?: readonly number[] | null,
): L[] {
  if (selection) {
    const wanted = new Set(selection);
    return pair.lessons.filter((lesson) => wanted.has(lesson.n));
  }
  return pair.lessons.filter((lesson) => !pair.done[String(lesson.n)]);
}

/** [3, 7, 11, 12, 13] -> "3,7,11-13" (the --lessons spelling), "-" for none. */
export function formatLessonList(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted.length === 0) return "-";
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  const flush = () => parts.push(start === prev ? String(start) : `${start}-${prev}`);
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    flush();
    start = prev = n;
  }
  flush();
  return parts.join(",");
}

// ─── Settling a pair ─────────────────────────────────────────────────────────

/** What a pair's tasks came to once every one of them has settled. */
export interface SettledPair {
  /** Lesson numbers whose generation failed, sorted. */
  failed: number[];
  /** The public file may be rewritten only when nothing failed. */
  writePublic: boolean;
}

export interface PairSettlement {
  /**
   * Records one lesson's outcome. Returns null while other lessons of the pair are still running,
   * and the final outcome exactly once, from whichever task finishes last. The outcome depends
   * only on which lessons failed, never on the order they finished in.
   */
  settle(lessonNumber: number, ok: boolean): SettledPair | null;
}

/**
 * One deterministic rule for when a pair's public file is written: only after every task for the
 * pair has settled, and never when any of them failed (the successful new lessons stay in the
 * progress file, and a rerun with `--lessons <failed only>` completes the pair).
 */
export function createPairSettlement(lessonNumbers: readonly number[]): PairSettlement {
  const pending = new Set(lessonNumbers);
  const failed = new Set<number>();
  let reported = false;
  return {
    settle(lessonNumber, ok) {
      if (!pending.delete(lessonNumber)) return null;
      if (!ok) failed.add(lessonNumber);
      if (pending.size > 0 || reported) return null;
      reported = true;
      const sorted = [...failed].sort((a, b) => a - b);
      return { failed: sorted, writePublic: sorted.length === 0 };
    },
  };
}

const SHELL_SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/;
const shellWord = (value: string) => (SHELL_SAFE.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`);

/** A ready-to-run command that regenerates exactly the failed lessons of one file. */
export function formatRerunCommand(options: {
  script: string;
  moduleId: string;
  /** Language tag as --lang takes it ("es", "en"). */
  lang: string;
  failed: readonly number[];
  provider: string;
  model: string;
  /** Other flags the run was given that change where it runs (--claude-bin, --out-root). */
  passThrough?: Readonly<Record<string, string>>;
}): string {
  const parts = [
    "node",
    options.script,
    "--module",
    options.moduleId,
    "--lang",
    options.lang,
    "--lessons",
    formatLessonList(options.failed),
    "--provider",
    options.provider,
    "--model",
    options.model,
  ];
  for (const [name, value] of Object.entries(options.passThrough ?? {})) parts.push(`--${name}`, value);
  return parts.map(shellWord).join(" ");
}

// ─── Retry wording ───────────────────────────────────────────────────────────

/**
 * The retry message for a reply that held no usable object. The api provider is told to call the
 * tool; the cli provider has no tool, so it is told to reply with the JSON object itself.
 */
export function noObjectRetryMessage(provider: Core60Provider, toolName: string): string {
  return provider === "cli"
    ? "Your reply was not one complete JSON object that matches the schema. Reply with one JSON object that matches the schema, holding the complete content."
    : `You did not call the ${toolName} tool with a valid object. Call it now with the complete content.`;
}
