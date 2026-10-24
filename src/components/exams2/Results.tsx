// Built by TAC — 2026-10-23
// Results after a test. A and B: score, a per-lesson table, missed lessons linked to study, and
// every item with the right answer and its explanation. C: the pass call, a coarse score and the
// phases to study, never an answer (the final test is the same for everyone and can be retaken).
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, BookOpen, Check, CircleHelp, X } from "lucide-react";
import { ExamsApiError, examsRequest } from "./api";
import { describeAnswer, describeSolution, percent, shortDate } from "./format";
import type { ResultAB, ResultC, ResultData, ReviewItem } from "./types";
import { FORM_TITLES } from "@/lib/exams2/timing";
import { cn } from "@/lib/utils";

const secondary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm " +
  "hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70";
const panel = "rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-6";

export function Results({
  sessionId,
  moduleName,
  baselinePct,
  onBack,
}: {
  sessionId: string;
  moduleName: string;
  baselinePct: number | null;
  onBack: () => void;
}) {
  const [data, setData] = useState<ResultData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    examsRequest<ResultData>({ action: "result", sessionId }, controller.signal)
      .then(setData)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ExamsApiError || cause instanceof Error
            ? cause.message
            : "We couldn't load your result.",
        );
      });
    return () => controller.abort();
  }, [sessionId]);

  return (
    <div className="mx-auto w-full max-w-3xl" data-testid="results">
      <button type="button" className={secondary} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to exams
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-600/50 p-4 text-red-800 dark:text-red-300"
        >
          {error}
        </p>
      ) : !data ? (
        <p role="status" className="mt-6 text-muted-foreground">
          Loading your result…
        </p>
      ) : data.kind === "C" ? (
        <FinalResult data={data} moduleName={moduleName} baselinePct={baselinePct} />
      ) : (
        <CheckpointResult data={data} moduleName={moduleName} />
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-gold-ink dark:text-gold">
      {children}
    </p>
  );
}

function SavedNote({ at }: { at: string | null }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Check className="h-4 w-4 text-gold-ink dark:text-gold" aria-hidden="true" />
      Saved to your account{at ? ` on ${shortDate(at)}` : ""}.
    </p>
  );
}

