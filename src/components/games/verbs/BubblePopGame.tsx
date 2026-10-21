// Built by TAC — 2026-10-21
// Verb Games: the Bubble Pop round screen. The engine (src/lib/verb-games/bubble.ts) owns every rule;
// this file only drives it with the round clock, paints bubbles with transform/opacity, and announces.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRoundClock } from "@/hooks/use-round-clock";
import { stopRemoteTTS } from "@/lib/tts";
import { createBubbleRound, type BubbleRound, type BubbleView } from "@/lib/verb-games/bubble";
import { familyById } from "@/lib/verb-games/families";
import { REASON_MS, ROUND_MS } from "@/lib/verb-games/rules";
import { buildRoundLog } from "@/lib/verb-games/scoring";
import type { Completion, Outcome, PatternData, RoundConfig, RoundLog, RoundResult } from "@/lib/verb-games/types";
import { choiceForKey } from "./choice-keys";
import { CompletionFlash } from "./CompletionFlash";
import { FrameChoices } from "./FrameChoices";
import { GameHud } from "./GameHud";
import { Legend } from "./Legend";
import { LiveRegion } from "./LiveRegion";
import { PIECE_COLORS } from "./piece-colors";
import { PieceTile } from "./PieceTile";
import { ReasonBand } from "./ReasonBand";

/** Dev builds only: the answer is marked so e2e can pick it. Always false in production. */
const DEV = Boolean(import.meta.env?.DEV);

/** A completion stays up at least this long during a round so a keyboard user can press S to save it. */
export const FLASH_MS = 2000;
/** Pop burst length. */
const BURST_MS = 220;
/** Fraction of a frame's lifetime spent fading in at the bottom and fading out at the top. */
const FADE_IN = 0.04;
const FADE_OUT = 0.12;
/** From this point in a frame the bubbles fade out and stop taking picks (rise and still row alike). */
const LOCK_AT = 1 - FADE_OUT;

