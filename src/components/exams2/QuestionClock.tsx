// Built by TAC — 2026-10-23
// The 45-second clock for one question: a ring (or just the number when the learner prefers
// reduced motion) that turns amber at 10 s and red at 5 s. The server is the authority on the
// clock; this only shows it. Screen readers hear it politely at 10 s and at 0, not every second.
import { useEffect, useRef, useState } from "react";
import type { ClockTone } from "@/lib/exams2/timing";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<ClockTone, string> = {
  calm: "text-gold-ink dark:text-gold",
  warn: "text-amber-700 dark:text-amber-400",
  urgent: "text-red-700 dark:text-red-400",
  expired: "text-muted-foreground",
};
const TONE_BORDER: Record<ClockTone, string> = {
  calm: "border-border",
  warn: "border-amber-600/70 dark:border-amber-400/70",
  urgent: "border-red-600/70 dark:border-red-400/70",
  expired: "border-border",
};

export function QuestionClock({
  limitMs,
  remaining,
  seconds,
  tone,
}: {
  limitMs: number;
  remaining: number;
  seconds: number;
  tone: ClockTone;
}) {
  const reduced = useReducedMotion();
  const size = 76;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(1, Math.max(0, remaining / limitMs));
  return (
    <div
      data-testid="question-clock"
      data-tone={tone}
      data-seconds={seconds}
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        reduced && "rounded-xl border-2 px-4 py-2",
        reduced && TONE_BORDER[tone],
        TONE_TEXT[tone],
      )}
      style={reduced ? undefined : { width: size, height: size }}
    >
      {reduced ? null : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-current"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
          />
        </svg>
      )}
      {/* The number is not announced every second: a separate polite region speaks at 10 s and 0. */}
      <div role="timer" aria-live="off" className="flex flex-col items-center leading-none">
        <span className="font-mono text-2xl font-semibold tabular-nums">{seconds}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {reduced ? "seconds left" : "sec"}
        </span>
      </div>
    </div>
  );
}

/**
 * Visually hidden live region. Says "10 seconds left" once when the clock reaches 10 and "Time is
 * up" once at 0. Empty otherwise, so it never chatters.
 */
export function ClockAnnouncer({ seconds }: { seconds: number }) {
  const [message, setMessage] = useState("");
  const spoken = useRef({ ten: false, zero: false });
  useEffect(() => {
    if (seconds <= 10 && seconds > 0 && !spoken.current.ten) {
      spoken.current.ten = true;
      setMessage("10 seconds left.");
    } else if (seconds === 0 && !spoken.current.zero) {
      spoken.current.zero = true;
      setMessage("Time is up. Moving to the next question.");
    }
  }, [seconds]);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
