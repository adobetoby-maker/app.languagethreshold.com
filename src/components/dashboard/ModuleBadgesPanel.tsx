import { Lock, Puzzle } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useSubscription } from "@/state/subscription-state";
import { getModule, MODULES } from "@/data/modules";
import { ladderProgress, getLadder } from "@/data/module-badges";

export function ModuleBadgesPanel() {
  const { state, dispatch } = useApp();
  const { status, teamActive } = useSubscription();
  const hasPlan = teamActive || status === "active" || status === "trialing";
  const activeModule = getModule(state.activeModuleId);
  const activeLadder = getLadder(state.activeModuleId);
  const progress = ladderProgress(state.activeModuleId, state.challengesCleared);

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
          <Puzzle className="h-5 w-5 text-gold-ink" strokeWidth={1.6} />
          Module Badges
        </h2>
        <span className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
          Climb the ladder of your active module
        </span>
      </div>

      {/* Active ladder */}
      {progress && activeModule && activeLadder ? (
        <div
          className="relative overflow-hidden rounded-2xl border p-6"
          style={{
            borderColor: `${activeLadder.accent}66`,
            background: "var(--card)",
            boxShadow: `0 0 40px -20px ${activeLadder.accent}80`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: `${activeLadder.accent}80`,
                  background: `${activeLadder.accent}1a`,
                  fontSize: 32,
                  lineHeight: 1,
                }}
                aria-hidden
              >
                {progress.current.emoji}
              </div>
              <div>
                <div className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                  {activeModule.emoji} {activeModule.name}
                </div>
                <div
                  className="mt-1 font-display text-2xl"
                  style={{ color: "var(--progress-accent-ink)" }}
                >
                  {progress.current.title}
                </div>
                <div className="mt-1 max-w-md text-xs text-muted-foreground">
                  {progress.current.blurb}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                Challenges Cleared
              </div>
              <div className="mt-1 font-display text-2xl text-foreground">{progress.cleared}</div>
              {progress.next ? (
                <div className="mt-1 font-sans text-xs uppercase tracking-wide text-muted-foreground">
                  {progress.toNext} to {progress.next.title}
                </div>
              ) : (
                <div className="mt-1 font-sans text-xs uppercase tracking-wide text-gold-ink">
                  Maxed ✦
                </div>
              )}
            </div>
          </div>

          {/* Progress bar to next rank */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${progress.pct}%`,
                background: `linear-gradient(90deg, ${activeLadder.accent}aa, ${activeLadder.accent})`,
                boxShadow: `0 0 12px ${activeLadder.accent}aa`,
              }}
            />
          </div>

          {/* Ladder grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {activeLadder.badges.map((b) => {
              const unlocked = progress.unlockedIds.includes(b.id);
              const isCurrent = b.id === progress.current.id;
              return (
                <div
                  key={b.id}
                  title={
                    unlocked
                      ? `${b.title} — ${b.blurb}`
                      : `Locked — clear ${b.threshold} challenges`
                  }
                  className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
                    isCurrent ? "shadow-gold" : unlocked ? "" : ""
                  }`}
                  style={{
                    borderColor: unlocked ? `${activeLadder.accent}80` : "var(--border)",
                    background: unlocked
                      ? `linear-gradient(160deg, ${activeLadder.accent}1f, transparent 70%)`
                      : undefined,
                  }}
                >
                  {isCurrent && (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${activeLadder.accent}, transparent)`,
                      }}
                    />
                  )}
                  <div className="flex items-start justify-between">
                    <span className="text-2xl leading-none" aria-hidden>
                      {unlocked ? b.emoji : "✦"}
                    </span>
                    {!unlocked && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
                    )}
                  </div>
                  <div
                    className={`mt-2 font-display text-sm leading-tight ${
                      unlocked ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {b.title}
                  </div>
                  <div className="mt-1 font-sans text-xs uppercase tracking-wide text-muted-foreground">
                    {b.threshold === 0 ? "Starter" : `${b.threshold} clears`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Activate a module from the top nav to start climbing its badge ladder.
        </div>
      )}

      {/* Other modules — show top rank as preview */}
      <div>
        <div className="mb-3 font-sans text-xs uppercase tracking-wide text-muted-foreground">
          Other Ladders
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.filter((m) => m.id !== state.activeModuleId).map((m) => {
            const ladder = getLadder(m.id);
            if (!ladder) return null;
            const owned = hasPlan || state.purchasedModules.includes(m.id);
            const top = ladder.badges[ladder.badges.length - 1];
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (owned) {
                    dispatch({ type: "SET_ACTIVE_MODULE", payload: m.id });
                  }
                }}
                disabled={!owned}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:border-gold/50 disabled:cursor-not-allowed disabled:border-dashed"
                style={{
                  background: owned
                    ? `linear-gradient(160deg, ${ladder.accent}10, transparent 70%)`
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                    {m.emoji} {m.name}
                  </div>
                  {!owned && (
                    <span className="rounded-full border border-gold/40 px-2 py-0.5 font-sans text-xs uppercase tracking-wider text-gold-ink">
                      Pro or Team
                    </span>
                  )}
                </div>
                <div
                  className="mt-2 font-display text-base"
                  style={{ color: "var(--progress-accent-ink)" }}
                >
                  Top rank · {top.emoji} {top.title}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {ladder.badges.map((b) => `${b.emoji} ${b.title}`).join("  →  ")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
