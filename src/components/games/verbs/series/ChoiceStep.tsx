// Built by TAC — 2026-10-22
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Volume2 } from "lucide-react";
import { createRng } from "@/lib/verb-games/rng";
import { choicePassed, listenChoices, personPrompt, pickChoices, readChoices, type SeriesItem } from "@/lib/verb-games/series";
import { subscribeVoices } from "@/lib/voices";
import type { PatternData, SourceFilter } from "@/lib/verb-games/types";
import { choiceForKey } from "../choice-keys";
import { LiveRegion } from "../LiveRegion";
import { DEV, FOCUS, SECONDARY, type StepRun } from "./series-meta";
import { LastHit, MissPanel, PromptCard, StepProgress } from "./SeriesParts";

const norm = (s: string) => s.normalize("NFC").toLowerCase();

/** How long Listen waits for the device's voices to load before it switches to reading. */
const VOICE_WAIT_MS = 1500;

/**
 * Pick it (prompt shown) and Listen (the form is played). Four choices, keys 1-4. A hit moves on at
 * once; a miss stops on the rule line and the right form until Continue.
 *
 * Listen never needs sound to pass: "Can't hear audio? Read it instead" shows the form as text and
 * asks for its person and English. It turns on by itself when speech cannot start (no voice, or a
 * speech error). A pass read this way is the same step-4 pass.
 */
