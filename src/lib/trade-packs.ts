// Built by TAC — 2026-10-23
// Client side of trade packs: static, module-flavored content for the core areas, one JSON file
// per module and target language under /trade-packs/<langCode>/<moduleId>.json. A pack holds a
// section per area (Word Match first); the area reads the pack first and falls back to its live
// AI call when the pack has nothing. Loaded like src/lib/lesson-content.ts: fetched once per
// session, cached offline by the service worker, a missing file (404, or the dev server's HTML
// fallback) remembered as "no pack". No React: node tests, the generator and the app share it.

import { contentNativeLanguage } from "./lesson-content-core.ts";
import { languageTag } from "./lesson-words-core.ts";
import {
  WORD_MATCH_LEVELS,
  checkWordMatchBoard,
  isWordMatchLevel,
  wordMatchFoldKey,
  wordMatchKey,
  type WordMatchBoard,
  type WordMatchLevel,
} from "./word-match-core.ts";

export const TRADE_PACK_VERSION = 1;

// ─── Types ───────────────────────────────────────────────────────────────────

/** A Word Match board as stored in a pack: the live board plus the level it is for. */
export interface TradePackWordMatchBoard extends WordMatchBoard {
  level: WordMatchLevel;
}

export interface TradePackFile {
  version: number;
  module: string;
  /** Target language (the one being learned). */
  language: string;
  nativeLanguage: string;
  generatedAt?: string;
  model?: string;
  /** True once a person who reads the language has gone through the file. */
  reviewed: boolean;
  wordMatch?: { boards: TradePackWordMatchBoard[] };
}

export interface TradePackIndexEntry {
  module: string;
  language: string;
  nativeLanguage: string;
  /** Site-relative URL of the pack file. */
  path: string;
  /** Areas the pack covers (today: "wordMatch"). */
  areas: string[];
  /** Word Match boards per level, "1" / "2" / "3". */
  wordMatchBoards?: Record<string, number>;
  bytes: number;
  reviewed: boolean;
  generatedAt: string;
}

export interface TradePackIndex {
  version: number;
  packs: TradePackIndexEntry[];
}

/** Pool size and variety the generator holds a Word Match section to. */
export const WORD_MATCH_PACK_RULES = {
  minBoardsPerLevel: 12,
  /** A target word may appear on at most this many boards of the whole section. */
  maxBoardsPerTarget: 2,
} as const;

// ─── Paths ───────────────────────────────────────────────────────────────────

/** Site-relative URL of a module's pack for one target language. */
export function tradePackPath(moduleId: string, language: string): string {
  return `/trade-packs/${languageTag(language)}/${encodeURIComponent(moduleId)}.json`;
}

/** The native language a target language's packs are written for (same pairing as lesson content). */
export function tradePackNativeLanguage(targetLanguage: string): string {
  return contentNativeLanguage(targetLanguage);
}

// ─── Parsing and validation ──────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Validates an untrusted pack (parsed JSON) for the app: right version, matching module and
 * language, and only the boards that pass the Word Match rules (an invalid board is dropped,
 * never repaired). Null when nothing in the file is usable. The strict pool rules run in the
 * generator and the tests (validateWordMatchSection), not on every learner's phone.
 */
export function parseTradePack(
  raw: unknown,
  expected: { moduleId: string; language: string },
): TradePackFile | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== TRADE_PACK_VERSION) return null;
  if (raw.module !== expected.moduleId || raw.language !== expected.language) return null;
  if (typeof raw.nativeLanguage !== "string" || !raw.nativeLanguage) return null;

  const file: TradePackFile = {
    version: TRADE_PACK_VERSION,
    module: expected.moduleId,
    language: expected.language,
    nativeLanguage: raw.nativeLanguage,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
    reviewed: raw.reviewed === true,
  };

  const section = raw.wordMatch;
  if (isRecord(section) && Array.isArray(section.boards)) {
    const boards: TradePackWordMatchBoard[] = [];
    for (const item of section.boards) {
      if (!isRecord(item) || !isWordMatchLevel(item.level)) continue;
      const checked = checkWordMatchBoard(item, item.level);
      if (checked.ok) boards.push({ level: item.level, ...checked.board });
    }
    if (boards.length > 0) file.wordMatch = { boards };
  }

  return file.wordMatch ? file : null;
}

