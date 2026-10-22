// Built by TAC — 2026-10-21
import type { RoundMode } from "@/lib/verb-games/types";

function clock(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The round HUD. Timed (the default): score, streak and the clock. Count: score, streak and
 * "3 / 10" (no clock). Forever: no clock; the streak stands on its own, large, beside the score.
 */
export function GameHud(p: {
  /** Rendered exactly as given. Callers pass it already uppercased (`.toUpperCase()`), e.g. `GAME · BUBBLE POP`. */
  eyebrow: string;
  score: number;
  streak: number;
  msLeft: number;
  movesLeft?: number;
  mode?: RoundMode;
  /** Correct forms so far: a count round shows it against N. Crush leaves it out (its goal box counts). */
  made?: number;
}) {
  const mode: RoundMode = p.mode ?? { kind: "timed" };
  const moves = p.movesLeft === undefined ? [] : [`MOVES ${p.movesLeft}`];
  const score = `SCORE ${p.score.toLocaleString("en-US")}`;
  const stats =
    mode.kind === "timed"
      ? [score, `STREAK ×${p.streak}`, clock(p.msLeft), ...moves]
      : mode.kind === "count"
        ? [score, `STREAK ×${p.streak}`, ...(p.made === undefined ? [] : [`${Math.min(p.made, mode.n)} / ${mode.n}`]), ...moves]
        : [score, ...moves];
  return (
    <header className="space-y-1" data-testid="game-hud" data-mode={mode.kind}>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink">{p.eyebrow}</div>
      {mode.kind === "forever" ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="font-mono text-sm tabular-nums text-foreground">{stats.join(" · ")}</div>
          <div className="flex items-baseline gap-2" data-testid="hud-streak">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink">STREAK</span>
            <span className="font-display text-3xl font-semibold leading-none tabular-nums text-foreground">{p.streak.toLocaleString("en-US")}</span>
          </div>
        </div>
      ) : (
        <div className="font-mono text-sm tabular-nums text-foreground">{stats.join(" · ")}</div>
      )}
    </header>
  );
}
