// Built by TAC — 2026-10-23
import type { AnswerPayload, PublicItemView, ReviewItem } from "./types";

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const percent = (value: number) => `${Math.round(value)}%`;

/** True when the learner has something to submit for this question. */
export function answerReady(item: PublicItemView, draft: AnswerPayload | null): boolean {
  if (!draft) return false;
  if (draft.type === "mc") return Boolean(draft.optionId);
  if (draft.type === "typed") return draft.text.trim().length > 0;
  if (draft.type === "match")
    return Object.keys(draft.matches).length === (item.left?.length ?? 0) && !!item.left?.length;
  return false;
}

/** A learner's answer as readable text, for the review after A and B. */
export function describeAnswer(item: ReviewItem, answer: AnswerPayload | null): string {
  if (!answer || answer.type === "dont_know") return "No answer";
  if (answer.type === "mc")
    return item.options?.find((option) => option.id === answer.optionId)?.text ?? "No answer";
  if (answer.type === "typed") return answer.text.trim() || "No answer";
  return Object.entries(answer.matches)
    .map(([left, right]) => `${left} → ${right}`)
    .join("; ");
}

/** The right answer as readable text. */
export function describeSolution(item: ReviewItem): string {
  const { solution } = item;
  if (solution.optionId)
    return item.options?.find((option) => option.id === solution.optionId)?.text ?? "";
  if (solution.text !== undefined) return solution.text;
  return (solution.pairs ?? []).map((pair) => `${pair.left} → ${pair.right}`).join("; ");
}
