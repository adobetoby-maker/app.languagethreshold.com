// Built by TAC — 2026-10-21
import { PIECE_COLORS } from "./PieceTile";

export function Legend() {
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground" data-testid="legend">
      <span aria-hidden="true" className="flex items-center gap-1">
        <span className="h-3 w-4 rounded-sm" style={{ backgroundColor: PIECE_COLORS.stem }} />
        <svg width="16" height="12" viewBox="0 0 16 12">
          <polygon points="4,0 16,0 16,12 4,12 0,6" fill={PIECE_COLORS.ending} />
        </svg>
        <span className="h-3 w-4 rounded-full" style={{ backgroundColor: PIECE_COLORS.whole }} />
      </span>
      <span>stem · ending / letters · whole form</span>
    </div>
  );
}
