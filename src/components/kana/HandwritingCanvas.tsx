import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Undo2, Trash2, Sparkle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  recognizeHandwriting,
  type HandwritingResult,
  type HandwritingLanguage,
} from "@/fns/handwriting-recognize.functions";
import { useApp, type Language } from "@/state/app-state";

// The recogniser only has hardcoded prompts for these languages (see
// handwriting-recognize.functions.ts). Anything else must not be sent —
// a confidently-wrong reading is worse than a visible "not available" state.
function isRecognizableLanguage(language: Language): language is HandwritingLanguage {
  return language === "Japanese" || language === "Chinese";
}

const CANVAS_SIZE = 400;
const BRUSH_COLOR = "#e8dcc8"; // warm off-white stroke on dark canvas
const BRUSH_SIZE = 6;

// Apple Pencil / stylus pressure ranges 0..1. Mice (and some touch surfaces that don't
// report real pressure) send a constant 0 or 0.5 — treat those as "no pressure data"
// rather than letting them collapse every stroke to the same near-invisible width.
function pressureToWidth(pressure: number, baseWidth: number): number {
  if (!pressure || pressure === 0.5) return baseWidth;
  const min = baseWidth * 0.5;
  const max = baseWidth * 1.8;
  return Math.min(max, Math.max(min, min + pressure * (max - min)));
}

interface Props {
  onRecognized: (text: string) => void;
  /** Label for the insert button in the result card.
   *  Defaults to "Use in Converter →" (Kana tab context).
   *  Pass a custom label (e.g. "Insert →") when embedding in a notes surface —
   *  doing so also clears the canvas automatically after insert so the user can
   *  draw the next character without a manual Clear step. */
  insertLabel?: string;
}

export function HandwritingCanvas({ onRecognized, insertLabel }: Props) {
  const { state } = useApp();
  const language = state.selectedLanguage;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokeHistoryRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const sawPenRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const recognize = useServerFn(recognizeHandwriting);

  const [hasStrokes, setHasStrokes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HandwritingResult | null>(null);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#12141a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Grid lines for character guidance
    ctx.strokeStyle = "rgba(201,168,76,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  // Initialize canvas: size the backing store for the device's pixel ratio so strokes
  // stay crisp on a retina iPad, then draw the background at logical coordinates.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawBackground(ctx);
  }, [drawBackground]);

  const getCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

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

  const startDraw = useCallback(
    (e: React.PointerEvent) => {
      if (isDrawingRef.current) return; // ignore a second simultaneous contact
      if (shouldIgnorePointer(e)) return;
      e.preventDefault();
      const canvas = canvasRef.current!;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // pointer may already be gone — safe to ignore
      }
      activePointerIdRef.current = e.pointerId;

      const ctx = canvas.getContext("2d")!;
      strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      isDrawingRef.current = true;

      const { x, y } = getCoords(e.clientX, e.clientY);
      lastPointRef.current = { x, y };
      ctx.strokeStyle = BRUSH_COLOR;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = pressureToWidth(e.pressure, BRUSH_SIZE);
      // Draw an immediate dot so a tap (no movement) still leaves a mark.
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasStrokes(true);
      setResult(null);
    },
    [getCoords, shouldIgnorePointer],
  );

  const draw = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (e.pointerId !== activePointerIdRef.current) return;
      if (shouldIgnorePointer(e)) return;
      e.preventDefault();
      const ctx = canvasRef.current!.getContext("2d")!;
      // Pencil reports far faster than the frame rate — draw every coalesced point so
      // fast strokes stay smooth instead of polygonal. getCoalescedEvents can return an
      // *empty* array (not just be missing) when there's nothing to coalesce, so `??`
      // alone isn't enough — fall back to the event itself whenever the list is empty.
      const native = e.nativeEvent;
      const coalesced = native.getCoalescedEvents?.();
      const events = coalesced && coalesced.length > 0 ? coalesced : [native];
      for (const ev of events) {
        const { x, y } = getCoords(ev.clientX, ev.clientY);
        const last = lastPointRef.current ?? { x, y };
        ctx.strokeStyle = BRUSH_COLOR;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = pressureToWidth(ev.pressure, BRUSH_SIZE);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastPointRef.current = { x, y };
      }
    },
    [getCoords, shouldIgnorePointer],
  );

  const endDraw = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // already released — safe to ignore
      }
    }
    activePointerIdRef.current = null;
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const undo = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const prev = strokeHistoryRef.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      setHasStrokes(strokeHistoryRef.current.length > 0);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    drawBackground(ctx);
    strokeHistoryRef.current = [];
    setHasStrokes(false);
    setResult(null);
  };

  const handleRecognize = async () => {
    // Guards the call site even though the UI below already hides this control
    // for unsupported languages — never let a stray call reach the recogniser
    // with a language it has no prompt for.
    if (!isRecognizableLanguage(language)) return;
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;

    setLoading(true);
    try {
      const res = await recognize({ data: { imageBase64: base64, language } });
      if (res.error) {
        toast.error(res.error);
      } else if (res.result) {
        setResult(res.result);
      }
    } catch {
      toast.error("Recognition failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecognizableLanguage(language)) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Handwriting recognition isn't available for {language} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Draw a {language === "Chinese" ? "Chinese character" : "kanji or kana character"} with
        your finger. AI will identify it.
      </p>

      {/* Canvas */}
      <div className="relative mx-auto w-full" style={{ maxWidth: CANVAS_SIZE, aspectRatio: "1" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full rounded-2xl border border-gold/20 cursor-crosshair"
          style={{
            touchAction: "none",
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!hasStrokes}
          className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground disabled:opacity-30"
        >
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button
          onClick={clear}
          disabled={!hasStrokes}
          className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
        <button
          onClick={handleRecognize}
          disabled={!hasStrokes || loading}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
        >
          {loading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Recognizing…
            </>
          ) : (
            <>
              <Sparkle className="h-3.5 w-3.5" /> Recognize
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl border border-gold/30 bg-gold/[0.04] p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            Recognized Character
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-gold/30 bg-card/60 px-5 py-3 text-center">
              <div className="font-display text-4xl leading-none">{result.text}</div>
              <div className="mt-1.5 font-mono text-xs text-gold">{result.reading}</div>
            </div>
            <div>
              <p className="text-base text-foreground">{result.meaning}</p>
              <button
                onClick={() => {
                  onRecognized(result.text);
                  if (insertLabel) {
                    clear();
                  } else {
                    toast("Character loaded into converter");
                  }
                }}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
              >
                {insertLabel ?? "Use in Converter →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
