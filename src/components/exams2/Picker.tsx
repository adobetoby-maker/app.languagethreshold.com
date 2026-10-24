// Built by TAC — 2026-10-23
// The exams page for a signed-in or signed-out visitor: pick a module, see its three tests (A
// Baseline, B Midpoint, C Final) with when each opens, the learner's status and best score, and a
// Start / Continue / Retake button. Modules without an approved bank show the cards as "Coming soon".
import { useState, type ReactNode } from "react";
import { CalendarClock, CircleCheck, Clock, Lock, PlayCircle } from "lucide-react";
import { shortDate, shortDateTime } from "./format";
import type { FormKind, FormOverview, ModuleOverview } from "./types";
import type { AppModule } from "@/data/modules";
import { FORM_QUESTIONS, FORM_TITLES } from "@/lib/exams2/timing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FORMS: FormKind[] = ["A", "B", "C"];
const FEATURED_TRADES = ["roofing", "gutters", "siding"];

const FORM_COPY: Record<FormKind, { day: string; summary: string; opens: string; mark: string }> = {
  A: {
    day: "Day 0",
    summary: "One question from every lesson. This is where you start.",
    opens: "Open from day 0.",
    mark: "Not graded. It is your baseline.",
  },
  B: {
    day: "Day 45",
    summary: "Two questions from each of lessons 1–15. A check on the first half.",
    opens: "Opens on day 45, or when lessons 1–15 are done.",
    mark: "70% means you are on track.",
  },
  C: {
    day: "Day 90",
    summary: "Two questions from every lesson. The final test for the module.",
    opens: "Opens on day 90, or when lessons 1–30 are done.",
    mark: "Pass at 80%. Retake as often as you like, up to 3 starts a day.",
  },
};

const primary =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-midnight " +
  "motion-safe:transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100";

