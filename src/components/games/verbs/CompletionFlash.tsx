// Built by TAC — 2026-10-21
import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Completion } from "@/lib/verb-games/types";
import { createLongPress, isSaveKey } from "./long-press";
import { PIECE_COLORS } from "./piece-colors";

/**
 * "vengo · I come" while the caller shows a completion (about 1 s; the caller owns the timing).
 * Saving a card, three ways, all deduped to one save per completion: long-press (500 ms, primary button
 * only), right-click, or the "S" key while the flash is showing.
 */
export function CompletionFlash(p: { completion: Completion | null; onSaveCard: (c: Completion) => void }) {
  const reduced = useReducedMotion();
  const c = p.completion;
  const shown = useRef(c);
  const save = useRef(p.onSaveCard);
  shown.current = c;
  save.current = p.onSaveCard;
  const press = useMemo(() => createLongPress<Completion>((value) => save.current(value)), []);

  // A new or cleared completion ends any press that started on the previous one.
  const t = c?.t;
  useEffect(() => {
    press.cancel();
    return press.cancel;
  }, [t, press]);

  useEffect(() => {
    if (t === undefined) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isSaveKey(e) || !shown.current) return;
      e.preventDefault();
      press.save(shown.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t, press]);

  return (
    <div className="flex h-12 items-center justify-center" data-testid="completion-flash">
      {c ? (
        <div
          key={c.t}
          role="button"
          tabIndex={0}
          aria-label={`Save ${c.form}, ${c.english}, to Verb Cards (S)`}
          aria-keyshortcuts="S"
          title="Press S, or press and hold, to save this form to Verb Cards"
          onPointerDown={(e) => {
            if (e.button === 0) press.start(c);
          }}
          onPointerUp={press.cancel}
          onPointerLeave={press.cancel}
          onPointerCancel={press.cancel}
          onContextMenu={(e) => {
            e.preventDefault();
            press.cancel();
            press.save(c);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              press.save(c);
            }
          }}
          className={`cursor-pointer select-none rounded-full px-4 py-2 font-mono text-base font-semibold [-webkit-touch-callout:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
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
