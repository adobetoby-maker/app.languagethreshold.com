import { Square, Volume2 } from "lucide-react";
import { useSpeech } from "@/state/speech-state";

export function MiniPlayer() {
  const { playing, current, stop } = useSpeech();
  if (!playing || !current) return null;

  const snippet = current.text.length > 60 ? current.text.slice(0, 57) + "…" : current.text;

  return (
    <div
      className="lt-miniplayer-above-nav fixed left-1/2 z-50 -translate-x-1/2"
      style={{ animation: "cardPop 220ms cubic-bezier(.22,1,.36,1)" }}
    >
      <div className="flex items-center gap-3 rounded-full border border-gold/50 bg-card/95 px-4 py-2 shadow-luxe backdrop-blur">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
        <Volume2 className="h-3.5 w-3.5 text-gold" />
        <span className="max-w-[60vw] truncate font-display text-sm italic text-foreground">
          Reading: {snippet}
        </span>
        <button
          onClick={stop}
          aria-label="Stop reading"
          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-foreground/80 transition-colors hover:border-destructive/60 hover:text-destructive"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
