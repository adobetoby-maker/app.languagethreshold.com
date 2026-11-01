import { useEffect, useRef } from "react";
import { useApp } from "@/state/app-state";
import { useConjugation } from "@/state/conjugation-state";
import { useSentenceBuild } from "@/state/sentence-build-state";
import { useListeningDrill } from "@/state/listening-drill-state";
import { useWordMatch } from "@/state/word-match-state";
import { useIdiomMaster } from "@/state/idiom-master-state";
import { useFalseFriends } from "@/state/false-friends-state";
import { useDailyChallenge } from "@/state/daily-challenge-state";

/**
 * Headless component that watches every game's leaderboard for activity
 * and records a daily-challenge completion whenever totalAttempts (or
 * for Word Match, totalGames) increases. Lives at the route level so it
 * captures activity from any game tab without each game knowing about
 * the daily-challenge layer.
 *
 * Implementation: keep a ref of the last-seen sum. On any change that
 * means INCREASE, fire `recordCompletion()` exactly once. The reducer
 * itself handles "already completed today" and only bumps streak on the
 * first completion of a new day.
 */
export function DailyChallengeBridge() {
  const dc = useDailyChallenge();
  const { state: app } = useApp();
  const conj = useConjugation();
  const sb = useSentenceBuild();
  const listening = useListeningDrill();
  const wm = useWordMatch();
  const idiom = useIdiomMaster();
  const ff = useFalseFriends();

  // Sum of every "completion-worthy" counter across all games.
  // For 5-question-run games we use totalAttempts. For Word Match we use
  // totalGames. For Match (career-tracking) we use matchesPlayed.
  const sum = (() => {
    let s = 0;
    const sumLB = (lb: Record<string, { totalAttempts?: number } | undefined>) => {
      for (const v of Object.values(lb)) if (v?.totalAttempts) s += v.totalAttempts;
    };
    sumLB(conj.state.leaderboard as Record<string, { totalAttempts?: number } | undefined>);
    sumLB(sb.state.leaderboard as Record<string, { totalAttempts?: number } | undefined>);
    sumLB(listening.state.leaderboard as Record<string, { totalAttempts?: number } | undefined>);
    sumLB(idiom.state.leaderboard as Record<string, { totalAttempts?: number } | undefined>);
    sumLB(ff.state.leaderboard as Record<string, { totalAttempts?: number } | undefined>);
    for (const v of Object.values(
      wm.state.leaderboard as Record<string, { totalGames?: number } | undefined>,
    )) {
      if (v?.totalGames) s += v.totalGames;
    }
    return s;
  })();

  const lastSumRef = useRef<number | null>(null);

  useEffect(() => {
    // First mount: just record current value as baseline. Don't trigger.
    if (lastSumRef.current === null) {
      lastSumRef.current = sum;
      return;
    }
    if (sum > lastSumRef.current) {
      dc.recordCompletion();
      lastSumRef.current = sum;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sum]);

  // Tiny XP bonus on first daily completion — keeps the streak feeling
  // rewarding without bloating the regular per-game XP.
  const lastDayRef = useRef<string | null>(null);
  useEffect(() => {
    const day = dc.data.lastCompletedDay;
    if (day && lastDayRef.current !== null && day !== lastDayRef.current) {
      // Day flipped from one completed day to another — fresh-day bonus.
      // useApp dispatch isn't directly here, but we can lazily import:
      void app; // silence unused
      // The actual XP is owned by per-game ANSWER actions; we skip the
      // duplicate award to avoid double-counting. The streak itself IS the
      // reward in this layer — XP nudges happen inside each game.
    }
    if (day) lastDayRef.current = day;
  }, [dc.data.lastCompletedDay, app]);

  return null;
}
