// Built by TAC — 2026-10-22
import { useEffect, useRef } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { missText, type SeriesItem } from "@/lib/verb-games/series";
import { CAPTION, EYEBROW, PRIMARY } from "./series-meta";

/** "Item 3 of 10 · 2 right", with a thin bar. */
export function StepProgress(p: { index: number; total: number; right: number; label?: string; rightLabel?: string }) {
  const done = Math.min(p.index, p.total);
  return (
    <div className="space-y-1.5" data-testid="series-progress">
      <div className={`${CAPTION} flex justify-between gap-2`}>
        <span>{p.label ?? `Item ${Math.min(p.index + 1, p.total)} of ${p.total}`}</span>
        <span data-testid="series-score">{p.rightLabel ?? `${p.right} right`}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={p.total}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${p.total === 0 ? 0 : (done / p.total) * 100}%` }} />
      </div>
    </div>
  );
}

/** "yo ___ · I come · venir": the person with a blank, its English, and the verb. */
export function PromptCard(p: { item: SeriesItem }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4" data-testid="series-prompt">
      <div className={EYEBROW}>
        {p.item.infinitive} · {p.item.verbEnglish}
      </div>
      <div className="mt-1 font-display text-3xl font-semibold text-foreground">
        {p.item.personLabel} <span className="text-muted-foreground">___</span>
      </div>
      <div className="mt-0.5 text-sm text-muted-foreground">{p.item.english}</div>
    </div>
  );
}

/** The last right answer, shown above the next item so a hit never stops the run. */
export function LastHit(p: { item: SeriesItem | null }) {
  return (
    <p className="flex min-h-6 items-center gap-1.5 font-mono text-xs text-muted-foreground" data-testid="series-last-hit" aria-hidden="true">
      {p.item && (
        <>
          <Check className="h-3.5 w-3.5 text-gold-ink" strokeWidth={2.2} aria-hidden="true" />
          {p.item.answer} · {p.item.english}
        </>
      )}
    </p>
  );
}

/**
 * A miss (or an "almost"): the family's rule line and the right form with its English. Focus moves
 * to Continue, so Enter carries on.
 */
export function MissPanel(p: {
  item: SeriesItem;
  title: string;
  kind: "wrong" | "almost";
  /** Extra line under the title, e.g. that an "almost" never counts. */
  note?: string;
  onContinue(): void;
  continueLabel?: string;
}) {
  const text = missText(p.item);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      data-testid="series-feedback"
      data-kind={p.kind}
      className="space-y-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4"
    >
      <p className="flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-200">
        <X className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        {p.title}
      </p>
      {p.note && <p className="text-sm text-foreground/80">{p.note}</p>}
      <p className="font-mono text-lg text-foreground" data-testid="series-right">
        {text.right}
      </p>
      <p className="text-sm leading-snug text-muted-foreground" data-testid="series-rule">
        {text.rule}
      </p>
      <button ref={ref} type="button" onClick={p.onContinue} className={`${PRIMARY} w-full sm:w-auto`} data-testid="series-continue">
        {p.continueLabel ?? "Continue"}
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
