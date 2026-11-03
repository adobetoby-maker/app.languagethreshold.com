import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SOUND_FAMILIES,
  SOUND_PRACTICE_VERSION,
  type SoundLesson,
} from "@/data/sound-like-a-native";
import {
  buildSoundPattern,
  readSoundPracticeRecord,
  selfTimedRate,
  type SoundPattern,
  type SoundPracticeRecord,
} from "@/lib/sound-practice-core";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { useSpeech } from "@/state/speech-state";
import { MouthMap } from "./MouthMap";

const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";
const primary = `${button} bg-gold text-background`;
const select =
  "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground";
type Run = {
  mode: "paced" | "timed";
  started: number;
  pace: number;
  signature: string;
  count: number;
};
type Finished = {
  mode: Run["mode"];
  elapsed: number;
  signature: string;
  count: number;
  checked: boolean;
};

export function SoundPractice({
  lesson,
  moduleId,
  lessonNumber,
  active,
}: {
  lesson: SoundLesson;
  moduleId: string;
  lessonNumber: number;
  active: boolean;
}) {
  const [familyId, setFamilyId] = useState(lesson.familyId);
  const family = SOUND_FAMILIES.find((f) => f.id === familyId) ?? SOUND_FAMILIES[0];
  const [pattern, setPattern] = useState<SoundPattern>("patter");
  const [shuffleSeed, setShuffleSeed] = useState(0);
  // A seed, rather than Math.random during render, keeps the server and hydration identical.
  const units = useMemo(() => {
    let seed = shuffleSeed + 1;
    return buildSoundPattern(family, pattern, () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    });
  }, [family, pattern, shuffleSeed]);
  const [mode, setMode] = useState<Run["mode"]>("paced");
  const [pace, setPace] = useState(60);
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState("Start slowly. Keep the vowel changes clear and relaxed.");
  const store = useLearnerDeviceStore(
    `sound-pattern:${SOUND_PRACTICE_VERSION}:Spanish:English:${moduleId}:${lessonNumber}`,
  );
  const [record, setRecord] = useState<SoundPracticeRecord>(() => readSoundPracticeRecord(null));
  const markedRef = useRef(false);
  const recordRef = useRef(record),
    flight = useRef<Run | null>(null);
  const { accent } = useSpeech();
  const locale = accent?.startsWith("es-") ? accent : "es-MX";
  const { speak, stop: stopAudio } = useOwnedPlayback(
    `${moduleId}:${lessonNumber}:${locale}:${active}`,
  );
  useEffect(() => {
    const next = readSoundPracticeRecord(store.read());
    recordRef.current = next;
    setRecord(next);
  }, [store]);
  const save = useCallback(
    (next: SoundPracticeRecord) => {
      recordRef.current = next;
      setRecord(next);
      store.write(next);
    },
    [store],
  );
  const stop = useCallback((message = "Run stopped. Practise slowly, then try again.") => {
    flight.current = null;
    setRun(null);
    setFinished(null);
    setElapsed(0);
    setStatus(message);
  }, []);
  const finish = useCallback(
    (current: Run, time: number) => {
      if (flight.current !== current) return;
      flight.current = null;
      setRun(null);
      setElapsed(time);
      setFinished({
        mode: current.mode,
        elapsed: time,
        signature: current.signature,
        count: current.count,
        checked: false,
      });
      save({ ...recordRef.current, completedRuns: recordRef.current.completedRuns + 1 });
      setStatus(
        current.mode === "timed"
          ? `Self-timed: ${(time / 1000).toFixed(1)} seconds for ${current.count} assigned units. Did you say all three repetitions clearly?`
          : "Cue run finished. How clear did your repetitions feel?",
      );
    },
    [save],
  );
  useEffect(() => {
    if (!active) {
      flight.current = null;
      setRun(null);
      setFinished(null);
      return;
    }
    if (!run) return;
    const tick = () => {
      const time = performance.now() - run.started;
      setElapsed(time);
      if (run.mode === "paced" && time >= (run.count * 60000) / run.pace) finish(run, time);
    };
    const id = window.setInterval(tick, 80);
    const visibility = () => {
      if (document.hidden) stop("Run paused because the page was hidden. Start again when ready.");
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [run, active, finish, stop]);
  useEffect(
    () => () => {
      flight.current = null;
    },
    [],
  );
  const start = () => {
    if (flight.current || !active) return;
    stopAudio();
    const current: Run = {
      mode,
      started: performance.now(),
      pace,
      count: units.length * (mode === "timed" ? 3 : 1),
      signature: JSON.stringify([family.id, pattern, units.map((u) => u.text)]),
    };
    markedRef.current = false;
    flight.current = current;
    setElapsed(0);
    setFinished(null);
    setRun(current);
    setStatus(
      mode === "timed"
        ? "Say the displayed row three times, then finish the timer."
        : "Say each highlighted unit aloud.",
    );
  };
  const markClear = () => {
    if (!finished || finished.checked || markedRef.current) return;
    markedRef.current = true;
    setFinished({ ...finished, checked: true });
    const next = {
      ...recordRef.current,
      selfCheckedRuns: recordRef.current.selfCheckedRuns + 1,
      best: { ...recordRef.current.best },
    };
    const rate = finished.mode === "timed" ? selfTimedRate(finished.count, finished.elapsed) : null;
    if (rate !== null) {
      next.best[finished.signature] = Math.max(next.best[finished.signature] ?? 0, rate);
      const entries = Object.entries(next.best);
      if (entries.length > 100) delete next.best[entries[0][0]];
    }
    save(next);
    setStatus(
      rate === null
        ? "You marked this run clear. Keep this pace, or choose a small increase."
        : `You marked this run clear: ${Math.round(rate)} assigned units/minute, self-timed. Best for this same pattern: ${Math.round(next.best[finished.signature])}. Speech was not automatically assessed.`,
    );
  };
  const current =
    run?.mode === "paced"
      ? Math.min(units.length - 1, Math.floor(elapsed / (60000 / run.pace)))
      : -1;
  const reset = () => stop("Pattern changed. Begin with a slow, clear run.");
  return (
    <div
      data-testid="sound-practice"
      className="mb-5 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div>
        <h3 className="font-serif text-2xl text-foreground">Sound lab · {lesson.title}</h3>
        <p className="mt-2 text-sm text-foreground">{lesson.coachingFocus}</p>
      </div>
      <label className="block text-sm font-semibold">
        Sound family
        <select
          aria-label="Sound family"
          value={family.id}
          disabled={!!run}
          onChange={(e) => {
            setFamilyId(e.target.value);
            reset();
          }}
          className={select}
        >
          {SOUND_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </label>
      {lesson.familyIds.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">This lesson’s families:</span>
          {lesson.familyIds.map((id) => {
            const item = SOUND_FAMILIES.find((f) => f.id === id);
            return item ? (
              <button
                key={id}
                type="button"
                disabled={!!run}
                aria-pressed={family.id === id}
                className={family.id === id ? primary : button}
                onClick={() => {
                  setFamilyId(id);
                  reset();
                }}
              >
                {item.title}
              </button>
            ) : null;
          })}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <MouthMap zone={family.coaching.zone} caption={family.coaching.contactOrNarrowing} />
        <div>
          <h4 className="text-base font-bold">Make the movement</h4>
          <dl className="mt-3 space-y-3 text-sm">
            {[
              ["Tongue and lips", family.coaching.tongueAndLips],
              ["Airflow", family.coaching.airflow],
              ["Voicing", family.coaching.voicing],
            ].map(([title, text]) => (
              <div key={title}>
                <dt className="font-semibold">{title}</dt>
                <dd className="mt-1">{text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
            <p className="font-bold">Try it aloud</p>
            <p className="mt-1">{family.coaching.speechExercise}</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{family.coaching.selfCheck}</p>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="font-serif text-xl">Pattern Sprint</h4>
        <p className="mt-1 text-sm">
          Practise consonant-linked vowels. Drill beats are a warm-up; return to natural rhythm in
          the reading.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            Game
            <select
              aria-label="Sound game"
              className={select}
              value={mode}
              disabled={!!run}
              onChange={(e) => {
                setMode(e.target.value as Run["mode"]);
                reset();
              }}
            >
              <option value="paced">Follow the cues</option>
              <option value="timed">Time my clear run · 3 repetitions</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Pattern
            <select
              aria-label="Sound pattern"
              className={select}
              value={pattern}
              disabled={!!run}
              onChange={(e) => {
                setPattern(e.target.value as SoundPattern);
                reset();
              }}
            >
              <option value="patter">Japanese-style order · a i u e o</option>
              <option value="switch">Switch back and forth</option>
              <option value="example">Repeat and switch · ka ki ki ke ko</option>
              <option value="reverse">Reverse the order</option>
              <option value="shuffle">Shuffle</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Units per minute
            <select
              aria-label="Sound pace"
              className={select}
              value={pace}
              disabled={!!run || mode === "timed"}
              onChange={(e) => {
                setPace(Number(e.target.value));
                reset();
              }}
            >
              {[60, 90, 120, 150].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div data-testid="sound-pattern-units" className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {units.map((u, i) => (
            <div
              key={`${u.text}:${i}`}
              aria-current={current === i ? "step" : undefined}
              className={`flex min-h-16 min-w-0 items-center justify-center rounded-xl border px-1 text-center font-serif text-xl sm:text-3xl ${current === i ? "border-foreground bg-gold text-background" : "border-border bg-background text-foreground"}`}
              lang="es"
            >
              {u.text}
            </div>
          ))}
        </div>
        {family.soundCues ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sound cue: {units.map((u) => u.cue).join(" · ")}. The row above uses Spanish spelling.
          </p>
        ) : null}
        <p className="mt-3 text-sm">Real-word anchors: {units.map((u) => u.anchor).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={!!run} onClick={start}>
            Start sound run
          </button>
          <button
            type="button"
            className={button}
            disabled={!!run}
            onClick={() => speak(units.map((unit) => unit.anchor).join(". "), locale)}
          >
            Hear word row
          </button>
          {mode === "timed" ? (
            <button
              type="button"
              className={button}
              disabled={!run || elapsed < 1000}
              onClick={() => {
                if (run) finish(run, performance.now() - run.started);
              }}
            >
              Finish spoken run
            </button>
          ) : null}
          <button type="button" className={button} disabled={!run} onClick={() => stop()}>
            Stop run
          </button>
          {pattern === "shuffle" ? (
            <button
              type="button"
              className={button}
              disabled={!!run}
              onClick={() => {
                setShuffleSeed((s) => s + 1);
                reset();
              }}
            >
              New pattern
            </button>
          ) : null}
        </div>
        {run?.mode === "timed" ? (
          <p className="mt-3 tabular-nums">Timer: {(elapsed / 1000).toFixed(1)} seconds</p>
        ) : null}
        <p data-testid="sound-run-status" role="status" className="mt-3 text-sm">
          {status}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            disabled={!finished || finished.checked}
            onClick={markClear}
          >
            I said this run clearly
          </button>
          <button
            type="button"
            className={button}
            disabled={!finished}
            onClick={() => {
              setPace((p) => (p === 150 ? 120 : p === 120 ? 90 : 60));
              stop("Take a slower, clear run. Start when ready.");
            }}
          >
            Retry more slowly
          </button>
        </div>
        <p data-testid="sound-run-record" className="mt-3 text-sm text-muted-foreground">
          {record.completedRuns} completed runs · {record.selfCheckedRuns} marked clear by you.
          Saved for this lesson and account on this device.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Timing and clarity marks are self-reported practice, not a pronunciation score. Increase
          speed only while the sounds stay clear.
        </p>
      </div>
      <details className="border-t border-border pt-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Apply the movement to words and phrases
        </summary>
        <div className="mt-2 space-y-2">
          {lesson.wordAnchors.map((w) => (
            <div
              key={w.target}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
            >
              <div>
                <span className="font-semibold" lang="es">
                  {w.target}
                </span>
                <span className="ml-2 text-muted-foreground">{w.native}</span>
              </div>
              <button
                type="button"
                className={button}
                onClick={() => speak(w.target, locale)}
                aria-label={`Hear ${w.target}`}
              >
                Hear word
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Read the passage below, then use one phrase in your own response. Word playback uses your
          selected app voice. Choose a Latin American voice for this track’s model; reviewed
          mouth-position recordings are not included.
        </p>
      </details>
      {lesson.regionalComparison ? (
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="font-semibold">Regional listening notes</p>
          <p className="mt-1">
            Use the reading and discussion prompts now. Reviewed clips comparing named regional
            speakers are not included, so this lesson does not present an accent-identification
            audio test.
          </p>
          {lesson.regionalNotes.map((note) => (
            <p className="mt-2" key={note}>
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
