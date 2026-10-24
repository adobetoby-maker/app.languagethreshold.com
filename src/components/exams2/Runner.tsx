// Built by TAC — 2026-10-23
// The test runner: one question per screen, a 45-second clock on each, no going back. Each answer
// is sent when the learner moves on (that is the autosave); when the clock runs out the page
// reports the question as unanswered and the server serves the next one. The server keeps the
// real clock and refuses late answers, so nothing here can be used to get more time.
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { ExamsApiError, ExamsNetworkError, examsRequest, newRequestId } from "./api";
import { answerReady } from "./format";
import { McInput, MatchInput, TypedInput } from "./QuestionInputs";
import { ClockAnnouncer, QuestionClock } from "./QuestionClock";
import { useQuestionClock } from "./useQuestionClock";
import type { AnswerPayload, SessionData } from "./types";
import { FORM_TITLES } from "@/lib/exams2/timing";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const primary =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-midnight " +
  "motion-safe:transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-transparent px-5 py-3 text-base " +
  "hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70 disabled:cursor-not-allowed disabled:opacity-50";

function noticeFor(outcome: SessionData["outcome"], questionNumber: number): string {
  if (outcome === "expired")
    return `Time ran out on question ${questionNumber}. It counts as unanswered.`;
  if (outcome === "late")
    return `Your answer to question ${questionNumber} arrived after the time limit, so it wasn't counted.`;
  return "";
}

async function sendWithRetry<T>(run: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (cause) {
      if (!(cause instanceof ExamsNetworkError) || attempt >= 2) throw cause;
      attempt++;
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
  }
}

