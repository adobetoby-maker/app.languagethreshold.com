// Built by TAC — 2026-10-21
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Completion } from "@/lib/verb-games/types";
import { PIECE_COLORS } from "./PieceTile";

export const LONG_PRESS_MS = 500;

/** Timer behind long-press. Kept apart from React so it can be tested with fake timers. */
export function createLongPress(onFire: () => void, ms: number = LONG_PRESS_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const start = () => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      onFire();
    }, ms);
  };
  return { start, cancel };
}

/** "vengo · I come" for about a second after a completion. Long-press (500 ms) or right-click saves a card. */
export function CompletionFlash(p: { completion: Completion | null; onSaveCard: (c: Completion) => void }) {
  const reduced = useReducedMotion();
  const current = useRef(p.completion);
  const save = useRef(p.onSaveCard);
  current.current = p.completion;
  save.current = p.onSaveCard;
  const press = useMemo(
    () =>
      createLongPress(() => {
        if (current.current) save.current(current.current);
      }),
    [],
  );
  useEffect(() => press.cancel, [press]);

  const c = p.completion;
  return (
    <div className="flex h-12 items-center justify-center" data-testid="completion-flash">
      {c ? (
        <div
          key={c.t}
          title="Press and hold to save this form as a card"
          onPointerDown={press.start}
          onPointerUp={press.cancel}
          onPointerLeave={press.cancel}
          onPointerCancel={press.cancel}
          onContextMenu={(e) => {
            e.preventDefault();
            press.cancel();
            save.current(c);
          }}
          className={`cursor-pointer select-none rounded-full px-4 py-2 font-mono text-base font-semibold [-webkit-touch-callout:none] ${
            reduced ? "" : "animate-in fade-in duration-200"
          }`}
          style={{ backgroundColor: PIECE_COLORS.done, color: "#0a1220", touchAction: "manipulation" }}
        >
          {`${c.form} · ${c.english}`}
        </div>
      ) : null}
    </div>
  );
}
