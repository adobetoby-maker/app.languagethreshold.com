import { useEffect, useRef, useState } from "react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { getModule } from "@/data/modules";
import { core60PathOfPair, stageLessonLabel } from "@/lib/core60-path";
import { core30ScopeKey } from "@/lib/core30-scope";
import { moduleLessonUrl } from "@/lib/learning-link";
import {
  PLACEMENT_VERSION,
  placementBlockScore,
  placementResult,
  placementCorrect,
} from "@/lib/module-placement";
import { sha256Hex } from "@/lib/exams2/hash";
import type { loadModulePlacement } from "@/lib/module-placement-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Loaded = Awaited<ReturnType<typeof loadModulePlacement>>;
interface Attempt {
  seed: string;
  fingerprint: string;
  responses: Record<string, string>;
  finished: boolean;
}
const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-gold focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50";
const gold = `${button} bg-gold text-midnight`;

/** Lives under the account's AppProvider; switching user/pair/module remounts the runner. */
export function ModulePlacement({
  moduleId,
  managed = false,
}: {
  moduleId: string;
  managed?: boolean;
}) {
  const { state } = useApp();
  const { user } = useAuth();
  const base =
    core60PathOfPair(moduleId, state.selectedLanguage, state.nativeLanguage)?.tradeModuleId ??
    moduleId;
  return (
    <PlacementRunner
      key={`${user?.id ?? "guest"}:${base}:${state.selectedLanguage}:${state.nativeLanguage}:${managed}`}
      moduleId={moduleId}
      base={base}
      managed={managed}
    />
  );
}

