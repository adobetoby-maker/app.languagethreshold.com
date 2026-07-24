/**
 * SM-2 spaced-repetition scheduler (the algorithm behind Anki/SuperMemo).
 * Pure and deterministic — no AI calls, so scheduling is instant and free.
 */
export type SrsGrade = "again" | "hard" | "good" | "easy";

export interface SrsFields {
  easeFactor: number; // >= 1.3, starts at 2.5
  interval: number; // days until next review
  repetitions: number; // consecutive correct reviews
  dueDate: number; // epoch ms
  lastReviewedAt: number | null;
}

export function newSrsFields(now: number = Date.now()): SrsFields {
  return { easeFactor: 2.5, interval: 0, repetitions: 0, dueDate: now, lastReviewedAt: null };
}

// SM-2 quality scale is 0-5; we expose four learner-facing buttons mapped onto it.
const GRADE_QUALITY: Record<SrsGrade, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export function schedule(fields: SrsFields, grade: SrsGrade, now: number = Date.now()): SrsFields {
  const q = GRADE_QUALITY[grade];
  let { easeFactor, interval, repetitions } = fields;

  if (q < 3) {
    // Forgotten — reset the streak so it comes back tomorrow instead of drifting away.
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  return {
    easeFactor,
    interval,
    repetitions,
    dueDate: now + interval * 86_400_000,
    lastReviewedAt: now,
  };
}

export function isDue(fields: SrsFields, now: number = Date.now()): boolean {
  return fields.dueDate <= now;
}