export function ChoiceStep(p: {
  kind: "pick" | "listen";
  data: PatternData;
  source: SourceFilter;
  items: SeriesItem[];
  seed: number;
  /** Listen only: plays a form in the learner's selected voice; `onFail` runs when it cannot. */
  speak?: (text: string, onFail?: () => void) => void;
  /** Listen only: true when the device has no voice to play with. */
  audioMissing?: () => boolean;
  onFinish(run: StepRun): void;
}) {
  const { kind, data, source, items, seed, speak, audioMissing, onFinish } = p;
  const choices = useMemo(() => {
    const rng = createRng((seed ^ 0x5bd1e995) >>> 0);
    return items.map((item) => (kind === "pick" ? pickChoices(data, item, source, rng) : listenChoices(data, item, source, rng)));
  }, [kind, data, source, items, seed]);
  // Read-instead choices have their own rng, so turning reading on never changes the audio choices.
  const readable = useMemo(() => {
    if (kind !== "listen") return [];
    const rng = createRng((seed ^ 0x2c1b3c6d) >>> 0);
    return items.map((item) => readChoices(data, item, rng));
  }, [kind, data, items, seed]);
  const [reading, setReading] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<number | null>(null);
  const [lastHit, setLastHit] = useState<SeriesItem | null>(null);
  const [message, setMessage] = useState("");
  const item = items[index] as SeriesItem | undefined;
  const options = useMemo(
    () => ((reading ? readable[index] : choices[index]) ?? []).map((label, id) => ({ id, label })),
    [reading, readable, choices, index],
  );
  const isRight = useCallback(
    (label: string, of: SeriesItem) => (reading ? label === personPrompt(of) : norm(label) === norm(of.answer)),
    [reading],
  );
  const finished = useRef(false);
  const failedRef = useRef(false);
  const missedRef = useRef<number | null>(null);
  useEffect(() => {
    missedRef.current = missed;
  }, [missed]);

  const advance = useCallback(
    (score: number) => {
      setMissed(null);
      missedRef.current = null;
      if (failedRef.current) setReading(true);
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
      if (isRight(label, item)) {
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
    [item, missed, options, right, advance, isRight],
  );

  /** Audio could not start: read from here on, and say so once. An open miss keeps its choices until Continue. */
  const audioDown = useCallback(() => {
    if (!failedRef.current) {
      failedRef.current = true;
      setAudioFailed(true);
      setMessage("Audio is not available here, so each form is shown to read instead.");
    }
    if (missedRef.current === null) setReading(true);
  }, []);

  const replay = useCallback(() => {
    if (item && !reading) speak?.(item.answer, audioDown);
  }, [item, speak, reading, audioDown]);

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

  // Listen plays each new item once; Replay (or R) plays it again. Never while reading.
  useEffect(() => {
    if (kind === "listen" && item && !reading) speak?.(item.answer, audioDown);
  }, [kind, item, speak, reading, audioDown]);

  // No voice on this device: give the voices a moment to load (Chrome lists them late), then read.
  useEffect(() => {
    if (kind !== "listen" || !audioMissing?.()) return;
    const timer = window.setTimeout(() => {
      if (audioMissing()) audioDown();
    }, VOICE_WAIT_MS);
    const off = subscribeVoices(() => {
      if (!audioMissing()) window.clearTimeout(timer);
    });
    return () => {
      window.clearTimeout(timer);
      off();
    };
  }, [kind, audioMissing, audioDown]);

  if (!item) return null;
  const done = missed !== null;
  return (
    <div className="space-y-4" data-testid={`series-${kind}`}>
      <StepProgress index={index} total={items.length} right={right} />
      {kind === "pick" ? (
        <PromptCard item={item} />
      ) : reading ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4" data-testid="series-read-prompt">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-gold-ink">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              {audioFailed ? "Audio is off · read it" : "Reading instead of listening"}
            </p>
            {!audioFailed && (
              <button type="button" onClick={() => setReading(false)} disabled={done} className={SECONDARY} data-testid="series-listen-instead">
                <Volume2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Listen instead
              </button>
            )}
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-foreground">Which person and English match this form?</div>
            <div className="mt-2 break-all font-mono text-3xl font-semibold text-foreground" data-testid="series-read-form" lang="es">
              {item.answer}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="series-listen-prompt"
        >
          <div className="min-w-0">
            <div className="font-display text-xl font-semibold text-foreground">Which form do you hear?</div>
            <div className="mt-0.5 text-sm text-muted-foreground">{done ? `${item.personLabel} · ${item.english}` : "Press R or Replay to hear it again."}</div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button type="button" onClick={replay} className={SECONDARY} data-testid="series-replay" aria-label="Replay the form">
              <Volume2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Replay
            </button>
            <button
              type="button"
              onClick={() => setReading(true)}
              disabled={done}
              data-testid="series-read-instead"
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-left text-sm text-foreground underline decoration-gold underline-offset-4 hover:decoration-2 disabled:cursor-not-allowed disabled:text-muted-foreground ${FOCUS}`}
            >
              <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Can't hear audio? Read it instead
            </button>
          </div>
        </div>
      )}
      <ol
        className={`grid gap-2.5 ${reading ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}
        aria-label={kind === "pick" ? `Choose the form of ${item.infinitive}` : reading ? `Choose the person and English for ${item.answer}` : "Choose the form you heard"}
      >
        {options.map((o, i) => {
          const isAnswer = isRight(o.label, item);
          const state = done ? (isAnswer ? "right" : o.id === missed ? "wrong" : "idle") : "idle";
          return (
            <li key={`${index}-${reading ? "r" : "a"}-${o.id}`}>
              <button
                type="button"
                data-choice={o.id}
                data-state={state}
                data-correct={DEV && isAnswer ? "true" : undefined}
                disabled={done}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => choose(o.id)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition-colors duration-150 enabled:cursor-pointer ${reading ? "text-sm leading-snug" : "font-mono text-lg"} ${FOCUS} ${
                  state === "right"
                    ? "border-gold bg-gold/15 text-foreground"
                    : state === "wrong"
                      ? "border-rose-500/60 bg-rose-500/10 text-rose-800 line-through dark:text-rose-200"
                      : "border-border bg-card text-card-foreground enabled:hover:border-gold disabled:border-border/60 disabled:text-muted-foreground"
                }`}
              >
                <span className="font-mono text-xs text-gold-ink" aria-hidden="true">
                  {i + 1}
                </span>
                <span className={`min-w-0 ${reading ? "" : "break-all"}`}>{o.label}</span>
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
