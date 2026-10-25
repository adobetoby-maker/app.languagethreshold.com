// Built by TAC — 2026-10-15
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fitWriting, writingFrame, writingPoint, type InkPoint, type WritingSize, type WritingView } from "@/lib/handwriting-layout";

// A pen, finger and mouse drawing pad for writing a word or short phrase in any script.
// Ink is kept as strokes (not pixels), so Undo is exact, the pad redraws crisply at any
// pixel ratio, and the same strokes can be exported as a clean black-on-white PNG for
// reading. Built on the same pointer-event approach as kana/HandwritingCanvas.tsx.

export interface HandwritingPadHandle {
  clear: () => void;
  undo: () => void;
  hasInk: () => boolean;
  /**
   * The ink as black strokes on white, cropped to the writing, as base64 PNG without the
   * data-URL prefix (null when the pad is empty). Pass `{ crop: false }` for the full pad.
   */
  toPngBase64: (options?: { crop?: boolean }) => string | null;
}

export interface HandwritingPadProps {
  /** Faint guide drawn on the pad for the learner to trace over or write beside. */
  guideText?: string;
  /** Called when the pad goes from blank to inked or back. */
  onChange?: (hasInk: boolean) => void;
  /** Ignore new ink and disable Undo and Clear. */
  disabled?: boolean;
  /** Accessible name for the drawing surface. */
  label?: string;
  className?: string;
}

type Stroke = InkPoint[];

const PAPER = "#FAF8F3";
const INK = "#1a1a2e";
const BASE_WIDTH = 3.4;
const BASELINE = 0.72;
const TOPLINE = 0.3;
const EXPORT_PAD = 14;
const EXPORT_MIN = { w: 140, h: 72 };
const EXPORT_MAX_SIDE = 1100;

function widthFor(event: { pointerType: string; pressure: number }): number {
  // Mice report 0 or 0.5 and some touch screens a constant; only a pen's pressure is trusted.
  if (event.pointerType === "pen" && event.pressure > 0) {
    return BASE_WIDTH * (0.55 + event.pressure * 1.1);
  }
  return BASE_WIDTH;
}

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  scale: number,
  color: string,
  minWidth: number,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const p = stroke[0];
      ctx.beginPath();
      ctx.arc(p.x * scale, p.y * scale, Math.max(minWidth, p.w * scale) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    for (let i = 1; i < stroke.length; i += 1) {
      const prev = stroke[i - 1];
      const cur = stroke[i];
      const next = stroke[i + 1];
      const startX = i === 1 ? prev.x : (prev.x + cur.x) / 2;
      const startY = i === 1 ? prev.y : (prev.y + cur.y) / 2;
      const endX = next ? (cur.x + next.x) / 2 : cur.x;
      const endY = next ? (cur.y + next.y) / 2 : cur.y;
      ctx.lineWidth = Math.max(minWidth, cur.w * scale);
      ctx.beginPath();
      ctx.moveTo(startX * scale, startY * scale);
      ctx.quadraticCurveTo(cur.x * scale, cur.y * scale, endX * scale, endY * scale);
      ctx.stroke();
    }
  }
}

function drawPaper(ctx: CanvasRenderingContext2D, w: number, h: number, guideText?: string) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(160,130,70,0.28)";
  ctx.beginPath();
  ctx.moveTo(12, h * TOPLINE);
  ctx.lineTo(w - 12, h * TOPLINE);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(160,130,70,0.55)";
  ctx.beginPath();
  ctx.moveTo(12, h * BASELINE);
  ctx.lineTo(w - 12, h * BASELINE);
  ctx.stroke();

  if (guideText) {
    const family = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
    let size = h * 0.5;
    ctx.font = `700 ${size}px ${family}`;
    const measured = ctx.measureText(guideText).width;
    const room = w - 32;
    if (measured > room) {
      size = Math.max(14, (size * room) / measured);
      ctx.font = `700 ${size}px ${family}`;
    }
    ctx.fillStyle = "rgba(150,105,25,0.22)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(guideText, w / 2, h * BASELINE, room);
    ctx.textAlign = "start";
  }
}

