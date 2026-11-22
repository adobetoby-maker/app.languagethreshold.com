import { conjugationItems, type LessonVerb } from "./lesson-content-core.ts";
import type { SpanishPattern } from "../data/spanish-basics.ts";
import type { LanguagePack } from "../data/language-packs/types.ts";
import { foldMarks, normalizeKey } from "./language-pack-text.ts";
import { appData } from "../data/language-packs/app-data.ts";
export interface LessonGameItem {
  id: string;
  prompt: string;
  answer: string;
  meaning: string;
}
export interface LessonGameBank {
  label: string;
  meanings: LessonGameItem[];
  forms: LessonGameItem[];
}
/** The authored pattern overrides present reference tables, never the other way around. */
export function lessonGameBank(
  verbs: readonly LessonVerb[],
  language: string,
  pattern?: SpanishPattern,
): LessonGameBank {
  const source = pattern?.verbs ?? verbs;
  const meanings = source.map((v) => ({
    id: v.infinitive,
    prompt: v.native,
    answer: v.infinitive,
    meaning: v.native,
  }));
  const forms = pattern
    ? pattern.verbs.flatMap((v) =>
        Object.entries(v.forms).map(([person, answer]) => ({
          id: `${v.infinitive}:${person}`,
          prompt: `${person.replaceAll("_", " / ")} · ${v.infinitive}`,
          answer,
          meaning: v.native,
        })),
      )
    : conjugationItems(verbs, language).map((v) => ({
        id: `${v.verb.infinitive}:${v.key}`,
        prompt: `${v.pronoun} · ${v.verb.infinitive}`,
        answer: v.expected,
        meaning: v.verb.native,
      }));
  return {
    label: pattern?.title ?? "Present tense",
    meanings,
    forms: forms.filter((v) => v.answer.trim()),
  };
}
/**
 * The subjects a typed game answer may start with, for a prompt such as "él / ella / usted ·
 * hablar" (language-pack model section 10): the prompt's own subjects plus every subject of the
 * pack's form key with that label ("ils" and "elles", "nosotros" and "nosotras", "je" and
 * "j'"). Empty for a prompt without a subject, or a pack whose forms are not keyed by person.
 */
