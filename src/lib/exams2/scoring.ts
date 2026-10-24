// Built by TAC — 2026-10-23
/**
 * Deterministic scoring for exams v2: one item, and the fixed forms A/B/C (design section 3).
 * Typed answers reuse the legacy engine's normalizer, so both engines agree on what "the same
 * answer" means. Pure module: no server-only imports, no React.
 */
import { scoreFixedAnswer } from "../assessments/core.ts";
import { moduleLessonUrl } from "../learning-link.ts";
import {
  answerPolicy,
  formItems,
  lessonTitle,
  type BankItem,
  type BankPhase,
  type ExamBank,
  type FixedFormKind,
} from "./bank.ts";
import { publicOptionId } from "./public-item.ts";

export type ExamAnswer =
  | { type: "mc"; optionId: string }
  | { type: "typed"; text: string }
  /** left text -> chosen right text, using the strings the public item showed. */
  | { type: "match"; matches: Record<string, string> }
  /** "I don't know": always wrong, and no guessing allowance in the diagnostic model. */
  | { type: "dont_know" };

export interface ItemScore {
  /** 0..1; match items earn 1/pairs per correct pair. */
  points: number;
  max: 1;
  dontKnow: boolean;
}

export const B_ON_TRACK = 0.7;
export const C_PASS = 0.8;

/** Score one answer against the private item. Unknown or mismatched answer shapes score 0. */
export function scoreItem(
  item: BankItem,
  answer: ExamAnswer | null | undefined,
  seed: string,
): ItemScore {
  const zero = (dontKnow = false): ItemScore => ({ points: 0, max: 1, dontKnow });
  if (!answer || typeof answer !== "object") return zero();
  if (answer.type === "dont_know") return zero(true);
  if (answer.type !== item.type) return zero();
  if (answer.type === "mc") {
    if (typeof answer.optionId !== "string" || !item.correctOptionId) return zero();
    const expected = publicOptionId(seed, item.id, item.correctOptionId);
    return { points: answer.optionId === expected ? 1 : 0, max: 1, dontKnow: false };
  }
  if (answer.type === "typed") {
    if (typeof answer.text !== "string" || answer.text.length > 500) return zero();
    const ok = scoreFixedAnswer(answer.text, item.accepted ?? [], answerPolicy(item));
    return { points: ok ? 1 : 0, max: 1, dontKnow: false };
  }
  const pairs = item.pairs ?? [];
  const matches = answer.matches;
  if (!pairs.length || !matches || typeof matches !== "object") return zero();
  // Each right-hand entry can be used once; a reused right only counts for its first left.
  const usedRights = new Set<string>();
  let correct = 0;
  for (const pair of pairs) {
    const chosen = Object.prototype.hasOwnProperty.call(matches, pair.left)
      ? matches[pair.left]
      : undefined;
    if (typeof chosen !== "string" || usedRights.has(chosen)) continue;
    usedRights.add(chosen);
    if (chosen === pair.right) correct++;
  }
  return { points: correct / pairs.length, max: 1, dontKnow: false };
}

export interface FixedResponse {
  itemId: string;
  answer: ExamAnswer | null;
}
export interface LessonScore {
  lesson: number;
  title: string;
  score: number;
  total: number;
  pct: number;
  href: string;
}
/**
 * Full fixed-form result. Server-side only: it carries per-item points (`items`), which for
 * form C would reveal which answers were right. Send `publicFixedFormResult()` to clients.
 */
export interface FixedFormResult {
  kind: FixedFormKind;
  score: number;
  total: number;
  /** Percent, one decimal. Pass/on-track flags use the exact ratio. */
  pct: number;
  /** C only: pass at >= 80%. */
  passed?: boolean;
  /** B only: "on track" at >= 70%. */
  onTrack?: boolean;
  lessons: LessonScore[];
  /** Lessons with any lost point, in lesson order. */
  missedLessons: number[];
  items: { itemId: string; lesson: number; points: number }[];
}
export interface LinkContext {
  target: string;
  native: string;
}

const pct1 = (score: number, total: number) =>
  total ? Math.round((score / total) * 1000) / 10 : 0;

/**
 * Score a fixed form. Unanswered items score 0. Throws when a response names an item that is not
 * on the form, or names one twice, so a forged submission is rejected rather than ignored.
 */
