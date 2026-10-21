// Built by TAC — 2026-10-21
// Verb Games: the Verb Crush round screen. The engine (src/lib/verb-games/crush.ts) owns every rule;
// this file drives it with the round clock, takes tap / drag / keyboard swaps, animates with
// transform and opacity only (WAAPI, never per-frame React renders), and announces.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRoundClock } from "@/hooks/use-round-clock";
import { stopRemoteTTS } from "@/lib/tts";
import {
  CRUSH_SIZE,
  adjacent,
  createCrushRound,
  type CrushRound,
  type CrushTile,
  type CrushView,
} from "@/lib/verb-games/crush";
import { REASON_MS, ROUND_MS, streakMultiplier } from "@/lib/verb-games/rules";
import { buildRoundLog } from "@/lib/verb-games/scoring";
import type {
  Completion,
  CrushLevel,
  Outcome,
  PatternData,
  RoundConfig,
  RoundLog,
  RoundResult,
} from "@/lib/verb-games/types";
import { CompletionFlash } from "./CompletionFlash";
import { GameHud } from "./GameHud";
import { Legend } from "./Legend";
import { LiveRegion } from "./LiveRegion";
import { PIECE_COLORS } from "./piece-colors";
import { PieceTile } from "./PieceTile";
import { ReasonBand } from "./ReasonBand";

/** Dev builds only (ruling F7): the first popping swap is marked so e2e can play it. Always false in production. */
const DEV = Boolean(import.meta.env?.DEV);

/** A completion stays up at least this long during a round so a keyboard user can press S to save it. */
const FLASH_MS = 2000;
/** Swap tween. */
const SWAP_MS = 170;
/** Pop burst. */
const BURST_MS = 200;
/** One refill tile dropping in. */
const DROP_MS = 240;
/** Gap between cascade passes, and between columns of one drop. */
const CASCADE_MS = 260;
const DROP_STAGGER_MS = 28;
/** A trap swap: half-way over, back, and a shake. */
const TRAP_MS = 360;
/** Reduced motion: how long trap tiles stay dimmed. */
const DIM_MS = 450;
/** A natural end (goal, moves or time) holds the board this long so the last pop is seen. */
const END_HOLD_MS = 900;
/** Pointer travel (px) that turns a press into a drag swap. */
const SWIPE_PX = 16;
/** Engine pop points before streak and chain (crush.ts POP_POINTS); used only to read the chain step back. */
const POP_POINTS = 50;

const CELLS = CRUSH_SIZE * CRUSH_SIZE;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** A small overshoot so a refill lands, not slides. */
const DROP_EASE = "cubic-bezier(0.25, 0.9, 0.35, 1.18)";

const BTN =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-gold";

type Dir = "left" | "right" | "up" | "down";

const KEY_DIR: Record<string, Dir> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** The neighbor of cell `i` in direction `d`, or null at the edge. */
function neighbor(i: number, d: Dir): number | null {
  const r = Math.floor(i / CRUSH_SIZE);
  const c = i % CRUSH_SIZE;
  if (d === "left") return c > 0 ? i - 1 : null;
  if (d === "right") return c < CRUSH_SIZE - 1 ? i + 1 : null;
  if (d === "up") return r > 0 ? i - CRUSH_SIZE : null;
  return r < CRUSH_SIZE - 1 ? i + CRUSH_SIZE : null;
}

function eyebrowFor(config: RoundConfig): string {
  // Ruling F8: GameHud renders the eyebrow as given, so it is uppercased here.
  return `GAME · VERB CRUSH · LEVEL ${String(config.level)}`.toUpperCase();
}

function tileText(tile: CrushTile): string {
  return tile.kind === "stem" ? `${tile.label}-` : `-${tile.label}`;
}

function cellLabel(tile: CrushTile, i: number): string {
  return `${tile.kind} ${tile.label}, row ${Math.floor(i / CRUSH_SIZE) + 1}, column ${(i % CRUSH_SIZE) + 1}`;
}

/** Font size that fits the tile text in one cell at any board width (the board is the query container). */
function fitFont(tile: CrushTile): string {
  const chars = tileText(tile).length;
  const pad = tile.kind === "ending" ? 22 : 10;
  return `clamp(9px, calc((20cqi - 8px - ${pad}px) / ${(chars * 0.62).toFixed(2)}), 17px)`;
}

