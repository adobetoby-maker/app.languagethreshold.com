// Built by TAC — 2026-10-22
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CornerDownLeft } from "lucide-react";
import { checkTyped, choicePassed, type SeriesItem, type TypeCheck } from "@/lib/verb-games/series";
import { LiveRegion } from "../LiveRegion";
import { DEV, FOCUS, PRIMARY, type StepRun } from "./series-meta";
import { LastHit, MissPanel, PromptCard, StepProgress } from "./SeriesParts";

const ACCENTS = ["á", "é", "í", "ó", "ú", "ü", "ñ"];

/** Type it (mastery): type the form; only an exact match counts. An accent slip is "almost". */
export function TypeStep(p: { items: SeriesItem[]; onFinish(run: StepRun): void }) {
  const { items, onFinish } = p;
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Exclude<TypeCheck, "exact"> | null>(null);
  const [lastHit, setLastHit] = useState<SeriesItem | null>(null);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const item = items[index] as SeriesItem | undefined;

  useEffect(() => {
    if (feedback === null) input.current?.focus({ preventScroll: true });
  }, [index, feedback]);

  const advance = (score: number) => {
    setFeedback(null);
    setValue("");
    if (index + 1 < items.length) {
      setIndex(index + 1);
      return;
    }
    if (finished.current) return;
    finished.current = true;
    onFinish({ score, total: items.length, passed: choicePassed(score, items.length) });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!item || feedback !== null || value.trim() === "") return;
    const result = checkTyped(value, item.answer);
    if (result === "exact") {
      const score = right + 1;
      setRight(score);
      setLastHit(item);
      setMessage(`Right: ${item.answer}.`);
      advance(score);
      return;
    }
    setFeedback(result);
    setMessage(result === "almost" ? `Almost. Mind the accent: ${item.answer}.` : `Not quite. ${item.answer}, ${item.english}.`);
  };

  const insert = (ch: string) => {
    const el = input.current;
    if (!el || feedback !== null) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  if (!item) return null;
  return (
    <div className="space-y-4" data-testid="series-type">
      <StepProgress index={index} total={items.length} right={right} rightLabel={`${right} exact`} />
      <PromptCard item={item} />
      <form onSubmit={submit} className="space-y-2.5" data-answer={DEV ? item.answer : undefined} data-testid="series-type-form">
        <label htmlFor="series-type-input" className="sr-only">
          Type the {item.personLabel} form of {item.infinitive}
        </label>
        <div className="flex gap-2">
          <input
            ref={input}
            id="series-type-input"
            data-testid="series-type-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={feedback !== null}
            lang="es"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="Type the form"
            className={`min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 font-mono text-lg text-foreground placeholder:text-muted-foreground/70 ${FOCUS}`}
          />
          <button type="submit" className={`${PRIMARY} shrink-0 px-4`} disabled={feedback !== null || value.trim() === ""} data-testid="series-type-submit">
            <CornerDownLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Check</span>
            <span className="sr-only sm:hidden">Check</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Insert an accented letter">
          {ACCENTS.map((ch) => (
            <button
              key={ch}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              disabled={feedback !== null}
              aria-label={`Insert ${ch}`}
              className={`min-h-11 min-w-11 cursor-pointer rounded-lg border border-border bg-card font-mono text-base text-card-foreground transition-colors duration-150 hover:border-gold disabled:opacity-50 ${FOCUS}`}
            >
              {ch}
            </button>
          ))}
        </div>
      </form>
      {feedback === "almost" && (
        <MissPanel
          item={item}
          kind="almost"
          title="Almost — mind the accent"
          note="Only an exact match counts toward mastery."
          onContinue={() => advance(right)}
          continueLabel={index + 1 >= items.length ? "See result" : "Continue"}
        />
      )}
      {feedback === "wrong" && (
        <MissPanel item={item} kind="wrong" title="Not quite" onContinue={() => advance(right)} continueLabel={index + 1 >= items.length ? "See result" : "Continue"} />
      )}
      {feedback === null && <LastHit item={lastHit} />}
      <LiveRegion message={message} />
    </div>
  );
}
