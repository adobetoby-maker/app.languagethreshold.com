import { useSyncedStudyStreak } from "@/hooks/use-study-cloud";
import { Flame, Star, Medal } from "lucide-react";
import { useApp } from "@/state/app-state";
import { CountUp } from "./CountUp";

export function StatusBar() {
  const { state } = useApp();
  const syncedStreak=useSyncedStudyStreak();
  const fiery = syncedStreak > 1;

  return (
    <div className="border-b border-border/50 bg-card/40">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 overflow-x-auto px-4 py-2.5 sm:gap-8 sm:px-6 sm:py-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Streak */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Flame
            className={`h-3.5 w-3.5 ${fiery ? "text-gold" : "text-gold/80"}`}
            strokeWidth={1.8}
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            Streak
          </span>
          <span
            className={`font-mono text-xs ${
              fiery ? "font-bold text-gold" : "font-medium text-foreground"
            }`}
          >
            {syncedStreak}d
          </span>
        </div>
        <span className="h-3 w-px shrink-0 bg-border/70" />

        {/* XP */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Star className="h-3.5 w-3.5 text-gold/80" strokeWidth={1.8} />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            XP
          </span>
          <CountUp value={state.xp} className="font-mono text-xs font-medium text-foreground" />
        </div>
        <span className="h-3 w-px shrink-0 bg-border/70" />

        {/* Level */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Medal className="h-3.5 w-3.5 text-gold/80" strokeWidth={1.8} />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            Level
          </span>
          <span className="font-mono text-xs font-medium text-foreground">{state.tier}</span>
        </div>
      </div>
    </div>
  );
}
