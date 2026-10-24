// Built by TAC — 2026-10-23
// Answer controls for the three item types the banks use: multiple choice, typed, and match.
// Each reports a draft answer upward; the runner decides when it is sent.
import { useId, useRef } from "react";
import type { AnswerPayload, PublicItemView } from "./types";
import { cn } from "@/lib/utils";

const SPANISH_KEYS = ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"];

const field =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground " +
  "placeholder:text-muted-foreground focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export function McInput({
  item,
  draft,
  disabled,
  onChange,
}: {
  item: PublicItemView;
  draft: AnswerPayload | null;
  disabled: boolean;
  onChange: (answer: AnswerPayload) => void;
}) {
  const name = useId();
  const selected = draft?.type === "mc" ? draft.optionId : "";
  return (
    <fieldset className="grid gap-2.5" disabled={disabled}>
      <legend className="sr-only">Choose one answer</legend>
      {(item.options ?? []).map((option, index) => (
        <label key={option.id} className="block cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={selected === option.id}
            onChange={() => onChange({ type: "mc", optionId: option.id })}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 text-base",
              "motion-safe:transition-colors motion-safe:duration-150",
              "hover:border-gold/60 peer-focus-visible:ring-2 peer-focus-visible:ring-gold/70",
              "peer-checked:border-gold peer-checked:bg-gold/10 peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
            )}
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground"
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span className="min-w-0 break-words">{option.text}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function TypedInput({
  item,
  draft,
  disabled,
  spanish,
  onChange,
  labelId,
}: {
  item: PublicItemView;
  draft: AnswerPayload | null;
  disabled: boolean;
  spanish: boolean;
  onChange: (answer: AnswerPayload) => void;
  labelId: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const text = draft?.type === "typed" ? draft.text : "";
  function insert(char: string) {
    const input = ref.current;
    if (!input) return;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = text.slice(0, start) + char + text.slice(end);
    onChange({ type: "typed", text: next });
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    });
  }
  return (
    <div className="grid gap-3">
      <input
        ref={ref}
        type="text"
        value={text}
        disabled={disabled}
        onChange={(event) => onChange({ type: "typed", text: event.target.value })}
        aria-labelledby={labelId}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Type your answer"
        className={field}
        data-testid="typed-answer"
      />
      {item.accentsRequired ? (
        <p className="text-sm text-muted-foreground">Accents count in this answer.</p>
      ) : null}
      {spanish ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Spanish letters">
          {SPANISH_KEYS.map((char) => (
            <button
              key={char}
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(char)}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card/40 px-3 text-lg hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60"
              aria-label={`Insert ${char}`}
            >
              {char}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MatchInput({
  item,
  draft,
  disabled,
  onChange,
}: {
  item: PublicItemView;
  draft: AnswerPayload | null;
  disabled: boolean;
  onChange: (answer: AnswerPayload) => void;
}) {
  const matches = draft?.type === "match" ? draft.matches : {};
  const used = new Set(Object.values(matches));
  function choose(left: string, right: string) {
    const next = { ...matches };
    if (right) next[left] = right;
    else delete next[left];
    onChange({ type: "match", matches: next });
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Pick the match for each line. Each choice can be used once.
      </p>
      {(item.left ?? []).map((left, index) => {
        const id = `match-${index}`;
        return (
          <div
            key={left}
            className="grid gap-1.5 rounded-xl border border-border bg-card/40 p-3 sm:grid-cols-[1fr_1fr] sm:items-center"
          >
            <label htmlFor={id} className="text-base font-medium break-words">
              {left}
            </label>
            <select
              id={id}
              value={matches[left] ?? ""}
              disabled={disabled}
              onChange={(event) => choose(left, event.target.value)}
              className={field}
            >
              <option value="">Choose a match</option>
              {(item.right ?? []).map((right) => (
                <option
                  key={right}
                  value={right}
                  disabled={used.has(right) && matches[left] !== right}
                >
                  {right}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