const BTN =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-gold";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Fading pieces are out of play: no pointer, no focus, hidden from assistive tech. Writes only on change. */
function setLocked(el: HTMLElement | null, locked: boolean): void {
  if (!el || (el.getAttribute("aria-hidden") === "true") === locked) return;
  if (locked) el.setAttribute("aria-hidden", "true");
  else el.removeAttribute("aria-hidden");
  el.style.pointerEvents = locked ? "none" : "";
  el.inert = locked;
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0">
      <circle cx="10" cy="10" r="10" fill={PIECE_COLORS.done} />
      <path d="M5.5 10.5l3 3 6-7" fill="none" stroke="#0a1220" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function eyebrowFor(config: RoundConfig): string {
  const scope = config.family === "mix" ? "MIX" : familyById(config.family).label;
  // Ruling F8: GameHud renders the eyebrow as given, so it is uppercased here.
  return `GAME · BUBBLE POP · ${scope}`.toUpperCase();
}

function frameText(v: BubbleView): string {
  return `${v.frame.prompt} · ${v.frame.english} · ${v.frame.infinitive}`;
}

function targetMessage(v: BubbleView): string {
  const n = v.pieces.length;
  return `${frameText(v)}. Choose 1 to ${n}.`;
}

/** Progress (0..1) of the current frame toward its escape deadline. */
function progressOf(v: BubbleView, t: number): number {
  const life = v.deadline - v.shownAt;
  return life > 0 ? clamp01((t - v.shownAt) / life) : 0;
}

type Burst = { key: number; label: string; x: number; y: number };

/**
 * The rising board. One transform on the cluster carries every bubble up; each bubble also bobs a few
 * pixels on its own. Both are written straight to the DOM by `paint`, so React never re-renders per frame.
 */
const RisingBoard = memo(function RisingBoard(p: {
  view: BubbleView;
  boardRef: React.RefObject<HTMLDivElement | null>;
  clusterRef: React.RefObject<HTMLDivElement | null>;
  bobRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onPick: (id: number) => void;
  burst: Burst | null;
}) {
  const { view } = p;
  return (
    <div
      ref={p.boardRef}
      data-testid="bubble-board"
      data-motion="rise"
      className="relative h-[17rem] overflow-hidden rounded-2xl border border-border/60 bg-card/40 sm:h-[21rem]"
    >
      {/* Surface line: where a bubble escapes. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-border" />
      <div
        ref={p.clusterRef}
        key={view.frame.index}
        data-testid="bubble-cluster"
        className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-center gap-x-3 gap-y-4 p-3 will-change-transform"
        style={{ opacity: 0 }}
      >
        {view.pieces.map((piece, i) => (
          <Bubble
            key={piece.id}
            index={i}
            label={piece.label}
            correct={piece.correct}
            dimmed={view.removed.includes(piece.id)}
            onPick={() => p.onPick(piece.id)}
            bobRef={(el) => {
              p.bobRefs.current[i] = el;
            }}
            // A staggered rest height so the cluster reads as loose bubbles, not a row of buttons.
            lift={i % 2 === 1 ? 18 : 0}
          />
        ))}
      </div>
      {p.burst && <PopBurst key={p.burst.key} burst={p.burst} />}
    </div>
  );
});

function Bubble(p: {
  index: number;
  label: string;
  correct: boolean;
  dimmed: boolean;
  onPick: () => void;
  bobRef?: (el: HTMLDivElement | null) => void;
  lift?: number;
}) {
  return (
    <div
      className="relative"
      style={p.lift ? { marginBottom: p.lift } : undefined}
      data-bubble={p.index}
      data-correct={DEV && p.correct ? "true" : undefined}
    >
      <div ref={p.bobRef} className="relative rounded-full border p-1.5" style={{ borderColor: `${PIECE_COLORS.whole}66`, backgroundColor: `${PIECE_COLORS.whole}14` }}>
        {/* Bubble shine: a flat highlight, not a glow. */}
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1.5 h-1.5 w-3 rounded-full bg-white/50" />
        <PieceTile kind="whole" label={p.label} dimmed={p.dimmed} onClick={p.dimmed ? undefined : p.onPick} testId="bubble" />
        <span
          aria-hidden="true"
          data-key={p.index + 1}
          className="pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background font-mono text-[10px] text-foreground"
        >
          {p.index + 1}
        </span>
      </div>
    </div>
  );
}

/** A short burst where a bubble popped: ring out, chip up and away, six droplets. transform/opacity only. */
function PopBurst(p: { burst: Burst }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof el.animate !== "function") return;
    const ease = "cubic-bezier(0.2, 0.8, 0.2, 1)";
    const [ring, chip, ...drops] = Array.from(el.children) as HTMLElement[];
    ring?.animate([{ transform: "translate(-50%,-50%) scale(0.6)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(2)", opacity: 0 }], { duration: BURST_MS, easing: ease, fill: "forwards" });
    chip?.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: "translate(-50%,-70%) scale(1.25)", opacity: 0 }], { duration: BURST_MS, easing: ease, fill: "forwards" });
    drops.forEach((d, i) => {
      const a = (Math.PI * 2 * i) / drops.length;
      const r = 46;
      d.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0.4)`, opacity: 0 },
        ],
        { duration: BURST_MS + 30, easing: ease, fill: "forwards" },
      );
    });
  }, []);
  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute" style={{ left: p.burst.x, top: p.burst.y }} data-testid="pop-burst">
      <span className="absolute h-16 w-16 rounded-full border-2" style={{ borderColor: PIECE_COLORS.done, transform: "translate(-50%,-50%)" }} />
      <span
        className="absolute whitespace-nowrap rounded-full px-4 py-2 font-mono text-base font-semibold"
        style={{ backgroundColor: PIECE_COLORS.done, color: "#0a1220", transform: "translate(-50%,-50%)" }}
      >
        {p.burst.label}
      </span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="absolute h-2 w-2 rounded-full" style={{ backgroundColor: PIECE_COLORS.done, transform: "translate(-50%,-50%)" }} />
      ))}
    </div>
  );
}

/** Reduced motion: the same bubbles held still in a row; the countdown bar shows the time left. */
const StillRow = memo(function StillRow(p: {
  view: BubbleView;
  onPick: (id: number) => void;
  piecesRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div data-testid="bubble-board" data-motion="still" className="flex min-h-[9rem] items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-4">
      {/* Keyed per frame so a new frame always starts unlocked and fully visible. */}
      <div ref={p.piecesRef} key={p.view.frame.index} className="flex flex-wrap content-center items-center justify-center gap-3">
      {p.view.pieces.map((piece, i) => (
        <Bubble
          key={`${p.view.frame.index}:${piece.id}`}
          index={i}
          label={piece.label}
          correct={piece.correct}
          dimmed={p.view.removed.includes(piece.id)}
          onPick={() => p.onPick(piece.id)}
        />
      ))}
      </div>
    </div>
  );
});

function Countdown(p: { barRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div data-testid="countdown" aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div ref={p.barRef} className="h-full w-full origin-left rounded-full bg-foreground/70 dark:bg-gold" />
    </div>
  );
}

export function BubblePopGame(p: {
  data: PatternData;
  config: RoundConfig;
  onEnd(log: RoundLog, result: RoundResult): void;
  /** Omit until saving a card is possible: the completion flash is then plain text, not a dead control. */
  onSaveCard?(c: Completion): void;
}) {
  // The round and its config are fixed for the life of this screen; remount for a new round.
  const [round] = useState<BubbleRound>(() => createBubbleRound(p.data, p.config));
  const [config] = useState(() => p.config);
  const [data] = useState(() => p.data);
  const [view, setView] = useState<BubbleView>(() => round.view());
  const [active, setActive] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [flash, setFlash] = useState<Completion | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [message, setMessage] = useState(() => targetMessage(round.view()));
  const reduced = useReducedMotion();
  const still = reduced || config.listMode;

  const viewRef = useRef(view);
  const tRef = useRef(0);
  const endedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const bobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const stillPiecesRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusFrame = useRef(-1);
  const size = useRef({ board: 0, cluster: 0 });
  const timers = useRef<{ reason?: ReturnType<typeof setTimeout>; flash?: ReturnType<typeof setTimeout>; burst?: ReturnType<typeof setTimeout> }>({});
  const onEndRef = useRef(p.onEnd);
  onEndRef.current = p.onEnd;
  const stillRef = useRef(still);
  stillRef.current = still;

  const finish = useCallback(
    (t: number, quit: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const at = Math.min(t, ROUND_MS.bubble);
      const result = round.end(at);
      // Ruling F19: the log is built by buildRoundLog; quitAtMs only when the player left early.
      const log = buildRoundLog(config, round.events(), data, Date.now(), quit && at < ROUND_MS.bubble ? at : undefined);
      setActive(false);
      stopRemoteTTS();
      onEndRef.current(log, result);
    },
    [round, config, data],
  );

  /** Writes the board's moving parts. Reads only cached sizes, writes only transform/opacity. */
  const paint = useCallback((t: number) => {
    const v = viewRef.current;
    const prog = progressOf(v, t);
    const bar = barRef.current;
    if (bar) bar.style.transform = `scaleX(${1 - prog})`;
    const locked = prog > LOCK_AT;
    if (stillRef.current) {
      // Reduced motion: no movement; the row dims in place for the last part of the frame.
      const row = stillPiecesRef.current;
      if (row) {
        row.style.opacity = locked ? (0.35 + 0.65 * ((1 - prog) / FADE_OUT)).toFixed(3) : "1";
        setLocked(row, locked);
      }
      return;
    }
    const cluster = clusterRef.current;
    if (!cluster) return;
    setLocked(cluster, locked);
    const travel = Math.max(0, size.current.board - size.current.cluster);
    cluster.style.transform = `translate3d(0, ${-(travel * prog).toFixed(1)}px, 0)`;
    const fade = prog < FADE_IN ? prog / FADE_IN : prog > 1 - FADE_OUT ? (1 - prog) / FADE_OUT : 1;
    cluster.style.opacity = fade.toFixed(3);
    const bobs = bobRefs.current;
    for (let i = 0; i < bobs.length; i++) {
      const el = bobs[i];
      if (!el) continue;
      const x = Math.sin(t / (620 + i * 90) + i * 1.7) * 4;
      const y = Math.cos(t / (780 + i * 70) + i) * 3;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }, []);

  /** Applies engine outcomes: flash, reason, burst, announcements, the next frame, and the end. */
  const apply = useCallback(
    (out: Outcome[], t: number, popped: Burst | null) => {
      if (out.length === 0) return;
      const said: string[] = [];
      for (const o of out) {
        if (o.kind === "complete") {
          const c = o.completion;
          said.push(`${c.form} · ${c.english}`);
          setFlash(c);
          clearTimeout(timers.current.flash);
          timers.current.flash = setTimeout(() => setFlash(null), FLASH_MS);
          if (popped) {
            setBurst(popped);
            clearTimeout(timers.current.burst);
            timers.current.burst = setTimeout(() => setBurst(null), BURST_MS + 80);
          }
        } else if (o.kind === "miss") {
          said.push(o.miss.reason);
          setReason(o.miss.reason);
          clearTimeout(timers.current.reason);
          timers.current.reason = setTimeout(() => setReason(null), REASON_MS);
        }
      }
      const next = round.view();
      const newFrame = out.some((o) => o.kind === "frame");
      if (newFrame) said.push(`Next: ${targetMessage(next)}`);
      viewRef.current = next;
      setView(next);
      if (said.length > 0) setMessage(said.join(" "));
      if (out.some((o) => o.kind === "end")) finish(t, false);
    },
    [round, finish],
  );

  const onTick = useCallback(
    (t: number) => {
      if (endedRef.current) return;
      tRef.current = t;
      apply(round.advance(t), t, null);
      if (!endedRef.current) paint(t);
    },
    [round, apply, paint],
  );

  const { t } = useRoundClock(active, onTick);

  const pick = useCallback(
    (id: number) => {
      if (endedRef.current) return;
      const v = viewRef.current;
      // Task 7 note: never hand the engine a time before its own clock, or the pick is dropped.
      const at = Math.max(tRef.current, round.view().t);
      // Bubbles that are fading out are out of play (click and key alike). List mode has no fade and
      // keeps taking picks until the engine's own deadline.
      if (!config.listMode && progressOf(v, at) > LOCK_AT) return;
      let popped: Burst | null = null;
      const piece = v.pieces.find((x) => x.id === id);
      const board = boardRef.current;
      if (piece?.correct && board && !stillRef.current) {
        // One layout read per pop (never per frame) to place the burst where the bubble was.
        const el = board.querySelector<HTMLElement>(`[data-bubble="${v.pieces.indexOf(piece)}"]`);
        if (el) {
          const b = board.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          popped = { key: v.frame.index, label: piece.label, x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
        }
      }
      const out = round.pick(at, v.frame.index, id);
      // Bubble's pick never returns [] (every path ends in an invalid marker, complete + frame, or a
      // miss; tests/verb-bubble.test.mjs fuzzes this). Unlike Crush, test "every", not "some": escapes
      // that ran before an invalid pick are real and must still reach the screen. The length check
      // guards [].every() === true in case the engine ever changes.
      if (out.length === 0 || out.every((o) => o.kind === "invalid")) return;
      if (!piece?.correct && !stillRef.current) {
        const i = v.pieces.findIndex((x) => x.id === id);
        const el = bobRefs.current[i]?.firstElementChild?.nextElementSibling as HTMLElement | null | undefined;
        el?.animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 180 });
      }
      apply(out, at, popped);
    },
    [round, apply, config.listMode],
  );

  // List mode: a new frame replaces the options, so focus would fall to the page. Move it to the first
  // option when it was inside the old options or already on the page; after a miss, only when the
  // focused option was the one just disabled.
  useLayoutEffect(() => {
    if (!config.listMode) return;
    const wrap = listRef.current;
    if (!wrap) return;
    const a = document.activeElement as HTMLElement | null;
    const newFrame = focusFrame.current !== view.frame.index;
    focusFrame.current = view.frame.index;
    const onPage = !a || a === document.body;
    const move = newFrame ? onPage || wrap.contains(a) : onPage || (wrap.contains(a) && (a as HTMLButtonElement).disabled === true);
    if (!move) return;
    wrap.querySelector<HTMLButtonElement>("[data-choice]:not([disabled])")?.focus({ preventScroll: true });
  }, [config.listMode, view.frame.index, view.removed.length]);

  // Keys 1-6 pick on the bubble boards; list mode uses FrameChoices' own key handler.
  useEffect(() => {
    if (config.listMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const v = viewRef.current;
      const id = choiceForKey(e.key, v.pieces, v.removed);
      if (id === null) return;
      e.preventDefault();
      pick(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.listMode, pick]);

  // Cached sizes for paint(); a ResizeObserver keeps them current without per-frame layout reads.
  useEffect(() => {
    if (still || typeof ResizeObserver !== "function") return;
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      size.current.board = board.clientHeight;
      size.current.cluster = clusterRef.current?.offsetHeight ?? 0;
    };
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    if (clusterRef.current) ro.observe(clusterRef.current);
    measure();
    paint(tRef.current);
    return () => ro.disconnect();
  }, [still, view.frame.index, view.pieces.length, paint]);

  // A fresh cluster mounts hidden (opacity 0); paint it before the browser shows it.
  useLayoutEffect(() => {
    if (!still && clusterRef.current) {
      size.current.cluster = clusterRef.current.offsetHeight;
      paint(tRef.current);
    }
  }, [still, view.frame.index, paint]);

  // Bring the whole board into view on start (the bubbles begin at its bottom edge). The section's
  // scroll-margin-bottom uses the app's bottom budget tokens (nav + floating control + gaps + safe
  // area), so End round lands clear of the fixed tab bar and the Tutor button.
  // Deferred past the router's scroll restoration, which runs after the URL changes to the play screen.
  useEffect(() => {
    const id = setTimeout(() => {
      sectionRef.current?.scrollIntoView?.({ block: "nearest", behavior: stillRef.current ? "auto" : "smooth" });
    }, 150);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      clearTimeout(pending.reason);
      clearTimeout(pending.flash);
      clearTimeout(pending.burst);
      stopRemoteTTS();
    };
  }, []);

  const msLeft = ROUND_MS.bubble - (endedRef.current ? ROUND_MS.bubble : t);
  const choices = view.pieces.map((x) => ({ id: x.id, label: x.label }));

  return (
    <section ref={sectionRef} className="mx-auto w-full max-w-3xl scroll-mt-4 space-y-3 [scroll-margin-bottom:calc(var(--lt-nav-height)+var(--lt-floating-control-height)+var(--lt-floating-gap)*2+env(safe-area-inset-bottom))]" data-testid="bubble-game" aria-label="Bubble Pop">
      <GameHud eyebrow={eyebrowFor(config)} score={view.score} streak={view.streak} msLeft={msLeft} />

      {config.listMode ? (
        <div ref={listRef}>
          <FrameChoices
            key={view.frame.index}
            prompt={view.frame.prompt}
            english={view.frame.english}
            infinitive={view.frame.infinitive}
            options={choices}
            disabled={view.removed}
            onPick={pick}
          />
        </div>
      ) : (
        <p data-testid="bubble-frame" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-tight">
          <span className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{view.frame.prompt}</span>
          <span className="font-mono text-sm text-muted-foreground">
            {" · "}
            {view.frame.english}
            {" · "}
            <span className="text-gold-ink">{view.frame.infinitive}</span>
          </span>
        </p>
      )}

      {/* Feedback sits between the frame and the board, where the eyes already are (never under the fold or the phone tab bar). */}
      {/* One fixed-height slot: the flash, with the reason band laid over it during a miss. S still saves while covered. */}
      <div className="relative flex h-14 items-center justify-center gap-2" data-testid="feedback-slot">
        {/* The flash is the answer just given, not the current prompt: say so with a check and "LAST". */}
        {flash && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="flash-mark">
            <span className="hidden sm:inline">Last</span>
            <CheckIcon />
          </span>
        )}
        {/* Sentence frames (after 30 s) carry long English: keep the pill inside the fixed slot, two lines at most. */}
        <div className="min-w-0 [&>div]:h-14 [&_[data-flash-pill]]:line-clamp-2 [&_[data-flash-pill]]:rounded-2xl [&_[data-flash-pill]]:py-1.5 [&_[data-flash-pill]]:text-sm [&_[data-flash-pill]]:leading-5">
          <CompletionFlash completion={flash} onSaveCard={p.onSaveCard} />
        </div>
        <div className={`absolute inset-0 ${reason ? "" : "pointer-events-none"}`}>
          <ReasonBand text={reason} />
        </div>
      </div>

      {config.listMode ? null : still ? (
        <StillRow view={view} onPick={pick} piecesRef={stillPiecesRef} />
      ) : (
        <RisingBoard view={view} boardRef={boardRef} clusterRef={clusterRef} bobRefs={bobRefs} onPick={pick} burst={burst} />
      )}
      {still && <Countdown barRef={barRef} />}

      {/* End round sits under the board so the HUD keeps one line at 375 px. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <button
          type="button"
          onClick={() => finish(Math.max(tRef.current, round.view().t), true)}
          className={`${BTN} border-border bg-card text-foreground hover:border-gold`}
        >
          End round
        </button>
      </div>
      <LiveRegion message={message} />
    </section>
  );
}
