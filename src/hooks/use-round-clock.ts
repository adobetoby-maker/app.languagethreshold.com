// Built by TAC — 2026-10-21
import { useEffect, useRef, useState } from "react";

/**
 * Round clock on requestAnimationFrame. `t` is active, visible milliseconds since the first active frame.
 * It holds its value while `active` is false or the tab is hidden (time spent hidden never counts) and
 * resumes from there; remount the screen to start a new round.
 *
 * `onTick(t)` runs every frame with the exact value. The returned `t` state updates every 100 ms so a
 * screen that only reads it does not re-render 60 times a second.
 */
export function useRoundClock(active: boolean, onTick: (t: number) => void): { t: number } {
  const [t, setT] = useState(0);
  const elapsed = useRef(0);
  const shown = useRef(0);
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    if (!active || typeof requestAnimationFrame !== "function") return;
    let raf = 0;
    let last: number | null = null;

    const frame = (now: number) => {
      if (last !== null) elapsed.current += now - last;
      last = now;
      tick.current(elapsed.current);
      const bucket = Math.floor(elapsed.current / 100);
      if (bucket !== shown.current) {
        shown.current = bucket;
        setT(elapsed.current);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      last = null;
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  return { t };
}