// ─── Card rules (generator and tests) ────────────────────────────────────────

export const WORD_MATCH_CARD_RULES = {
  maxTargetChars: 28,
  maxTargetWords: 4,
  maxEnglishChars: 36,
  /** The longest single word a card holds: on a phone (4 columns) a longer one is clipped. */
  maxWordChars: 13,
  maxTopicWords: 4,
  /** A level 3 board with this many A1 everyday words on it is rejected. */
  maxA1TargetsAtLevel3: 1,
} as const;

/**
 * Everyday Spanish a beginner already owns (CEFR A1). A level 3 (B2) board is job-specific and
 * multi-word; two of these on one board means it was padded with easy words.
 */
export const WORD_MATCH_A1_WORDS: ReadonlySet<string> = new Set(
  [
    "hoy",
    "mañana",
    "ayer",
    "ahora",
    "trabajo",
    "techo",
    "pared",
    "piso",
    "clavo",
    "lluvia",
    "foto",
    "viento",
    "agua",
    "casa",
    "sol",
    "día",
    "noche",
    "mano",
    "puerta",
    "ventana",
    "calor",
    "frío",
    "grande",
    "pequeño",
    "bueno",
    "malo",
    "caja",
    "mesa",
    "silla",
    "comida",
    "tiempo",
    "número",
    "hora",
    "semana",
    "mes",
    "año",
    "amigo",
    "jefe",
    "cuerda",
    "panel",
    "escalera",
    "camión",
    "color",
    "luz",
    "madera",
    "papel",
    "causa",
    "clima",
  ].map(wordMatchFoldKey),
);