export function ModuleChooser({
  modules,
  bankIds,
  selected,
  onSelect,
}: {
  modules: AppModule[];
  bankIds: Set<string>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const featured = modules.filter(
    (module) => bankIds.has(module.id) || FEATURED_TRADES.includes(module.id),
  );
  const others = modules.filter((module) => !featured.includes(module));
  return (
    <div>
      <p id="module-picker-label" className="text-sm font-medium text-muted-foreground">
        Choose a module
      </p>
      <div
        role="group"
        aria-labelledby="module-picker-label"
        className="mt-2 flex flex-wrap gap-2.5"
      >
        {featured.map((module) => {
          const ready = bankIds.has(module.id);
          const active = module.id === selected;
          return (
            <button
              key={module.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(module.id)}
              className={cn(
                "min-h-14 min-w-[10rem] cursor-pointer rounded-xl border px-4 py-2.5 text-left",
                "motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-gold/70",
                active ? "border-gold bg-gold/10" : "border-border hover:border-gold/60",
              )}
            >
              <span className="block text-base font-medium">{module.name}</span>
              <span
                className={cn(
                  "block text-xs",
                  ready ? "text-gold-ink dark:text-gold" : "text-muted-foreground",
                )}
              >
                {ready ? "Tests ready" : "Coming soon"}
              </span>
            </button>
          );
        })}
      </div>
      {others.length ? (
        <div className="mt-3">
          <label htmlFor="module-other" className="text-sm text-muted-foreground">
            Other modules
          </label>
          <select
            id="module-other"
            value={others.some((module) => module.id === selected) ? selected : ""}
            onChange={(event) => event.target.value && onSelect(event.target.value)}
            className="mt-1 block min-h-12 w-full max-w-md rounded-xl border border-border bg-background px-3 text-base focus:border-gold focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <option value="">Choose another module</option>
            {others.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function FormCards({
  module,
  overview,
  ready,
  signedIn,
  busy,
  error,
  onStart,
  onContinue,
  onSignIn,
}: {
  module: AppModule;
  overview: ModuleOverview | null;
  ready: boolean;
  signedIn: boolean;
  busy: FormKind | null;
  error: { kind: FormKind; message: string } | null;
  onStart: (kind: FormKind) => Promise<void>;
  onContinue: (sessionId: string) => void;
  onSignIn: () => void;
}) {
  const [confirm, setConfirm] = useState<FormKind | null>(null);
  return (
    <>
      <ol
        aria-label={`${module.name} tests`}
        className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]"
      >
        {FORMS.map((kind) => (
          <li key={kind} className="flex">
            <FormCard
              kind={kind}
              form={overview?.forms?.[kind] ?? null}
              ready={ready}
              signedIn={signedIn}
              starting={busy === kind}
              error={error?.kind === kind && confirm === null ? error.message : ""}
              onStart={() => setConfirm(kind)}
              onContinue={onContinue}
              onSignIn={onSignIn}
            />
          </li>
        ))}
      </ol>
      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          {confirm ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Start test {confirm}: {FORM_TITLES[confirm]}?
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-base text-muted-foreground">
                    <p>
                      {FORM_QUESTIONS[confirm]} questions, 45 seconds each. The clock starts on
                      question 1 as soon as you begin.
                    </p>
                    <p>
                      When time runs out a question counts as unanswered and the test moves on. You
                      can&rsquo;t go back to an earlier question.
                    </p>
                    {confirm === "A" ? <p>You can take the baseline test once.</p> : null}
                  </div>
                </DialogDescription>
              </DialogHeader>
              {error?.kind === confirm ? (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {error.message}
                </p>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  className="min-h-12 cursor-pointer rounded-xl border border-border px-5 py-3 hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70"
                  onClick={() => setConfirm(null)}
                >
                  Not now
                </button>
                <button
                  type="button"
                  className={cn(primary, "sm:w-auto")}
                  disabled={busy !== null}
                  onClick={async () => {
                    await onStart(confirm);
                    setConfirm(null);
                  }}
                >
                  {busy === confirm ? "Starting…" : "Begin test"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function statusLine(form: FormOverview): { icon: typeof Clock; text: string } {
  if (form.status === "in_progress" && form.inProgress)
    return {
      icon: PlayCircle,
      text: `In progress · question ${form.inProgress.step + 1} of ${form.inProgress.total}`,
    };
  if (form.status === "completed" && form.best) {
    const when = shortDate(form.best.at);
    if (form.kind === "C")
      return {
        icon: CircleCheck,
        text: `${form.best.passed ? "Passed" : "Best so far"}: about ${Math.round(form.best.pct)}%${when ? ` · ${when}` : ""}`,
      };
    return {
      icon: CircleCheck,
      text: `${form.kind === "A" ? "Baseline" : "Best"}: ${Math.round(form.best.pct)}%${when ? ` · ${when}` : ""}`,
    };
  }
  return { icon: Clock, text: "Not taken yet" };
}

function FormCard({
  kind,
  form,
  ready,
  signedIn,
  starting,
  error,
  onStart,
  onContinue,
  onSignIn,
}: {
  kind: FormKind;
  form: FormOverview | null;
  ready: boolean;
  signedIn: boolean;
  starting: boolean;
  error: string;
  onStart: () => void;
  onContinue: (sessionId: string) => void;
  onSignIn: () => void;
}) {
  const copy = FORM_COPY[kind];
  const headingId = `form-${kind}`;
  const live = ready && signedIn && form ? form : null;
  const locked = Boolean(live && !live.window.open && !live.preview && !live.inProgress);
  const blocked = Boolean(live && !locked && !live.retake.allowed && !live.inProgress);
  const status = live ? statusLine(live) : null;
  const StatusIcon = status?.icon ?? Clock;

  let action: ReactNode;
  if (!ready) {
    action = (
      <button type="button" disabled className={primary}>
        Coming soon
      </button>
    );
  } else if (!live) {
    action = (
      <button type="button" className={primary} onClick={onSignIn}>
        Sign in to start
      </button>
    );
  } else if (live.inProgress) {
    const id = live.inProgress.sessionId;
    action = (
      <button type="button" className={primary} onClick={() => onContinue(id)}>
        Continue
      </button>
    );
  } else if (locked) {
    action = (
      <button type="button" disabled className={primary}>
        <Lock className="h-4 w-4" aria-hidden="true" />
        Not open yet
      </button>
    );
  } else if (blocked) {
    action = (
      <button type="button" disabled className={primary}>
        {kind === "A" ? "Already taken" : "Available soon"}
      </button>
    );
  } else {
    action = (
      <button type="button" className={primary} onClick={onStart} disabled={starting}>
        {starting ? "Starting…" : live.status === "completed" ? "Retake" : "Start"}
      </button>
    );
  }

  const opens = !ready
    ? "Tests for this module are still being prepared."
    : live
      ? live.window.open
        ? live.window.via === "lessons"
          ? "Open: you finished the lessons."
          : "Open now."
        : live.window.message
      : copy.opens;

  return (
    <article
      aria-labelledby={headingId}
      data-testid={`form-card-${kind}`}
      data-state={!ready ? "soon" : locked ? "locked" : "open"}
      className={cn(
        "flex w-full flex-col rounded-2xl border bg-card/50 p-5 sm:p-6",
        kind === "C" ? "border-gold/50" : "border-border/60",
        !ready && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 font-display text-lg text-gold-ink dark:text-gold">
          {kind}
        </span>
        <span className="font-mono text-xs uppercase tracking-[.18em] text-muted-foreground">
          {copy.day}
        </span>
      </div>
      <h3 id={headingId} className="mt-4 font-display text-2xl">
        {FORM_TITLES[kind]}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {FORM_QUESTIONS[kind]} questions, 45 seconds each
      </p>
      <p className="mt-3 text-base">{copy.summary}</p>
      <p className="mt-2 text-sm text-muted-foreground">{copy.mark}</p>

      <dl className="mt-5 grid gap-2.5 text-sm">
        <div>
          <dt className="sr-only">Status</dt>
          <dd className="flex items-start gap-2">
            <StatusIcon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                status ? "text-gold-ink dark:text-gold" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span data-testid={`form-status-${kind}`}>
              {status?.text ??
                (ready && !signedIn ? "Sign in to see your progress" : "No tests yet")}
            </span>
          </dd>
        </div>
        <div>
          <dt className="sr-only">When it opens</dt>
          <dd className="flex items-start gap-2 text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span data-testid={`form-opens-${kind}`}>
              {opens}
              {live && !live.window.open && live.window.lessons ? (
                <span className="block">
                  {live.window.lessons.done} of {live.window.lessons.to} lessons done so far.
                </span>
              ) : null}
            </span>
          </dd>
        </div>
        {live?.preview ? (
          <div className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold-ink dark:text-gold">
            Staff preview: this test is still locked for learners.
          </div>
        ) : null}
        {live?.window.lateBaseline && live.status === "not_taken" ? (
          <div className="text-muted-foreground">
            Late baseline: you started the lessons first, so this is not a true starting point.
          </div>
        ) : null}
        {blocked && live?.retake.message ? (
          <div className="text-muted-foreground">
            {live.retake.message}
            {live.retake.retryAt ? ` (${shortDateTime(live.retake.retryAt)})` : ""}
          </div>
        ) : null}
        {live?.inProgress ? (
          <div className="text-muted-foreground">
            The clock on your current question keeps running while you&rsquo;re away.
          </div>
        ) : null}
      </dl>

      <div className="mt-auto pt-6">
        {error ? (
          <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {action}
      </div>
    </article>
  );
}
