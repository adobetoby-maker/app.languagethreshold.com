import { useEffect, useRef, useState } from "react";
import { useMatch } from "@/state/match-state";
import { useDailyChallenge } from "@/state/daily-challenge-state";

// Match can launch from the shell before any game tab has been opened.
export function MatchChallengeBridge() {
  const [restored, setRestored] = useState(false);
  useEffect(() => setRestored(true), []);
  return restored ? <ObserveMatches /> : null;
}
function ObserveMatches() {
  const { matchesPlayed = 0 } = useMatch();
  const { recordCompletion } = useDailyChallenge();
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (previous.current !== null && matchesPlayed > previous.current) recordCompletion();
    previous.current = matchesPlayed;
  }, [matchesPlayed, recordCompletion]);
  return null;
}