export const HandwritingPad = forwardRef<HandwritingPadHandle, HandwritingPadProps>(
  function HandwritingPad(
    { guideText, onChange, disabled = false, label = "Handwriting pad", className },
    ref,
  ) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const sizeRef = useRef({ w: 0, h: 0 });
    const writingSizeRef = useRef<WritingSize>({ w: 0, h: 0 });
    const viewRef = useRef<WritingView>({ scale: 1, x: 0, y: 0 });
    const activePointer = useRef<number | null>(null);
    const sawPen = useRef(false);
    const onChangeRef = useRef(onChange);
    const guideRef = useRef(guideText);
    const [hasInk, setHasInk] = useState(false);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w, h);
      const view = viewRef.current;
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      drawPaper(ctx, writingSizeRef.current.w, writingSizeRef.current.h, guideRef.current);
      drawStrokes(ctx, strokesRef.current, 1, INK, 1 / view.scale);
      ctx.restore();
    }, []);

    // The parent is told outside any state updater: calling its setState from inside this
    // component's updater is what raised "Cannot update a component while rendering another".
    const hasInkRef = useRef(false);
    const syncInk = useCallback((next: boolean) => {
      if (hasInkRef.current === next) return;
      hasInkRef.current = next;
      setHasInk(next);
      onChangeRef.current?.(next);
    }, []);

    // Size the backing store to the box and the device pixel ratio, then redraw.
    useEffect(() => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const fit = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (w === 0 || h === 0) return;
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        // Never rescale the stored points: repeated rotations must not shrink or
        // distort the ink, and recognition must export the same original writing.
        if (strokesRef.current.length === 0) writingSizeRef.current = { w, h };
        viewRef.current = fitWriting(writingFrame(writingSizeRef.current, strokesRef.current), { w, h });
        if (w !== sizeRef.current.w || h !== sizeRef.current.h) activePointer.current = null;
        sizeRef.current = { w, h };
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        render();
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(wrap);
      return () => observer.disconnect();
    }, [render]);

    useEffect(() => {
      guideRef.current = guideText;
      render();
    }, [guideText, render]);

    const clear = useCallback(() => {
      strokesRef.current = [];
      activePointer.current = null;
      writingSizeRef.current = { ...sizeRef.current };
      viewRef.current = { scale: 1, x: 0, y: 0 };
      render();
      syncInk(false);
    }, [render, syncInk]);

    const undo = useCallback(() => {
      strokesRef.current = strokesRef.current.slice(0, -1);
      activePointer.current = null;
      render();
      syncInk(strokesRef.current.length > 0);
    }, [render, syncInk]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        undo,
        hasInk: () => strokesRef.current.length > 0,
        toPngBase64: (options) => {
          const strokes = strokesRef.current;
          if (strokes.length === 0) return null;
          let box = writingFrame(writingSizeRef.current, strokes);
          if (options?.crop !== false) {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const stroke of strokes) {
              for (const p of stroke) {
                minX = Math.min(minX, p.x - p.w);
                minY = Math.min(minY, p.y - p.w);
                maxX = Math.max(maxX, p.x + p.w);
                maxY = Math.max(maxY, p.y + p.w);
              }
            }
            const cw = Math.max(EXPORT_MIN.w, maxX - minX + EXPORT_PAD * 2);
            const ch = Math.max(EXPORT_MIN.h, maxY - minY + EXPORT_PAD * 2);
            box = { x: (minX + maxX) / 2 - cw / 2, y: (minY + maxY) / 2 - ch / 2, w: cw, h: ch };
          }
          const scale = Math.min(2, EXPORT_MAX_SIDE / Math.max(box.w, box.h));
          const out = document.createElement("canvas");
          out.width = Math.max(1, Math.round(box.w * scale));
          out.height = Math.max(1, Math.round(box.h * scale));
          const ctx = out.getContext("2d");
          if (!ctx) return null;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, out.width, out.height);
          ctx.translate(-box.x * scale, -box.y * scale);
          drawStrokes(ctx, strokes, scale, "#111111", 3);
          return out.toDataURL("image/png").split(",")[1] ?? null;
        },
      }),
      [clear, undo],
    );

    const pointAt = (event: ReactPointerEvent<HTMLCanvasElement>, source: PointerEvent): InkPoint => {
      const rect = event.currentTarget.getBoundingClientRect();
      return writingPoint({
        x: Math.max(0, Math.min(rect.width, source.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, source.clientY - rect.top)),
        w: widthFor(source),
      }, viewRef.current);
    };

    // Palm rejection: once a pen has touched this pad, finger contacts are ignored so a
    // resting hand cannot draw. Devices with no pen never report "pen", so fingers still work.
    const ignored = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === "pen") {
        sawPen.current = true;
        return false;
      }
      return event.pointerType === "touch" && sawPen.current;
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled || activePointer.current !== null || ignored(event)) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone.
      }
      activePointer.current = event.pointerId;
      strokesRef.current = [...strokesRef.current, [pointAt(event, event.nativeEvent)]];
      render();
      syncInk(true);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (activePointer.current !== event.pointerId) return;
      event.preventDefault();
      const stroke = strokesRef.current[strokesRef.current.length - 1];
      if (!stroke) return;
      // A pencil reports faster than the frame rate; keep every coalesced point.
      const coalesced = event.nativeEvent.getCoalescedEvents?.();
      const events = coalesced && coalesced.length > 0 ? coalesced : [event.nativeEvent];
      for (const source of events) {
        const point = pointAt(event, source);
        const last = stroke[stroke.length - 1];
        if (last && Math.hypot(point.x - last.x, point.y - last.y) * viewRef.current.scale < 0.8) continue;
        stroke.push(point);
      }
      render();
    };

    const onPointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (activePointer.current !== event.pointerId) return;
      event.preventDefault();
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
      activePointer.current = null;
    };

    const toolBtn =
      "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-card/30 px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-gold/40 hover:bg-gold/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";

    return (
      <div className={cn("space-y-2", className)} data-testid="handwriting-pad">
        <div
          ref={wrapRef}
          className="relative h-44 w-full overflow-hidden rounded-xl border border-gold/30 sm:h-52"
          style={{ backgroundColor: PAPER, touchAction: "none", overscrollBehavior: "none" }}
        >
          <canvas
            ref={canvasRef}
            data-testid="handwriting-canvas"
            data-ink={hasInk ? "true" : "false"}
            role="img"
            aria-label={`${label}. Write with a finger, a pencil or a mouse.`}
            className={cn(
              "absolute inset-0 block h-full w-full select-none",
              disabled ? "cursor-not-allowed" : "cursor-crosshair",
            )}
            style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
            onContextMenu={(event) => event.preventDefault()}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={disabled || !hasInk}
            className={cn(toolBtn, "flex-1")}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Undo
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={disabled || !hasInk}
            className={cn(toolBtn, "flex-1")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>
    );
  },
);
