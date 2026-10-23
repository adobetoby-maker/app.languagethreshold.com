// Built by TAC — 2026-10-23
/**
 * The only shapes of a bank item that may leave the server.
 *
 * `publicItem` is a whitelist built field by field (never a spread of the private item), so a new
 * private field can never leak by default. Before a session is completed nothing derived from
 * `correctOptionId`, `accepted`, `distractorRationale`, `explanation`, `sourceRefs`, `author`,
 * `difficulty` or the match pairing is sent. Option ids are opaque per session, so an authored id
 * such as "a" for the correct option reveals nothing.
 */
import type { BankItem, ExamKind } from "./bank.ts";
import { seededShuffle, sha256Hex } from "./hash.ts";

export interface PublicOption {
  id: string;
  text: string;
}
export interface PublicItem {
  id: string;
  lesson: number;
  type: BankItem["type"];
  prompt: string;
  context?: string;
  /** mc only, in session order. */
  options?: PublicOption[];
  /** match only: left column in authored order, right column shuffled for the session. */
  left?: string[];
  right?: string[];
  /** typed only: set when accents are part of the answer. */
  accentsRequired?: true;
}
export interface PublicItemOptions {
  /** Session seed: drives option ids and order. */
  seed: string;
  /** Shuffle multiple-choice options (default true). Match right columns are always shuffled. */
  shuffleOptions?: boolean;
}

/** Opaque, per-session id of an authored option. The server maps answers back with the seed. */
export function publicOptionId(seed: string, itemId: string, optionId: string): string {
  return "o" + sha256Hex(`exams2-option\u001f${seed}\u001f${itemId}\u001f${optionId}`).slice(0, 12);
}

/** Right column order for a match item in this session; never the authored (answer) order. */
export function matchRightOrder(item: BankItem, seed: string): string[] {
  const rights = (item.pairs ?? []).map((pair) => pair.right);
  const shuffled = seededShuffle(rights, "exams2-match", seed, item.id);
  if (shuffled.length > 1 && shuffled.every((value, index) => value === rights[index]))
    shuffled.push(shuffled.shift()!);
  return shuffled;
}

export function publicItem(item: BankItem, options: PublicItemOptions): PublicItem {
  const out: PublicItem = {
    id: item.id,
    lesson: item.lesson,
    type: item.type,
    prompt: item.prompt,
  };
  if (item.context) out.context = item.context;
  if (item.type === "mc") {
    const authored = (item.options ?? []).map((option) => ({
      id: publicOptionId(options.seed, item.id, option.id),
      text: option.text,
    }));
    out.options =
      options.shuffleOptions === false
        ? authored
        : seededShuffle(authored, "exams2-mc", options.seed, item.id);
  } else if (item.type === "match") {
    out.left = (item.pairs ?? []).map((pair) => pair.left);
    out.right = matchRightOrder(item, options.seed);
  } else if (item.type === "typed" && item.policy?.accents === "require") {
    out.accentsRequired = true;
  }
  return out;
}

export interface ItemReview extends PublicItem {
  /** mc: the session's public id of the correct option. */
  correctOptionId?: string;
  /** typed: the canonical answer (first accepted form). */
  answer?: string;
  /** match: the correct pairs. */
  pairs?: { left: string; right: string }[];
  explanation: string;
}

/**
 * The answer review shown after a completed A, B or diagnostic session. Form C never reveals
 * answers, so this returns null for it. Callers must only use it once the session is completed.
 */
export function completedItemReview(
  item: BankItem,
  kind: ExamKind,
  options: PublicItemOptions,
): ItemReview | null {
  if (kind === "C") return null;
  const review: ItemReview = { ...publicItem(item, options), explanation: item.explanation };
  if (item.type === "mc" && item.correctOptionId)
    review.correctOptionId = publicOptionId(options.seed, item.id, item.correctOptionId);
  if (item.type === "typed" && item.accepted?.length) review.answer = item.accepted[0];
  if (item.type === "match")
    review.pairs = (item.pairs ?? []).map(({ left, right }) => ({ left, right }));
  return review;
}
