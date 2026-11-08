import recordings from "@/data/picture-action-audio.json";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Backpack,
  Hammer,
  RotateCcw,
  Volume2,
  Wrench,
  HelpCircle,
  BookOpen,
  Package,
  HardHat,
  RectangleHorizontal,
} from "lucide-react";
import {
  pictureScenesForModule,
  basePictureModule,
  PICTURE_OBJECTS,
  pictureScene,
  sceneForModule,
  supportsPicturePair,
  acceptsPictureTarget,
  cleaningDistance,
  CLEANING_DISTANCE,
  canFinishAction,
  picturePreferences,
  type PictureChallenge,
  type SceneId,
  type InstructionMode,
  type PicturePreferences,
} from "@/lib/picture-action";
import type { Point } from "@/lib/place-directions-game";
const button =
  "rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";
const KEY = "lt.picture-action.settings.v1";
function ObjectIcon({ id }: { id: string }) {
  const icons: Record<string, typeof Hammer> = {
    hammer: Hammer,
    backpack: Backpack,
    helmet: HardHat,
    book: BookOpen,
    box: Package,
    tray: RectangleHorizontal,
  };
  const Icon = icons[id];
  if (id === "net")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <ellipse cx="19" cy="11" rx="10" ry="7" />
        <path d="M9 11l4 11h12l4-11M13 8l10 12M23 7L13 20M17 5v17M9 15L2 30" />
      </svg>
    );
  const emoji = PICTURE_OBJECTS[id]?.icon;
  if (emoji)
    return (
      <span className="text-3xl leading-none" aria-hidden="true">
        {emoji}
      </span>
    );
  if (Icon) return <Icon className="size-8" />;
  if (id === "towel")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="6" y="3" width="20" height="26" rx="3" />
        <path d="M10 3v26M6 22h20M6 25h20" />
      </svg>
    );
  if (id === "brush")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M11 14V9a5 5 0 0 1 10 0v5" />
        <rect x="4" y="14" width="24" height="8" rx="3" />
        <path d="M6 22v6m4-6v6m4-6v6m4-6v6m4-6v6m4-6v6" />
      </svg>
    );
  if (id === "cap")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M5 22C0 14 5 5 16 5s16 9 11 17zM6 22h20v5H6zM11 6l-2 13m12-13 2 13" />
      </svg>
    );
  if (id === "hat")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M7 20v-6a9 9 0 0 1 18 0v6M3 20c6-4 20-4 26 0v4H3z" />
        <path d="M12 7v11" />
      </svg>
    );
  if (id === "shoes")
    return (
      <svg
        className="size-8"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M3 5h7l2 5 9 4c6 0 8 3 8 6H3zm0 15h26v4H3zM8 25h20v4H8zM15 10l-3 3m7-1-3 3" />
      </svg>
    );
  return (
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
  );
}
export function PlaceDirectionsGame({
  initialRound = 0,
  moduleId = "place-directions",
  category = "",
  targetLanguage = "Spanish",
  nativeLanguage = "English",
}: {
  initialRound?: number;
  moduleId?: string;
  category?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
}) {
  const context = `${targetLanguage}:${nativeLanguage}:${moduleId}`;
  const [sceneId, setSceneId] = useState<SceneId>(() => sceneForModule(moduleId, category));
  const scene = pictureScene(sceneId);
  const availableScenes = pictureScenesForModule(moduleId);
  const [round, setRound] = useState(initialRound),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState<InstructionMode>("voice-text"),
    [rate, setRate] = useState(0.85);
  const c = scene.challenges[Math.max(0, Math.min(scene.challenges.length - 1, round))];
  const [position, setPosition] = useState<Point>(() => c.start),
    [picked, setPicked] = useState(false),
    [correct, setCorrect] = useState(false),
    [feedback, setFeedback] = useState(""),
    [help, setHelp] = useState(false),
    [demo, setDemo] = useState(false),
    [finished, setFinished] = useState(false),
    [score, setScore] = useState(0),
    [hadHelp, setHadHelp] = useState(false),
    [speechError, setSpeechError] = useState(""),
    [cleanProgress, setCleanProgress] = useState(0);
  const recordedAudio = useRef<HTMLAudioElement | null>(null);
  const [voiceGender, setVoiceGender] = useState("female");
  const [hasPlayed, setHasPlayed] = useState(false);
  const dragged = useRef(false);
  const board = useRef<HTMLDivElement>(null),
    start = useRef<Point | null>(null),
    previous = useRef<Point | null>(null),
    cleaned = useRef(0),
    audioStarted = useRef(false),
    settings = useRef<PicturePreferences>({ mode: "voice-text", rate: 0.85, scenes: {} }),
    heading = useRef<HTMLHeadingElement>(null);
  const supported =
      supportsPicturePair(targetLanguage, nativeLanguage) &&
      basePictureModule(moduleId) !== "japanese-basics",
    goal = scene.targets.find((t) => t.id === c.target)!,
    object = PICTURE_OBJECTS[c.object];
  const command = (x: PictureChallenge) => (targetLanguage === "English" ? x.en : x.es);
  const translation = targetLanguage === "English" ? c.es : c.en;
  useEffect(() => {
    let prefs = picturePreferences(null);
    try {
      prefs = picturePreferences(JSON.parse(localStorage.getItem(KEY) || "null"));
    } catch {
      /* Storage can be blocked. */
    }
    settings.current = prefs;
    setMode(prefs.mode);
    setRate(prefs.rate);
    const id =
        (pictureScenesForModule(moduleId).some((s) => s.id === prefs.scenes[context])
          ? prefs.scenes[context]
          : undefined) ?? sceneForModule(moduleId, category),
      s = pictureScene(id),
      n = Math.max(0, Math.min(s.challenges.length - 1, initialRound));
    setSceneId(id);
    recordedAudio.current?.pause();
    recordedAudio.current = null;
    setRound(n);
    setPosition(s.challenges[n].start);
    setReady(true);
    return () => {
      recordedAudio.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, [context, moduleId, category, initialRound]);
  function save(patch: Partial<PicturePreferences>) {
    settings.current = { ...settings.current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(settings.current));
    } catch {
      /* Optional preferences only. */
    }
  }
  function speak(x = c, speed = rate) {
    setSpeechError("");
    recordedAudio.current?.pause();
    window.speechSynthesis?.cancel();
    const clip = recordings.clips.find(
      (r) =>
        r.id === x.id &&
        r.language === (targetLanguage === "English" ? "en" : "es") &&
        r.gender === voiceGender &&
        r.text === command(x),
    );
    if (clip) {
      audioStarted.current = true;
      setHasPlayed(true);
      const audio = new Audio(clip.url);
      recordedAudio.current = audio;
      audio.playbackRate = speed;
      audio.preload = "auto";
      audio.onerror = () => {
        if (recordedAudio.current === audio)
          setSpeechError("Recording could not load. Check your connection and tap Replay.");
      };
      void audio.play().catch(() => {
        if (recordedAudio.current === audio)
          setSpeechError("Tap Replay to start the HD recording.");
      });
      return;
    }
    setSpeechError(
      "This command’s HD recording is not available yet. Choose Voice + text or Text only to continue.",
    );
  }

  function clear(x: PictureChallenge, n: number) {
    recordedAudio.current?.pause();
    recordedAudio.current = null;
    setRound(n);
    setPosition({ ...x.start });
    setPicked(false);
    setCorrect(false);
    setFeedback("");
    setHelp(false);
    setDemo(false);
    setHadHelp(false);
    setFinished(false);
    setSpeechError("");
    cleaned.current = 0;
    setCleanProgress(0);
    start.current = null;
    previous.current = null;
    window.speechSynthesis?.cancel();
  }
  function next() {
    if (round >= scene.challenges.length - 1) {
      recordedAudio.current?.pause();
      setFinished(true);
      window.speechSynthesis?.cancel();
      return;
    }
    const n = round + 1,
      x = scene.challenges[n];
    clear(x, n);
    if (mode !== "text" && audioStarted.current) speak(x);
    heading.current?.scrollIntoView({ block: "nearest" });
  }
  const advance = useRef(next);
  useEffect(() => {
    advance.current = next;
  });
  useEffect(() => {
    if (!correct || finished) return;
    const timer = window.setTimeout(() => advance.current(), 850);
    return () => window.clearTimeout(timer);
  }, [correct, finished, round, sceneId]);
  function switchScene(id: SceneId) {
    const s = pictureScene(id);
    setSceneId(id);
    setScore(0);
    clear(s.challenges[0], 0);
    save({ scenes: { ...settings.current.scenes, [context]: id } });
    if (mode !== "text" && audioStarted.current) speak(s.challenges[0]);
  }
  function switchMode(value: InstructionMode) {
    setMode(value);
    save({ mode: value });
    setSpeechError("");
    if (value === "text") {
      recordedAudio.current?.pause();
      recordedAudio.current = null;
      window.speechSynthesis?.cancel();
      audioStarted.current = false;
      setHasPlayed(false);
    } else speak();
  }
  function check(p: Point, pickup = picked, assisted = false) {
    setPosition(p);
    if (demo || correct) return;
    if (c.pickup && !pickup) {
      setFeedback("Pick up the object first, then place it.");
      return;
    }
    if (
      c.action === "clean" &&
      acceptsPictureTarget(scene, c.target, p) &&
      cleaned.current < CLEANING_DISTANCE
    ) {
      setFeedback("Move the brush back and forth in that area, or use Clean this area below.");
      return;
    }
    const ok = canFinishAction(scene, c, p, pickup, demo, cleaned.current);
    setCorrect(ok);
    setFeedback(
      ok
        ? `${c.action === "clean" ? "Cleaned" : "Correct placement"}: ${goal.en}.`
        : "Try again. Check the object and the reference point.",
    );
    if (ok && !hadHelp && !assisted) setScore((s) => s + 1);
  }
  function point(e: PointerEvent): Point {
    const b = board.current!.getBoundingClientRect();
    return {
      x: Math.min(0.96, Math.max(0.04, (e.clientX - b.left) / b.width)),
      y: Math.min(0.96, Math.max(0.04, (e.clientY - b.top) / b.height)),
    };
  }
  function down(e: PointerEvent<HTMLButtonElement>) {
    if (!ready || demo || correct) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragged.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    previous.current = position;
    setPicked(true);
    setFeedback(c.pickup ? "Picked up. Now place it." : "");
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current || demo || correct) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) <= 5) return;
    dragged.current = true;
    const p = point(e);
    if (c.action === "clean" && previous.current) {
      cleaned.current += cleaningDistance(scene, c.target, previous.current, p);
      setCleanProgress(Math.min(1, cleaned.current / CLEANING_DISTANCE));
    }
    previous.current = p;
    setPosition(p);
  }
  function up(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const moved =
      dragged.current || Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 5;
    start.current = null;
    previous.current = null;
    if (moved) check(point(e), true);
  }
  function show() {
    setHadHelp(true);
    setCorrect(false);
    setFeedback("");
    cleaned.current = 0;
    setCleanProgress(0);
    if (demo) {
      setDemo(false);
      setPosition({ ...c.start });
      setPicked(false);
    } else {
      setDemo(true);
      setPosition(goal.point);
    }
  }
  if (!supported)
    return (
      <section className="rounded-2xl border bg-card p-4" aria-label="Picture and action practice">
        <h2 className="font-display text-xl">Picture & Action</h2>
        <p className="mt-2">
          Scene practice is currently authored for Spanish with English support and English with
          Spanish support. Your selected language is preserved.
        </p>
      </section>
    );
  return (
    <section
      className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
      aria-label="Picture and action game"
      data-testid="place-game"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Picture & Action</h2>
        <span>
          {finished ? scene.challenges.length : round + 1} / {scene.challenges.length}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Scene
          <select
            className="mt-1 w-full rounded-xl border border-border bg-background p-3"
            disabled={!ready}
            value={sceneId}
            onChange={(e) => switchScene(e.target.value as SceneId)}
            data-testid="picture-scene"
          >
            {availableScenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Instructions
          <select
            className="mt-1 w-full rounded-xl border border-border bg-background p-3"
            disabled={!ready}
            value={mode}
            onChange={(e) => switchMode(e.target.value as InstructionMode)}
            data-testid="instruction-mode"
          >
            <option value="voice-text">Voice + text</option>
            <option value="voice">Voice only</option>
            <option value="text">Text only</option>
          </select>
        </label>
      </div>
      {finished ? (
        <div aria-label="Placement results" className="space-y-3">
          <h3 className="font-display text-2xl">Practice complete</h3>
          <p>
            {score} of {scene.challenges.length} actions completed without demonstrations or text
            help.
          </p>
          <button
            className={button}
            onClick={() => {
              setScore(0);
              clear(scene.challenges[0], 0);
            }}
          >
            Play again
          </button>
        </div>
      ) : (
        <>
          <h3
            ref={heading}
            tabIndex={-1}
            className="font-display text-2xl font-semibold sm:text-3xl"
            data-testid="placement-command"
          >
            {mode === "voice" ? "Listen and act." : command(c)}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {mode !== "text" && (
              <button className={button} disabled={!ready} onClick={() => speak()}>
                <Volume2 className="mr-2 inline size-4" />
                {hasPlayed ? "Replay" : "Listen"} · HD recording
              </button>
            )}
            <button
              className={button}
              disabled={!ready}
              onClick={() => {
                setHelp(!help);
                if (!help) setHadHelp(true);
              }}
              aria-expanded={help}
            >
              <HelpCircle className="mr-2 inline size-4" />
              {mode === "voice"
                ? "Show text help"
                : targetLanguage === "English"
                  ? "Spanish help"
                  : "English help"}
            </button>
          </div>
          {help && (
            <div className="rounded-xl border p-3">
              {mode === "voice" && <p>{command(c)}</p>}
              <p>{translation}</p>
            </div>
          )}
          {speechError && <p role="alert">{speechError}</p>}
          {mode !== "voice" && (
            <p className="text-sm">
              <strong>{targetLanguage === "English" ? object.en : object.es}</strong> ·{" "}
              {targetLanguage === "English" ? object.es : object.en}
              <span className="ml-3">
                {c.action === "clean"
                  ? "Clean / limpiar"
                  : c.action === "hang"
                    ? "Hang / colgar"
                    : c.pickup
                      ? "Pick up + place / levantar + poner"
                      : "Place / poner"}
              </span>
            </p>
          )}
          <p className="text-sm">
            {c.action === "clean"
              ? "Move the brush back and forth over the requested area. You can also select an area and tap Clean this area."
              : c.pickup
                ? "Pick it up, then move it: drag the object, or tap it and choose a destination below."
                : "Drag the object, or tap it and choose a destination below."}
          </p>
          <div
            ref={board}
            className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900"
            data-testid="placement-board"
          >
            <img
              src={`${scene.image}-hq.webp`}
              srcSet={`${scene.image}-mobile.webp 768w, ${scene.image}-hq.webp 1254w`}
              sizes="(max-width: 640px) calc(100vw - 64px), 624px"
              alt={scene.alt}
              className="absolute inset-0 size-full object-fill"
              draggable={false}
            />
            {sceneId === "workshop" && c.target === "under-tool" && (
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
              aria-label={`Pick up ${object.en}`}
              aria-pressed={picked}
              disabled={!ready || demo || correct}
              data-testid="movable-tool"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => {
                start.current = null;
                previous.current = null;
                setPicked(false);
              }}
              onClick={() => setPicked(true)}
              className={`absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-xl border-2 bg-slate-950/90 text-white shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-white ${picked ? "border-emerald-400" : "border-amber-400"}`}
              style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
            >
              <ObjectIcon id={c.object} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your viewpoint: front is closest to you; left and right are your left and right.
          </p>
          {c.action === "clean" && (
            <div
              role="progressbar"
              aria-label="Cleaning action"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(cleanProgress * 100)}
              className="h-2 overflow-hidden rounded bg-muted"
            >
              <div className="h-full bg-emerald-500" style={{ width: `${cleanProgress * 100}%` }} />
            </div>
          )}
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
            <button className={button} disabled={!ready || correct} onClick={show}>
              {demo ? "Your turn" : "Show me"}
            </button>
            <button
              className={button}
              disabled={!ready}
              onClick={() => {
                setScore(0);
                clear(scene.challenges[0], 0);
              }}
            >
              <RotateCcw className="mr-2 inline size-4" />
              Restart
            </button>
            {correct && (
              <span className="self-center text-sm text-emerald-500" role="status">
                {round === scene.challenges.length - 1 ? "Opening results…" : "Next command…"}
              </span>
            )}
          </div>
          <details>
            <summary className="cursor-pointer py-2 font-semibold">Act without dragging</summary>
            <p className="mb-2 text-sm">
              Pick up the object above, then choose a position. These English choices count as help.
            </p>
            <div className="flex flex-wrap gap-2">
              {scene.targets
                .filter((t) => t.id !== "under-tool" || c.target === "under-tool")
                .map((t) => (
                  <button
                    key={t.id}
                    className={button}
                    disabled={!picked || demo || correct}
                    onClick={() => {
                      setHadHelp(true);
                      check(t.point, picked, true);
                    }}
                    data-place={t.id}
                  >
                    {t.en}
                  </button>
                ))}
            </div>
            {c.action === "clean" && (
              <button
                className={`${button} mt-3`}
                disabled={!picked || demo || correct}
                onClick={() => {
                  setHadHelp(true);
                  cleaned.current = Math.min(
                    CLEANING_DISTANCE,
                    cleaned.current + CLEANING_DISTANCE / 3 + 0.0001,
                  );
                  setCleanProgress(cleaned.current / CLEANING_DISTANCE);
                  check(position, picked, true);
                }}
              >
                Clean this area · {Math.round(cleanProgress * 100)}%
              </button>
            )}
          </details>
        </>
      )}
      <details>
        <summary className="cursor-pointer py-2 text-sm font-semibold">
          Voice and practice settings
        </summary>
        <label className="mt-2 block text-sm">
          Voice
          <select
            className="ml-2 rounded-lg border bg-background p-2"
            value={voiceGender}
            onChange={(e) => {
              recordedAudio.current?.pause();
              setVoiceGender(e.target.value);
            }}
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label className="mt-2 block text-sm">
          Voice speed
          <select
            className="ml-2 rounded-lg border bg-background p-2"
            value={rate}
            disabled={!ready}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRate(value);
              save({ rate: value });
              if (mode !== "text") speak(c, value);
            }}
          >
            <option value={0.65}>Slower</option>
            <option value={0.85}>Steady</option>
            <option value={1}>Natural</option>
          </select>
        </label>
        <p className="mt-2 text-sm text-muted-foreground">
          Instructions use HD recordings. Scene and instruction preferences are remembered on this
          device. Practice results do not mark a lesson complete.
        </p>
        <a
          className="mt-2 inline-block text-sm underline"
          href="/downloads/picture-action-app-assets.zip"
          download
        >
          Download optimized app image pack
        </a>
      </details>
    </section>
  );
}