function PlacementRunner({
  moduleId,
  base,
  managed,
}: {
  moduleId: string;
  base: string;
  managed: boolean;
}) {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const target = state.selectedLanguage;
  const native = state.nativeLanguage;
  const storageKey = JSON.stringify([PLACEMENT_VERSION, user?.id ?? "guest", base, target, native]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState(false);
  const generation = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const context = { targetLanguage: target, instructionLanguage: native };

  useEffect(() => {
    if (attempt) {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      } catch {
        /* The current attempt remains usable with storage blocked. */
      }
    }
  }, [attempt, storageKey]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  async function start(fresh = false) {
    const gen = ++generation.current;
    setOpen(true);
    setBusy(true);
    setError("");
    setValue("");
    setConfirm(false);
    try {
      let next: Attempt = {
        seed: crypto.randomUUID(),
        fingerprint: "",
        responses: {},
        finished: false,
      };
      if (!fresh) {
        try {
          const raw = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null");
          if (
            raw &&
            typeof raw.seed === "string" &&
            raw.responses &&
            typeof raw.responses === "object" &&
            !Array.isArray(raw.responses) &&
            Object.values(raw.responses).every((v) => typeof v === "string") &&
            typeof raw.fingerprint === "string" &&
            typeof raw.finished === "boolean"
          )
            next = raw;
        } catch {
          /* Ignore an unusable device attempt. */
        }
      }
      const { loadModulePlacement } = await import("@/lib/module-placement-loader");
      const data = await loadModulePlacement(moduleId, target, native, next.seed);
      if (gen !== generation.current) return;
      if (!data.blocks.length)
        throw new Error(
          "This language pair does not yet have enough lesson material for placement. You can start at lesson 1.",
        );
      const fingerprint = sha256Hex(JSON.stringify(data.blocks));
      if (next.fingerprint && next.fingerprint !== fingerprint)
        next = { ...next, responses: {}, finished: false };
      next.fingerprint = fingerprint;
      // A saved attempt must refer to this exact, regenerated question set.
      const ids = new Set(data.blocks.flatMap((b) => b.questions.map((q) => q.id)));
      next.responses = Object.fromEntries(
        Object.entries(next.responses).filter(([id]) => ids.has(id)),
      );
      setLoaded(data);
      setAttempt(next);
    } catch (cause) {
      if (gen === generation.current)
        setError(
          cause instanceof Error ? cause.message : "Placement could not load. Please try again.",
        );
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }

  const blocks = loaded?.blocks ?? [];
  const responses = attempt?.responses ?? {};
  const activeBlock = blocks.find((b) => !placementBlockScore(b, responses).passed);
  const question = activeBlock?.questions.find((q) => !Object.hasOwn(responses, q.id));
  const done = !!attempt && !busy && (!!attempt.finished || !question);
  useEffect(() => {
    if (done) dialogRef.current?.scrollTo({ top: 0 });
  }, [done]);
  const result = loaded && done ? placementResult(blocks, responses) : null;
  const recommendation = result?.start ?? (result?.complete ? loaded?.gap : null);
  const credit = result?.credit ?? [];
  const alreadyCredited =
    credit.length > 0 &&
    credit.every((lesson) =>
      Boolean(
        state.core30Log[core30ScopeKey(lesson.moduleId, context)]?.lessons[String(lesson.n)]
          ?.masteredAt,
      ),
    );
  const missed = done
    ? blocks.flatMap((b) =>
        b.questions.filter(
          (q) => Object.hasOwn(responses, q.id) && !placementCorrect(q, responses[q.id]),
        ),
      )
    : [];

  function answer(text: string) {
    if (!attempt || !question || !activeBlock) return;
    const next = { ...responses, [question.id]: text };
    const blockDone = activeBlock.questions.every((q) => Object.hasOwn(next, q.id));
    setAttempt({
      ...attempt,
      responses: next,
      finished: blockDone && !placementBlockScore(activeBlock, next).passed,
    });
    setValue("");
  }
  function grant() {
    if (!attempt || !result || !credit.length || managed) return;
    dispatch({
      type: "CORE30_APPLY_PLACEMENT",
      payload: {
        context,
        lessons: credit.map((l) => ({ moduleId: l.moduleId, n: l.n })),
        attemptId: attempt.seed,
        at: new Date().toISOString(),
      },
    });
    setConfirm(false);
  }
  const moduleName = loaded?.name ?? getModule(base)?.name ?? "this module";
  return (
    <section
      className="my-4 rounded-xl border border-border bg-card p-4"
      data-testid="module-placement"
    >
      <h2 className="font-serif text-lg">
        Already know some {getModule(base)?.name ?? "of this course"}?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Find your starting lesson with a placement test. Checks cover meaning and typed answers in
        five-lesson blocks. Pass at 80% overall and 80% typed; choose whether to take credit for
        earlier lessons.
      </p>
      {managed ? (
        <p className="mt-2 text-sm">
          Your supervisor manages this plan. Placement credit is available in independent study.
        </p>
      ) : (
        <button type="button" className={`${button} mt-3`} onClick={() => void start()}>
          Take placement test
        </button>
      )}
      {target === "Spanish" && native === "English" && (
        <a
          className={`${button} mt-3 inline-flex items-center`}
          href={`/exams?module=${encodeURIComponent(base)}&target=Spanish&native=English&test=post-core`}
        >
          Take the free post-Core test · unlimited retakes
        </a>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={dialogRef}
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
          style={{ top: "5dvh", translate: "-50% 0", overflowAnchor: "none" }}
          aria-describedby="placement-description"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{moduleName} placement</DialogTitle>
            <DialogDescription id="placement-description">
              {done
                ? "Your recommended starting point. Earlier lessons remain available."
                : "Check your skills from Foundation through Master. Closing this window pauses the test."}
            </DialogDescription>
          </DialogHeader>
          {busy ? (
            <p role="status">Loading lesson checks…</p>
          ) : error ? (
            <div>
              <p role="alert">{error}</p>
              <button type="button" className={`${button} mt-3`} onClick={() => void start()}>
                Try again
              </button>
            </div>
          ) : result ? (
            <div className="space-y-4" data-testid="placement-result">
              <h3 className="text-xl font-semibold">
                {result.complete && loaded?.gap
                  ? "You passed all tested blocks; later lessons were not assessed"
                  : recommendation
                    ? `Start at ${stageLessonLabel(recommendation.moduleId, recommendation.n)}`
                    : "You passed every available block"}
              </h3>
              {recommendation && <p>{recommendation.title}</p>}
              <p>{credit.length} earlier lessons are eligible for optional completion credit.</p>
              {loaded?.gap && (
                <p className="text-sm">
                  Placement material ends at {stageLessonLabel(loaded.gap.moduleId, loaded.gap.n)}.
                  Untested lessons cannot receive credit.
                </p>
              )}
              {recommendation && (
                <a
                  className={`${gold} inline-flex items-center`}
                  href={moduleLessonUrl({
                    moduleId: recommendation.moduleId,
                    lesson: recommendation.n,
                    target,
                    native,
                  })}
                >
                  Start recommended lesson
                </a>
              )}
              {!!credit.length && (
                <div>
                  {alreadyCredited ? (
                    <p role="status">
                      These lessons are already complete in your independent progress.
                    </p>
                  ) : confirm ? (
                    <div className="space-y-3 rounded-xl border border-border p-4">
                      <p>
                        Mark {credit.length} earlier lessons complete for {target} with {native}{" "}
                        support? This adds placement credit to your independent progress.
                      </p>
                      <button type="button" className={gold} onClick={grant}>
                        Confirm completion credit
                      </button>{" "}
                      <button type="button" className={button} onClick={() => setConfirm(false)}>
                        Keep my progress unchanged
                      </button>
                    </div>
                  ) : (
                    <button type="button" className={button} onClick={() => setConfirm(true)}>
                      Take credit for {credit.length} earlier lessons
                    </button>
                  )}
                </div>
              )}
              <button type="button" className={button} onClick={() => setOpen(false)}>
                Keep studying without credit
              </button>{" "}
              <button type="button" className={button} onClick={() => void start(true)}>
                Retake placement
              </button>
              <p className="text-sm text-muted-foreground">
                Independent study placement. Speaking is not assessed; this is not a proficiency
                certificate.
              </p>
              {!!missed.length && (
                <details>
                  <summary className="cursor-pointer py-3">Review tested answers</summary>
                  <ul className="space-y-3">
                    {missed.map((q) => (
                      <li key={q.id}>
                        <p>{q.prompt}</p>
                        <p className="text-sm">
                          Your answer: {responses[q.id] || "I don’t know"}. Lesson answer:{" "}
                          {q.answer}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : question && activeBlock ? (
            <div className="space-y-4">
              <p className="text-sm">
                {activeBlock.lessons[0].stage} · lessons {activeBlock.lessons[0].n}–
                {activeBlock.lessons.at(-1)!.n} · question{" "}
                {activeBlock.questions.indexOf(question) + 1} of {activeBlock.questions.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {Object.keys(responses).length} answered. The test stops at your first block needing
                practice. Closing this window pauses it.
              </p>
              <h3 className="text-xl font-semibold" aria-live="polite">
                {question.prompt}
              </h3>
              {question.hint && <p>{question.hint}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (value.trim()) answer(value);
                }}
                className="space-y-4"
              >
                {question.type === "choice" ? (
                  <fieldset className="grid gap-2">
                    <legend className="sr-only">Choose one answer</legend>
                    {question.options!.map((option, i) => (
                      <label
                        key={option}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3"
                      >
                        <input
                          type="radio"
                          name="placement-answer"
                          value={option}
                          checked={value === option}
                          onChange={() => setValue(option)}
                        />{" "}
                        <span>
                          {String.fromCharCode(65 + i)}. {option}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <div>
                    <label htmlFor="placement-answer" className="mb-2 block text-sm">
                      Type the missing word or phrase. Accents matter; case and punctuation do not.
                    </label>
                    <input
                      id="placement-answer"
                      key={question.id}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={200}
                      className="min-h-12 w-full rounded-xl border border-border bg-background p-3 text-base"
                    />
                  </div>
                )}
                <button type="submit" className={gold} disabled={!value.trim()}>
                  Submit answer
                </button>{" "}
                <button type="button" className={button} onClick={() => answer("")}>
                  I don’t know
                </button>
              </form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
