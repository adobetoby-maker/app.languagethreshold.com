import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Backpack,
  Hammer,
  RotateCcw,
  Volume2,
  Wrench,
  Move,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import {
  CHALLENGES,
  PLACES,
  initialPosition,
  validPlacement,
  type Point,
} from "@/lib/place-directions-game";

const button =
  "rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";
export function PlaceDirectionsGame({ initialRound = 0 }: { initialRound?: number }) {
  const [round, setRound] = useState(Math.max(0, Math.min(CHALLENGES.length - 1, initialRound)));
  const c = CHALLENGES[round];
  const [position, setPosition] = useState<Point>(() => initialPosition(c.place));
  const [picked, setPicked] = useState(false),
    [feedback, setFeedback] = useState(""),
    [correct, setCorrect] = useState(false),
    [help, setHelp] = useState(false),
    [demo, setDemo] = useState(false),
    [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0),
    [hadHelp, setHadHelp] = useState(false),
    [speechError, setSpeechError] = useState("");
  const board = useRef<HTMLDivElement>(null),
    start = useRef<Point | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const goal = PLACES.find((p) => p.id === c.place)!;
  useEffect(
    () => () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );
  function reset(n: number) {
    setRound(n);
    setPosition(initialPosition(CHALLENGES[n].place));
    setPicked(false);
    setFeedback("");
    setCorrect(false);
    setDemo(false);
    setHelp(false);
    setHadHelp(false);
    setFinished(false);
    window.speechSynthesis?.cancel();
  }
  function check(p: Point, pickup = picked) {
    setPosition(p);
    if (demo || correct) return;
    if (c.pickup && !pickup) {
      setFeedback("Pick up the object first: tap it, then choose its destination.");
      return;
    }
    const ok = validPlacement(c.place, p, c.pickup, pickup, demo);
    setCorrect(ok);
    setFeedback(
      ok
        ? "Correct placement. " + goal.en + "."
        : "Try again. Check the reference object and its position.",
    );
    if (ok && !hadHelp) setScore((s) => s + 1);
  }
  function pointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (demo || correct) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setPicked(true);
    setFeedback(c.pickup ? "Picked up. Now place it in the requested position." : "");
  }
  function point(e: PointerEvent): Point {
    const b = board.current!.getBoundingClientRect();
    return {
      x: Math.min(0.96, Math.max(0.04, (e.clientX - b.left) / b.width)),
      y: Math.min(0.96, Math.max(0.04, (e.clientY - b.top) / b.height)),
    };
  }
  function pointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current || demo || correct) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 5)
      setPosition(point(e));
  }
  function pointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 5;
    start.current = null;
    if (moved) check(point(e), true);
  }
  function show() {
    setHadHelp(true);
    setCorrect(false);
    setFeedback("");
    if (demo) {
      setDemo(false);
      setPosition(initialPosition(c.place));
      setPicked(false);
    } else {
      setDemo(true);
      setPosition(goal.point);
    }
  }
  function listen() {
    if (!window.speechSynthesis) {
      setSpeechError(
        "Device speech is unavailable in this browser. The written command is available above.",
      );
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(c.es);
    u.lang = "es-MX";
    u.rate = 0.8;
    u.onerror = () =>
      setSpeechError("Device speech could not play. You can continue with the written command.");
    window.speechSynthesis.speak(u);
  }
  const Icon = c.tool === "hammer" ? Hammer : c.tool === "backpack" ? Backpack : Wrench;
  if (finished)
    return (
      <section
        className="rounded-2xl border border-border bg-card p-6"
        aria-label="Placement results"
      >
        <h2 className="font-display text-2xl">Practice complete</h2>
        <p className="my-3">
          {score} of {CHALLENGES.length} placements completed without a demonstration. This is
          practice, not a lesson mastery result.
        </p>
        <button
          className={button}
          onClick={() => {
            setScore(0);
            reset(0);
          }}
        >
          Play again
        </button>
      </section>
    );
  return (
    <section
      className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
      aria-label="Place the tool game"
      data-testid="place-game"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold">Place the tool</p>
        <span>
          {round + 1} / {CHALLENGES.length}
        </span>
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="font-display text-2xl font-semibold sm:text-3xl"
        data-testid="placement-command"
      >
        {c.es}
      </h2>
      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={listen}>
          <Volume2 className="mr-2 inline size-4" />
          Listen · device voice
        </button>
        <button className={button} onClick={() => setHelp(!help)} aria-expanded={help}>
          <HelpCircle className="mr-2 inline size-4" />
          English help
        </button>
      </div>
      {help && <p className="text-foreground">{c.en}</p>}
      {speechError && <p role="status">{speechError}</p>}
      <p className="text-sm">
        {c.pickup
          ? "Pick it up, then move it: drag the object, or tap it and choose a destination below."
          : "Drag the object, or tap it and choose a destination below."}
      </p>
      <div
        ref={board}
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900"
        data-testid="placement-board"
      >
        <img
          src="/images/place-directions/workshop.jpg"
          alt="Workshop viewed from the front: open toolbox on the left, table on the right, two cones in front, and a truck in the distance."
          className="absolute inset-0 size-full object-fill"
          draggable={false}
        />
        {c.place === "under-tool" && (
          <div
            className="pointer-events-none absolute z-20 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-amber-400 bg-slate-900/90 text-white"
            style={{ left: "63%", top: "40%" }}
            aria-label="Wrench reference object"
          >
            <Wrench className="size-8" />
          </div>
        )}
        <button
          type="button"
          aria-label={`Pick up ${c.tool}`}
          aria-pressed={picked}
          disabled={demo || correct}
          data-testid="movable-tool"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            start.current = null;
            setPosition(initialPosition(c.place));
            setPicked(false);
          }}
          onClick={() => {
            if (!demo && !correct) setPicked(true);
          }}
          className={`absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-xl border-2 bg-slate-950/90 text-white shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-white ${picked ? "border-emerald-400" : "border-amber-400"}`}
          style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
        >
          {c.tool === "screwdriver" ? (
            <svg
              className="size-8"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden="true"
            >
              <g transform="rotate(40 16 16)">
                <rect x="12" y="2" width="8" height="13" rx="3" fill="currentColor" />
                <path d="M16 15v11m-2 0h4l-1 4h-2z" />
              </g>
            </svg>
          ) : (
            <Icon className="size-8" />
          )}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Your viewpoint: front is closest to you. For “under the wrench,” the wrench is drawn above
        the movable tool.
      </p>
      <div
        role="status"
        aria-live="polite"
        data-testid="placement-feedback"
        className={
          correct ? "font-semibold text-emerald-600 dark:text-emerald-300" : "text-foreground"
        }
      >
        {demo ? "Demonstration — no point awarded. Tap Your turn to try it." : feedback}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={correct} onClick={show}>
          <Move className="mr-2 inline size-4" />
          {demo ? "Your turn" : "Show me"}
        </button>
        <button
          className={button}
          onClick={() => {
            setScore(0);
            reset(0);
          }}
        >
          <RotateCcw className="mr-2 inline size-4" />
          Restart
        </button>
        {correct && (
          <button
            className={`${button} border-emerald-500`}
            onClick={() => {
              if (round === CHALLENGES.length - 1) setFinished(true);
              else {
                reset(round + 1);
                heading.current?.scrollIntoView({ block: "nearest" });
              }
            }}
            data-testid="placement-next"
          >
            {round === CHALLENGES.length - 1 ? "See results" : "Next instruction"}
            <ArrowRight className="ml-2 inline size-4" />
          </button>
        )}
      </div>
      <details>
        <summary className="cursor-pointer py-2 font-semibold">Place without dragging</summary>
        <p className="mb-2 text-sm">
          Pick up the object above, then choose its position. English choices provide extra support.
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACES.filter((p) => p.id !== "under-tool" || c.place === "under-tool").map((p) => (
            <button
              key={p.id}
              className={button}
              disabled={!picked || demo || correct}
              onClick={() => check(p.point)}
              data-place={p.id}
            >
              {p.en}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
