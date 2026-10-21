// Built by TAC — 2026-10-21
function clock(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function GameHud(p: {
  /** Rendered exactly as given. Callers pass it already uppercased (`.toUpperCase()`), e.g. `GAME · BUBBLE POP`. */
  eyebrow: string;
  score: number;
  streak: number;
  msLeft: number;
  movesLeft?: number;
}) {
  const stats = [
    `SCORE ${p.score.toLocaleString("en-US")}`,
    `STREAK ×${p.streak}`,
    clock(p.msLeft),
    ...(p.movesLeft === undefined ? [] : [`MOVES ${p.movesLeft}`]),
  ].join(" · ");
  return (
    <header className="space-y-1" data-testid="game-hud">
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">{p.eyebrow}</div>
      <div className="font-mono text-sm tabular-nums text-foreground">{stats}</div>
    </header>
  );
}
