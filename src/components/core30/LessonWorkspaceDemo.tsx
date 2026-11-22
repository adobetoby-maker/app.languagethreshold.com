import { NativeSpeakSurface } from "@/components/speak/NativeSpeakSurface";
import { SpeakingConversationControls } from "@/components/speak/SpeakingConversationControls";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { V6Header, V6Dock } from "./V6AppChrome";
import { V4StudyActivity } from "./V4StudyChrome";
import {
  FOUNDATION_ROOFING_LESSONS,
  FOUNDATION_ROOFING_MODULE_ID,
} from "@/data/foundation-roofing-curriculum";
import { moduleAuthoredPair } from "@/data/curriculum";
import { requirePackFor } from "@/data/language-packs/registry";
import { defaultAccentTag } from "@/lib/language-pack-text";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Mic, Moon, Play, Sun, Turtle, Volume2 } from "lucide-react";
import {
  LESSON_MODES,
  LessonModeBar,
  LessonWorkspaceHeader,
  type LessonModeId,
} from "./LessonWorkspaceChrome";

type Word = { es: string; en: string; kind?: string };
type DemoLesson = { passage: { title: string; target: string[]; native: string[] }; words: Word[] };
const DEMO_LESSON = FOUNDATION_ROOFING_LESSONS[0];
// The demo shows the Roofing Foundation in the pair it was written for; its language, voice and
// lang attributes come from that pair's pack, never a literal.
const DEMO_PACK = requirePackFor(moduleAuthoredPair(FOUNDATION_ROOFING_MODULE_ID)?.target);
const DEMO_LANG = DEMO_PACK.code;
const DEMO_PAIR = moduleAuthoredPair(FOUNDATION_ROOFING_MODULE_ID);
const LESSON_LINK = `/?${new URLSearchParams({
  tab: "core30",
  module: FOUNDATION_ROOFING_MODULE_ID,
  target: DEMO_PACK.name,
  native: DEMO_PAIR?.native ?? "",
  lesson: "1",
  way: "see",
})}`;
const buttonClass =
  "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

