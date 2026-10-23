// Built by TAC — 2026-10-22
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { matchBoard, matchPassed, missText, MATCH_MAX_MISTAKES } from "@/lib/verb-games/series";
import type { FamilyId, PatternData, SourceFilter } from "@/lib/verb-games/types";
import { LiveRegion } from "../LiveRegion";
import { CAPTION, DEV, FOCUS, type StepRun } from "./series-meta";

type Side = "form" | "prompt";

/** Match it: tap a form, then its person + English (or the other way round). */
export function MatchStep(p: { data: PatternData; source: SourceFilter; family: FamilyId; seed: number; onFinish(run: StepRun): void }) {
  const board = useMemo(() => matchBoard(p.data, p.family, p.source, p.seed), [p.data, p.family, p.source, p.seed]);
  const [matched, setMatched] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  /** Pairs that were part of a wrong attempt: they are matched in the end, but not clean. */
  const [tainted, setTainted] = useState<number[]>([]);
  const [selected, setSelected] = useState<{ side: Side; id: number } | null>(null);
  const [miss, setMiss] = useState<{ form: number; prompt: number } | null>(null);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const total = board.pairs.length;
  const pairOf = (id: number) => board.pairs.find((x) => x.id === id);

  const tap = (side: Side, id: number) => {
    if (finished || matched.includes(id)) return;
    if (!selected || selected.side === side) {
      setSelected(selected?.side === side && selected.id === id ? null : { side, id });
      return;
    }
    const form = side === "form" ? id : selected.id;
    const prompt = side === "prompt" ? id : selected.id;
    setSelected(null);
    if (form === prompt) {
      const next = [...matched, form];
      const pair = pairOf(form);
      setMatched(next);
      setMiss(null);
      setMessage(pair ? `Matched: ${pair.form}, ${pair.prompt}.` : "");
      if (next.length === total) {
        setFinished(true);
        const clean = next.filter((pairId) => !tainted.includes(pairId)).length;
        p.onFinish({ score: clean, total, mistakes, passed: matchPassed(next.length, total, mistakes) });
      }
    } else {
      setMistakes((n) => n + 1);
      setTainted((t) => [...new Set([...t, form, prompt])]);
      setMiss({ form, prompt });
      const want = pairOf(prompt);
      setMessage(want ? `Not a pair. ${want.prompt} is ${want.form}.` : "Not a pair.");
    }
  };

  const missPair = miss ? pairOf(miss.prompt) : undefined;
  const missWrong = miss ? pairOf(miss.form) : undefined;
  const cell = (side: Side, id: number) => {
    const pair = pairOf(id);
    if (!pair) return null;
    const done = matched.includes(id);
    const isSelected = selected?.side === side && selected.id === id;
    const isMiss = miss !== null && (side === "form" ? miss.form === id : miss.prompt === id);
    return (
      <li key={`${side}-${id}`}>
        <button
          type="button"
          data-testid={`match-${side}`}
          data-pair={DEV ? id : undefined}
          data-state={done ? "matched" : isSelected ? "selected" : isMiss ? "miss" : "idle"}
          aria-pressed={isSelected}
          disabled={done}
          onClick={() => tap(side, id)}
          className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors duration-150 enabled:cursor-pointer ${FOCUS} ${
            side === "form" ? "font-mono text-base sm:text-lg" : "text-sm leading-snug"
          } ${
            done
              ? "border-gold/60 bg-gold/15 text-foreground"
              : isSelected
                ? "border-gold bg-gold/10 text-foreground shadow-[inset_0_0_0_1px_var(--gold)]"
                : isMiss
                  ? "border-rose-500/60 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                  : "border-border bg-card text-card-foreground hover:border-gold"
          }`}
        >
          {done && <Check className="h-4 w-4 shrink-0 text-gold-ink" strokeWidth={2.2} aria-hidden="true" />}
          <span className="min-w-0 break-words">{side === "form" ? pair.form : pair.prompt}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4" data-testid="series-match">
      <div className={`${CAPTION} flex flex-wrap justify-between gap-2`}>
        <span data-testid="match-pairs">
          Pairs {matched.length} of {total}
        </span>
        <span data-testid="match-mistakes" className={mistakes > MATCH_MAX_MISTAKES ? "text-rose-800 dark:text-rose-200" : undefined}>
          Mistakes {mistakes} · {MATCH_MAX_MISTAKES} allowed
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="min-w-0 space-y-2">
          <h4 className={CAPTION}>Form</h4>
          <ul className="space-y-2" aria-label="Forms">
            {board.formOrder.map((id) => cell("form", id))}
          </ul>
        </div>
        <div className="min-w-0 space-y-2">
          <h4 className={CAPTION}>Person · English</h4>
          <ul className="space-y-2" aria-label="Persons and English">
            {board.promptOrder.map((id) => cell("prompt", id))}
          </ul>
        </div>
      </div>
      <div className="min-h-24" aria-hidden={miss === null}>
        {missPair && missWrong && (
          <div data-testid="series-feedback" data-kind="wrong" className="space-y-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
              <X className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              {missWrong.form} is not {missPair.prompt}
            </p>
            <p className="font-mono text-base text-foreground" data-testid="series-right">
              {missText(missPair.item).right}
            </p>
            <p className="text-sm leading-snug text-muted-foreground" data-testid="series-rule">
              {missText(missPair.item).rule}
            </p>
          </div>
        )}
        {!miss && <p className="text-sm text-muted-foreground">Tap a form, then the person and English it belongs to.</p>}
      </div>
      <LiveRegion message={message} />
    </div>
  );
}