function FinalResult({
  data,
  moduleName,
  baselinePct,
}: {
  data: ResultC;
  moduleName: string;
  baselinePct: number | null;
}) {
  const { pct, passed, missedPhases } = data.result;
  return (
    <>
      <Eyebrow>
        {moduleName} · Test C · {FORM_TITLES.C}
      </Eyebrow>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">
        {passed ? "You passed the final test" : "Not passed yet"}
      </h1>
      <div className={cn(panel, "mt-6 flex flex-wrap items-end gap-x-8 gap-y-3")}>
        <div>
          <p className="font-display text-6xl tabular-nums" data-testid="result-score">
            {pct}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rounded to the nearest 5. Pass mark: 80%.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-semibold",
            passed
              ? "border-emerald-600/50 text-emerald-800 dark:text-emerald-300"
              : "border-amber-600/60 text-amber-800 dark:text-amber-300",
          )}
        >
          {passed ? "Passed" : "Below the pass mark"}
        </span>
      </div>
      {baselinePct !== null ? (
        <p className="mt-4 text-base" data-testid="growth">
          Baseline {percent(baselinePct)} <span aria-hidden="true">{"→"}</span>
          <span className="sr-only"> to </span> final about {pct}%.{" "}
          <span className="text-muted-foreground">Same blueprint, not statistically equated.</span>
        </p>
      ) : null}
      <SavedNote at={data.completedAt} />
      <section aria-labelledby="missed-phases" className="mt-10">
        <h2 id="missed-phases" className="font-display text-2xl">
          {missedPhases.length ? "Where to study next" : "Nothing to study"}
        </h2>
        {missedPhases.length ? (
          <>
            <p className="mt-2 text-muted-foreground">
              These parts of the module had missed questions. The final test never shows answers, so
              study the lessons, then retake it when you&rsquo;re ready.
            </p>
            <ul className="mt-4 grid gap-2.5">
              {missedPhases.map((phase) => (
                <li key={phase.id}>
                  <a
                    href={phase.href}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70"
                  >
                    <span>{phase.title}</span>
                    <span className="flex items-center gap-1.5 text-sm text-gold-ink dark:text-gold">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Study
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Every part of the module is solid. Well done.
          </p>
        )}
      </section>
    </>
  );
}

function CheckpointResult({ data, moduleName }: { data: ResultAB; moduleName: string }) {
  const { kind, pct, onTrack, lessons, missedLessons } = data.result;
  const missedSet = new Set(missedLessons.map((lesson) => lesson.lesson));
  const [onlyMissed, setOnlyMissed] = useState(missedLessons.length > 0);
  const reviewItems = data.review.filter((item) => !onlyMissed || item.points < 1);
  const heading = kind === "A" ? "Your baseline" : onTrack ? "You are on track" : "Keep practicing";
  return (
    <>
      <Eyebrow>
        {moduleName} · Test {kind} · {FORM_TITLES[kind]}
      </Eyebrow>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">{heading}</h1>
      <div className={cn(panel, "mt-6 flex flex-wrap items-end gap-x-8 gap-y-3")}>
        <div>
          <p className="font-display text-6xl tabular-nums" data-testid="result-score">
            {percent(pct)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kind === "A"
              ? "This is where you start. It isn't graded."
              : "Midpoint on lessons 1–15. 70% means you are on track."}
          </p>
        </div>
        {kind === "B" ? (
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-semibold",
              onTrack
                ? "border-emerald-600/50 text-emerald-800 dark:text-emerald-300"
                : "border-amber-600/60 text-amber-800 dark:text-amber-300",
            )}
          >
            {onTrack ? "On track" : "Below 70%"}
          </span>
        ) : null}
      </div>
      <SavedNote at={data.completedAt} />

      <section aria-labelledby="by-lesson" className="mt-10">
        <h2 id="by-lesson" className="font-display text-2xl">
          Score by lesson
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">
              Score for each lesson, with a study link for lessons with missed questions
            </caption>
            <thead className="bg-card/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-14 px-3 py-2.5 font-medium">
                  Lesson
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Topic
                </th>
                <th scope="col" className="w-24 px-3 py-2.5 text-right font-medium">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((row) => (
                <tr key={row.lesson} className="border-t border-border/50 align-top">
                  <td className="px-3 py-3 font-mono tabular-nums text-muted-foreground">
                    {row.lesson}
                  </td>
                  <td className="px-3 py-3">
                    <span className="break-words">{row.title}</span>
                    {missedSet.has(row.lesson) ? (
                      <a
                        href={row.href}
                        className="mt-1 flex min-h-8 items-center gap-1.5 text-gold-ink underline underline-offset-4 dark:text-gold"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        Study lesson {row.lesson}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold tabular-nums">{percent(row.pct)}</span>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 block h-1 overflow-hidden rounded-full bg-border"
                    >
                      <span
                        className="block h-full rounded-full bg-gold"
                        style={{ width: `${Math.min(100, Math.round(row.pct))}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="review" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="review" className="font-display text-2xl">
            Every question, with the answer
          </h2>
          {missedLessons.length ? (
            <div role="group" aria-label="Which questions to show" className="flex gap-2">
              {[
                { label: "Missed", value: true },
                { label: "All", value: false },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={onlyMissed === option.value}
                  onClick={() => setOnlyMissed(option.value)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-full border px-4 text-sm focus-visible:ring-2 focus-visible:ring-gold/70",
                    onlyMissed === option.value
                      ? "border-gold bg-gold/15"
                      : "border-border hover:border-gold/60",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <ul className="mt-4 grid gap-2.5">
          {reviewItems.map((item) => (
            <ReviewRow key={item.id} item={item} />
          ))}
        </ul>
      </section>
    </>
  );
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const right = item.points >= 1;
  const partly = item.points > 0 && item.points < 1;
  const Icon = right ? Check : partly ? CircleHelp : X;
  return (
    <li>
      <details className="group rounded-xl border border-border/60 bg-card/40">
        <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 px-4 py-3 focus-visible:ring-2 focus-visible:ring-gold/70">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              right
                ? "border-emerald-600/60 text-emerald-700 dark:text-emerald-300"
                : partly
                  ? "border-amber-600/60 text-amber-700 dark:text-amber-300"
                  : "border-red-600/60 text-red-700 dark:text-red-300",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">
              {right ? "Correct" : partly ? "Partly correct" : "Missed"}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">
              Lesson {item.lesson}
            </span>
            <span className="block break-words">{item.prompt}</span>
          </span>
        </summary>
        <dl className="grid gap-3 border-t border-border/50 px-4 py-4 text-sm">
          {item.context ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Context</dt>
              <dd className="mt-0.5 break-words">{item.context}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Your answer</dt>
            <dd className="mt-0.5 break-words">{describeAnswer(item, item.yourAnswer)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Right answer</dt>
            <dd className="mt-0.5 break-words font-medium">{describeSolution(item)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Why</dt>
            <dd className="mt-0.5 break-words">{item.explanation}</dd>
          </div>
        </dl>
      </details>
    </li>
  );
}
