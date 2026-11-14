import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { V6Header, V6Dock } from "./V6AppChrome";
import { FOUNDATION_ROOFING_LESSONS } from "@/data/foundation-roofing-curriculum";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Moon, Play, Sun } from "lucide-react";
import {
  LESSON_MODES,
  LessonModeBar,
  LessonWorkspaceHeader,
  type LessonModeId,
} from "./LessonWorkspaceChrome";

type Word = { es: string; en: string; kind?: string };
type DemoLesson = { passage: { title: string; target: string[]; native: string[] }; words: Word[] };
const DEMO_LESSON = FOUNDATION_ROOFING_LESSONS[0];
const LESSON_LINK =
  "/?tab=core30&module=foundation-roofing&target=Spanish&native=English&lesson=1&way=see";
const buttonClass =
  "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

/** A public, temporary layout preview. No account, progress store, or AI requests. */
export function LessonWorkspaceDemo() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSpeak, setShowSpeak] = useState(true);
  const [lesson, setLesson] = useState<DemoLesson | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState<LessonModeId>("see");
  const [opened, setOpened] = useState<LessonModeId[]>(["see"]);
  const [lessonOpen, setLessonOpen] = useState(true);
  const [dark, setDark] = useState(true);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState("");
  const [notes, setNotes] = useState("");
  const [response, setResponse] = useState("");
  const [audioStatus, setAudioStatus] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollArea = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const originalDark = root.classList.contains("dark");
    const originalScheme = root.style.colorScheme;
    setDark(originalDark);
    return () => {
      root.classList.toggle("dark", originalDark);
      root.style.colorScheme = originalScheme;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void fetch("/lesson-content/es/foundation-roofing.json", { signal: controller.signal })
      .then(async (result) => {
        if (!result.ok) throw new Error("The sample lesson could not be loaded.");
        const data = await result.json();
        const sample = data.lessons?.["1"] as DemoLesson | undefined;
        if (
          !sample ||
          !Array.isArray(sample.passage?.target) ||
          !Array.isArray(sample.passage?.native)
        )
          throw new Error("The sample lesson is unavailable.");
        const words = (DEMO_LESSON.words ?? []).filter(
          (word) =>
            typeof word.es === "string" && typeof word.en === "string" && word.kind === "term",
        );
        if (!words.length) throw new Error("The sample vocabulary is unavailable.");
        if (!controller.signal.aborted) setLesson({ ...sample, words });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : "The sample lesson could not be loaded.",
          );
      });
    return () => controller.abort();
  }, [retry]);
  const stopAudio = useCallback(() => {
    if (utterance.current) {
      utterance.current = null;
      window.speechSynthesis?.cancel();
    }
  }, []);
  useEffect(() => {
    stopAudio();
    setAudioStatus("");
    setRevealed(false);
    scrollArea.current
      ?.querySelector(".lt-lesson-demo-panel")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
    return stopAudio;
  }, [active, lessonOpen, stopAudio]);

  function selectMode(mode: LessonModeId) {
    setActive(mode);
    setOpened((current) => (current.includes(mode) ? current : [...current, mode]));
  }
  function changeWord(delta: number) {
    stopAudio();
    setAudioStatus("");
    setIndex((current) => Math.max(0, Math.min(current + delta, (lesson?.words.length ?? 1) - 1)));
    setRevealed(false);
    setChecked("");
  }
  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    setDark(next);
  }
  const word = lesson?.words[index];
  function playWord() {
    stopAudio();
    if (!word || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      setAudioStatus("Audio is unavailable here. Reveal the phrase below to continue.");
      return;
    }
    const next = new SpeechSynthesisUtterance(word.es);
    next.lang = "es-ES";
    next.voice =
      window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith("es")) ?? null;
    next.onend = () => {
      if (utterance.current === next) {
        utterance.current = null;
        setAudioStatus("Ready to play again.");
      }
    };
    next.onerror = () => {
      if (utterance.current === next) {
        utterance.current = null;
        setAudioStatus("Audio is unavailable here. Reveal the phrase below to continue.");
      }
    };
    utterance.current = next;
    setAudioStatus("Playing with this browser’s device voice.");
    window.speechSynthesis.speak(next);
  }
  const nextMode = LESSON_MODES[LESSON_MODES.findIndex((mode) => mode.id === active) + 1];
  return (
    <div className="lt-lesson-demo-shell lt-v6-demo">
      <V6Header
        course="Roofing · Foundation"
        language="Spanish"
        onCourses={() => {
          setShowSpeak(false);
          setLessonOpen(false);
        }}
        onTutor={() => {
          window.location.href = "/?tab=speak";
        }}
        onReview={() => {
          setShowSpeak(false);
          setLessonOpen(true);
          selectMode("recall");
        }}
        onMenu={() => setMenuOpen(true)}
      />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="space-y-4 rounded-t-3xl">
          <SheetTitle>Explore</SheetTitle>
          <SheetDescription>
            This is a layout preview. Open the app for your account, tutor, and AI conversation.
          </SheetDescription>
          <a className={buttonClass + " flex items-center"} href="/?tab=speak">
            Open the app
          </a>
          <a className={buttonClass + " flex items-center"} href="/?panel=settings">
            Settings and account
          </a>
          <button
            className={buttonClass}
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
          >
            Switch theme
          </button>
        </SheetContent>
      </Sheet>
      <V6Dock
        active={showSpeak ? "speak" : active}
        onSelect={(mode) => {
          setLessonOpen(true);
          setShowSpeak(mode === "speak");
          if (mode !== "speak") selectMode(mode);
        }}
      />
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 px-4 pt-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Layout preview · practice stays in this demo
        </p>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
        >
          {dark ? (
            <Sun aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Moon aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
      {showSpeak ? (
        <main data-demo-scroll className="lt-v6-speak-preview">
          <h1>Speak</h1>
          <p className="lt-v6-subtitle">Sounds and Greetings</p>
          <section className="lt-v6-panel">
            <h2>Speaking card</h2>
            <p>Greet a new coworker and introduce yourself.</p>
            <p className="text-muted-foreground">
              Practice the greetings from your lesson, then continue the conversation.
            </p>
          </section>
          <section className="lt-v6-panel">
            <p className="text-sm text-gold-ink">Model dialogue</p>
            <p className="lt-v6-dialogue" lang="es">
              {lesson?.passage.target[0] ?? "Buenos días, me llamo Luis y soy nuevo."}
            </p>
            <p className="text-muted-foreground">
              {lesson?.passage.native[0] ?? "Good morning, my name is Luis and I'm new."}
            </p>
          </section>
          <section className="lt-v6-panel">
            <h2>Your turn</h2>
            <p>
              This layout preview uses your published lesson. Open Speak to record, listen back, and
              talk with the AI partner.
            </p>
            <a
              className="lt-v6-primary"
              href="/?tab=speak&amp;module=foundation-roofing&amp;target=Spanish&amp;native=English"
            >
              Open Speak
            </a>
          </section>
          <p className="text-sm text-muted-foreground">Layout preview · temporary study practice</p>
        </main>
      ) : !lessonOpen ? (
        <main data-demo-scroll className="px-4 py-8">
          <div className="mx-auto max-w-2xl space-y-5">
            <p className="text-sm text-gold-ink">Your course</p>
            <h1 className="font-serif text-3xl">Roofing · Foundation</h1>
            <p className="text-muted-foreground">
              This preview uses the published first lesson. Your actual lesson progress stays
              unchanged.
            </p>
            <button type="button" className={buttonClass} onClick={() => setLessonOpen(true)}>
              Return to preview lesson
            </button>
            <p>
              <a
                href={LESSON_LINK}
                className="inline-flex min-h-11 items-center text-sm text-gold-ink underline"
              >
                Open the actual lesson in the app
              </a>
            </p>
          </div>
        </main>
      ) : (
        <>
          <main ref={scrollArea} data-demo-scroll className="px-4">
            <LessonWorkspaceHeader
              courseTitle="Roofing · Foundation"
              lessonTitle={DEMO_LESSON.title}
              lessonLabel="Foundation · Lesson 1"
              goal={DEMO_LESSON.objective}
              active={active}
              opened={opened}
              onExit={() => setLessonOpen(false)}
            />

            <div
              key={active}
              className="lt-lesson-demo-panel mx-auto mt-5 max-w-2xl space-y-5 pb-4"
            >
              {error ? (
                <div
                  role="alert"
                  className="space-y-4 rounded-2xl border border-border bg-card p-5"
                >
                  <p>{error}</p>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry sample lesson
                  </button>
                </div>
              ) : !lesson || !word ? (
                <p role="status">Loading the published lesson…</p>
              ) : (
                <>
                  <div>
                    <h2 className="font-serif text-2xl">
                      {LESSON_MODES.find((mode) => mode.id === active)?.label}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {LESSON_MODES.find((mode) => mode.id === active)?.why}
                    </p>
                  </div>
                  {active === "see" && (
                    <article className="space-y-3" aria-label="Published lesson reading">
                      {lesson.passage.target.map((line, i) => (
                        <div
                          key={`${i}:${line}`}
                          className="rounded-2xl border border-border bg-card p-4"
                        >
                          <p lang="es" className="font-serif text-xl leading-relaxed">
                            {line}
                          </p>
                          <p
                            lang="en"
                            className="mt-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            {lesson.passage.native[i]}
                          </p>
                        </div>
                      ))}
                    </article>
                  )}
                  {(["recall", "hear", "type"] as LessonModeId[]).includes(active) && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Published vocabulary · {index + 1} of {lesson.words.length}
                      </p>
                      <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
                        {active === "recall" && (
                          <>
                            <p lang="es" className="font-serif text-3xl">
                              {word.es}
                            </p>
                            <button
                              type="button"
                              className={buttonClass}
                              aria-expanded={revealed}
                              onClick={() => setRevealed((value) => !value)}
                            >
                              {revealed ? "Hide meaning" : "Reveal meaning"}
                            </button>
                            {revealed && (
                              <p lang="en" className="text-xl text-foreground">
                                {word.en}
                              </p>
                            )}
                          </>
                        )}
                        {active === "hear" && (
                          <>
                            <button
                              type="button"
                              onClick={playWord}
                              className={`${buttonClass} flex w-full items-center justify-center gap-2`}
                            >
                              <Play aria-hidden="true" className="h-5 w-5" />
                              Play demo audio
                            </button>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Demo device voice. Your configured app voice is used in the actual
                              lesson.
                            </p>
                            <p role="status" className="text-sm text-muted-foreground">
                              {audioStatus}
                            </p>
                            <button
                              type="button"
                              className={buttonClass}
                              aria-expanded={revealed}
                              onClick={() => setRevealed((value) => !value)}
                            >
                              {revealed ? "Hide phrase" : "Reveal phrase"}
                            </button>
                            {revealed && (
                              <p lang="es" className="font-serif text-2xl">
                                {word.es}{" "}
                                <span className="block text-base text-muted-foreground">
                                  {word.en}
                                </span>
                              </p>
                            )}
                          </>
                        )}
                        {active === "type" && (
                          <form
                            className="space-y-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              setChecked(
                                typed.trim().normalize("NFC").toLocaleLowerCase("es") ===
                                  word.es.trim().normalize("NFC").toLocaleLowerCase("es")
                                  ? "That matches the published word. Demo practice only."
                                  : `Compare with the lesson word: ${word.es}`,
                              );
                            }}
                          >
                            <p className="text-xl">{word.en}</p>
                            <label className="block space-y-2">
                              <span className="text-sm font-semibold">Type the Spanish word</span>
                              <input
                                lang="es"
                                autoComplete="off"
                                value={typed}
                                onChange={(event) => {
                                  setTyped(event.target.value);
                                  setChecked("");
                                }}
                                className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
                              />
                            </label>
                            <button type="submit" className={buttonClass}>
                              Check demo answer
                            </button>
                            <p role="status" className="text-sm leading-relaxed">
                              {checked}
                            </p>
                          </form>
                        )}
                      </section>
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => changeWord(-1)}
                          className={`${buttonClass} disabled:opacity-40`}
                        >
                          <ArrowLeft aria-hidden="true" className="mr-1 inline h-4 w-4" />
                          Previous word
                        </button>
                        <button
                          type="button"
                          disabled={index === lesson.words.length - 1}
                          onClick={() => changeWord(1)}
                          className={`${buttonClass} disabled:opacity-40`}
                        >
                          Next word
                          <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                  {active === "write" && (
                    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
                      <p className="leading-relaxed">
                        Copy a lesson phrase or write what you want to practise next. This preview
                        provides a typed scratchpad; the app’s handwriting activity stays in the
                        actual lesson.
                      </p>
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold">Demo writing notes</span>
                        <textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          rows={6}
                          className="w-full resize-y rounded-xl border border-border bg-background p-3 text-base leading-relaxed"
                        />
                      </label>
                      <button type="button" className={buttonClass} onClick={() => setNotes("")}>
                        Clear demo notes
                      </button>
                    </section>
                  )}
                  {active === "say" && (
                    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
                      <p lang="es" className="font-serif text-2xl">
                        {lesson.passage.target[0]}
                      </p>
                      <p className="text-muted-foreground">
                        Practise the phrase aloud. Open the actual lesson for recording, coaching,
                        and the AI conversation; this preview doesn’t generate replies.
                      </p>
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold">What you want to say</span>
                        <textarea
                          value={response}
                          onChange={(event) => setResponse(event.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-background p-3 text-base leading-relaxed"
                        />
                      </label>
                      <a
                        href={LESSON_LINK.replace("way=see", "way=say")}
                        className={`${buttonClass} inline-flex items-center`}
                      >
                        Open actual speaking practice
                      </a>
                    </section>
                  )}
                  {nextMode ? (
                    <button
                      type="button"
                      className={`${buttonClass} w-full`}
                      onClick={() => selectMode(nextMode.id)}
                    >
                      Continue to {nextMode.label}
                      <ArrowRight aria-hidden="true" className="ml-2 inline h-4 w-4" />
                    </button>
                  ) : (
                    <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                      You’ve explored the layout. Your actual lesson progress is unchanged.
                    </p>
                  )}
                  <a
                    href={LESSON_LINK}
                    className="inline-flex min-h-11 items-center text-sm text-gold-ink underline"
                  >
                    Open the actual lesson in the app
                  </a>
                </>
              )}
            </div>
          </main>
          <LessonModeBar active={active} opened={opened} onSelect={selectMode} />
        </>
      )}
    </div>
  );
}
