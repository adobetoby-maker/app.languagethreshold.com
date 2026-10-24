// Built by TAC — 2026-10-23
// Shapes of the /api/exam-check responses the learner pages use. Mirrors src/lib/exams2/server.ts,
// but never the bank's private key names: the client only ever sees public items, the client-side
// names for a finished review, and coarse results.

export type FormKind = "A" | "B" | "C";

export interface FormWindowView {
  kind: FormKind;
  open: boolean;
  via?: "always" | "day" | "lessons";
  /** First day the day rule opens this form, YYYY-MM-DD. */
  opensOn?: string;
  lessons?: { from: number; to: number; done: number };
  lateBaseline?: boolean;
  /** Ready-made sentence for a locked form ("Opens Dec 7, 2026, or when lessons 1–15 are done."). */
  message: string;
}
export interface FormScoreView {
  /** A and B: exact. C: nearest 5. */
  pct: number;
  passed?: boolean;
  onTrack?: boolean;
  at: string | null;
}
export interface FormOverview {
  kind: FormKind;
  title: string;
  questions: number;
  window: FormWindowView;
  /** Platform staff can start this form although it is still locked for learners. */
  preview: boolean;
  status: "not_taken" | "in_progress" | "completed";
  inProgress: { sessionId: string; step: number; total: number } | null;
  attempts: number;
  best: FormScoreView | null;
  last: FormScoreView | null;
  retake: { allowed: boolean; message?: string; retryAt?: string };
}
export interface ModuleOverview {
  moduleId: string;
  /** null for a signed-out visitor: they only learn which modules have tests. */
  forms: Record<FormKind, FormOverview> | null;
}
export interface Overview {
  target: string;
  native: string;
  signedIn: boolean;
  staff: boolean;
  modules: ModuleOverview[];
}

export interface PublicOption {
  id: string;
  text: string;
}
export interface PublicItemView {
  id: string;
  lesson: number;
  type: "mc" | "typed" | "match";
  prompt: string;
  context?: string;
  options?: PublicOption[];
  left?: string[];
  right?: string[];
  accentsRequired?: true;
}
export type AnswerPayload =
  | { type: "mc"; optionId: string }
  | { type: "typed"; text: string }
  | { type: "match"; matches: Record<string, string> }
  | { type: "dont_know" };

export interface QuestionTimerView {
  limitMs: number;
  graceMs: number;
  /** Server-measured time since this question was served. */
  elapsedMs: number;
}
export interface SessionData {
  sessionId: string;
  kind: FormKind | "diagnostic";
  moduleId: string;
  target: string;
  native: string;
  status: "in_progress" | "completed" | "abandoned";
  step: number;
  total: number;
  item: PublicItemView | null;
  timer: QuestionTimerView | null;
  resumed?: boolean;
  /** How the answer just sent was recorded. */
  outcome?: "recorded" | "expired" | "late";
}

export interface ReviewItem extends PublicItemView {
  explanation: string;
  solution: { optionId?: string; text?: string; pairs?: { left: string; right: string }[] };
  yourAnswer: AnswerPayload | null;
  points: number;
}
export interface LessonRow {
  lesson: number;
  title: string;
  pct: number;
  href: string;
}
export interface ResultAB {
  sessionId: string;
  kind: "A" | "B";
  status: "completed";
  completedAt: string | null;
  result: {
    kind: "A" | "B";
    pct: number;
    onTrack?: boolean;
    lessons: LessonRow[];
    missedLessons: { lesson: number; title: string; href: string }[];
  };
  review: ReviewItem[];
}
export interface ResultC {
  sessionId: string;
  kind: "C";
  status: "completed";
  completedAt: string | null;
  result: {
    kind: "C";
    pct: number;
    passed: boolean;
    missedPhases: { id: string; title: string; href: string }[];
  };
}
export type ResultData = ResultAB | ResultC;
