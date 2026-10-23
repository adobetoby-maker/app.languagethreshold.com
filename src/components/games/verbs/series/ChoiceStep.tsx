// Built by TAC — 2026-10-22
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { createRng } from "@/lib/verb-games/rng";
import { choicePassed, listenChoices, pickChoices, type SeriesItem } from "@/lib/verb-games/series";
import type { PatternData, SourceFilter } from "@/lib/verb-games/types";
import { choiceForKey } from "../choice-keys";
import { LiveRegion } from "../LiveRegion";
import { DEV, FOCUS, SECONDARY, type StepRun } from "./series-meta";
import { LastHit, MissPanel, PromptCard, StepProgress } from "./SeriesParts";

const norm = (s: string) => s.normalize("NFC").toLowerCase();

/**
 * Pick it (prompt shown) and Listen (the form is played). Four choices, keys 1-4. A hit moves on at
 * once; a miss stops on the rule line and the right form until Continue.
 */
export function ChoiceStep(p: {
  kind: "pick" | "listen";
  data: PatternData;
  source: SourceFilter;
  items: SeriesItem[];
  seed: number;
  /** Listen only: plays a form in the learner's selected voice. */
  speak?: (text: string) => void;
  onFinish(run: StepRun): void;
}) {
  const { kind, data, source, items, seed, speak, onFinish } = p;
  const choices = useMemo(() => {
    const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
    return items.map((item) => (kind === "pick" ? pickChoices(data, item, source, rng) : listenChoices(data, item, source, rng)));
  }, [kind, data, source, items, seed]);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<number | null>(null);
  const [lastHit, setLastHit] = useState<SeriesItem | null>(null);
  const [message, setMessage] = useState("");
  const item = items[index] as SeriesItem | undefined;
  const options = useMemo(() => (choices[index] ?? []).map((label, id) => ({ id, label })), [choices, index]);
  const finished = useRef(false);

  const advance = useCallback(
    (score: number) => {
      setMissed(null);
      if (index + 1 < items.length) {
        setIndex(index + 1);
        return;
      }
      if (finished.current) return;
      finished.current = true;
      onFinish({ score, total: items.length, passed: choicePassed(score, items.length) });
    },
    [index, items.length, onFinish],
  );

  const choose = useCallback(
    (id: number) => {
      if (!item || missed !== null || finished.current) return;
      const label = options[id]?.label ?? "";
      if (norm(label) === norm(item.answer)) {
        const score = right + 1;
        setRight(score);
        setLastHit(item);
        setMessage(`Right: ${item.answer}, ${item.english}.`);
        advance(score);
      } else {
        setMissed(id);
        setMessage(`Not quite. ${item.answer}, ${item.english}. ${item.personLabel}.`);
      }
    },
    [item, missed, options, right, advance],
  );

  const replay = useCallback(() => {
    if (item) speak?.(item.answer);
  }, [item, speak]);

  // Keys 1-4 pick while a question is open; R replays the sound on Listen.
  const keys = useRef({ choose, options, open: true, replay });
  useEffect(() => {
    keys.current = { choose, options, open: missed === null, replay };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const k = keys.current;
      if (kind === "listen" && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        k.replay();
        return;
      }
      if (!k.open) return;
      const id = choiceForKey(e.key, k.options.slice(0, 4), []);
      if (id === null) return;
      e.preventDefault();
      k.choose(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind]);

  // Listen plays each new item once; Replay (or R) plays it again.
  useEffect(() => {
    if (kind === "listen" && item) speak?.(item.answer);
  }, [kind, item, speak]);

  if (!item) return null;
  const done = missed !== null;
  return (
    <div className="space-y-4" data-testid={`series-${kind}`}>
      <StepProgress index={index} total={items.length} right={right} />
      {kind === "pick" ? (
        <PromptCard item={item} />
      ) : (
        <div
          className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="series-listen-prompt"
        >
          <div className="min-w-0">
            <div className="font-display text-xl font-semibold text-foreground">Which form do you hear?</div>
            <div className="mt-0.5 text-sm text-muted-foreground">{done ? `${item.personLabel} · ${item.english}` : "Press R or Replay to hear it again."}</div>
          </div>
          <button type="button" onClick={replay} className={SECONDARY} data-testid="series-replay" aria-label="Replay the form">
            <Volume2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Replay
          </button>
        </div>
      )}
      <ol className="grid grid-cols-2 gap-2.5" aria-label={kind === "pick" ? `Choose the form of ${item.infinitive}` : "Choose the form you heard"}>
        {options.map((o, i) => {
          const isAnswer = norm(o.label) === norm(item.answer);
          const state = done ? (isAnswer ? "right" : o.id === missed ? "wrong" : "idle") : "idle";
          return (
            <li key={`${index}-${o.id}`}>
              <button
                type="button"
                data-choice={o.id}
                data-state={state}
                data-correct={DEV && isAnswer ? "true" : undefined}
                disabled={done}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => choose(o.id)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3.5 py-2 text-left font-mono text-lg transition-colors duration-150 enabled:cursor-pointer ${FOCUS} ${
                  state === "right"
                    ? "border-gold bg-gold/15 text-foreground"
                    : state === "wrong"
                      ? "border-rose-500/60 bg-rose-500/10 text-rose-800 line-through dark:text-rose-200"
                      : "border-border bg-card text-card-foreground enabled:hover:border-gold disabled:opacity-50"
                }`}
              >
                <span className="font-mono text-xs text-gold-ink" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="min-w-0 break-all">{o.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {done ? (
        <MissPanel item={item} kind="wrong" title="Not quite" onContinue={() => advance(right)} continueLabel={index + 1 >= items.length ? "See result" : "Continue"} />
      ) : (
        <LastHit item={lastHit} />
      )}
      <LiveRegion message={message} />
    </div>
  );
}
