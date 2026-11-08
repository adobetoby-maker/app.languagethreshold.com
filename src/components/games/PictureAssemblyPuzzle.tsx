import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Volume2, RotateCcw } from "lucide-react";
import recordings from "@/data/picture-action-audio.json";
import { assemblyForModule, assemblySlot, assemblySlotPoint } from "@/lib/picture-assembly";
import { PICTURE_OBJECTS, type InstructionMode } from "@/lib/picture-action";
import { ObjectIcon } from "./PictureObjectIcon";
const button =
  "rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold disabled:opacity-50";
export function PictureAssemblyPuzzle({
  moduleId,
  targetLanguage,
  mode,
  rate,
  gender,
  onBack,
  autoPlay = false,
}: {
  moduleId: string;
  targetLanguage: string;
  mode: InstructionMode;
  rate: number;
  gender: string;
  onBack: () => void;
  autoPlay?: boolean;
}) {
  const puzzle = assemblyForModule(moduleId);
  const [placed, setPlaced] = useState<number[]>([]),
    [active, setActive] = useState(0),
    [message, setMessage] = useState(""),
    [help, setHelp] = useState(false),
    [point, setPoint] = useState({ x: 0.12, y: 0.9 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const board = useRef<HTMLDivElement>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    canSpeak = useRef(autoPlay),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    locked = useRef(false);
  const item = puzzle.items[active],
    word = PICTURE_OBJECTS[item.object],
    complete = placed.length === puzzle.items.length;
  const command = targetLanguage === "English" ? item.en : item.es;
  function speak(index = active) {
    audio.current?.pause();
    canSpeak.current = true;
    const entry = puzzle.items[index],
      clip = recordings.clips.find(
        (c) =>
          c.id === entry.id &&
          c.language === (targetLanguage === "English" ? "en" : "es") &&
          c.gender === gender,
      );
    if (!clip) {
      setMessage("This recording is unavailable. Use text help to continue.");
      return;
    }
    const player = new Audio(clip.url);
    audio.current = player;
    player.playbackRate = rate;
    player.onerror = () => {
      if (audio.current === player) setMessage("Recording could not load. Tap Replay.");
    };
    void player.play().catch(() => {
      if (audio.current === player) setMessage("Tap Replay to hear the command.");
    });
  }
  const latestSpeak = useRef(speak);
  useEffect(() => {
    latestSpeak.current = speak;
  });
  useEffect(() => {
    if (mode === "text") {
      audio.current?.pause();
      return;
    }
    if (canSpeak.current && !complete) latestSpeak.current(active);
  }, [active, complete, mode, rate, gender]);
  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function select(index: number) {
    if (placed.includes(index) || locked.current || complete) return;
    setActive(index);
    setPoint({ x: 0.12, y: 0.9 });
    setMessage("");
    setHelp(false);
  }
  function drop(slot: number | null) {
    if (locked.current || placed.includes(active) || complete) return;
    if (slot !== item.slot) {
      setPoint({ x: 0.12, y: 0.9 });
      setMessage("Try another compartment. Listen again or open text help.");
      return;
    }
    locked.current = true;
    const nextPlaced = [...placed, active];
    setPlaced(nextPlaced);
    setMessage("Correct. Your item stays in place.");
    audio.current?.pause();
    const next = puzzle.items.findIndex((_, i) => !nextPlaced.includes(i));
    if (next >= 0)
      timer.current = setTimeout(() => {
        locked.current = false;
        setActive(next);
        setPoint({ x: 0.12, y: 0.9 });
        setMessage("");
        setHelp(false);
      }, 850);
  }
  function pointerPoint(e: PointerEvent) {
    const r = board.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function restart() {
    if (timer.current) clearTimeout(timer.current);
    audio.current?.pause();
    locked.current = false;
    setPlaced([]);
    setActive(0);
    setPoint({ x: 0.12, y: 0.9 });
    setMessage("");
    setHelp(false);
    if (mode !== "text" && canSpeak.current) speak(0);
  }
  const image =
    puzzle.kind === "worktable" ? "worktable" : puzzle.kind === "backpack" ? "backpack" : "case";
  return (
    <section
      className="space-y-4"
      aria-label="Final packing challenge"
      data-testid="assembly-puzzle"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl">{puzzle.title}</h3>
        <span data-testid="assembly-count">
          {placed.length} / {puzzle.items.length}
        </span>
      </div>
      <p>Final challenge · Put all six items in their places. They stay where you put them.</p>
      {complete ? (
        <p
          role="status"
          className="text-lg font-semibold text-emerald-700 dark:text-emerald-300"
          data-testid="assembly-complete"
        >
          Everything is organized. Puzzle complete!
        </p>
      ) : (
        <>
          <h4 className="font-display text-xl" data-testid="assembly-command">
            {mode === "voice" && !help ? "Listen and pack." : command}
          </h4>
          <div className="flex flex-wrap gap-2">
            {mode !== "text" && (
              <button className={button} onClick={() => speak()}>
                <Volume2 className="mr-2 inline size-4" />
                Replay · HD recording
              </button>
            )}
            <button className={button} onClick={() => setHelp(!help)}>
              {help ? "Hide text help" : "Text help"}
            </button>
          </div>
          {help && <p>{targetLanguage === "English" ? item.es : item.en}</p>}
          <div className="flex flex-wrap gap-2" aria-label="Items to organize">
            {puzzle.items.map((entry, i) => (
              <button
                key={entry.id}
                className={`${button} ${active === i ? "border-amber-400" : ""}`}
                disabled={placed.includes(i)}
                aria-pressed={active === i}
                aria-label={`Choose ${PICTURE_OBJECTS[entry.object].en}`}
                onClick={() => select(i)}
              >
                <ObjectIcon id={entry.object} />
                <span className="mt-1 block">
                  {targetLanguage === "English"
                    ? PICTURE_OBJECTS[entry.object].en
                    : PICTURE_OBJECTS[entry.object].es}
                  {placed.includes(i) ? " ✓" : ""}
                </span>
              </button>
            ))}
          </div>
          <p className="text-sm">
            Drag the selected item, or tap an empty compartment. You can choose items in any order.
          </p>
        </>
      )}
      <div
        ref={board}
        className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950"
        data-testid="assembly-board"
      >
        <img
          src={`/images/picture-action/assembly-${image}-hq.webp`}
          srcSet={`/images/picture-action/assembly-${image}-mobile.webp 768w, /images/picture-action/assembly-${image}-hq.webp 1254w`}
          sizes="(max-width:640px) calc(100vw - 64px),624px"
          className="absolute inset-0 size-full"
          alt={
            puzzle.kind === "worktable"
              ? "Worktable with six empty organizer mats"
              : puzzle.kind === "backpack"
                ? "Open backpack with six organizer pockets"
                : "Open organizer case with six compartments"
          }
          draggable={false}
        />
        {puzzle.items.map((entry, i) => {
          const p = assemblySlotPoint(entry.slot),
            done = placed.includes(i);
          return (
            <button
              key={entry.id}
              aria-label={`Compartment ${entry.slot + 1}${done ? ", packed" : ""}`}
              data-testid={`assembly-slot-${entry.slot}`}
              className={`absolute flex h-[17%] w-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border ${done ? "border-emerald-400 bg-emerald-950/60" : "border-white/20 hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"}`}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              disabled={done || complete}
              onClick={() => drop(entry.slot)}
            >
              {done && <ObjectIcon id={entry.object} />}
            </button>
          );
        })}
        {!complete && !placed.includes(active) && (
          <button
            aria-label={`Drag ${word.en}`}
            data-testid="assembly-active-item"
            className="absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-xl border-2 border-amber-400 bg-slate-950 text-white"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            onPointerDown={(e) => {
              dragStart.current = pointerPoint(e);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) setPoint(pointerPoint(e));
            }}
            onPointerCancel={() => {
              dragStart.current = null;
              setPoint({ x: 0.12, y: 0.9 });
            }}
            onPointerUp={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              e.currentTarget.releasePointerCapture(e.pointerId);
              const p = pointerPoint(e),
                start = dragStart.current;
              dragStart.current = null;
              if (start && Math.hypot(p.x - start.x, p.y - start.y) > 0.02) drop(assemblySlot(p));
            }}
          >
            <ObjectIcon id={item.object} />
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" data-testid="assembly-feedback">
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={restart}>
          <RotateCcw className="mr-2 inline size-4" />
          Start puzzle again
        </button>
        <button className={button} onClick={onBack}>
          Back to commands
        </button>
      </div>
    </section>
  );
}
