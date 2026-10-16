// Built by TAC — 2026-10-15
// Pure logic for answer feedback (no React, no DOM): compares what a learner typed or wrote
// with the expected answer, letter by letter, and says what is off in plain words. Shared by
// src/components/core30/AnswerFeedback.tsx and unit-tested directly. Scoring is NOT decided
// here (the practice kit scores with isCorrectTypedAnswer); this only explains the result.

import { isLatinScript } from "./lesson-words-core.ts";

export type AnswerVerdict = "correct" | "accent" | "close" | "wrong";
export type SegmentStatus = "ok" | "wrong" | "missing" | "extra" | "accent";

export interface AnswerSegment {
  /**
   * ok / wrong / missing / accent: the expected text at this spot. extra: the learner's own
   * letters that should not be there.
   */
  text: string;
  status: SegmentStatus;
  /** For wrong and accent: what the learner wrote in this spot. */
  given?: string;
}

export interface AnswerComparison {
  verdict: AnswerVerdict;
  /** The expected answer split into runs, in order, marked against what was given. */
  segments: AnswerSegment[];
  /** Short plain tips, at most three. */
  tips: string[];
  /** The accepted form that was compared (an entry like "A / B" is compared one side at a time). */
  target: string;
}

export const SLIP_HEADLINE = "Correct — small slip";

const VERDICT_LABELS: Record<AnswerVerdict, string> = {
  correct: "Correct",
  accent: "Right word, check the accent",
  close: "Close",
  wrong: "Not quite",
};

/**
 * The headline for a verdict. When the practice kit's scorer counted the answer correct but the
 * letter comparison still found a slip, the headline says so, so it always agrees with the score.
 */
export function verdictHeadline(verdict: AnswerVerdict, scoredCorrect = false): string {
  if (scoredCorrect && verdict !== "correct") return SLIP_HEADLINE;
  return VERDICT_LABELS[verdict];
}

const CJK_LANGUAGES = new Set(["Japanese", "Chinese", "Korean"]);
const HAN_KANA_HANGUL = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const ACCENT_COST = 0.5;

interface Item {
  /** Comparison form: lowercase. */
  low: string;
  /** Lowercase with accents removed (Latin mode only; equals `low` otherwise). */
  base: string;
  /** The character as written. */
  shown: string;
  /** Index into the display characters (expected side only). */
  disp: number;
}

interface Display {
  char: string;
  skip: boolean;
}

function stripMarks(char: string): string {
  return char.normalize("NFD").replace(/\p{M}/gu, "");
}

function isSeparator(char: string): boolean {
  return /[\s\p{P}\p{S}]/u.test(char);
}

/**
 * Splits text into comparison items plus the display characters. Case, punctuation and extra
 * spaces are not compared: a run of them between two words is one space item, and at the
 * edges (or anywhere, for CJK text) they are skipped.
 */
function toItems(
  text: string,
  accentAware: boolean,
  dropSeparators: boolean,
): { items: Item[]; display: Display[] } {
  const chars = Array.from(text.normalize(accentAware ? "NFC" : "NFKC"));
  const items: Item[] = [];
  const display: Display[] = [];
  const hasLetterAfter = (from: number) => chars.slice(from).some((c) => !isSeparator(c));
  let inRun = false;
  chars.forEach((char, i) => {
    if (isSeparator(char)) {
      const startsRun = !inRun;
      inRun = true;
      const useful = !dropSeparators && startsRun && items.length > 0 && hasLetterAfter(i + 1);
      if (useful) {
        display.push({ char, skip: false });
        items.push({ low: " ", base: " ", shown: char, disp: display.length - 1 });
      } else {
        display.push({ char, skip: true });
      }
      return;
    }
    inRun = false;
    const low = char.toLocaleLowerCase();
    display.push({ char, skip: false });
    items.push({
      low,
      base: accentAware ? stripMarks(low) : low,
      shown: char,
      disp: display.length - 1,
    });
  });
  return { items, display };
}

type Op =
  | { kind: "match"; e: number; g: number }
  | { kind: "accent"; e: number; g: number }
  | { kind: "sub"; e: number; g: number }
  | { kind: "missing"; e: number }
  | { kind: "extra"; g: number; at: number };