type Geometry = {
  pitchX: number;
  pitchY: number;
  cellW: number;
  cellH: number;
  originX: number;
  originY: number;
};

type Burst = { key: string; label: string; step: number; x: number; y: number; delay: number };

/** What one accepted swap does to the board, worked out from the tile ids the engine hands out. */
type Plan = { bursts: Burst[]; drops: Map<number, number>; reshuffle: boolean };

/**
 * The engine refills each popped pair with two fresh ids (stem first) in pop order, pass by pass, and
 * a fresh board takes 25 more. So an id says which pop (and which cascade pass) put a tile there.
 */
function planSwap(
  before: readonly CrushTile[],
  after: readonly CrushTile[],
  completions: readonly Completion[],
  streak0: number,
  geo: Geometry | null,
): Plan {
  const known = new Set(before.map((c) => c.id));
  let next = before.reduce((m, c) => Math.max(m, c.id), -1) + 1;
  const pops = completions.map((c, k) => {
    const mult = streakMultiplier(streak0 + k + 1) || 1;
    const step = Math.max(1, Math.round(c.points / (POP_POINTS * mult)));
    const first = next;
    next += 2;
    return { step, first, label: c.form };
  });
  const lastRefill = next - 1;
  const reshuffle = after.some((c) => c.id > lastRefill);
  const maxStep = pops.reduce((m, p) => Math.max(m, p.step), 0);
  const drops = new Map<number, number>();
  const bursts: Burst[] = [];
  const center = (i: number, pair: boolean) => {
    if (!geo) return { x: 0, y: 0 };
    const r = Math.floor(i / CRUSH_SIZE);
    const c = i % CRUSH_SIZE;
    return {
      x: geo.originX + c * geo.pitchX + (pair ? (geo.pitchX + geo.cellW) / 2 : geo.cellW / 2),
      y: geo.originY + r * geo.pitchY + geo.cellH / 2,
    };
  };
  const burstDelay = (step: number) => (step - 1) * CASCADE_MS;

  if (reshuffle) {
    // No pop was left, so the engine dealt a fresh board: the pops burst where the swap was, then the board deals in.
    pops.forEach((p, k) =>
      bursts.push({
        key: `r${p.first}`,
        label: p.label,
        step: p.step,
        ...center(12, false),
        delay: burstDelay(p.step) + k * 40,
      }),
    );
    const base = maxStep > 0 ? burstDelay(maxStep) + BURST_MS : 0;
    after.forEach((c, i) =>
      drops.set(c.id, base + (Math.floor(i / CRUSH_SIZE) + (i % CRUSH_SIZE)) * DROP_STAGGER_MS),
    );
    return { bursts, drops, reshuffle };
  }

  after.forEach((tile, i) => {
    if (known.has(tile.id)) return;
    const k = pops.findIndex((p) => tile.id === p.first || tile.id === p.first + 1);
    const pop = pops[k];
    if (!pop) return;
    if (tile.id === pop.first)
      bursts.push({
        key: `b${pop.first}`,
        label: pop.label,
        step: pop.step,
        ...center(i, true),
        delay: burstDelay(pop.step),
      });
    drops.set(tile.id, burstDelay(pop.step) + BURST_MS / 2 + (i % CRUSH_SIZE) * DROP_STAGGER_MS);
  });
  return { bursts, drops, reshuffle };
}