export function scoreFixedForm(
  bank: ExamBank,
  kind: FixedFormKind,
  responses: readonly FixedResponse[],
  seed: string,
  link: LinkContext,
): FixedFormResult {
  const items = formItems(bank, kind);
  const onForm = new Map(items.map((item) => [item.id, item]));
  const answers = new Map<string, ExamAnswer | null>();
  for (const response of responses) {
    if (!onForm.has(response.itemId))
      throw new Error("Response for an item that is not on this form.");
    if (answers.has(response.itemId)) throw new Error("Duplicate response for one item.");
    answers.set(response.itemId, response.answer);
  }
  const scored = items.map((item) => ({
    itemId: item.id,
    lesson: item.lesson,
    points: scoreItem(item, answers.get(item.id), seed).points,
  }));
  const byLesson = new Map<number, { score: number; total: number }>();
  for (const entry of scored) {
    const bucket = byLesson.get(entry.lesson) ?? { score: 0, total: 0 };
    bucket.score += entry.points;
    bucket.total += 1;
    byLesson.set(entry.lesson, bucket);
  }
  const lessons: LessonScore[] = [...byLesson.entries()]
    .sort(([a], [b]) => a - b)
    .map(([lesson, { score, total }]) => ({
      lesson,
      title: lessonTitle(bank, lesson),
      score,
      total,
      pct: pct1(score, total),
      href: moduleLessonUrl({
        moduleId: bank.moduleId,
        target: link.target,
        native: link.native,
        lesson,
        way: "recall",
      }),
    }));
  const score = scored.reduce((sum, entry) => sum + entry.points, 0);
  const total = scored.length;
  const result: FixedFormResult = {
    kind,
    score,
    total,
    pct: pct1(score, total),
    lessons,
    missedLessons: lessons
      .filter((lesson) => lesson.score < lesson.total)
      .map((lesson) => lesson.lesson),
    items: scored,
  };
  // Compare in integer quarter-points to avoid float drift at the 80% / 70% boundary.
  const quarters = Math.round(score * 4);
  if (kind === "C") result.passed = quarters * 10 >= Math.round(total * 4 * C_PASS * 10);
  if (kind === "B") result.onTrack = quarters * 10 >= Math.round(total * 4 * B_ON_TRACK * 10);
  return result;
}

export interface PublicMissedLesson {
  lesson: number;
  title: string;
  href: string;
}
/** A job phase with at least one lost point on form C, linked to the phase's first lesson. */
export interface PublicMissedPhase {
  id: string;
  title: string;
  href: string;
}
/**
 * Form C, client-safe and deliberately coarse. Form C is the same 60 items for everyone and can
 * be retaken (owner decision), so exact percents and per-lesson misses would let repeated
 * attempts map out the answer key. The client gets the percent rounded to the nearest 5, the
 * pass/fail call (made on the exact score) and the phases with misses. Nothing per lesson or item.
 */
export interface PublicFormCResult {
  kind: "C";
  /** Nearest 5; never shows 80 or more on a fail, or under 80 on a pass. */
  pct: number;
  passed: boolean;
  missedPhases: PublicMissedPhase[];
}
/** Forms A and B, client-safe: percent, the per-lesson table and missed lessons, no item data. */
export interface PublicFormABResult {
  kind: "A" | "B";
  pct: number;
  onTrack?: boolean;
  lessons: { lesson: number; title: string; pct: number; href: string }[];
  missedLessons: PublicMissedLesson[];
}
export type PublicFixedFormResult = PublicFormCResult | PublicFormABResult;

/** Percent rounded to the nearest 5, kept on the right side of the pass line. */
export function coarsePct(pct: number, passed: boolean): number {
  const rounded = Math.round(pct / 5) * 5;
  if (!passed && rounded >= C_PASS * 100) return C_PASS * 100 - 5;
  if (passed && rounded < C_PASS * 100) return C_PASS * 100;
  return rounded;
}

/**
 * The only fixed-form result that may leave the server. Built field by field from the full
 * result; never includes item ids, per-item points or raw scores. Form C needs the bank's phases
 * and reports misses by phase only. Answer review for A and B comes separately from
 * `completedItemReview`; form C never gets one.
 */
export function publicFixedFormResult(
  result: FixedFormResult,
  phases?: readonly Pick<BankPhase, "id" | "title" | "lessons">[],
): PublicFixedFormResult {
  const byLesson = new Map(result.lessons.map((lesson) => [lesson.lesson, lesson]));
  if (result.kind === "C") {
    if (!phases?.length) throw new Error("Form C results need the bank's phases.");
    const missed = new Set(result.missedLessons);
    const passed = result.passed === true;
    return {
      kind: "C",
      pct: coarsePct(result.pct, passed),
      passed,
      missedPhases: phases
        .filter((phase) => phase.lessons.some((lesson) => missed.has(lesson)))
        .map((phase) => ({
          id: phase.id,
          title: phase.title,
          href: byLesson.get(phase.lessons[0])?.href ?? "",
        })),
    };
  }
  const missedLessons = result.missedLessons.map((n) => {
    const lesson = byLesson.get(n)!;
    return { lesson: n, title: lesson.title, href: lesson.href };
  });
  const out: PublicFormABResult = {
    kind: result.kind,
    pct: result.pct,
    lessons: result.lessons.map(({ lesson, title, pct, href }) => ({ lesson, title, pct, href })),
    missedLessons,
  };
  if (result.kind === "B") out.onTrack = result.onTrack === true;
  return out;
}
