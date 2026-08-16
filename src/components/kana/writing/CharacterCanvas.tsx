import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Undo2, Trash2 } from "lucide-react";
import { drawGridOnCanvas, renderGuideToCanvas, scoreDrawing, type ScoreResult } from "./scoring";

export const CANVAS_SIZE = 300;

// Apple Pencil / stylus pressure ranges 0..1. Mice (and some touch surfaces that don't
// report real pressure) send a constant 0 or 0.5 — treat those as "no pressure data"
// rather than letting them collapse every stroke to the same near-invisible width.
function pressureToWidth(pressure: number, baseWidth: number): number {
  if (!pressure || pressure === 0.5) return baseWidth;
  const min = baseWidth * 0.5;
  const max = baseWidth * 1.8;
  return Math.min(max, Math.max(min, min + pressure * (max - min)));
}

export interface CharacterCanvasRef {
  clear: () => void;
  undo: () => void;
  getScore: (char: string, rightHalfOnly?: boolean) => ScoreResult;
  hasStrokes: () => boolean;
  getCanvas: () => HTMLCanvasElement | null;
}

interface Props {
  guideChar?: string;
  guideAlpha?: number;
  rightGuideAlpha?: number;
  brushColor?: string;
  brushSize?: number;
  disabled?: boolean;
  onStrokeEnd?: () => void;
  maxSize?: number;
}