export function Runner({
  view,
  moduleName,
  spanish,
  onView,
  onLeave,
}: {
  view: SessionData;
  moduleName: string;
  spanish: boolean;
  onView: (next: SessionData) => void;
  onLeave: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [leaving, setLeaving] = useState(false);
  const pending = useRef<{ key: string; requestId: string } | null>(null);
  const lastAnswer = useRef<AnswerPayload | null | undefined>(undefined);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 9000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const send = useCallback(
    async (answer: AnswerPayload | null) => {
      const item = view.item;
      if (!item) return;
      lastAnswer.current = answer;
      // The same answer to the same question keeps one request id, so a retry can never count twice.
      const key = `${view.step}:${JSON.stringify(answer)}`;
      if (pending.current?.key !== key) pending.current = { key, requestId: newRequestId() };
      const requestId = pending.current.requestId;
      setBusy(true);
      setError("");
      try {
        const next = await sendWithRetry(() =>
          examsRequest<SessionData>({
            action: "answer",
            sessionId: view.sessionId,
            step: view.step,
            itemId: item.id,
            answer,
            requestId,
          }),
        );
        pending.current = null;
        setNotice(noticeFor(next.outcome, view.step + 1));
        onView(next);
      } catch (cause) {
        if (
          cause instanceof ExamsApiError &&
          ["step_mismatch", "item_mismatch", "finished"].includes(cause.code)
        ) {
          // Another tab or a retry already moved the test on: pick up where the server is.
          try {
            onView(
              await examsRequest<SessionData>({ action: "resume", sessionId: view.sessionId }),
            );
            pending.current = null;
            return;
          } catch {
            /* fall through to the message below */
          }
        }
        setError(
          cause instanceof Error ? cause.message : "We couldn't save that answer. Try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [view, onView],
  );

  const expire = useCallback(() => void send(null), [send]);
  const retry = () => void send(lastAnswer.current === undefined ? null : lastAnswer.current);

  if (!view.item || !view.timer) return null;
  const kind = view.kind === "diagnostic" ? null : view.kind;
  return (
    <div className="mx-auto w-full max-w-2xl" data-testid="runner">
      <QuestionPane
        key={`${view.sessionId}:${view.step}`}
        view={view}
        label={`${moduleName}${kind ? ` · Test ${kind} · ${FORM_TITLES[kind]}` : ""}`}
        busy={busy}
        spanish={spanish}
        onSubmit={(answer) => void send(answer)}
        onExpire={expire}
      />
      {notice ? (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl border border-amber-600/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/50 dark:text-amber-200"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-600/50 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:border-red-400/50 dark:text-red-200"
        >
          <span>{error}</span>
          <button type="button" className={secondary + " min-h-10 py-2"} onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Check className="h-4 w-4 text-gold-ink dark:text-gold" aria-hidden="true" />
          Each answer saves when you move on. You can&rsquo;t go back.
        </p>
        {leaving ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Leave the test"
          >
            <span>The clock keeps running while you&rsquo;re away.</span>
            <button type="button" className={secondary + " min-h-10 py-2"} onClick={onLeave}>
              Leave anyway
            </button>
            <button
              type="button"
              className={secondary + " min-h-10 py-2"}
              onClick={() => setLeaving(false)}
            >
              Stay
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="min-h-10 cursor-pointer rounded-lg px-2 underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-gold/70"
            onClick={() => setLeaving(true)}
          >
            Leave test
          </button>
        )}
      </footer>
    </div>
  );
}

function QuestionPane({
  view,
  label,
  busy,
  spanish,
  onSubmit,
  onExpire,
}: {
  view: SessionData;
  label: string;
  busy: boolean;
  spanish: boolean;
  onSubmit: (answer: AnswerPayload | null) => void;
  onExpire: () => void;
}) {
  const item = view.item!;
  const timer = view.timer!;
  const reduced = useReducedMotion();
  const clock = useQuestionClock(timer.limitMs, timer.elapsedMs, reduced);
  const [draft, setDraft] = useState<AnswerPayload | null>(null);
  const promptId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const expiredSent = useRef(false);
  const timedOut = clock.remaining <= 0;
  const ready = answerReady(item, draft);
  const isLast = view.step + 1 === view.total;

  useEffect(() => {
    // A typed answer takes focus in its field (its label is the prompt); other types start at the
    // prompt so a screen reader reads the question first.
    if (item.type !== "typed") headingRef.current?.focus();
    else document.querySelector<HTMLInputElement>('[data-testid="typed-answer"]')?.focus();
  }, [item.type]);

  useEffect(() => {
    if (timedOut && !busy && !expiredSent.current) {
      expiredSent.current = true;
      onExpire();
    }
  }, [timedOut, busy, onExpire]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!ready || busy || timedOut || !draft) return;
    onSubmit(draft);
  }

  const done = view.step;
  const share = Math.round((done / view.total) * 100);
  return (
    <div>
      <ClockAnnouncer seconds={clock.seconds} />
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-ink dark:text-gold">
            {label}
          </p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl" data-testid="progress-label">
            Question {view.step + 1} of {view.total}
          </h1>
        </div>
        <QuestionClock
          limitMs={timer.limitMs}
          remaining={clock.remaining}
          seconds={clock.seconds}
          tone={clock.tone}
        />
      </header>
      <div
        role="progressbar"
        aria-label="Test progress"
        aria-valuemin={0}
        aria-valuemax={view.total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${view.total} questions done`}
        className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-gold motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${share}%` }}
        />
      </div>

      <form onSubmit={submit} className="mt-8" noValidate>
        <h2
          id={promptId}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl leading-snug outline-none sm:text-2xl"
          data-testid="question-prompt"
        >
          {item.prompt}
        </h2>
        {item.context ? (
          <p className="mt-3 rounded-r-xl border-l-4 border-gold/60 bg-card/40 px-4 py-3 text-base text-muted-foreground">
            {item.context}
          </p>
        ) : null}
        <div className="mt-6">
          {item.type === "mc" ? (
            <McInput item={item} draft={draft} disabled={busy || timedOut} onChange={setDraft} />
          ) : item.type === "typed" ? (
            <TypedInput
              item={item}
              draft={draft}
              disabled={busy || timedOut}
              spanish={spanish}
              onChange={setDraft}
              labelId={promptId}
            />
          ) : (
            <MatchInput item={item} draft={draft} disabled={busy || timedOut} onChange={setDraft} />
          )}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={secondary}
            disabled={busy || timedOut}
            onClick={() => onSubmit({ type: "dont_know" })}
          >
            I don&rsquo;t know
          </button>
          <button type="submit" className={primary} disabled={!ready || busy || timedOut}>
            {busy ? "Saving…" : isLast ? "Finish" : "Next"}
            {busy ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
