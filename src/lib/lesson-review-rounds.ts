import type { SrsFields, SrsGrade } from "./srs.ts";

export const REVIEW_ROUND_SIZE = 12;
export const REVIEW_MAX_ATTEMPTS = 18;
export interface ReviewCandidate {
  id: string;
  srs: SrsFields;
  reviewHistory?: { grade: SrsGrade; at: number }[];
}
export interface ReviewRound {
  checkpoint: number | null;
  queue: string[];
  attempts: number;
  total: number;
  retries: Record<string, number>;
}
export interface LessonReviewRecord {
  completed: Record<string, number>;
  round: ReviewRound | null;
}
export const emptyReviewRecord = (): LessonReviewRecord => ({ completed: {}, round: null });
/** NFC preserves language distinctions, including ñ; never strip accents to identify a card. */
export function reviewPair(target: string, native: string): string {
  return JSON.stringify([
    target.normalize("NFC").trim().toLocaleLowerCase("en"),
    native.normalize("NFC").trim().toLocaleLowerCase("en"),
  ]);
}
export function checkpointBoundaries(total: number): number[] {
  const boundaries: number[] = [];
  for (let n = 3; n <= total; n += 3) boundaries.push(n);
  if (total > 0 && total % 3) boundaries.push(total);
  return boundaries;
}
/** Only a completed batch unlocks its review. Existing completed checkpoints never interrupt again. */
export function pendingCheckpoint(
  completedLessons: readonly boolean[],
  completed: Record<string, number>,
): number | null {
  return (
    checkpointBoundaries(completedLessons.length).find(
      (n, i, all) =>
        !completed[String(n)] && completedLessons.slice(i ? all[i - 1] : 0, n).every(Boolean),
    ) ?? null
  );
}
export function selectReviewCards<T extends ReviewCandidate>(
  cards: readonly T[],
  now: number,
  dueOnly = false,
): T[] {
  const weak = (c: T) => {
    const last = c.reviewHistory?.at(-1)?.grade;
    return last === "again" ? 0 : last === "hard" ? 1 : 2;
  };
  return cards
    .filter((c) => !dueOnly || c.srs.dueDate <= now)
    .slice()
    .sort(
      (a, b) =>
        Number(b.srs.dueDate <= now) - Number(a.srs.dueDate <= now) ||
        weak(a) - weak(b) ||
        a.srs.dueDate - b.srs.dueDate ||
        a.id.localeCompare(b.id),
    )
    .slice(0, REVIEW_ROUND_SIZE);
}
export function startReviewRound(
  cards: readonly ReviewCandidate[],
  checkpoint: number | null,
  now: number,
): ReviewRound {
  const queue = selectReviewCards(cards, now, checkpoint === null).map((c) => c.id);
  return { checkpoint, queue, attempts: 0, total: queue.length, retries: {} };
}
/** One retry per failed card, after intervening cards. A lone failure waits until its future due date. */
export function rateReviewRound(round: ReviewRound, grade: SrsGrade): ReviewRound {
  const [id, ...queue] = round.queue;
  if (!id) return round;
  const attempts = round.attempts + 1;
  const retries = { ...round.retries };
  if (
    (grade === "again" || grade === "hard") &&
    queue.length >= 2 &&
    !retries[id] &&
    attempts + queue.length < REVIEW_MAX_ATTEMPTS
  ) {
    queue.splice(Math.min(3, queue.length), 0, id);
    retries[id] = 1;
  }
  return { ...round, queue: attempts >= REVIEW_MAX_ATTEMPTS ? [] : queue, attempts, retries };
}
export function readReviewRecord(value: unknown): LessonReviewRecord {
  if (!value || typeof value !== "object") return emptyReviewRecord();
  const v = value as Partial<LessonReviewRecord>;
  const completed = Object.fromEntries(
    Object.entries(v.completed ?? {}).filter(
      ([k, at]) => /^\d+$/.test(k) && typeof at === "number" && Number.isFinite(at),
    ),
  );
  const r = v.round;
  const valid =
    r &&
    Array.isArray(r.queue) &&
    r.queue.length <= REVIEW_MAX_ATTEMPTS &&
    r.queue.every((id) => typeof id === "string") &&
    Number.isInteger(r.attempts) &&
    r.attempts >= 0 &&
    r.attempts <= REVIEW_MAX_ATTEMPTS &&
    Number.isInteger(r.total) &&
    r.total >= 0 &&
    r.total <= REVIEW_ROUND_SIZE &&
    (r.checkpoint === null || Number.isInteger(r.checkpoint)) &&
    r.retries &&
    typeof r.retries === "object";
  return { completed, round: valid ? r : null };
}