/** Pops burst where the pair was: a done-green chip scales up and fades, a ring opens, four sparks fly. */
function PopBurst(p: { burst: Burst; still: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const { delay } = p.burst;
  const still = p.still;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof el.animate !== "function") return;
    const [ring, chip, ...sparks] = Array.from(el.children) as HTMLElement[];
    const timing = { duration: BURST_MS, delay, easing: EASE, fill: "both" as const };
    if (still) {
      // Reduced motion: the chip fades in place; nothing scales or flies.
      chip?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], {
        ...timing,
        duration: BURST_MS + 150,
      });
      ring?.animate([{ opacity: 0 }, { opacity: 0 }], timing);
      sparks.forEach((s) => s.animate([{ opacity: 0 }, { opacity: 0 }], timing));
      return;
    }
    ring?.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.5)", opacity: 0.9 },
        { transform: "translate(-50%,-50%) scale(1.9)", opacity: 0 },
      ],
      timing,
    );
    chip?.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.7)", opacity: 0 },
        { transform: "translate(-50%,-50%) scale(1.12)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%,-62%) scale(1.2)", opacity: 0 },
      ],
      { ...timing, duration: BURST_MS + 140 },
    );
    sparks.forEach((s, i) => {
      const a = (Math.PI * 2 * i) / sparks.length + Math.PI / 4;
      const r = 40;
      s.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${(Math.cos(a) * r).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * r).toFixed(1)}px)) scale(0.3)`,
            opacity: 0,
          },
        ],
        { ...timing, duration: BURST_MS + 40 },
      );
    });
  }, [delay, still]);
  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{ left: p.burst.x, top: p.burst.y }}
      data-testid="crush-burst"
    >
      <span
        className="absolute h-14 w-14 rounded-full border-2"
        style={{ borderColor: PIECE_COLORS.done, transform: "translate(-50%,-50%)", opacity: 0 }}
      />
      <span
        className="absolute whitespace-nowrap rounded-full px-3 py-1.5 font-mono text-sm font-semibold sm:text-base"
        style={{
          backgroundColor: PIECE_COLORS.done,
          color: "#0a1220",
          transform: "translate(-50%,-50%)",
          opacity: 0,
        }}
      >
        {p.burst.label}
        {p.burst.step > 1 ? (
          <span className="ml-1.5 text-[11px] opacity-70">×{p.burst.step}</span>
        ) : null}
      </span>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            backgroundColor: PIECE_COLORS.done,
            transform: "translate(-50%,-50%)",
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The 5×5 board. Its width also follows the viewport height (never under 16rem, which keeps tiles at
 * 44 px) so the HUD, the goal and the whole board fit a short phone without scrolling.
 * Re-renders only when the shown cells, the pick, focus, hints or bursts change. */
const Board = memo(function Board(p: {
  cells: CrushTile[];
  selected: number | null;
  focusIndex: number;
  hint: [number, number] | null;
  dimmed: readonly number[];
  bursts: Burst[];
  still: boolean;
  boardRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  tileEls: React.MutableRefObject<Map<number, HTMLDivElement>>;
  onCell: (i: number) => void;
  onKey: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: () => void;
  onFocusIn: (i: number) => void;
}) {
  const rows = [0, 1, 2, 3, 4];
  return (
    <div
      ref={p.boardRef}
      data-testid="crush-board"
      data-motion={p.still ? "still" : "move"}
      className="relative mx-auto aspect-square w-full max-w-[max(16rem,min(28rem,calc(100svh-23.5rem)))] select-none lg:max-w-[max(16rem,min(28rem,calc(100svh-22.5rem)))] overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-1.5 [container-type:inline-size] sm:p-2"
      style={{ touchAction: "none" }}
    >
      <div
        ref={p.gridRef}
        data-testid="crush-grid"
        role="grid"
        aria-label="Verb Crush board, 5 by 5. Arrow keys move. Enter or Space picks a tile; an arrow with a tile picked swaps it."
        aria-rowcount={CRUSH_SIZE}
        aria-colcount={CRUSH_SIZE}
        className="grid h-full grid-rows-5 gap-1.5 sm:gap-2"
        onKeyDown={p.onKey}
        onPointerDown={p.onPointerDown}
        onPointerMove={p.onPointerMove}
        onPointerUp={p.onPointerEnd}
        onPointerCancel={p.onPointerEnd}
      >
        {rows.map((r) => (
          <div
            key={r}
            role="row"
            aria-rowindex={r + 1}
            className="grid min-h-0 grid-cols-5 gap-1.5 sm:gap-2"
          >
            {p.cells.slice(r * CRUSH_SIZE, r * CRUSH_SIZE + CRUSH_SIZE).map((tile, k) => {
              const i = r * CRUSH_SIZE + k;
              const selected = p.selected === i;
              const hint = p.hint
                ? p.hint[0] === i
                  ? "a"
                  : p.hint[1] === i
                    ? "b"
                    : undefined
                : undefined;
              return (
                <div
                  key={tile.id}
                  ref={(el) => {
                    if (el) p.tileEls.current.set(tile.id, el);
                    else p.tileEls.current.delete(tile.id);
                  }}
                  role="gridcell"
                  aria-colindex={k + 1}
                  aria-selected={selected}
                  aria-label={cellLabel(tile, i)}
                  tabIndex={i === p.focusIndex ? 0 : -1}
                  data-testid="crush-cell"
                  data-index={i}
                  data-kind={tile.kind}
                  data-hint={DEV ? hint : undefined}
                  onClick={() => p.onCell(i)}
                  onFocus={() => p.onFocusIn(i)}
                  className={[
                    "relative flex min-h-0 min-w-0 cursor-pointer rounded-lg will-change-transform",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-gold",
                    // The tile fills its cell; a long stem shrinks its text instead of overflowing.
                    "[&>span]:h-full [&>span]:min-h-0 [&>span]:w-full [&>span]:px-1 [&>span]:leading-none [&>span]:[font-size:inherit]",
                    "[&>[data-shape=chevron]]:pl-[17px] [&>[data-shape=chevron]]:pr-1 hover:[&>span]:brightness-110",
                    selected ? "z-10" : "",
                    selected && !p.still ? "scale-[1.06]" : "",
                    p.still ? "" : "transition-transform duration-150",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ fontSize: fitFont(tile) }}
                >
                  <PieceTile
                    kind={tile.kind}
                    label={tile.label}
                    selected={selected}
                    dimmed={p.dimmed.includes(i)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {p.bursts.map((b) => (
        <PopBurst key={b.key} burst={b} still={p.still} />
      ))}
    </div>
  );
});

/** One goal slot: empty dashed box, then the popped form on done green. */
function GoalSlot(p: { index: number; completion: Completion | null; still: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const filled = p.completion !== null;
  const { still } = p;
  useLayoutEffect(() => {
    if (!filled || still) return;
    ref.current?.animate?.(
      [
        { transform: "scale(0.7)", opacity: 0.4 },
        { transform: "scale(1.08)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      {
        duration: 260,
        delay: SWAP_MS,
        easing: EASE,
        fill: "backwards",
      },
    );
  }, [filled, still]);
  const c = p.completion;
  return (
    <li
      ref={ref}
      data-goal-slot={p.index}
      data-filled={filled ? "true" : undefined}
      aria-label={c ? `${c.form}, ${c.english}` : `Goal ${p.index + 1}, not made yet`}
      title={c ? `${c.form} · ${c.english}` : undefined}
      className={`flex h-7 min-w-0 items-center justify-center rounded-md border px-1 font-mono text-[12px] font-semibold ${filled ? "" : "border-dashed border-border"}`}
      style={
        c
          ? { backgroundColor: PIECE_COLORS.done, borderColor: PIECE_COLORS.done, color: "#0a1220" }
          : undefined
      }
    >
      <span className="truncate">{c ? c.form : ""}</span>
    </li>
  );
}

function GoalBox(p: { level: CrushLevel; goals: Completion[]; still: boolean }) {
  const count = p.level.goalCount;
  const made = Math.min(p.goals.length, count);
  // Up to six slots sit in one row; eight split into two rows of four on a phone.
  const cols = count <= 6 ? count : Math.ceil(count / 2);
  const done = made >= count;
  return (
    <div
      data-testid="crush-goal"
      data-made={made}
      className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-ink">
            Goal
          </div>
          <div className="truncate font-display text-lg font-semibold leading-tight text-foreground">
            {p.level.label}
          </div>
        </div>
        <div
          data-testid="crush-goal-count"
          className={`shrink-0 font-mono text-sm tabular-nums ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}
        >
          {made} / {count}
        </div>
      </div>
      <ol
        aria-label="Goal forms"
        className="mt-2 grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))] lg:grid-cols-2"
        style={{ "--cols": cols, "--cols-sm": count } as React.CSSProperties}
      >
        {Array.from({ length: count }, (_, i) => (
          <GoalSlot key={i} index={i} completion={p.goals[i] ?? null} still={p.still} />
        ))}
      </ol>
    </div>
  );
}

