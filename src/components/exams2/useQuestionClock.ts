// Built by TAC — 2026-10-23
import { useEffect, useState } from "react";
import { clockTone, secondsLeft } from "@/lib/exams2/timing";

/**
 * Counts down to a deadline fixed when the question appears: now + (limit - server-measured
 * elapsed). Re-reads Date.now() on every tick, so a throttled background tab catches up.
 */
export function useQuestionClock(limitMs: number, elapsedMs: number, reducedMotion: boolean) {
  const [deadline] = useState(() => Date.now() + Math.max(0, limitMs - elapsedMs));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, reducedMotion ? 250 : 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [reducedMotion]);
  const remaining = Math.max(0, deadline - now);
  return { remaining, seconds: secondsLeft(remaining), tone: clockTone(remaining) };
}