export function gameSubjects(prompt: string, pack: LanguagePack): string[] {
  if (!prompt.includes(" · ") || pack.grammar.verbForms.axis !== "person") return [];
  const label = prompt.split(" · ")[0].trim();
  const subjects = new Set(
    label
      .split(" / ")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  for (const key of pack.grammar.verbForms.keys) {
    if (key.label === label || key.key.replaceAll("_", " / ") === label)
      for (const subject of key.subjects ?? []) subjects.add(subject);
  }
  return [...subjects];
}

/**
 * Is `actual` the expected verb form? One matcher for every game and mode: the pack's key
 * (Unicode form, apostrophes, locale lowercase), its typed accent policy (marks are compared
 * unless the pack folds them), its typed alternates (œ for oe), and an optional leading subject
 * (`subjects`, elided "j'" closed up) or lead word ("que", "si"). When the pack's forms carry
 * their subject ("j'aime"), the bare form is accepted too.
 */
export function gameAnswer(
  expected: string,
  actual: string,
  subjects: readonly string[],
  pack: LanguagePack,
): boolean {
  const folds = pack.answerRules.accentPolicy.typed !== "strict";
  // A language whose app file keeps plain verb-game answers (Spanish) compares exactly as it always
  // has: NFC, trimmed, lower case; punctuation is not stripped.
  const plain = appData(pack).plainVerbGameAnswers;
  const normalize = (s: string) => {
    if (plain) return s.normalize("NFC").trim().toLocaleLowerCase();
    const key = normalizeKey(s, pack);
    return folds ? foldMarks(key, pack) : key;
  };
  const answer = normalize(actual);
  const wanted = normalize(expected);
  if (!answer) return false;
  if (answer === wanted) return true;
  const alternates = Object.entries(pack.answerRules.typedAlternates);
  if (alternates.some(([letter, substitute]) => wanted.replaceAll(letter, substitute) === answer))
    return true;
  const prefixes = [...subjects, ...pack.grammar.verbForms.formLeadWords].flatMap((subject) => {
    const prefix = normalize(subject);
    if (!prefix) return [];
    return /['’ʼ]$/u.test(prefix) ? [prefix] : [`${prefix} `];
  });
  if (
    prefixes.some(
      (prefix) => answer.startsWith(prefix) && answer.slice(prefix.length).trim() === wanted,
    )
  )
    return true;
  // A form authored with its subject ("j'aime") also accepts the bare form ("aime").
  if (pack.grammar.verbForms.includesSubject) {
    const own = prefixes.find((prefix) => wanted.startsWith(prefix));
    if (own && answer === wanted.slice(own.length).trim()) return true;
  }
  return false;
}

// ─── Base verb-game rules ────────────────────────────────────────────────────
// Learners outside the released course packs (Spanish, Japanese and every language without a
// bundled pack) keep the base app's verb games exactly (owner decisions 2 and 3): its subjects
// (Spanish and English prompts only), its matcher and its letters.

/** Base subjects: the prompt's own subjects, for Spanish and English prompts only. */
export function baseGameSubjects(prompt: string, language: string): string[] {
  return ["Spanish", "English"].includes(language) && prompt.includes(" · ")
    ? prompt.split(" · ")[0].split(" / ")
    : [];
}

/** The base app's typed verb-game matcher (NFC, trimmed, lower case; punctuation kept). */
export function baseGameAnswer(
  expected: string,
  actual: string,
  subjects: readonly string[] = [],
): boolean {
  const normalize = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase();
  const answer = normalize(actual),
    wanted = normalize(expected);
  if (answer === wanted) return true;
  const alternatives = subjects.flatMap((subject) => [
    subject,
    ...(subject === "nosotros"
      ? ["nosotras"]
      : subject === "vosotros"
        ? ["vosotras"]
        : subject === "ellos"
          ? ["ellas"]
          : []),
  ]);
  return alternatives.some((subject) => {
    const prefix = normalize(subject) + " ";
    return answer.startsWith(prefix) && answer.slice(prefix.length).trim() === wanted;
  });
}

/** The base app's hangman keys. */
export const GAME_LETTERS = [..."abcdefghijklmnñopqrstuvwxyzáéíóúü"];
/** The base app's typed letter row. */
export const BASE_TYPED_LETTERS = [..."áéíóúüñ"];

/**
 * Hangman keys and the mask set (language-pack model section 9): the pack alphabet, so no letter
 * of the language is given away unmasked. A pack without an alphabet (IME scripts) plays with the
 * distinct letters of the round's own answers.
 */
export function gameLetters(pack: LanguagePack, answers: readonly string[] = []): string[] {
  const alphabet = [...pack.keyboard.alphabet];
  if (alphabet.length > 0) return alphabet;
  const letters = answers.flatMap((answer) => [
    ...answer.normalize(pack.answerRules.unicodeNormalization).toLocaleLowerCase(),
  ]);
  return [...new Set(letters.filter((c) => /\p{L}/u.test(c)))];
}
export function maskedAnswer(
  answer: string,
  guesses: readonly string[],
  letters: readonly string[],
): string {
  return [...answer.normalize("NFC")]
    .map((c) =>
      !letters.includes(c.toLowerCase()) || guesses.includes(c.toLowerCase()) ? c : "＿",
    )
    .join(" ");
}
/** Matching answers must be distinct: shared forms such as era cannot have two apparent matches. */
export function distinctGameItems(items: readonly LessonGameItem[]): LessonGameItem[] {
  const seen = new Set<string>();
  return items.filter((v) => {
    const key = v.answer.normalize("NFC").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Matching: prompts on the left, answers on the right ──────────────────────

/** One "match each prompt to its answer" round as the learner sees it. */
export interface PairBoard {
  /** The prompt picked first, waiting for its answer. */
  selected: string | null;
  /** Items already matched, in the order they were matched. */
  matched: readonly string[];
  /**
   * The wrong pair while its red feedback shows: the prompt that was picked and the answer
   * that was tapped. `serial` names this miss for the timer that clears it.
   */
  wrong: { prompt: string; answer: string; serial: number } | null;
  mistakes: number;
}

export const EMPTY_PAIR_BOARD: PairBoard = {
  selected: null,
  matched: [],
  wrong: null,
  mistakes: 0,
};

export type PairTapOutcome = "ignored" | "selected" | "needs-prompt" | "matched" | "mismatch";

export interface PairTapResult {
  board: PairBoard;
  outcome: PairTapOutcome;
}

/**
 * A tap on a prompt picks it. A tap while a wrong pair still shows red ends that feedback at
 * once and is the first tap of the retry, so a quick learner never waits for the red to fade.
 */
export function tapPairPrompt(board: PairBoard, id: string): PairTapResult {
  if (board.matched.includes(id)) return { board, outcome: "ignored" };
  return { board: { ...board, selected: id, wrong: null }, outcome: "selected" };
}

/**
 * A tap on an answer pairs it with the picked prompt. A wrong pair marks BOTH tiles and counts
 * one mistake; nothing is matched, and the prompt stays picked while the red shows, so another
 * answer can be tried straight away (each miss is marked in turn).
 */
export function tapPairAnswer(board: PairBoard, id: string): PairTapResult {
  if (board.matched.includes(id)) return { board, outcome: "ignored" };
  if (board.selected === null) return { board, outcome: "needs-prompt" };
  if (board.selected === id)
    return {
      board: { ...board, selected: null, matched: [...board.matched, id], wrong: null },
      outcome: "matched",
    };
  const mistakes = board.mistakes + 1;
  return {
    board: { ...board, wrong: { prompt: board.selected, answer: id, serial: mistakes }, mistakes },
    outcome: "mismatch",
  };
}

/**
 * End of one miss's red feedback: nothing is picked or marked, so both tiles can be tried
 * again. It names the miss it clears; a timer left over from an earlier miss, or from one the
 * learner has already tapped past, changes nothing.
 */
export function clearPairMismatch(board: PairBoard, serial: number): PairBoard {
  return board.wrong?.serial === serial ? { ...board, wrong: null, selected: null } : board;
}

export type PairTileState = "matched" | "wrong" | "selected" | "idle";

/** How one tile is shown. "wrong" (red) outranks the picked prompt's highlight. */
export function pairTileState(
  board: PairBoard,
  id: string,
  side: "prompt" | "answer",
): PairTileState {
  if (board.matched.includes(id)) return "matched";
  if (board.wrong && board.wrong[side] === id) return "wrong";
  return side === "prompt" && board.selected === id ? "selected" : "idle";
}

/** Select one answer per authored verb; callers shuffle first to vary the practiced person. */
export function gameRoundItems(items: readonly LessonGameItem[]): LessonGameItem[] {
  const selected: LessonGameItem[] = [];
  const verbs = new Set(items.map((item) => item.id.split(":")[0]));
  const answers = new Set<string>();
  for (const verb of verbs) {
    const item = items.find(
      (item) =>
        item.id.split(":")[0] === verb && !answers.has(item.answer.normalize("NFC").toLowerCase()),
    );
    if (item) {
      selected.push(item);
      answers.add(item.answer.normalize("NFC").toLowerCase());
    }
  }
  return selected.slice(0, 10);
}
