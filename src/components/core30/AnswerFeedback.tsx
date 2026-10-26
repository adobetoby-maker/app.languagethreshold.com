// Built by TAC — 2026-10-15
import { useMemo, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  compareAnswer,
  verdictHeadline,
  type AnswerSegment,
  type AnswerVerdict,
  type SegmentStatus,
} from "@/lib/answer-feedback";
import { languageTag } from "@/lib/lesson-words-core";

// Explains an answer: a verdict line, the expected word with each letter marked against what
// the learner gave, what the app read from handwriting (when that is where the answer came
// from) and short tips. Generic on purpose: it holds no lesson or practice-mode state, so any
// screen that has a given answer and an expected answer can use it.

export interface AnswerFeedbackProps {
  /** What was typed, or the text read from handwriting. */
  given: string;
  /** The expected answer. */
  expected: string;
  /** The language of the expected answer, e.g. "Spanish". */
  language: string;
  /** Text read from the learner's handwriting; shown as "We read: ..." when present. */
  recognizedText?: string | null;
  /** Tighter spacing and a smaller answer for use inside lists and cards. */
  compact?: boolean;
  /**
   * True when the practice scorer counted this answer correct. A slip the scorer forgives then
   * reads "Correct — small slip" (tips still listed) instead of "Close", so the headline
   * always agrees with the score.
   */
  scoredCorrect?: boolean;
  /** Something to show at the end of the verdict line, such as an audio button. */
  action?: ReactNode;
  className?: string;
}

const VERDICT_BOX: Record<AnswerVerdict, string> = {
  correct: "border-emerald-500/40 bg-emerald-500/10",
  accent: "border-gold/40 bg-gold/10",
  close: "border-gold/40 bg-gold/10",
  wrong: "border-red-500/40 bg-red-500/10",
};

// Colour is never the only signal: wrong letters are underlined, missing ones sit in a dashed
// box, extra ones are struck through and accent marks get a dotted underline.
const SEGMENT_CLASS: Record<SegmentStatus, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  wrong:
    "rounded-sm bg-red-500/15 px-px text-red-600 underline decoration-red-500 decoration-2 underline-offset-4 dark:text-red-400",
  missing:
    "rounded-sm border-b-2 border-dashed border-red-500 bg-red-500/20 px-px text-red-600 dark:text-red-400",
  extra: "text-red-600 line-through decoration-2 dark:text-red-400",
  accent:
    "text-amber-700 underline decoration-amber-600 decoration-dotted decoration-2 underline-offset-4 dark:text-gold dark:decoration-gold",
};

const SEGMENT_TITLE: Record<SegmentStatus, string> = {
  ok: "Right",
  wrong: "Wrong letter",
  missing: "Missing",
  extra: "Extra",
  accent: "Check the accent",
};

function VerdictIcon({ verdict }: { verdict: AnswerVerdict }) {
  if (verdict === "correct") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />;
  }
  if (verdict === "wrong") {
    return <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />;
  }
  return <CircleAlert className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />;
}

function Segment({ segment }: { segment: AnswerSegment }) {
  const title =
    segment.status === "wrong" && segment.given
      ? `Wrong letter: you wrote ${segment.given}`
      : segment.status === "accent" && segment.given
        ? `Check the accent: you wrote ${segment.given}`
        : SEGMENT_TITLE[segment.status];
  return (
    <span data-status={segment.status} title={title} className={SEGMENT_CLASS[segment.status]}>
      {segment.text}
    </span>
  );
}

export function AnswerFeedback({
  given,
  expected,
  language,
  recognizedText,
  compact = false,
  scoredCorrect = false,
  action,
  className,
}: AnswerFeedbackProps) {
  const comparison = useMemo(
    () => compareAnswer(given, expected, language),
    [given, expected, language],
  );
  const tag = languageTag(language);
  const read = recognizedText?.trim();
  const slip = scoredCorrect && comparison.verdict !== "correct";
  const tone: AnswerVerdict = slip ? "correct" : comparison.verdict;

  return (
    <div
      role="status"
      data-testid="answer-feedback"
      data-verdict={comparison.verdict}
      data-scored-correct={scoredCorrect ? "true" : undefined}
      className={cn(
        "space-y-2 rounded-xl border text-sm",
        compact ? "p-2.5" : "p-3",
        VERDICT_BOX[tone],
        className,
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <VerdictIcon verdict={tone} />
        <p className="min-w-0 break-words font-semibold" data-testid="answer-feedback-verdict">
          {verdictHeadline(comparison.verdict, scoredCorrect)}
        </p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div>
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Answer
        </p>
        <p
          lang={tag}
          data-testid="answer-feedback-word"
          className={cn("break-words font-bold", compact ? "text-xl" : "text-2xl")}
        >
          <span className="sr-only">{comparison.target}</span>
          <span aria-hidden="true">
            {comparison.segments.map((segment, index) => (
              <Segment key={`${index}-${segment.status}-${segment.text}`} segment={segment} />
            ))}
          </span>
        </p>
        {comparison.target !== expected.trim() ? (
          <p lang={tag} className="mt-0.5 break-words text-xs text-muted-foreground">
            Full entry: {expected}
          </p>
        ) : null}
      </div>

      {read ? (
        <p className="break-words text-sm text-foreground" data-testid="answer-feedback-read">
          <span className="text-muted-foreground">We read: </span>
          <span lang={tag} className="font-semibold">
            {read}
          </span>
        </p>
      ) : null}

      {comparison.tips.length > 0 ? (
        <ul className="space-y-0.5 text-sm text-foreground" data-testid="answer-feedback-tips">
          {comparison.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