/** A public, temporary layout preview. No account, progress store, or AI requests. */
export function LessonWorkspaceDemo() {
  const [demoText, setDemoText] = useState(true);
  const [demoFeedback, setDemoFeedback] = useState(true);
  const [demoVoice, setDemoVoice] = useState(true);
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
    const study = () => {
      setShowSpeak(false);
      setLessonOpen(true);
    };
    window.addEventListener("lt:v6-open-study", study);
    return () => window.removeEventListener("lt:v6-open-study", study);
  }, []);
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
    void fetch(`/lesson-content/${DEMO_LANG}/${FOUNDATION_ROOFING_MODULE_ID}.json`, { signal: controller.signal })
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
  function playWord(rate = 1) {
    stopAudio();
    if (!word || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      setAudioStatus("Audio is unavailable here. Reveal the phrase below to continue.");
      return;
    }
    const next = new SpeechSynthesisUtterance(word.es);
    next.lang = defaultAccentTag(DEMO_PACK) ?? DEMO_PACK.speech.tts.languageCode;
    next.rate = rate;
    next.voice =
      window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith(DEMO_LANG)) ?? null;
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
        language={DEMO_PACK.name}
        lessonNumber={1}
        totalLessons={FOUNDATION_ROOFING_LESSONS.length}
        dueCards={0}
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
      {!showSpeak && <V4StudyActivity />}
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
          if (mode === "study") selectMode(active);
          else if (mode === "verbs") {
            window.location.href = "/?tab=verbs";
          } else if (mode !== "speak") selectMode(mode);
        }}
      />
      <div className="lt-demo-legacy-banner mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between gap-2 px-4 pt-2">
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
        <main data-demo-scroll className="lt-native-demo-main">
          <NativeSpeakSurface
            lesson="Sounds and Greetings"
            language={DEMO_PACK.name}
            partnerTitle="Teacher · learn a topic"
            transcript={<div role="region" aria-label="Conversation replies" />}
            partner={
              <p>
                This preview uses the default teacher.{" "}
                <a href="/?tab=speak" className="underline">
                  Open live Speak
                </a>{" "}
                to choose a partner and talk.
              </p>
            }
            controls={
              <SpeakingConversationControls
                text={demoText}
                feedback={demoFeedback}
                voice={demoVoice}
                onText={() => setDemoText((value) => !value)}
                onFeedback={() => setDemoFeedback((value) => !value)}
                onVoice={() => setDemoVoice((value) => !value)}
                onRepeat={() => {}}
                repeatDisabled
              />
            }
            composer={
              <form
                className="lt-native-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  window.location.href = "/?tab=speak";
                }}
              >
                <textarea
                  aria-label={`Preview ${DEMO_PACK.name} reply`}
                  placeholder={`Your ${DEMO_PACK.name} reply…`}
                  rows={2}
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                />
                <button>↑ Send</button>
              </form>
            }
            microphone={
              <div className="lt-native-microphone">
                <button
                  onClick={() => {
                    window.location.href = "/?tab=speak";
                  }}
                >
                  <Mic size={19} aria-hidden /> Speak
                </button>
              </div>
            }
            voice={demoVoice}
            onVoice={() => setDemoVoice((value) => !value)}
            status="Ready"
            onLatest={() => {}}
            onReset={() => setResponse("")}
            onScenarios={() => {
              window.location.href = "/?tab=speak";
            }}
            onPartnerStart={() => {
              window.location.href = "/?tab=speak";
            }}
            partnerStartDisabled={false}
          />
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
                  {active !== "see" && (
                    <div>
                      <h2 className="font-serif text-2xl">
                        {LESSON_MODES.find((mode) => mode.id === active)?.label}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {LESSON_MODES.find((mode) => mode.id === active)?.why}
                      </p>
                    </div>
                  )}
                  {active === "see" && (
                    <div className="lt-native-reading">
                      <div className="lt-native-reading-progress">
                        <span>See it</span>
                        <span>
                          {index + 1} / {lesson.words.length}
                        </span>
                      </div>
                      <p className="lt-native-reading-hint">
                        Connect the meaning. Listen, notice, and read aloud.
                      </p>
                      <article
                        className="lt-native-reading-card"
                        aria-label="Published lesson reading"
                      >
                        <p className="lt-native-reading-language">{DEMO_PACK.name}</p>
                        <p lang={DEMO_LANG} className="lt-native-reading-target">
                          {word.es}
                        </p>
                        <p lang="en" className="lt-native-reading-translation">
                          {word.en}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => playWord()}>
                            <Volume2 size={20} aria-hidden />
                            Listen
                          </button>
                          <button onClick={() => playWord(0.7)}>
                            <Turtle size={20} aria-hidden />
                            Slow
                          </button>
                        </div>
                      </article>
                      <div className="lt-native-reading-actions">
                        <button disabled={index === 0} onClick={() => changeWord(-1)}>
                          ← Previous
                        </button>
                        <button
                          onClick={() =>
                            index + 1 < lesson.words.length ? changeWord(1) : selectMode("recall")
                          }
                        >
                          {index + 1 < lesson.words.length ? "Next" : "Finish round"}
                        </button>
                      </div>
                      {audioStatus && (
                        <p role="status" className="text-sm text-muted-foreground">
                          {audioStatus}
                        </p>
                      )}
                    </div>
                  )}
                  {(["recall", "hear", "type"] as LessonModeId[]).includes(active) && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Published vocabulary · {index + 1} of {lesson.words.length}
                      </p>
                      <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
                        {active === "recall" && (
                          <>
                            <p lang={DEMO_LANG} className="font-serif text-3xl">
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
                              onClick={() => playWord()}
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
                              <p lang={DEMO_LANG} className="font-serif text-2xl">
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
                                typed.trim().normalize("NFC").toLocaleLowerCase(DEMO_LANG) ===
                                  word.es.trim().normalize("NFC").toLocaleLowerCase(DEMO_LANG)
                                  ? "That matches the published word. Demo practice only."
                                  : `Compare with the lesson word: ${word.es}`,
                              );
                            }}
                          >
                            <p className="text-xl">{word.en}</p>
                            <label className="block space-y-2">
                              <span className="text-sm font-semibold">Type the {DEMO_PACK.name} word</span>
                              <input
                                lang={DEMO_LANG}
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
                      <p lang={DEMO_LANG} className="font-serif text-2xl">
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
                  {active !== "see" &&
                    (nextMode ? (
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
                    ))}
                  <a
                    href={LESSON_LINK}
                    className="lt-demo-live-lesson inline-flex min-h-11 items-center text-sm text-gold-ink underline"
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