function align(given: Item[], expected: Item[]): { ops: Op[]; cost: number } {
  const n = given.length;
  const m = expected.length;
  const cost = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) cost[i][0] = i;
  for (let j = 1; j <= m; j += 1) cost[0][j] = j;
  const subCost = (g: Item, e: Item) => (g.low === e.low ? 0 : g.base === e.base ? ACCENT_COST : 1);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      cost[i][j] = Math.min(
        cost[i - 1][j - 1] + subCost(given[i - 1], expected[j - 1]),
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
      );
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const c = subCost(given[i - 1], expected[j - 1]);
      if (Math.abs(cost[i][j] - (cost[i - 1][j - 1] + c)) < 1e-9) {
        ops.push({
          kind: c === 0 ? "match" : c === ACCENT_COST ? "accent" : "sub",
          e: j - 1,
          g: i - 1,
        });
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (j > 0 && (i === 0 || Math.abs(cost[i][j] - (cost[i][j - 1] + 1)) < 1e-9)) {
      ops.push({ kind: "missing", e: j - 1 });
      j -= 1;
    } else {
      ops.push({ kind: "extra", g: i - 1, at: j });
      i -= 1;
    }
  }
  return { ops: ops.reverse(), cost: cost[n][m] };
}

/** Accepted forms of an entry: the whole thing, the part before "(", and each side of "/". */
function targetForms(expected: string): string[] {
  const forms: string[] = [];
  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !forms.includes(trimmed)) forms.push(trimmed);
  };
  add(expected);
  add(expected.split(/\s*[(（]/)[0]);
  for (const side of expected.split(/\s+\/\s+|／/)) add(side.split(/\s*[(（]/)[0]);
  return forms;
}

function markName(char: string): "tilde" | "dots" | "cedilla" | "accent" {
  const marks = char.normalize("NFD").replace(/[^\p{M}]/gu, "");
  if (marks.includes("̃")) return "tilde";
  if (marks.includes("̈")) return "dots";
  if (marks.includes("̧")) return "cedilla";
  return "accent";
}

function accentTip(expectedChar: string, givenChar: string): string {
  const expectedHasMark = expectedChar.normalize("NFD") !== stripMarks(expectedChar);
  const givenHasMark = givenChar.normalize("NFD") !== stripMarks(givenChar);
  if (expectedHasMark && !givenHasMark) {
    const name = markName(expectedChar);
    if (name === "tilde") return `Add the tilde: ${expectedChar}`;
    if (name === "dots") return `Add the dots: ${expectedChar}`;
    if (name === "cedilla") return `Add the cedilla: ${expectedChar}`;
    return `Accent on the ${expectedChar}`;
  }
  if (!expectedHasMark && givenHasMark) return `No accent on the ${expectedChar}`;
  return `Use ${expectedChar}, not ${givenChar}`;
}

function mergeSegments(segments: AnswerSegment[]): AnswerSegment[] {
  const merged: AnswerSegment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.status === segment.status) {
      last.text += segment.text;
      if (segment.given !== undefined) last.given = (last.given ?? "") + segment.given;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function tipsFor(givenItems: Item[], expectedItems: Item[], ops: Op[]): string[] {
  const tips: string[] = [];
  const push = (tip: string) => {
    if (!tips.includes(tip)) tips.push(tip);
  };

  // An ending tip covers every hard mistake that sits in the last two letters of the last word.
  let lastSeparator = -1;
  expectedItems.forEach((item, index) => {
    if (item.low === " ") lastSeparator = index;
  });
  const wordLength = expectedItems.length - (lastSeparator + 1);
  const position = (op: Op) => (op.kind === "extra" ? op.at : op.kind === "match" ? -1 : op.e);
  const hardOps = ops.filter(
    (op) => op.kind === "sub" || op.kind === "missing" || op.kind === "extra",
  );
  const withExpected = hardOps.filter((op) => op.kind === "sub" || op.kind === "missing");
  const inEnding =
    wordLength >= 4 &&
    withExpected.length > 0 &&
    hardOps.every((op) => position(op) >= expectedItems.length - 2);
  const covered = new Set<Op>();
  if (inEnding) {
    const first = Math.min(...withExpected.map(position));
    const tail = expectedItems
      .slice(first)
      .map((item) => item.shown.toLocaleLowerCase())
      .join("");
    push(`Ending should be -${tail}`);
    for (const op of hardOps) covered.add(op);
  }

  for (const op of ops) {
    if (covered.has(op)) continue;
    if (op.kind === "accent") {
      push(accentTip(expectedItems[op.e].shown, givenItems[op.g].shown));
    } else if (op.kind === "sub") {
      push(`Use ${expectedItems[op.e].shown} instead of ${givenItems[op.g].shown}`);
    }
  }

  // Neighbouring missing or extra letters read as one tip: "Missing letters: ra".
  const runs = (kind: "missing" | "extra"): string[] => {
    const out: string[] = [];
    let current = "";
    let previous = -2;
    for (const op of ops) {
      if (op.kind !== kind || covered.has(op)) {
        if (current) out.push(current);
        current = "";
        previous = -2;
        continue;
      }
      const index = op.kind === "missing" ? op.e : op.kind === "extra" ? op.g : -1;
      if (index !== previous + 1 && current) {
        out.push(current);
        current = "";
      }
      current += op.kind === "missing" ? expectedItems[op.e].shown : givenItems[op.g].shown;
      previous = index;
    }
    if (current) out.push(current);
    return out;
  };
  for (const run of runs("missing")) {
    if (run.trim() === "") push("Missing space");
    else push(run.length > 1 ? `Missing letters: ${run}` : `Missing letter: ${run}`);
  }
  for (const run of runs("extra")) {
    if (run.trim() === "") push("Extra space");
    else push(run.length > 1 ? `Extra letters: ${run}` : `Extra letter: ${run}`);
  }
  return tips.slice(0, 3);
}

function build(
  givenItems: Item[],
  expectedItems: Item[],
  display: Display[],
  ops: Op[],
): { segments: AnswerSegment[]; tips: string[]; hard: number; accents: number } {
  const segments: AnswerSegment[] = [];
  let pointer = 0;
  const flushTo = (target: number) => {
    while (pointer < target) {
      segments.push({ text: display[pointer].char, status: "ok" });
      pointer += 1;
    }
  };
  let hard = 0;
  let accents = 0;
  for (const op of ops) {
    if (op.kind === "extra") {
      segments.push({ text: givenItems[op.g].shown, status: "extra" });
      hard += 1;
      continue;
    }
    const item = expectedItems[op.e];
    flushTo(item.disp);
    const text = display[item.disp].char;
    pointer = item.disp + 1;
    if (op.kind === "match") segments.push({ text, status: "ok" });
    else if (op.kind === "accent") {
      segments.push({ text, status: "accent", given: givenItems[op.g].shown });
      accents += 1;
    } else if (op.kind === "sub") {
      segments.push({ text, status: "wrong", given: givenItems[op.g].shown });
      hard += 1;
    } else {
      segments.push({ text, status: "missing" });
      hard += 1;
    }
  }
  flushTo(display.length);

  return {
    segments: mergeSegments(segments),
    tips: tipsFor(givenItems, expectedItems, ops),
    hard,
    accents,
  };
}

/**
 * Compares `given` with `expected`. Latin text is accent-aware ("nino" for "niño" is an
 * "accent" verdict, not a miss); other scripts are compared character by character. Case,
 * punctuation and extra spaces are ignored. An entry such as "A / B" or "A (note)" is
 * compared with whichever accepted form is nearest to what was given.
 */
export function compareAnswer(given: string, expected: string, language: string): AnswerComparison {
  const perCharacter = !isLatinScript(expected) || CJK_LANGUAGES.has(language);
  const accentAware = !perCharacter;
  const dropSeparators = perCharacter && HAN_KANA_HANGUL.test(expected);
  const givenSide = toItems(given ?? "", accentAware, dropSeparators);

  let best: {
    form: string;
    cost: number;
    ops: Op[];
    expectedItems: Item[];
    display: Display[];
  } | null = null;
  for (const form of targetForms(expected)) {
    const side = toItems(form, accentAware, dropSeparators);
    const { ops, cost } = align(givenSide.items, side.items);
    if (!best || cost < best.cost) {
      best = { form, cost, ops, expectedItems: side.items, display: side.display };
    }
  }
  if (!best) return { verdict: "wrong", segments: [], tips: [], target: expected };

  if (givenSide.items.length === 0) {
    return {
      verdict: "wrong",
      segments: mergeSegments(
        best.display.map((d) => ({
          text: d.char,
          status: d.skip ? ("ok" as const) : ("missing" as const),
        })),
      ),
      tips: ["Nothing written yet"],
      target: best.form,
    };
  }

  const built = build(givenSide.items, best.expectedItems, best.display, best.ops);
  const length = best.expectedItems.length;
  let verdict: AnswerVerdict;
  if (built.hard === 0 && built.accents === 0) verdict = "correct";
  else if (built.hard === 0) verdict = "accent";
  else if (built.hard <= Math.max(1, Math.floor(length / 4)) && built.hard < length) {
    verdict = "close";
  } else verdict = "wrong";

  let tips = built.tips;
  if (verdict === "wrong" && built.hard > 3) {
    tips = ["Quite different from the answer. Listen once more, then try again"];
  }
  return { verdict, segments: built.segments, tips, target: best.form };
}
