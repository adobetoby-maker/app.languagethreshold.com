import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Info, Mic, RotateCcw, Turtle, Volume2 } from "lucide-react";
import type { LessonWord } from "@/data/curriculum";
import { recognitionLocales } from "@/lib/language-pack-text";
import { languageTag } from "@/lib/lesson-words-core";
import { followsPackRules } from "@/data/language-packs/pack-rules";
import { recognitionConstructor, type SpeechRecognitionLike } from "@/lib/phone-dictation";
import { type SpeechWordScore } from "@/lib/speech-word-similarity";
import { speechScore } from "@/lib/speech-score";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { useListeningSpeaker } from "@/hooks/use-listening-speaker";
import { usePack } from "@/hooks/use-language-pack";
import { useSpeech } from "@/state/speech-state";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-semibold text-foreground disabled:opacity-40";
export function LessonSayItCard({
  words,
  language,
  onActivity,
  onOpenConversation,
  online,
}: {
  words: LessonWord[];
  language: string;
  onActivity: () => void;
  onOpenConversation: () => void;
  online: boolean;
}) {
  const [index, setIndex] = useState(0),
    [heard, setHeard] = useState(""),
    [result, setResult] = useState<SpeechWordScore | null>(null),
    [listening, setListening] = useState(false),
    [error, setError] = useState(""),
    [details, setDetails] = useState(false),
    [supported, setSupported] = useState(false),
    [manual, setManual] = useState(false),
    [recording, setRecording] = useState<string | null>(null),
    [dockHeight, setDockHeight] = useState(110);
  const word = words[Math.min(index, words.length - 1)];
  const { accent, rate } = useSpeech();
  // The lesson's pack decides recognition: the learner's accent when it is this language, then
  // the pack's recognition locales. Null: no recognizer for this pack (dictation unsupported).
  // Learners outside the released course packs (Spanish included) keep the base locale: the
  // accent when it is this language, else the language tag (owner decisions 2 and 3).
  const pack = usePack(language);
  const packRules = followsPackRules(pack);
  const locale = packRules
    ? pack
      ? (recognitionLocales(accent, pack)[0] ?? null)
      : null
    : accent?.slice(0, 2) === languageTag(language).slice(0, 2)
      ? accent
      : languageTag(language);
  const scope = JSON.stringify([language, index, word?.es]);
  const { capture, cancel } = usePracticeLifecycle("say-word:" + scope);
  // The model word (Listen, Slow) is read by the learner's listening voice: recorded HD audio
  // first, then the HD voice, never a device voice in its place unless the learner chose one.
  // It keeps this word's scope, so Next, Speak, My recording and leaving the page stop it as
  // before. The learner's own recording and the microphone are separate and unchanged.
  const { speak: playModel, stop: stopModel } = useListeningSpeaker("say-word:" + scope, pack);
  const recognition = useRef<SpeechRecognitionLike | null>(null),
    transcript = useRef(""),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    url = useRef<string | null>(null),
    replay = useRef<HTMLAudioElement | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canReplay = useRef(false);
  useEffect(() => {
    // Phone/Safari dictation owns its microphone. Do not compete with a second capture.
    canReplay.current =
      !window.matchMedia("(pointer: coarse)").matches &&
      !(/Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg/i.test(navigator.userAgent));
  }, []);
  const activity = useRef(onActivity);
  activity.current = onActivity;
  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  useEffect(() => {
    setSupported(Boolean(recognitionConstructor()));
    return () => {
      clearTimeout(timer.current);
      recognition.current?.abort();
      recognition.current = null;
      stopRecording();
      replay.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, [scope]);
  useEffect(() => {
    const pause = () => {
      if (document.visibilityState === "hidden") {
        cancel();
        stopModel();
        replay.current?.pause();
        recognition.current?.abort();
        recognition.current = null;
        stopRecording();
        setListening(false);
        setHeard("");
        setResult(null);
        clearTimeout(timer.current);
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [cancel, stopModel]);
  useLayoutEffect(() => {
    const dock = document.querySelector(".lt-v6-bottom");
    if (!dock) return;
    const measure = () => setDockHeight(dock.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);
  if (!word) return null;
  function next(delta: number) {
    cancel();
    recognition.current?.abort();
    recognition.current = null;
    stopRecording();
    stopModel();
    replay.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setRecording(null);
    setHeard("");
    setResult(null);
    setError("");
    setManual(false);
    setListening(false);
    transcript.current = "";
    clearTimeout(timer.current);
    setIndex((i) => Math.min(words.length - 1, Math.max(0, i + delta)));
    activity.current();
  }
  function start() {
    stopModel();
    replay.current?.pause();
    cancel();
    recognition.current?.abort();
    stopRecording();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setRecording(null);
    const Ctor = recognitionConstructor();
    if (!Ctor || !locale) {
      setSupported(false);
      return;
    }
    const lease = capture(),
      rec = new Ctor(),
      sessionLive = { current: true };
    recognition.current = rec;
    transcript.current = "";
    setHeard("");
    setResult(null);
    setError("");
    setListening(true);
    activity.current();
    const current = () => lease.isCurrent() && recognition.current === rec;
    rec.lang = locale;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      if (!current()) return;
      const text = Array.from(event.results)
        .map((x) => x[0].transcript)
        .join(" ");
      transcript.current = text;
      setHeard(text);
    };
    rec.onerror = (event) => {
      if (!current()) return;
      sessionLive.current = false;
      const messages: Record<string, string> = {
        "not-allowed": "Allow microphone access in your browser, then try again.",
        "service-not-allowed": "Allow speech recognition in your browser, then try again.",
        network: "Dictation could not connect. Try again or use keyboard dictation.",
        "audio-capture": "The microphone could not start. Close other audio apps and try again.",
      };
      if (recorder.current) canReplay.current = false;
      setError(messages[event.error ?? ""] ?? "I didn’t catch any words. Please try again.");
      setListening(false);
      rec.abort();
      recognition.current = null;
      stopRecording();
      clearTimeout(timer.current);
    };
    rec.onend = () => {
      if (!current()) return;
      sessionLive.current = false;
      setListening(false);
      stopRecording();
      clearTimeout(timer.current);
      if (transcript.current.trim()) {
        setResult(pack ? speechScore(word.es, transcript.current, pack) : null);
        activity.current();
      } else {
        setError("I didn’t catch any words. Please try again.");
      }
    };
    lease.own(() => {
      rec.abort();
      stopRecording();
      clearTimeout(timer.current);
    });
    // Optional local replay. Dictation remains usable when MediaRecorder is unavailable.
    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia)
      void navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          if (!current() || !sessionLive.current) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          stream.current = s;
          const chunks: Blob[] = [];
          let mr: MediaRecorder;
          try {
            mr = new MediaRecorder(s);
          } catch {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          recorder.current = mr;
          mr.ondataavailable = (e) => {
            if (e.data.size) chunks.push(e.data);
          };
          mr.onstop = () => {
            if (!current() || !chunks.length) return;
            const u = URL.createObjectURL(
              new Blob(chunks, { type: mr.mimeType || chunks[0].type }),
            );
            if (url.current) URL.revokeObjectURL(url.current);
            url.current = u;
            setRecording(u);
          };
          mr.start();
        })
        .catch(() => {
          if (current()) stopRecording();
        });
    try {
      rec.start();
      timer.current = setTimeout(() => {
        if (current()) rec.stop();
      }, 90000);
    } catch {
      sessionLive.current = false;
      setListening(false);
      stopRecording();
      rec.abort();
      recognition.current = null;
      clearTimeout(timer.current);
      setError("Dictation could not start. Try again or use keyboard dictation.");
    }
  }
  return (
    <div data-testid="lesson-say-word-practice" className="space-y-3 pb-20">
      <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-gold">
          SAY IT · {index + 1}/{words.length}
        </span>
        <button
          type="button"
          data-testid="lesson-say-go"
          disabled={!online}
          onClick={onOpenConversation}
          className="min-h-11 rounded-xl border border-gold/50 bg-gold/10 px-3 text-sm font-semibold text-gold disabled:opacity-50"
        >
          Start lesson conversation
        </button>
      </div>
      <article className="lt-say-word-card relative space-y-2 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex min-h-6 items-center justify-between gap-3 pr-10">
          <span className="text-xs font-semibold text-gold">Your voice is the lesson</span>
          <button
            className="absolute right-2 top-1 inline-flex size-11 items-center justify-center"
            aria-label="Speaking feedback details"
            onClick={() => setDetails(true)}
          >
            <Info size={20} />
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3
            data-testid="say-word-target"
            lang={packRules ? pack?.code : (locale ?? undefined)}
            className="min-w-0 flex-1 font-display text-[28px] leading-tight"
          >
            {word.es}
          </h3>
          {result && (
            <div
              data-testid="say-word-score"
              className={`shrink-0 text-right ${result.exact ? "text-emerald-600 dark:text-emerald-300" : "text-gold"}`}
            >
              <strong className="font-display text-[24px]">{result.score}%</strong>
              <span className="block whitespace-nowrap text-[10px]">word similarity</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground">{word.en}</p>
        <div className="flex gap-2">
          <button className={button} disabled={listening} onClick={() => playModel(word.es)}>
            <Volume2 size={18} />
            Listen
          </button>
          <button
            className={button}
            disabled={listening}
            onClick={() => playModel(word.es, { rate: rate * 0.65 })}
          >
            <Turtle size={18} />
            Slow
          </button>
        </div>
        {supported && !manual ? (
          <button
            data-testid="say-word-record"
            className="lt-v6-primary w-full gap-2"
            onClick={() => {
              if (listening) {
                recognition.current?.stop();
              } else start();
            }}
          >
            <Mic size={20} />
            {listening ? "Finish speaking" : result ? "Try speaking again" : "Speak this line"}
          </button>
        ) : (
          <label className="block text-sm">
            Use keyboard dictation or type what you said
            <input
              aria-label="Recognized words"
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background p-3"
              value={heard}
              onChange={(e) => {
                setHeard(e.target.value);
                setResult(
                  e.target.value.trim() && pack ? speechScore(word.es, e.target.value, pack) : null,
                );
                activity.current();
              }}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-gold">
            {error}
            {supported && !manual && (
              <button
                type="button"
                className="mt-1 block min-h-11 underline"
                onClick={() => setManual(true)}
              >
                Use keyboard dictation or typing
              </button>
            )}
          </p>
        )}
        {(heard || listening) && (
          <p
            className={`line-clamp-2 text-sm ${listening ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}
            data-testid="say-word-heard"
          >
            {heard ? `Heard: ${heard}` : "Mic is listening…"}
          </p>
        )}
        {result && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-2 ${result.exact ? "text-emerald-600 dark:text-emerald-300" : "text-gold"}`}
            >
              {result.exact ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}{" "}
              {result.exact ? "Matched" : "Keep practicing"}
            </span>
            {recording && (
              <button
                className={button}
                onClick={() => {
                  stopModel();
                  replay.current?.pause();
                  const a = new Audio(recording);
                  replay.current = a;
                  const lease = capture();
                  const release = lease.own(() => a.pause());
                  a.onended = release;
                  void a.play().catch(() => {
                    release();
                    if (lease.isCurrent()) setError("Tap My recording again to replay.");
                  });
                }}
              >
                My recording
              </button>
            )}
          </div>
        )}
      </article>
      <nav
        aria-label="Say It word navigation"
        className="lt-say-word-navigation"
        style={{ bottom: dockHeight }}
      >
        <button className={button} disabled={index === 0} onClick={() => next(-1)}>
          <ArrowLeft size={18} />
          Previous
        </button>
        <button
          data-testid="say-word-next"
          className={button}
          onClick={() => {
            if (index === words.length - 1) next(-index);
            else next(1);
          }}
        >
          {index === words.length - 1 ? "Practice again" : "Next"}
        </button>
      </nav>
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent>
          <DialogTitle>Speaking feedback</DialogTitle>
          <p>
            Matched text receives full credit. Close matches receive partial credit. Missing or
            extra text and word order affect the score.
          </p>
          <p>
            Word similarity compares recognized text, not your accent. Dictation uses your device or
            browser’s speech service.
          </p>
          {heard && <p>Heard: {heard}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
