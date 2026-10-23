// Built by TAC — 2026-10-23
// Pure rules for a Word Match board, shared by the live server function
// (src/fns/word-match.functions.ts), the trade-pack loader (src/lib/trade-packs.ts) and the
// offline pack generator (scripts/build-trade-packs.mts), so "a valid board" has one definition.
// No React, no network, no path aliases: node runs this file directly.

// Difficulty levels for the Word Match memory game.
// 1 = 6 pairs (12 cards) at A1/A2 — concrete everyday vocab
// 2 = 8 pairs (16 cards) at B1 — slightly abstract, more variety
// 3 = 10 pairs (20 cards) at B2+ — abstract, low-frequency, advanced
export type WordMatchLevel = 1 | 2 | 3;

export type WordMatchCefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface WordMatchPair {
  target: string;
  english: string;
}

export interface WordMatchBoard {
  pairs: WordMatchPair[]; // length 6 / 8 / 10 by level
  cefr: WordMatchCefr;
  topic: string; // 1-3 words
}

export const WORD_MATCH_LEVELS: readonly WordMatchLevel[] = [1, 2, 3];

export const WORD_MATCH_LIMITS = {
  maxTarget: 80,
  maxEnglish: 160,
  maxTopic: 80,
} as const;

/** Pairs on a board at each level. */
export function wordMatchPairCount(level: WordMatchLevel): 6 | 8 | 10 {
  return level === 1 ? 6 : level === 2 ? 8 : 10;
}

/** The CEFR label a board of this level carries. */
export function wordMatchCefr(level: WordMatchLevel): "A2" | "B1" | "B2" {
  return level === 1 ? "A2" : level === 2 ? "B1" : "B2";
}

export function isWordMatchLevel(value: unknown): value is WordMatchLevel {
  return value === 1 || value === 2 || value === 3;
}

/** How two cards are compared for "the same word": NFC + lower case. */
export const wordMatchKey = (value: string) => value.normalize("NFC").toLowerCase();

/**
 * Looser comparison for "these two faces say the same thing": accents, case and surrounding
 * space are ignored ("Fascia" and "fascia", "limón" and "limon"). Not used for the board
 * uniqueness rule above, which stays NFC + lower case exactly as the live server function has it.
 */
export const wordMatchFoldKey = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export type WordMatchBoardCheck =
  | { ok: true; board: WordMatchBoard }
  | {
      ok: false;
      /** "incomplete": wrong shape, count, length or CEFR. "duplicates": repeated words or meanings. */
      reason: "incomplete" | "duplicates";
      errors: string[];
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** A trimmed string within 1..max characters, or an error line. */
function text(value: unknown, label: string, max: number, errors: string[]): string {
  if (typeof value !== "string") {
    errors.push(`${label} must be text`);
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length < 1) errors.push(`${label} is empty`);
  else if (trimmed.length > max) errors.push(`${label} is longer than ${max} characters`);
  return trimmed;
}

/**
 * Checks one board for a level and returns it cleaned (strings trimmed, unknown keys dropped).
 * Rules: 6 / 8 / 10 pairs for level 1 / 2 / 3; target 1-80 and english 1-160 characters; topic
 * 1-80; cefr A2 / B1 / B2 by level; every target distinct and every english distinct (NFC +
 * lower case). The same rules the live server function has always applied.
 */
export function checkWordMatchBoard(raw: unknown, level: WordMatchLevel): WordMatchBoardCheck {
  const expectedCount = wordMatchPairCount(level);
  const expectedCefr = wordMatchCefr(level);
  const errors: string[] = [];
  if (!isRecord(raw))
    return { ok: false, reason: "incomplete", errors: ["board must be an object"] };

  const pairs: WordMatchPair[] = [];
  if (!Array.isArray(raw.pairs)) {
    errors.push("pairs must be a list");
  } else {
    if (raw.pairs.length !== expectedCount) {
      errors.push(`level ${level} needs exactly ${expectedCount} pairs, got ${raw.pairs.length}`);
    }
    raw.pairs.forEach((item, index) => {
      if (!isRecord(item)) {
        errors.push(`pair ${index + 1} must be an object`);
        return;
      }
      pairs.push({
        target: text(item.target, `pair ${index + 1} target`, WORD_MATCH_LIMITS.maxTarget, errors),
        english: text(
          item.english,
          `pair ${index + 1} english`,
          WORD_MATCH_LIMITS.maxEnglish,
          errors,
        ),
      });
    });
  }
  const topic = text(raw.topic, "topic", WORD_MATCH_LIMITS.maxTopic, errors);
  if (raw.cefr !== expectedCefr) errors.push(`cefr must be ${expectedCefr} for level ${level}`);
  if (errors.length > 0) return { ok: false, reason: "incomplete", errors };

  const targets = new Set(pairs.map((pair) => wordMatchKey(pair.target)));
  const english = new Set(pairs.map((pair) => wordMatchKey(pair.english)));
  if (targets.size !== expectedCount || english.size !== expectedCount) {
    const dupes: string[] = [];
    if (targets.size !== expectedCount) dupes.push("two cards share the same target word");
    if (english.size !== expectedCount) dupes.push("two cards share the same English meaning");
    return { ok: false, reason: "duplicates", errors: dupes };
  }
  return { ok: true, board: { pairs, topic, cefr: expectedCefr } };
}
