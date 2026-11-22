import { useMemo } from "react";
import { Trophy, Flame, Target, Award } from "lucide-react";
import { useConjugation, type LeaderboardKey } from "@/state/conjugation-state";
import type { Language } from "@/state/app-state";
import type { ConjugationLevel } from "@/fns/conjugation.functions";

const LEVELS: ConjugationLevel[] = [1, 2, 3];

export function ConjugationLeaderboard({ language }: { language: Language }) {
  const conj = useConjugation();

  // Per-language rows for L1/L2/L3 + an aggregate "all levels" row.
  const rows = useMemo(() => {
    return LEVELS.map((level) => {
      const key: LeaderboardKey = `${language}-${level}` as LeaderboardKey;
      const stats = conj.state.leaderboard[key] ?? {
        bestStreak: 0,
        currentStreak: 0,
        perfectRuns: 0,
        totalCorrect: 0,
        totalAttempts: 0,
      };
      const accuracy =
        stats.totalAttempts === 0
          ? 0
          : Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
      return { level, ...stats, accuracy };
    });
  }, [conj.state.leaderboard, language]);

  // Cross-language ranking by best-streak so users can see how each tongue
  // compares — useful when picking which language to grind today.
  const crossLang = useMemo(() => {
    const langs: Language[] = [
      "Spanish",
      "French",
      "German",
      "Italian",
      "Japanese",
      "Korean",
      "Portuguese",
      "English",
    ];
    return langs
      .map((l) => {
        let best = 0;
        let perfect = 0;
        let attempts = 0;
        let correct = 0;
        for (const lvl of LEVELS) {
          const k = `${l}-${lvl}` as LeaderboardKey;
          const s = conj.state.leaderboard[k];
          if (!s) continue;
          best = Math.max(best, s.bestStreak);
          perfect += s.perfectRuns;
          attempts += s.totalAttempts;
          correct += s.totalCorrect;
        }
        return {
          language: l,
          bestStreak: best,
          perfectRuns: perfect,
          totalAttempts: attempts,
          accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
        };
      })
      .filter((r) => r.totalAttempts > 0)
      // A French or Italian learner's board names no Spanish row.
      .filter(
        (r) => !(r.language === "Spanish" && (language === "French" || language === "Italian")),
      )
      .sort((a, b) => b.bestStreak - a.bestStreak);
  }, [conj.state.leaderboard, language]);

  const hasAny = rows.some((r) => r.totalAttempts > 0);

  return (
    <div className="space-y-4">
      {/* Per-language, per-level table */}
      <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
          <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            Leaderboard · {language}
          </h3>
        </div>

        {!hasAny && (
          <p className="text-sm text-muted-foreground">
            No runs yet. Finish a 5-question run to populate the board.
          </p>
        )}

        {hasAny && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/40 [&>th]:py-2 [&>th]:font-normal [&>th]:uppercase [&>th]:tracking-[0.18em]">
                  <th>Level</th>
                  <th title="Longest correct-in-a-row, all-time">Best</th>
                  <th title="Current correct-in-a-row">Current</th>
                  <th title="Completed 5/5 runs">Perfect</th>
                  <th>Accuracy</th>
                  <th title="Total attempts">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.level}
                    className="border-b border-border/30 last:border-0 [&>td]:py-2.5"
                  >
                    <td className="text-foreground">L{r.level}</td>
                    <td className="text-foreground">
                      <Flame className="mr-1 inline h-3 w-3 text-gold" />
                      {r.bestStreak}
                    </td>
                    <td className={r.currentStreak >= 3 ? "text-gold" : "text-foreground/80"}>
                      {r.currentStreak}
                    </td>
                    <td className="text-foreground">
                      <Award className="mr-1 inline h-3 w-3 text-gold" />
                      {r.perfectRuns}
                    </td>
                    <td className="text-foreground/80">
                      <Target className="mr-1 inline h-3 w-3 text-emerald-400" />
                      {r.accuracy}%
                    </td>
                    <td className="text-muted-foreground">{r.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cross-language standings */}
      {crossLang.length > 1 && (
        <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            ◈ Across All Languages
          </div>
          <ol className="space-y-1">
            {crossLang.slice(0, 7).map((r, i) => (
              <li
                key={r.language}
                data-self={r.language === language}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-3 py-2 font-mono text-[11px] data-[self=true]:border-gold/50 data-[self=true]:bg-gold/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 text-muted-foreground">{i + 1}.</span>
                  <span className="text-foreground">{r.language}</span>
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    <Flame className="mr-1 inline h-3 w-3 text-gold" />
                    {r.bestStreak}
                  </span>
                  <span>
                    <Award className="mr-1 inline h-3 w-3 text-gold" />
                    {r.perfectRuns}
                  </span>
                  <span>{r.accuracy}%</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Achievement legend */}
      <div className="rounded-2xl border border-border/40 bg-card/20 p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Streak Rewards
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-4">
          <Badge label="Hot streak" threshold={3} icon="flame" />
          <Badge label="On fire" threshold={5} icon="flame" />
          <Badge label="Streaking" threshold={10} icon="zap" />
          <Badge label="Unstoppable" threshold={25} icon="trophy" />
        </div>
      </div>
    </div>
  );
}

function Badge({
  label,
  threshold,
  icon,
}: {
  label: string;
  threshold: number;
  icon: "flame" | "zap" | "trophy";
}) {
  const Icon = icon === "trophy" ? Trophy : icon === "zap" ? Award : Flame;
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/30 px-2 py-1.5">
      <Icon className="h-3 w-3 text-gold" />
      <span className="text-foreground/80">{label}</span>
      <span className="ml-auto font-mono text-[9px] text-muted-foreground">{threshold}+</span>
    </div>
  );
}
