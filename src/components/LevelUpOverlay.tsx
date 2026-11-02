import { X } from "lucide-react";
import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useApp } from "@/state/app-state";

function fireGoldConfetti() {
  const palette = ["#C9A84C", "#E8D08A", "#F5F0E8", "#FFFFFF"];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.45 }, colors: palette });
  setTimeout(
    () =>
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.5 },
        colors: palette,
      }),
    180,
  );
  setTimeout(
    () =>
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.5 },
        colors: palette,
      }),
    180,
  );
}

export function LevelUpOverlay() {
  const { state, dispatch } = useApp();
  const open = !!state.pendingLevelUp;
  useOverlayHistory(open, () => dispatch({ type: "DISMISS_LEVEL_UP" }));

  useEffect(() => {
    if (open) fireGoldConfetti();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-midnight/60 px-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-3xl border border-gold/50 bg-card/95 p-8 text-center shadow-luxe"
        style={{ animation: "cardPop 280ms cubic-bezier(.22,1,.36,1)" }}
      >
        <button
          type="button"
          aria-label="Close level celebration"
          onClick={() => dispatch({ type: "DISMISS_LEVEL_UP" })}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
          ✦ Level Up
        </div>
        <h2 className="mt-3 font-display text-4xl italic text-foreground">
          {state.pendingLevelUp}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          You've crossed into a new tier. Keep going — every word builds the next one.
        </p>
        <button
          onClick={() => dispatch({ type: "DISMISS_LEVEL_UP" })}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/15 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold/25"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