export const CharacterCanvas = forwardRef<CharacterCanvasRef, Props>(
  (
    {
      guideChar,
      guideAlpha = 0.12,
      rightGuideAlpha,
      brushColor = "#1a1a2e",
      brushSize = 4,
      disabled = false,
      onStrokeEnd,
      maxSize = 360,
    },
    ref,
  ) => {
    const guideRef = useRef<HTMLCanvasElement>(null);
    const drawRef = useRef<HTMLCanvasElement>(null);
    const strokeHistoryRef = useRef<ImageData[]>([]);
    const isDrawingRef = useRef(false);
    const pathRef = useRef<{ x: number; y: number }[]>([]);
    const sawPenRef = useRef(false);
    const activePointerIdRef = useRef<number | null>(null);

    // HiDPI: size both backing stores by devicePixelRatio so strokes and the guide
    // glyph stay crisp on a retina iPad. Must run before the guide-render effect below,
    // since resizing a canvas clears it. The guide layer's renderer already scales to
    // canvas.width itself (see scoring.ts) — only the draw layer needs its context
    // scaled, since its coordinate space (toCanvasPos) stays logical 0..CANVAS_SIZE.
    useEffect(() => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const guide = guideRef.current;
      if (guide) {
        guide.width = CANVAS_SIZE * dpr;
        guide.height = CANVAS_SIZE * dpr;
      }
      const draw = drawRef.current;
      if (draw) {
        draw.width = CANVAS_SIZE * dpr;
        draw.height = CANVAS_SIZE * dpr;
        const ctx = draw.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
      }
    }, []);

    useEffect(() => {
      const canvas = guideRef.current;
      if (!canvas) return;
      if (guideChar) {
        renderGuideToCanvas(canvas, guideChar, guideAlpha, rightGuideAlpha);
      } else {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGridOnCanvas(ctx, canvas.width);
      }
    }, [guideChar, guideAlpha, rightGuideAlpha]);

    // scoring.ts hardcodes a 300x300 pixel read via getImageData — it isn't aware of the
    // HiDPI-scaled backing store. Downsample to a plain CANVAS_SIZE x CANVAS_SIZE canvas
    // before handing anything to it, so scoring keeps working unchanged.
    const getNormalizedCanvas = useCallback((): HTMLCanvasElement | null => {
      const real = drawRef.current;
      if (!real) return null;
      if (real.width === CANVAS_SIZE && real.height === CANVAS_SIZE) return real;
      const off = document.createElement("canvas");
      off.width = CANVAS_SIZE;
      off.height = CANVAS_SIZE;
      const octx = off.getContext("2d");
      if (!octx) return real;
      octx.drawImage(real, 0, 0, real.width, real.height, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return off;
    }, []);

    const toCanvasPos = useCallback((clientX: number, clientY: number) => {
      const canvas = drawRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
        y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
      };
    }, []);

    const beginStroke = useCallback(
      (x: number, y: number, pressure: number) => {
        if (disabled) return;
        isDrawingRef.current = true;
        pathRef.current = [{ x, y }];
        const ctx = drawRef.current!.getContext("2d")!;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = pressureToWidth(pressure, brushSize);
        // Draw an immediate dot so a tap (no movement) still leaves a mark.
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
      },
      [disabled, brushColor, brushSize],
    );

    const extendStroke = useCallback(
      (x: number, y: number, pressure: number) => {
        if (!isDrawingRef.current) return;
        const path = pathRef.current;
        path.push({ x, y });
        const ctx = drawRef.current!.getContext("2d")!;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = pressureToWidth(pressure, brushSize);

        if (path.length >= 3) {
          const prev = path[path.length - 3];
          const mid = path[path.length - 2];
          const midX1 = (prev.x + mid.x) / 2;
          const midY1 = (prev.y + mid.y) / 2;
          const midX2 = (mid.x + x) / 2;
          const midY2 = (mid.y + y) / 2;
          ctx.beginPath();
          ctx.moveTo(midX1, midY1);
          ctx.quadraticCurveTo(mid.x, mid.y, midX2, midY2);
          ctx.stroke();
        } else {
          const prev = path[path.length - 2] ?? { x, y };
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      },
      [brushColor, brushSize],
    );

    const finishStroke = useCallback(() => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      pathRef.current = [];
      const canvas = drawRef.current!;
      const ctx = canvas.getContext("2d")!;
      strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      onStrokeEnd?.();
    }, [onStrokeEnd]);

    // Palm rejection: once a real pen contact has been seen on this canvas, ignore touch
    // events from then on — a resting palm must not draw. Devices with no pen never see a
    // "pen" pointerType, so finger drawing keeps working there.
    const shouldIgnorePointer = useCallback((e: React.PointerEvent) => {
      if (e.pointerType === "pen") {
        sawPenRef.current = true;
        return false;
      }
      if (e.pointerType === "touch" && sawPenRef.current) return true;
      return false;
    }, []);

    const onPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (disabled) return;
        if (isDrawingRef.current) return; // ignore a second simultaneous contact
        if (shouldIgnorePointer(e)) return;
        e.preventDefault();
        const canvas = drawRef.current;
        if (canvas) {
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            // pointer may already be gone — safe to ignore
          }
        }
        activePointerIdRef.current = e.pointerId;
        const p = toCanvasPos(e.clientX, e.clientY);
        beginStroke(p.x, p.y, e.pressure);
      },
      [disabled, shouldIgnorePointer, toCanvasPos, beginStroke],
    );

    const onPointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawingRef.current) return;
        if (e.pointerId !== activePointerIdRef.current) return;
        if (shouldIgnorePointer(e)) return;
        e.preventDefault();
        // Pencil reports far faster than the frame rate — draw every coalesced point so
        // fast strokes stay smooth instead of polygonal. getCoalescedEvents can return an
        // *empty* array (not just be missing) when there's nothing to coalesce, so `??`
        // alone isn't enough — fall back to the event itself whenever the list is empty.
        const native = e.nativeEvent;
        const coalesced = native.getCoalescedEvents?.();
        const events = coalesced && coalesced.length > 0 ? coalesced : [native];
        for (const ev of events) {
          const p = toCanvasPos(ev.clientX, ev.clientY);
          extendStroke(p.x, p.y, ev.pressure);
        }
      },
      [shouldIgnorePointer, toCanvasPos, extendStroke],
    );

    const onPointerEnd = useCallback(
      (e: React.PointerEvent) => {
        if (e.pointerId !== activePointerIdRef.current) return;
        e.preventDefault();
        const canvas = drawRef.current;
        if (canvas) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {
            // already released — safe to ignore
          }
        }
        activePointerIdRef.current = null;
        finishStroke();
      },
      [finishStroke],
    );

    useImperativeHandle(ref, () => ({
      clear: () => {
        const ctx = drawRef.current!.getContext("2d")!;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        strokeHistoryRef.current = [];
      },
      undo: () => {
        const history = strokeHistoryRef.current;
        history.pop();
        const ctx = drawRef.current!.getContext("2d")!;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        if (history.length > 0) {
          ctx.putImageData(history[history.length - 1], 0, 0);
        }
      },
      getScore: (char, rightHalfOnly = false) => {
        const normalized = getNormalizedCanvas();
        return scoreDrawing(normalized ?? drawRef.current!, char, { rightHalfOnly });
      },
      hasStrokes: () => strokeHistoryRef.current.length > 0,
      getCanvas: () => getNormalizedCanvas(),
    }));

    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-blue-200/40 shadow-sm"
          style={{ maxWidth: maxSize, aspectRatio: "1" }}
        >
          {/* Guide layer */}
          <canvas
            ref={guideRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0 w-full h-full"
            style={{ background: "#fafaf7" }}
          />
          {/* Drawing layer */}
          <canvas
            ref={drawRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="absolute inset-0 w-full h-full"
            style={{
              touchAction: "none",
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              background: "transparent",
              cursor: disabled ? "default" : "crosshair",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          />
        </div>

        {/* Controls */}
        {!disabled && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const history = strokeHistoryRef.current;
                history.pop();
                const ctx = drawRef.current!.getContext("2d")!;
                ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                if (history.length > 0) ctx.putImageData(history[history.length - 1], 0, 0);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold"
            >
              <Undo2 className="h-3 w-3" /> Undo
            </button>
            <button
              onClick={() => {
                const ctx = drawRef.current!.getContext("2d")!;
                ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                strokeHistoryRef.current = [];
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        )}
      </div>
    );
  },
);

CharacterCanvas.displayName = "CharacterCanvas";
