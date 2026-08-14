import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useApp } from "@/state/app-state";
import { getTourScript, type TourStep } from "@/data/tour-scripts";
import { cn } from "@/lib/utils";
import { dismissLearningHint } from "@/lib/learning-guidance";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8; // px padding around highlighted element

export function ActionHint({
  storageKey,
  children,
  className = "",
}: {
  storageKey: string;
  children: ReactNode;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onDismiss = (event: Event) => {
      if ((event as CustomEvent<string>).detail === storageKey) setDismissed(true);
    };
    window.addEventListener("lt:dismiss-learning-hint", onDismiss);
    return () => window.removeEventListener("lt:dismiss-learning-hint", onDismiss);
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 ${className}`}
    >
      <span className="text-sky-600 dark:text-sky-300" aria-hidden>
        ✦
      </span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/85">{children}</div>
      <button
        type="button"
        onClick={() => dismissLearningHint(storageKey)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/60 hover:text-foreground"
        aria-label="Dismiss guidance"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

export function AppTour({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { w, h } = useWindowSize();

  const steps = getTourScript(state.activeModuleId);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;

  // Resolve the target rect whenever step or window changes
  useLayoutEffect(() => {
    const r = getTargetRect(step.target);
    setRect(r);
  }, [step.target, w, h]);

  function goTo(i: number) {
    setStepIndex(Math.max(0, Math.min(steps.length - 1, i)));
  }

  function navigate() {
    if (step.tabKey) {
      dispatch({ type: "SET_TAB", payload: step.tabKey });
    }
    onClose();
  }

  // Card positioning: try right of target, fall back to left, then below
  // iOS PWA renders under the Dynamic Island. Absolutely-positioned tour cards are
  // placed in raw viewport coordinates, so the top floor must clear the inset —
  // padding on the parent cannot help them.
  const safeTop =
    typeof window !== "undefined"
      ? parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--lt-safe-top-px"),
        ) || 0
      : 0;
  const topFloor = safeTop + 8;

  const cardPos = (() => {
    if (!rect) return { top: h / 2 - 100, left: w / 2 - 150 };
    const cardW = Math.min(300, w - 32);
    const cardH = 220;
    const rightSpace = w - (rect.left + rect.width);
    const leftSpace = rect.left;

    if (rightSpace >= cardW + 16) {
      // Right of target
      return {
        top: Math.max(topFloor, Math.min(h - cardH - 8, rect.top + rect.height / 2 - cardH / 2)),
        left: rect.left + rect.width + 12,
      };
    }
    if (leftSpace >= cardW + 16) {
      // Left of target
      return {
        top: Math.max(topFloor, Math.min(h - cardH - 8, rect.top + rect.height / 2 - cardH / 2)),
        left: rect.left - cardW - 12,
      };
    }
    // Below target
    return {
      top: Math.max(topFloor, Math.min(h - cardH - 8, rect.top + rect.height + 12)),
      left: Math.max(8, Math.min(w - cardW - 8, rect.left + rect.width / 2 - cardW / 2)),
    };
  })();

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal>
      {/* Backdrop with spotlight cutout */}
      <div
        className="absolute inset-0 bg-midnight/80 transition-all duration-300"
        style={
          rect
            ? {
                WebkitMaskImage: `radial-gradient(ellipse ${rect.width}px ${rect.height}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 99%, black 100%)`,
                maskImage: `radial-gradient(ellipse ${rect.width}px ${rect.height}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 99%, black 100%)`,
              }
            : undefined
        }
        onClick={onClose}
      />

      {/* Highlight ring around target */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 2px rgba(212,175,55,0.8), 0 0 20px 4px rgba(212,175,55,0.25)",
            borderRadius: 12,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="absolute z-10 w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-gold/30 bg-card/98 p-5 shadow-luxe backdrop-blur-xl"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Step counter */}
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold/60 mb-2">
          Step {stepIndex + 1} of {steps.length}
        </p>

        <h3 className="font-display text-sm font-semibold text-foreground leading-snug mb-2">
          {step.title}
        </h3>
        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed mb-4">
          {step.body}
        </p>

        {/* CTA */}
        {step.tabKey && (
          <button
            onClick={navigate}
            className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-gold transition-colors hover:bg-gold/20"
          >
            {step.cta ?? "Go there"}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}

        {/* Prev / Next */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goTo(stepIndex - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === stepIndex ? "w-4 bg-gold" : "w-1.5 bg-border/60 hover:bg-border",
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-gold transition-colors hover:bg-gold/20"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => goTo(stepIndex + 1)}
              className="flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile fallback: if no sidebar visible, show step at bottom */}
      {!rect && (
        <div className="absolute bottom-24 inset-x-4 rounded-2xl border border-gold/30 bg-card/98 p-5 shadow-luxe">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold/60 mb-2">
            Step {stepIndex + 1} of {steps.length} · {step.title}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground leading-relaxed mb-3">
            {step.body}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              className="flex-1 rounded-lg border border-border/60 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground disabled:opacity-30"
            >
              ← Prev
            </button>
            {isLast ? (
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gold/40 bg-gold/10 py-2 font-mono text-[10px] uppercase tracking-widest text-gold"
              >
                Done
              </button>
            ) : (
              <button
                onClick={() => goTo(stepIndex + 1)}
                className="flex-1 rounded-lg border border-border/60 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