export function VerbCrushGame(p: {
  data: PatternData;
  config: RoundConfig;
  onEnd(log: RoundLog, result: RoundResult): void;
  onSaveCard(c: Completion): void;
}) {
  // The round and its config are fixed for the life of this screen; remount for a new round.
  const [round] = useState<CrushRound>(() => createCrushRound(p.data, p.config));
  const [config] = useState(() => p.config);
  const [data] = useState(() => p.data);
  const level = useMemo(
    () => data.crushLevels.find((l) => l.level === config.level) as CrushLevel,
    [data, config],
  );
  const [view, setView] = useState<CrushView>(() => round.view());
  /** The cells on screen. They trail the engine by one swap tween so tiles can travel before they change. */
  const [cells, setCells] = useState<CrushTile[]>(() => round.view().cells);
  const [selected, setSelected] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [dimmed, setDimmed] = useState<number[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [goals, setGoals] = useState<Completion[]>([]);
  const [active, setActive] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [flash, setFlash] = useState<Completion | null>(null);
  const [message, setMessage] = useState(() => {
    const v = round.view();
    return `Goal: ${level.label}. 0 of ${v.goalCount}. ${v.movesLeft} moves. Swap a stem next to its ending to make a form.`;
  });
  const reduced = useReducedMotion();
  const still = reduced;

  const tRef = useRef(0);
  const endedRef = useRef(false);
  const busyRef = useRef(false);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const focusRef = useRef(focusIndex);
  focusRef.current = focusIndex;
  const stillRef = useRef(still);
  stillRef.current = still;
  const boardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const tileEls = useRef(new Map<number, HTMLDivElement>());
  const geo = useRef<Geometry | null>(null);
  const running = useRef(new Set<Animation>());
  const swapAnims = useRef<Animation[]>([]);
  const pendingDrops = useRef<Map<number, number> | null>(null);
  const hadFocus = useRef(false);
  const pointer = useRef<{ id: number; i: number; x: number; y: number; done: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const onEndRef = useRef(p.onEnd);
  onEndRef.current = p.onEnd;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const track = useCallback((a: Animation | undefined) => {
    if (!a) return;
    running.current.add(a);
    const done = () => running.current.delete(a);
    a.onfinish = done;
    a.oncancel = done;
  }, []);

  /** Ends any drop or burst still running, so a new swap starts from settled tiles. */
  const settle = useCallback(() => {
    for (const a of [...running.current]) {
      try {
        a.finish();
      } catch {
        a.cancel();
      }
    }
    running.current.clear();
  }, []);

  const finish = useCallback(
    (t: number, quit: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const at = Math.min(t, ROUND_MS.crush);
      const engineEnded = round.view().ended;
      const result = round.end(at);
      // Ruling F19: the log is built by buildRoundLog; quitAtMs only when the player left early.
      const log = buildRoundLog(
        config,
        round.events(),
        data,
        Date.now(),
        quit && !engineEnded && at < ROUND_MS.crush ? at : undefined,
      );
      setActive(false);
      setSelected(null);
      stopRemoteTTS();
      if (quit) onEndRef.current(log, result);
      // A natural end holds the board briefly so the last pop and the full goal are seen.
      else later(() => onEndRef.current(log, result), END_HOLD_MS);
    },
    [round, config, data, later],
  );

  /** Shows the engine's answer to a swap: flash, reason, goals, HUD, announcements and the end. */
  const report = useCallback(
    (out: Outcome[], next: CrushView, t: number, reshuffle: boolean) => {
      const said: string[] = [];
      const pops = out.flatMap((o) => (o.kind === "complete" ? [o.completion] : []));
      for (const c of pops) said.push(`${c.form} · ${c.english}.`);
      if (pops.length > 0) {
        const last = pops[pops.length - 1] as Completion;
        setFlash(last);
        later(() => setFlash((f) => (f === last ? null : f)), FLASH_MS);
        setGoals((g) => [...g, ...pops]);
        said.push(`Goal ${Math.min(next.made, next.goalCount)} of ${next.goalCount}.`);
        if (pops.length > 1) said.push(`Chain of ${pops.length}.`);
      }
      const miss = out.find((o) => o.kind === "miss");
      if (miss && miss.kind === "miss") {
        said.push(miss.miss.reason);
        setReason(miss.miss.reason);
        const r = miss.miss.reason;
        later(() => setReason((x) => (x === r ? null : x)), REASON_MS);
      } else if (pops.length === 0) {
        said.push(`Swapped. ${next.movesLeft} moves left.`);
      }
      if (reshuffle && !next.ended) said.push("No pops left, so here is a new board.");
      if (out.some((o) => o.kind === "end")) {
        said.push(
          next.won ? "Goal complete." : next.movesLeft <= 0 ? "Out of moves." : "Time is up.",
        );
      }
      setView(next);
      setMessage(said.join(" "));
      if (out.some((o) => o.kind === "end")) finish(t, false);
    },
    [later, finish],
  );

  /** Puts the engine's cells on screen with their pops, drops and focus. */
  const commit = useCallback(
    (after: CrushTile[], plan: Plan | null) => {
      pendingDrops.current = plan && plan.drops.size > 0 ? plan.drops : null;
      if (plan && plan.bursts.length > 0) {
        setBursts(plan.bursts);
        const longest = plan.bursts.reduce((m, b) => Math.max(m, b.delay), 0) + BURST_MS + 200;
        const keys = plan.bursts.map((b) => b.key).join();
        later(() => setBursts((bs) => (bs.map((b) => b.key).join() === keys ? [] : bs)), longest);
      }
      setCells(after);
      busyRef.current = false;
    },
    [later],
  );

  const swap = useCallback(
    (a: number, b: number) => {
      if (endedRef.current || busyRef.current || !adjacent(a, b)) return;
      settle();
      const before = cellsRef.current;
      const streak0 = round.view().streak;
      // Task 7 note: never hand the engine a time before its own clock, or the swap is dropped.
      const at = Math.max(tRef.current, round.view().t);
      const out = round.swap(at, a, b);
      if (out.every((o) => o.kind === "invalid")) return;
      setSelected(null);
      const next = round.view();
      const pops = out.flatMap((o) => (o.kind === "complete" ? [o.completion] : []));
      const trapped = out.some((o) => o.kind === "miss");
      const plan = trapped ? null : planSwap(before, next.cells, pops, streak0, geo.current);
      report(out, next, at, plan?.reshuffle ?? false);
      // Focus follows the tile the player moved.
      if (!trapped && focusRef.current === a) setFocusIndex(b);

      const g = geo.current;
      const elA = tileEls.current.get((before[a] as CrushTile).id);
      const elB = tileEls.current.get((before[b] as CrushTile).id);
      const canAnimate = !stillRef.current && g && elA && elB && typeof elA.animate === "function";
      const dx = ((b % CRUSH_SIZE) - (a % CRUSH_SIZE)) * (g?.pitchX ?? 0);
      const dy = (Math.floor(b / CRUSH_SIZE) - Math.floor(a / CRUSH_SIZE)) * (g?.pitchY ?? 0);

      if (trapped) {
        if (canAnimate) {
          // Half-way over, back, and a shake: the word was not a form.
          const go = (x: number, y: number) => [
            { transform: "translate(0,0)" },
            {
              transform: `translate(${(x * 0.55).toFixed(1)}px,${(y * 0.55).toFixed(1)}px)`,
              offset: 0.35,
            },
            { transform: "translate(0,0)", offset: 0.6 },
            { transform: "translate(-4px,0)", offset: 0.72 },
            { transform: "translate(4px,0)", offset: 0.86 },
            { transform: "translate(0,0)" },
          ];
          track(elA.animate(go(dx, dy), { duration: TRAP_MS, easing: "ease-in-out" }));
          track(elB.animate(go(-dx, -dy), { duration: TRAP_MS, easing: "ease-in-out" }));
        } else {
          // Reduced motion: the two tiles dim in place.
          setDimmed([a, b]);
          later(() => setDimmed([]), DIM_MS);
        }
        return;
      }

      if (!canAnimate) {
        commit(next.cells, plan);
        return;
      }
      busyRef.current = true;
      elA.style.zIndex = "5";
      elB.style.zIndex = "5";
      const timing = { duration: SWAP_MS, easing: EASE, fill: "forwards" as const };
      swapAnims.current = [
        elA.animate(
          [{ transform: "translate(0,0)" }, { transform: `translate(${dx}px,${dy}px)` }],
          timing,
        ),
        elB.animate(
          [{ transform: "translate(0,0)" }, { transform: `translate(${-dx}px,${-dy}px)` }],
          timing,
        ),
      ];
      later(() => commit(next.cells, plan), SWAP_MS);
    },
    [round, settle, report, track, later, commit],
  );

  // After the shown cells change: drop the tween transforms, run the refill drops, keep focus on the board.
  useLayoutEffect(() => {
    for (const a of swapAnims.current) a.cancel();
    swapAnims.current = [];
    for (const el of tileEls.current.values()) el.style.zIndex = "";
    const drops = pendingDrops.current;
    pendingDrops.current = null;
    const g = geo.current;
    if (drops) {
      for (const [id, delay] of drops) {
        const el = tileEls.current.get(id);
        if (!el || typeof el.animate !== "function") continue;
        if (stillRef.current) {
          track(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, fill: "backwards" }));
        } else {
          const lift = -(g?.pitchY ?? 40) * 0.75;
          track(
            el.animate(
              [
                { transform: `translateY(${lift.toFixed(1)}px) scale(0.92)`, opacity: 0 },
                { transform: "translateY(0) scale(1)", opacity: 1 },
              ],
              {
                duration: DROP_MS,
                delay,
                easing: DROP_EASE,
                fill: "backwards",
              },
            ),
          );
        }
      }
    }
    if (hadFocus.current) {
      // A tile that moved within its row keeps focus (keyed DOM node): follow it. A tile that was
      // remounted (row change, pop) drops focus to the body: put it back on the focused cell.
      const active = document.activeElement as HTMLElement | null;
      const grid = gridRef.current;
      if (active && grid?.contains(active) && active.dataset.index !== undefined) {
        const k = Number(active.dataset.index);
        if (k !== focusRef.current) setFocusIndex(k);
      } else {
        grid?.querySelector<HTMLElement>(`[data-index="${focusRef.current}"]`)?.focus({ preventScroll: true });
      }
    }
  }, [cells, track]);

  /** Tap or Enter on cell `i`: pick, unpick, swap with the picked neighbor, or move the pick. */
  const choose = useCallback(
    (i: number) => {
      if (endedRef.current) return;
      setFocusIndex(i);
      const s = selectedRef.current;
      if (s === null) setSelected(i);
      else if (s === i) setSelected(null);
      else if (adjacent(s, i)) swap(s, i);
      else setSelected(i);
    },
    [swap],
  );

  const onCell = useCallback(
    (i: number) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      choose(i);
    },
    [choose],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = focusRef.current;
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        const s = selectedRef.current;
        if (s !== null) {
          const j = neighbor(s, dir);
          if (j !== null) swap(s, j);
          return;
        }
        const j = neighbor(i, dir);
        if (j !== null) setFocusIndex(j);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) choose(i);
        return;
      }
      if (e.key === "Escape" && selectedRef.current !== null) {
        e.preventDefault();
        setSelected(null);
      }
    },
    [swap, choose],
  );

  // Roving focus: the focused cell follows focusIndex while the board has focus.
  useEffect(() => {
    if (!hadFocus.current) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`);
    if (el && document.activeElement !== el) el.focus({ preventScroll: true });
  }, [focusIndex]);

  const onFocusIn = useCallback((i: number) => {
    hadFocus.current = true;
    if (focusRef.current !== i) setFocusIndex(i);
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    // Focus that moves to another control leaves the board; focus dropped to the body (a focused tile
    // was remounted by a swap or pop) does not, so the next commit can put it back.
    const out = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body && !grid.contains(active)) hadFocus.current = false;
      });
    };
    grid.addEventListener("focusout", out);
    return () => grid.removeEventListener("focusout", out);
  }, []);

  // Drag or swipe: past SWIPE_PX the press swaps with the neighbor in the main direction, once.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!cell) return;
    pointer.current = {
      id: e.pointerId,
      i: Number(cell.dataset.index),
      x: e.clientX,
      y: e.clientY,
      done: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p0 = pointer.current;
      if (!p0 || p0.done || p0.id !== e.pointerId) return;
      const dx = e.clientX - p0.x;
      const dy = e.clientY - p0.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
      p0.done = true;
      suppressClick.current = true;
      const dir: Dir =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      const j = neighbor(p0.i, dir);
      setFocusIndex(p0.i);
      if (j !== null) swap(p0.i, j);
    },
    [swap],
  );

  const onPointerEnd = useCallback(() => {
    const p0 = pointer.current;
    pointer.current = null;
    // A drag that ended outside any cell fires no click; clear the guard on the next frame.
    if (p0?.done) requestAnimationFrame(() => (suppressClick.current = false));
  }, []);

  const onTick = useCallback(
    (t: number) => {
      if (endedRef.current) return;
      tRef.current = t;
      const out = round.advance(t);
      if (out.some((o) => o.kind === "end")) report(out, round.view(), t, false);
    },
    [round, report],
  );

  const { t } = useRoundClock(active, onTick);

  // Cell geometry for tweens and bursts, read only when the board resizes (never per frame).
  useEffect(() => {
    const board = boardRef.current;
    const grid = gridRef.current;
    if (!board || !grid) return;
    const measure = () => {
      const c0 = grid.querySelector<HTMLElement>('[data-index="0"]');
      const c1 = grid.querySelector<HTMLElement>('[data-index="1"]');
      const c5 = grid.querySelector<HTMLElement>(`[data-index="${CRUSH_SIZE}"]`);
      if (!c0 || !c1 || !c5) return;
      geo.current = {
        pitchX: c1.offsetLeft - c0.offsetLeft,
        pitchY: c5.offsetTop - c0.offsetTop,
        cellW: c0.offsetWidth,
        cellH: c0.offsetHeight,
        originX: c0.offsetLeft,
        originY: c0.offsetTop,
      };
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, []);

  // Bring the HUD to the top on start (so HUD, goal and board share the screen on a short phone), past the
  // router's scroll restoration (as Bubble Pop does),
  // and put keyboard focus on the first cell so arrows work at once.
  useEffect(() => {
    const id = setTimeout(() => {
      const section = sectionRef.current;
      if (section) {
        // A sticky or fixed top bar would cover the HUD: start the section just below whatever sits at the top edge.
        const r = section.getBoundingClientRect();
        let inset = 0;
        for (
          let el = document.elementFromPoint?.(r.left + r.width / 2, 1) as HTMLElement | null;
          el && el !== document.body;
          el = el.parentElement
        ) {
          const pos = getComputedStyle(el).position;
          if (pos === "sticky" || pos === "fixed") {
            inset = Math.max(0, el.getBoundingClientRect().bottom);
            break;
          }
        }
        section.style.scrollMarginTop = `${Math.round(inset) + 12}px`;
        section.scrollIntoView?.({
          block: "start",
          behavior: stillRef.current ? "auto" : "smooth",
        });
      }
      const active = document.activeElement;
      if (!active || active === document.body) {
        gridRef.current
          ?.querySelector<HTMLElement>('[data-index="0"]')
          ?.focus({ preventScroll: true });
      }
    }, 150);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    const anims = running.current;
    return () => {
      for (const id of pending) clearTimeout(id);
      pending.clear();
      for (const a of anims) a.cancel();
      stopRemoteTTS();
    };
  }, []);

  // Dev only: the first popping swap on the board as shown (recomputed when the shown cells change).
  const hint = useMemo<[number, number] | null>(
    () => (DEV && cells.length === CELLS && !endedRef.current ? round.findPopSwap() : null),
    [round, cells],
  );

  const msLeft = ROUND_MS.crush - (endedRef.current ? Math.min(view.t, ROUND_MS.crush) : t);

  // Phone and tablet: one column, goal above the board. Desktop: the goal and controls sit beside the board.
  return (
    <section
      ref={sectionRef}
      className="mx-auto grid w-full max-w-xl scroll-mb-24 grid-cols-1 gap-3 lg:max-w-[46rem] lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-6"
      data-testid="crush-game"
      aria-label="Verb Crush"
    >
      <div className="lg:col-span-2">
        <GameHud
          eyebrow={eyebrowFor(config)}
          score={view.score}
          streak={view.streak}
          msLeft={msLeft}
          movesLeft={view.movesLeft}
        />
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:self-start">
        <GoalBox level={level} goals={goals} still={still} />
      </div>

      {/* One fixed-height slot: the flash, with the reason band laid over it during a miss. S still saves while covered. */}
      <div className="relative flex h-14 flex-col justify-center sm:h-12 lg:col-start-1 lg:row-start-2">
        <CompletionFlash completion={flash} onSaveCard={p.onSaveCard} />
        <div className={`absolute inset-0 ${reason ? "" : "pointer-events-none"}`}>
          <ReasonBand text={reason} />
        </div>
      </div>

      <div className="lg:col-start-1 lg:row-start-3">
        <Board
          cells={cells}
          selected={selected}
          focusIndex={focusIndex}
          hint={hint}
          dimmed={dimmed}
          bursts={bursts}
          still={still}
          boardRef={boardRef}
          gridRef={gridRef}
          tileEls={tileEls}
          onCell={onCell}
          onKey={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerEnd={onPointerEnd}
          onFocusIn={onFocusIn}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:col-start-2 lg:row-start-3 lg:flex-col lg:items-start lg:justify-end">
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
