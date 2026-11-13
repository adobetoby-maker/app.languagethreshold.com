import { ModuleAnswerReview } from "./ModuleAnswerReview";
import { useCallback, useEffect, useRef, useState } from "react";
import { MODULES, moduleSupportsLearningPair } from "@/data/modules";
import { core60PathOfPair, stageLessonLabel } from "@/lib/core60-path";
import { moduleLessonUrl } from "@/lib/learning-link";
import { placementBlockScore, placementResult } from "@/lib/module-placement";
import {
  moduleExamScore,
  nextModuleExamBlock,
  placementAttemptSummary,
  type ModuleExamMode,
} from "@/lib/module-exam";
import type { loadModulePlacement } from "@/lib/module-placement-loader";

type Loaded = Awaited<ReturnType<typeof loadModulePlacement>>;
const modules = MODULES.filter(
  (module) =>
    moduleSupportsLearningPair(module, "Spanish", "English") &&
    (core60PathOfPair(module.id, "Spanish", "English")?.tradeModuleId ?? module.id) === module.id,
);
const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 font-semibold hover:border-gold focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50";

/** Public lesson-derived study checks. Never loads the private, reviewed exam banks. */
export function FreeSpanishExams({
  initialModule,
  initialMode = "placement",
}: {
  initialModule?: string;
  initialMode?: ModuleExamMode;
}) {
  const initialBase = initialModule
    ? (core60PathOfPair(initialModule, "Spanish", "English")?.tradeModuleId ?? initialModule)
    : undefined;
  const [moduleId, setModuleId] = useState(
    modules.some((m) => m.id === initialBase) ? initialBase! : "spanish-basics",
  );
  const [mode, setMode] = useState<ModuleExamMode>(initialMode);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [value, setValue] = useState("");
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    setReady(true);
    return invalidate;
  }, [invalidate]);

  function reset() {
    generation.current++;
    setLoaded(null);
    setResponses({});
    setFinished(false);
    setValue("");
    setError("");
    setBusy(false);
  }
  async function start() {
    const gen = ++generation.current;
    setBusy(true);
    setError("");
    setLoaded(null);
    setResponses({});
    setFinished(false);
    setValue("");
    try {
      const { loadModulePlacement } = await import("@/lib/module-placement-loader");
      const data = await loadModulePlacement(
        moduleId,
        "Spanish",
        "English",
        crypto.randomUUID(),
        mode,
      );
      if (gen !== generation.current) return;
      if (!data.blocks.length)
        throw new Error(
          "This module does not yet have enough Spanish lesson material for a test. Choose another module.",
        );
      setLoaded(data);
    } catch (cause) {
      if (gen === generation.current)
        setError(
          cause instanceof Error ? cause.message : "The test could not load. Please try again.",
        );
    } finally {
      if (gen === generation.current) setBusy(false);
    }
  }
  const block = loaded ? nextModuleExamBlock(loaded.blocks, responses, mode) : undefined;
  const question = block?.questions.find((q) => !Object.hasOwn(responses, q.id));
  const done = Boolean(loaded && (finished || !question));
  const result = loaded && done ? placementResult(loaded.blocks, responses) : null;
  const score = loaded && done ? moduleExamScore(loaded.blocks, responses) : null;
  const summary = loaded && done ? placementAttemptSummary(loaded.blocks, responses) : null;
  const recommendation = result?.start ?? (result?.complete ? loaded?.gap : null);
  useEffect(() => {
    if (loaded) heading.current?.focus();
  }, [loaded, question?.id, done]);

  function answer(text: string) {
    if (!question || !block) return;
    const next = { ...responses, [question.id]: text };
    setResponses(next);
    setValue("");
    if (
      mode === "placement" &&
      block.questions.every((q) => Object.hasOwn(next, q.id)) &&
      !placementBlockScore(block, next).passed
    )
      setFinished(true);
  }
  return (
    <section
      className="mx-auto mb-8 max-w-5xl space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8"
      data-testid="free-spanish-exams"
    >
      <div>
        <h1 className="font-serif text-3xl">Free Spanish placement test</h1>
        <p className="mt-3">
          Test your skills and get an estimated starting lesson. Choose Spanish 101 for general
          Spanish, or a module for the language you use at work and in daily life.
        </p>
        <p className="mt-2 font-semibold">
          Free to take. No account or payment needed. Unlimited retakes.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 font-semibold">
          Choose your module
          <select
            className="min-h-12 w-full rounded-xl border border-border bg-background p-3 text-foreground"
            value={moduleId}
            onChange={(e) => {
              reset();
              setModuleId(e.target.value);
            }}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 font-semibold">
          Choose your test
          <select
            className="min-h-12 w-full rounded-xl border border-border bg-background p-3 text-foreground"
            value={mode}
            onChange={(e) => {
              reset();
              setMode(e.target.value as ModuleExamMode);
            }}
          >
            <option value="placement">Placement test</option>
            <option value="post-core">Post-Core test</option>
          </select>
        </label>
      </div>
      <p>
        {mode === "placement"
          ? "Meaning and typed-answer checks work through five-lesson blocks, from Foundation through Master where available. The test stops at the first block to revisit."
          : "Answer 60 questions covering all 30 Core lessons. Finish the whole check to see your score and lessons to revisit. Retake whenever you want."}
      </p>
      <p className="text-sm">
        Results estimate reading, vocabulary and written recall. Speaking is not assessed. Your
        saved lesson progress stays unchanged.
      </p>
      {busy ? (
        <p role="status">Preparing your Spanish test…</p>
      ) : !loaded ? (
        <button
          className={`${button} bg-gold text-midnight`}
          type="button"
          disabled={!ready}
          onClick={() => void start()}
        >
          {mode === "placement" ? "Take free placement test" : "Take post-Core test"}
        </button>
      ) : null}
      {error && <p role="alert">{error}</p>}
      {loaded && done && score ? (
        <div className="space-y-4 border-t border-border pt-5" data-testid="free-exam-result">
          <h2 className="font-serif text-2xl" tabIndex={-1} ref={heading}>
            {mode === "post-core"
              ? `Your Core score: ${score.percent}%`
              : result?.complete && loaded.gap
                ? "You passed all tested blocks; later lessons were not assessed"
                : recommendation
                  ? `Estimated starting point: ${stageLessonLabel(recommendation.moduleId, recommendation.n)}`
                  : "You passed every available placement block"}
          </h2>
          {mode === "post-core" ? (
            <p>
              {score.correct} of {score.total} correct.{" "}
              {score.review.length
                ? "Revisit the lessons below, then try again."
                : "You recalled the material in this check. Keep practicing in conversation."}
            </p>
          ) : (
            <p>
              {recommendation?.title ??
                "You reached the end of this module’s placement material. Choose another module or revisit lessons for practice."}{" "}
              This is a study recommendation based on this attempt.
            </p>
          )}
          {mode === "placement" && summary && (
            <div className="space-y-3" data-testid="placement-scoring-summary">
              <p>
                {summary.correct} of {summary.answered} submitted answers marked correct. Untested
                lessons are not counted as wrong.
              </p>
              <p>
                The test moves on when a five-lesson block reaches 80% overall and 80% on typed
                answers. Otherwise it recommends the start of that block.
              </p>
              <ul className="space-y-2">
                {summary.blocks.map(
                  ({ block, correct, total, typedCorrect, typedTotal, passed }) => (
                    <li key={block.questions[0].id}>
                      {stageLessonLabel(block.lessons[0].moduleId, block.lessons[0].n)}–
                      {block.lessons.at(-1)!.n}: {correct}/{total} correct; typed {typedCorrect}/
                      {typedTotal}. {passed ? "Passed." : "Needs review."}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
          {loaded.gap && (
            <p>
              Placement coverage ends before {stageLessonLabel(loaded.gap.moduleId, loaded.gap.n)}.
              Later lessons were not assessed.
            </p>
          )}
          {(mode === "post-core" ? score.review : recommendation ? [recommendation] : []).map(
            (lesson) => (
              <a
                className="block min-h-11 rounded-xl border border-border p-3 hover:border-gold"
                key={`${lesson.moduleId}:${lesson.n}`}
                href={moduleLessonUrl({
                  moduleId: lesson.moduleId,
                  lesson: lesson.n,
                  target: "Spanish",
                  native: "English",
                })}
              >
                {stageLessonLabel(lesson.moduleId, lesson.n)}: {lesson.title}
              </a>
            ),
          )}
          <button className={button} type="button" onClick={() => void start()}>
            Retake with a new question draw
          </button>
          <ModuleAnswerReview blocks={loaded.blocks} responses={responses} />
        </div>
      ) : loaded && question && block ? (
        <div className="space-y-4 border-t border-border pt-5" data-testid="free-exam-question">
          <p>
            {mode === "post-core"
              ? `Question ${Object.keys(responses).length + 1} of 60`
              : `${Object.keys(responses).length} answered · ${block.lessons[0].stage} lessons ${block.lessons[0].n}–${block.lessons.at(-1)!.n}`}
          </p>
          <h2 className="font-serif text-2xl" tabIndex={-1} ref={heading}>
            {question.prompt}
          </h2>
          {question.hint && <p>{question.hint}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) answer(value);
            }}
          >
            {question.type === "choice" ? (
              <fieldset className="mb-4 grid gap-3">
                <legend className="sr-only">Choose the meaning</legend>
                {question.options!.map((option) => (
                  <label
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3"
                    key={option}
                  >
                    <input
                      type="radio"
                      name="free-exam-answer"
                      checked={value === option}
                      value={option}
                      onChange={() => setValue(option)}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="mb-4 block">
                Type the missing word, phrase, or completed sentence. Accents matter.
                <input
                  className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background p-3"
                  key={question.id}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                className={`${button} bg-gold text-midnight`}
                type="submit"
                disabled={!value.trim()}
              >
                Submit answer
              </button>
              <button className={button} type="button" onClick={() => answer("")}>
                I don’t know
              </button>
              <button className={button} type="button" onClick={reset}>
                End test
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