/** Card text is lower case ("teja asfáltica"), except acronyms and words with an inner capital. */
export function cardCase(text: string): string {
  const trimmed = text.normalize("NFC").trim();
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first.length > 1 && first === first.toUpperCase()) return trimmed;
  if (/\p{Ll}\p{Lu}/u.test(first)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * The rules a board must meet beyond the shared validator: card size, lower case, no slashes or
 * brackets, two faces that differ (accent and case insensitive), and, at level 3, no padding with
 * A1 everyday words. Empty list = fine. `board` must already pass checkWordMatchBoard.
 */
export function wordMatchCardProblems(board: WordMatchBoard, level: WordMatchLevel): string[] {
  const rules = WORD_MATCH_CARD_RULES;
  const problems: string[] = [];
  if (wordCount(board.topic) > rules.maxTopicWords) {
    problems.push(`topic is longer than ${rules.maxTopicWords} words`);
  }
  if (cardCase(board.topic) !== board.topic.trim())
    problems.push(`topic "${board.topic}" is not lower case`);
  for (const pair of board.pairs) {
    const faces = `"${pair.target}" / "${pair.english}"`;
    if (/[/()\\]/.test(pair.target) || /[/()\\]/.test(pair.english)) {
      problems.push(
        `${faces}: no slashes or brackets on a card, one plain word or phrase per face`,
      );
    }
    if (
      pair.target.length > rules.maxTargetChars ||
      wordCount(pair.target) > rules.maxTargetWords
    ) {
      problems.push(
        `"${pair.target}" is too long for a card (at most ${rules.maxTargetWords} words, ${rules.maxTargetChars} characters)`,
      );
    }
    if (pair.english.length > rules.maxEnglishChars) {
      problems.push(
        `"${pair.english}" is too long for a card (at most ${rules.maxEnglishChars} characters)`,
      );
    }
    const longest = pair.target.split(/\s+/).reduce((a, w) => (w.length > a.length ? w : a), "");
    if (longest.length > rules.maxWordChars) {
      problems.push(
        `"${longest}" is too long a word for a phone card (at most ${rules.maxWordChars} characters)`,
      );
    }
    if (cardCase(pair.target) !== pair.target || cardCase(pair.english) !== pair.english) {
      problems.push(`${faces}: cards are written in lower case`);
    }
    if (wordMatchFoldKey(pair.target) === wordMatchFoldKey(pair.english)) {
      problems.push(`${faces}: both faces are the same word, so the pair teaches nothing`);
    }
  }
  if (level === 3) {
    const easy = board.pairs.filter((pair) =>
      WORD_MATCH_A1_WORDS.has(wordMatchFoldKey(pair.target)),
    );
    if (easy.length > rules.maxA1TargetsAtLevel3) {
      problems.push(
        `level 3 is job-specific, multi-word vocabulary; these are A1 everyday words: ${easy.map((pair) => pair.target).join(", ")}`,
      );
    }
  }
  return problems;
}

/**
 * Pool-level rules for a Word Match section (generator and tests): every board valid for its
 * level, at least WORD_MATCH_PACK_RULES.minBoardsPerLevel boards per level, one topic per
 * board across the whole section, and little reuse of a target word across boards. Empty list = valid.
 */
export function validateWordMatchSection(boards: readonly unknown[]): string[] {
  const errors: string[] = [];
  const perLevel: Record<number, TradePackWordMatchBoard[]> = { 1: [], 2: [], 3: [] };
  boards.forEach((item, index) => {
    const label = `board ${index + 1}`;
    if (!isRecord(item) || !isWordMatchLevel(item.level)) {
      errors.push(`${label}: level must be 1, 2 or 3`);
      return;
    }
    const checked = checkWordMatchBoard(item, item.level);
    if (!checked.ok) {
      errors.push(...checked.errors.map((error) => `${label} (level ${item.level}): ${error}`));
      return;
    }
    const problems = wordMatchCardProblems(checked.board, item.level);
    if (problems.length > 0) {
      errors.push(...problems.map((problem) => `${label} (level ${item.level}): ${problem}`));
      return;
    }
    perLevel[item.level].push({ level: item.level, ...checked.board });
  });

  const uses = new Map<string, number>();
  const topics = new Set<string>();
  for (const level of WORD_MATCH_LEVELS) {
    const list = perLevel[level];
    if (list.length < WORD_MATCH_PACK_RULES.minBoardsPerLevel) {
      errors.push(
        `level ${level} has ${list.length} valid boards, needs at least ${WORD_MATCH_PACK_RULES.minBoardsPerLevel}`,
      );
    }
    for (const board of list) {
      const topic = wordMatchFoldKey(board.topic);
      if (topics.has(topic))
        errors.push(
          `topic "${board.topic}" is used by two boards (topics are unique across the pack)`,
        );
      topics.add(topic);
      for (const pair of board.pairs) {
        const key = wordMatchKey(pair.target);
        uses.set(key, (uses.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [target, count] of uses) {
    if (count > WORD_MATCH_PACK_RULES.maxBoardsPerTarget) {
      errors.push(
        `"${target}" appears on ${count} boards (at most ${WORD_MATCH_PACK_RULES.maxBoardsPerTarget})`,
      );
    }
  }
  return errors;
}

// ─── Picking ─────────────────────────────────────────────────────────────────

export interface PickPackBoardInput {
  moduleId: string | null | undefined;
  language: string;
  level: WordMatchLevel;
  /** Recently used topic labels; a board with one of these topics is skipped. */
  avoid?: readonly string[];
  /**
   * The learner's native language. When given, a pack written for another native language is
   * not used (its English side would be in the wrong language).
   */
  nativeLanguage?: string;
  /** Test hook: a 0..1 random source. */
  random?: () => number;
}

/**
 * A pack board for the level whose topic is not in `avoid`, chosen at random among those that
 * are eligible; null when the pack is not loaded, missing, or has no eligible board. Reads only
 * what is already loaded (see loadTradePack / packBoardFor).
 */
export function pickPackBoard(input: PickPackBoardInput): WordMatchBoard | null {
  if (!input.moduleId) return null;
  const file = loadedTradePack(input.moduleId, input.language);
  if (!file?.wordMatch) return null;
  if (input.nativeLanguage && input.nativeLanguage !== file.nativeLanguage) return null;
  const avoided = new Set((input.avoid ?? []).map(wordMatchKey));
  const eligible = file.wordMatch.boards.filter(
    (board) => board.level === input.level && !avoided.has(wordMatchKey(board.topic)),
  );
  if (eligible.length === 0) return null;
  const random = input.random ?? Math.random;
  const chosen = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  // A copy without the level, so nothing in the game can mutate the shared pack.
  return {
    pairs: chosen.pairs.map((pair) => ({ target: pair.target, english: pair.english })),
    cefr: chosen.cefr,
    topic: chosen.topic,
  };
}

// ─── Loading ─────────────────────────────────────────────────────────────────

// null = no file / unusable. A key that is absent has not been resolved yet.
const files = new Map<string, TradePackFile | null>();
const requests = new Map<string, Promise<TradePackFile | null>>();

const keyOf = (moduleId: string, language: string) => `${moduleId}|${language}`;

/** What is already loaded: the file, null for "no pack", undefined when not asked yet. */
export function loadedTradePack(
  moduleId: string,
  language: string,
): TradePackFile | null | undefined {
  const key = keyOf(moduleId, language);
  return files.has(key) ? (files.get(key) ?? null) : undefined;
}

/**
 * Loads (once) the pack for a module+language. Resolves null when there is none or it is
 * unusable; never throws. A network failure is not remembered, so a later call can retry (and
 * the service worker may answer from its cache when offline).
 */
export function loadTradePack(moduleId: string, language: string): Promise<TradePackFile | null> {
  const key = keyOf(moduleId, language);
  if (files.has(key)) return Promise.resolve(files.get(key) ?? null);
  const existing = requests.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      // A stalled request must not hold up the game: after 8 s the area falls back to live AI.
      const response = await fetch(tradePackPath(moduleId, language), {
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404) {
        files.set(key, null);
        return null;
      }
      if (!response.ok) return null;
      const file = parseTradePack(await response.json(), { moduleId, language });
      files.set(key, file);
      return file;
    } catch (error) {
      // Offline with nothing cached, or a body that is not JSON (dev server fallback page).
      if (error instanceof SyntaxError) files.set(key, null);
      return null;
    }
  })().finally(() => {
    requests.delete(key);
  });
  requests.set(key, promise);
  return promise;
}

/**
 * Fetches the module's pack in the background so the first game starts from it and the service
 * worker has it stored for offline use. Safe to call on every mount and on every change of
 * module or language.
 */
export function prefetchTradePack(
  moduleId: string | null | undefined,
  language: string,
  nativeLanguage: string,
) {
  if (typeof fetch !== "function" || !moduleId) return;
  // Packs exist only for the default pairing of each target language.
  if (nativeLanguage !== tradePackNativeLanguage(language)) return;
  void loadTradePack(moduleId, language);
}

/**
 * A pack board for a game that is starting: waits for the pack if its fetch is still in
 * flight, then picks. Null means "the pack has nothing", and the caller uses its live call.
 */
export async function packBoardFor(
  input: PickPackBoardInput & { moduleId: string },
): Promise<WordMatchBoard | null> {
  if (input.nativeLanguage && input.nativeLanguage !== tradePackNativeLanguage(input.language)) {
    return null;
  }
  await loadTradePack(input.moduleId, input.language);
  return pickPackBoard(input);
}

/** Test hook: forget everything loaded. */
export function resetTradePacksForTests() {
  files.clear();
  requests.clear();
}
