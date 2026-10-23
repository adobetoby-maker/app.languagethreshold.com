// Built by TAC — 2026-10-22
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Volume2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cardsPassed, rateCard, startCards, type CardRating, type SeriesItem } from "@/lib/verb-games/series";
import { LiveRegion } from "../LiveRegion";
import { EYEBROW, FOCUS, SECONDARY, type StepRun } from "./series-meta";
import { StepProgress } from "./SeriesParts";

const RATINGS: { rating: CardRating; label: string; hint: string }[] = [
  { rating: "again", label: "Again", hint: "Show it again soon" },
  { rating: "good", label: "Good", hint: "I knew it" },
  { rating: "easy", label: "Easy", hint: "Too easy" },
];

/** Cards: front infinitive + person + English, back the form + example. Again brings a card back. */
export function CardsStep(p: { items: SeriesItem[]; speak?: (text: string) => void; onFinish(run: StepRun): void }) {
  const { items, speak, onFinish } = p;
  const reduced = useReducedMotion();
  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const [cards, setCards] = useState(() => startCards(items));
  const [flipped, setFlipped] = useState(false);
  const [message, setMessage] = useState("");
  const cardRef = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  const total = cards.queue.length + cards.done.length;
  const current = byKey.get(cards.queue[0] ?? "");

  const flip = () => {
    if (!current) return;
    setFlipped((f) => !f);
    if (!flipped) setMessage(`${current.answer}. ${current.english}.`);
  };
  const rate = (rating: CardRating) => {
    if (!current || !flipped || finished.current) return;
    const next = rateCard(cards, rating);
    setCards(next);
    setFlipped(false);
    setMessage(rating === "again" ? `${current.answer} comes back later.` : `${current.answer} done.`);
    if (cardsPassed(next)) {
      finished.current = true;
      onFinish({ score: next.done.length, total: next.done.length, passed: true });
    }
  };

  // Space or Enter flips (when focus is not on another control); 1-3 rate a flipped card.
  const keys = useRef({ flip, rate, flipped });
  useEffect(() => {
    keys.current = { flip, rate, flipped };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName))) {
        if (!(target.tagName === "BUTTON" && /^[1-3]$/.test(e.key))) return;
      }
      const k = keys.current;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        k.flip();
      } else if (/^[1-3]$/.test(e.key) && k.flipped) {
        e.preventDefault();
        k.rate((RATINGS[Number(e.key) - 1] as (typeof RATINGS)[number]).rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A new card takes focus so Space flips it straight away.
  const key = cards.queue[0];
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [key]);

  if (!current) return null;
  return (
    <div className="space-y-4" data-testid="series-cards">
      <StepProgress index={cards.done.length} total={total} right={cards.done.length} label={`${cards.done.length} of ${total} cards`} rightLabel={`${cards.queue.length} due`} />
      <button
        ref={cardRef}
        type="button"
        data-testid="series-card"
        data-side={flipped ? "back" : "front"}
        aria-label={flipped ? `${current.answer}, ${current.english}. Flip back.` : `${current.infinitive}, ${current.personLabel}, ${current.english}. Flip to see the form.`}
        onClick={flip}
        className={`flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-5 py-6 text-center ${FOCUS} ${
          reduced ? "" : "transition-colors duration-200"
        } ${flipped ? "border-gold/60 bg-gold/[0.07]" : "border-border/70 bg-background/40 hover:border-gold/50"}`}
      >
        {flipped ? (
          <>
            <span className={EYEBROW}>
              {current.infinitive} · {current.personLabel}
            </span>
            <span className="font-mono text-4xl font-semibold text-foreground" data-testid="series-card-form">
              {current.answer}
            </span>
            <span className="text-sm text-muted-foreground">{current.english}</span>
            {current.example && (
              <span className="mt-2 block max-w-md space-y-0.5 border-t border-border/50 pt-3">
                <span className="block text-base italic text-foreground">{current.example.target}</span>
                <span className="block text-xs text-muted-foreground">{current.example.native}</span>
              </span>
            )}
          </>
        ) : (
          <>
            <span className={EYEBROW}>
              {current.infinitive} · {current.verbEnglish}
            </span>
            <span className="font-display text-4xl font-semibold text-foreground">{current.personLabel}</span>
            <span className="text-base text-muted-foreground">{current.english}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              Tap or press Space to flip
            </span>
          </>
        )}
      </button>
      {flipped ? (
        <div className="space-y-3">
          {speak && (
            <button type="button" onClick={() => speak(current.answer)} className={SECONDARY} data-testid="series-card-hear">
              <Volume2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Hear it
            </button>
          )}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="How well did you know it?">
            {RATINGS.map((r, i) => (
              <button
                key={r.rating}
                type="button"
                data-rating={r.rating}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => rate(r.rating)}
                className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-1.5 transition-colors duration-150 ${FOCUS} ${
                  r.rating === "again"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-800 hover:bg-rose-500/20 dark:text-rose-200"
                    : "border-gold/50 bg-gold/10 text-foreground hover:bg-gold/20"
                }`}
              >
                <span className="font-semibold">
                  <span className="mr-1 font-mono text-xs text-gold-ink" aria-hidden="true">
                    {i + 1}
                  </span>
                  {r.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{r.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="min-h-14 text-sm text-muted-foreground">Say the form to yourself, then flip to check.</p>
      )}
      <LiveRegion message={message} />
    </div>
  );
}
