import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Mic, RotateCcw, Square, X } from "lucide-react";
import { SPEAKING_MISSIONS, type SpeakingMission } from "@/data/speaking-missions";
import { configureUtterance } from "@/lib/voices";
import { useAiGate } from "@/state/ai-gate-state";

type MissionStatus = "ready" | "listening" | "thinking" | "complete" | "error";
type FeedbackLanguage = "English" | "Spanish" | "Adaptive";

interface MissionTurn {
  id: string;
  role: "learner" | "partner";
  text: string;
  opening?: boolean;
  feedback?: string[];
}

interface MissionTurnResponse {
  assistantText: string;
  deferredFeedback: string[];
  provisionalObjectiveIds: string[];
  shouldEnd: boolean;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEventLike = { error?: string };

function recognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function specialtyStyle(specialty: SpeakingMission["specialty"]) {
  return specialty === "construction"
    ? { label: "Construction", icon: "🏗️", color: "#ff7a4a" }
    : { label: "Missionary", icon: "📖", color: "#c9a84c" };
}

function missionTurnId() {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

export function SpeakingMissionsPreview() {
  const { gated } = useAiGate();
  const [selectedMission, setSelectedMission] = useState<SpeakingMission | null>(null);
  const [started, setStarted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [feedbackLanguage, setFeedbackLanguage] = useState<FeedbackLanguage>("Adaptive");
  const [status, setStatus] = useState<MissionStatus>("ready");
  const [turns, setTurns] = useState<MissionTurn[]>([]);
  const [interim, setInterim] = useState("");
  const [objectiveIds, setObjectiveIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  useEffect(() => setRecognitionSupported(recognitionConstructor() !== null), []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, interim, status]);

  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const stopActiveWork = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
    stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    return () => stopActiveWork();
  }, [stopActiveWork]);

  useEffect(() => {
    if (!started || status === "complete" || sessionStartedAtRef.current === null) return;
    const elapsed = Date.now() - sessionStartedAtRef.current;
    const remaining = Math.max(0, 18 * 60 * 1000 - elapsed);
    const hardCap = window.setTimeout(() => {
      stopActiveWork();
      setStatus("complete");
      setErrorMessage("This UX-preview mission reached its 18-minute limit.");
    }, remaining);
    return () => window.clearTimeout(hardCap);
  }, [started, status, stopActiveWork]);

  useEffect(() => {
    const stopOnBackground = () => {
      if (document.visibilityState !== "hidden" || !started || status === "complete") return;
      stopActiveWork();
      setInterim("");
      setStatus("error");
      setErrorMessage(
        "The mission paused when this tab moved to the background. Tap Resume to continue.",
      );
    };
    document.addEventListener("visibilitychange", stopOnBackground);
    return () => document.removeEventListener("visibilitychange", stopOnBackground);
  }, [started, status, stopActiveWork]);

  const speakPartnerText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      stopAudio();
      const utterance = new SpeechSynthesisUtterance(text);
      configureUtterance(utterance, "es-MX", null);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    },
    [stopAudio],
  );

  const beginMission = () => {
    if (!selectedMission || !ageConfirmed) return;
    stopActiveWork();
    const opening: MissionTurn = {
      id: missionTurnId(),
      role: "partner",
      text: selectedMission.openingLine,
      opening: true,
    };
    setTurns([opening]);
    setObjectiveIds([]);
    setErrorMessage(null);
    setInterim("");
    setStatus("ready");
    sessionStartedAtRef.current = Date.now();
    setStarted(true);
    speakPartnerText(opening.text);
  };

  const exitMission = () => {
    stopActiveWork();
    setStarted(false);
    setTurns([]);
    setInterim("");
    setObjectiveIds([]);
    setErrorMessage(null);
    setStatus("ready");
    sessionStartedAtRef.current = null;
  };

  const selectMission = (mission: SpeakingMission) => {
    exitMission();
    setSelectedMission(mission);
  };

  const sendLearnerTurn = async (text: string) => {
    if (!selectedMission) return;
    const learnerText = text.trim();
    if (!learnerText) {
      setStatus("ready");
      return;
    }

    const learnerTurn: MissionTurn = {
      id: missionTurnId(),
      role: "learner",
      text: learnerText,
    };
    const previousTurns = turns;
    setTurns((current) => [...current, learnerTurn]);
    setStatus("thinking");
    setErrorMessage(null);
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;

    try {
      const history: Array<{ role: "user" | "assistant"; content: string }> = previousTurns
        .slice(-38)
        .map((turn) => ({
          role: turn.role === "learner" ? ("user" as const) : ("assistant" as const),
          content: turn.text,
        }));
      history.push({ role: "user", content: learnerText });
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mission",
          language: "Spanish",
          level: selectedMission.level,
          messages: history,
          scenarioVersionId: selectedMission.id,
          ageConfirmed,
          feedbackLanguage,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as MissionTurnResponse | { error?: string };
      if (!response.ok || !("assistantText" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The mission partner could not respond.",
        );
      }

      setTurns((current) => [
        ...current.map((turn) =>
          turn.id === learnerTurn.id ? { ...turn, feedback: payload.deferredFeedback } : turn,
        ),
        { id: missionTurnId(), role: "partner", text: payload.assistantText },
      ]);
      setObjectiveIds((current) => [...new Set([...current, ...payload.provisionalObjectiveIds])]);
      requestRef.current = null;
      setStatus(payload.shouldEnd ? "complete" : "ready");
      speakPartnerText(payload.assistantText);
    } catch (error) {
      requestRef.current = null;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The mission partner could not respond.",
      );
    }
  };

  const startListening = () => {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setErrorMessage(
        "Speech recognition is unavailable in this browser. Use a supported browser for this UX preview.",
      );
      setStatus("error");
      return;
    }
    try {
      stopAudio();
      const recognition = new Constructor();
      recognition.lang = "es-MX";
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalText = "";
      recognition.onresult = (event) => {
        let interimText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        setInterim(interimText);
      };
      recognition.onerror = (event) => {
        if (event?.error && event.error !== "no-speech" && event.error !== "aborted") {
          setErrorMessage(`Microphone error: ${String(event.error)}`);
          setStatus("error");
        }
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setInterim("");
        if (finalText.trim()) {
          setStatus("ready");
          gated(() => sendLearnerTurn(finalText));
        } else setStatus((current) => (current === "error" ? current : "ready"));
      };
      recognitionRef.current = recognition;
      recognition.start();
      setStatus("listening");
      setErrorMessage(null);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "The microphone could not start.");
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const completedObjectiveCount =
    selectedMission?.objectives.filter((objective) => objectiveIds.includes(objective.id)).length ??
    0;

  if (!selectedMission) {
    return (
      <section aria-labelledby="mission-preview-heading" className="mt-5">
        <div className="mb-5 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            UX preview · Spanish
          </p>
          <h2 id="mission-preview-heading" className="mt-1 font-serif text-2xl text-foreground">
            Practice a real situation
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            These six missions use the main app&apos;s current AI and browser speech path so we can
            evaluate flow and interface. They do not yet count toward durable mastery.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SPEAKING_MISSIONS.map((mission) => {
            const specialty = specialtyStyle(mission.specialty);
            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => selectMission(mission)}
                className="rounded-2xl border border-border/70 bg-card/50 p-4 text-left transition-colors hover:border-gold/50 hover:bg-card"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span style={{ color: specialty.color }}>
                    {specialty.icon} {specialty.label}
                  </span>
                  <span className="text-muted-foreground">
                    {mission.level} · {mission.quickMinutes}–{mission.targetMinutes} min
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-xl text-foreground">{mission.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {mission.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (!started) {
    const specialty = specialtyStyle(selectedMission.specialty);
    return (
      <section className="mt-5 rounded-3xl border border-border/70 bg-card/40 p-5">
        <button
          type="button"
          onClick={() => setSelectedMission(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All missions
        </button>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs">
          <span style={{ color: specialty.color }}>
            {specialty.icon} {specialty.label} · {selectedMission.level}
          </span>
          <span className="text-muted-foreground">
            {selectedMission.quickMinutes}–{selectedMission.targetMinutes} min
          </span>
        </div>
        <h2 className="mt-2 font-serif text-3xl text-foreground">{selectedMission.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {selectedMission.summary}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Mission objectives
            </p>
            <ul className="mt-2 space-y-2 text-sm text-foreground/85">
              {selectedMission.objectives.map((objective) => (
                <li key={objective.id} className="flex gap-2">
                  <span className="text-gold">○</span>
                  <span>
                    {objective.description}
                    {objective.critical ? " *" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Useful vocabulary
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMission.vocabulary.map((word) => (
                <span key={word} className="rounded-full border border-border/70 px-3 py-1 text-xs">
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gold/25 bg-background/50 p-4">
          <label className="flex items-start gap-3 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm I am 13 or older. Mission mode sends my recognized speech text to Anthropic.
              Audio remains handled by the browser in this UX preview.
            </span>
          </label>
          <label className="mt-4 grid gap-1 text-sm">
            <span className="text-muted-foreground">Coaching language</span>
            <select
              value={feedbackLanguage}
              onChange={(event) => setFeedbackLanguage(event.target.value as FeedbackLanguage)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-foreground"
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Adaptive">Adaptive</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={beginMission}
          disabled={!ageConfirmed}
          className="mt-5 w-full rounded-xl bg-gold px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start mission
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          * Required for Bronze or higher in the future scoring model. This preview does not save a
          tier.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Mission in progress · UX preview
          </p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">{selectedMission.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedObjectiveCount}/{selectedMission.objectives.length} provisional objectives
          </p>
        </div>
        <button
          type="button"
          onClick={exitMission}
          className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> End
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Mission objectives">
        {selectedMission.objectives.map((objective) => {
          const completed = objectiveIds.includes(objective.id);
          return (
            <span
              key={objective.id}
              className={
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs " +
                (completed
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                  : "border-border text-muted-foreground")
              }
              title={objective.description}
            >
              {completed ? <Check className="h-3 w-3" /> : "○"} {objective.description}
            </span>
          );
        })}
      </div>

      <div
        ref={transcriptRef}
        className="h-[390px] overflow-y-auto rounded-3xl border border-border/60 bg-card/40 p-4"
        aria-live="polite"
      >
        <ul className="flex flex-col gap-3">
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={turn.role === "learner" ? "flex justify-end" : "flex justify-start"}
            >
              <div className="max-w-[88%]">
                <div
                  className={
                    turn.role === "learner"
                      ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                      : "rounded-2xl rounded-bl-sm border border-gold/30 bg-background/70 px-4 py-2.5 text-sm text-foreground"
                  }
                >
                  {turn.role === "partner" && (
                    <button
                      type="button"
                      onClick={() => speakPartnerText(turn.text)}
                      className="mr-2 text-gold"
                      aria-label="Replay partner speech"
                    >
                      🔊
                    </button>
                  )}
                  <span className="leading-relaxed">{turn.text}</span>
                </div>
                {turn.feedback?.map((feedback, index) => (
                  <p
                    key={`${turn.id}-feedback-${index}`}
                    className="mt-1 rounded-xl bg-gold/10 px-3 py-1.5 text-xs text-gold"
                  >
                    💡 {feedback}
                  </p>
                ))}
              </div>
            </li>
          ))}
          {interim && (
            <li className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl border border-dashed border-primary/50 bg-primary/10 px-4 py-2.5 text-sm italic">
                {interim}
              </div>
            </li>
          )}
          {status === "thinking" && (
            <li className="flex justify-start">
              <div className="rounded-2xl border border-gold/20 px-4 py-2 text-xs text-muted-foreground">
                Partner is responding…
              </div>
            </li>
          )}
        </ul>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-5 flex flex-col items-center gap-3">
        {status === "complete" ? (
          <div className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-center">
            <p className="font-serif text-xl text-foreground">Mission reached a natural close</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedObjectiveCount} provisional objective
              {completedObjectiveCount === 1 ? "" : "s"} observed. No mastery tier was saved.
            </p>
            <button
              type="button"
              onClick={beginMission}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200"
            >
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : recognitionSupported === false ? (
          <p className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
            Speech recognition is unavailable in this browser.
          </p>
        ) : status === "error" ? (
          <button
            type="button"
            onClick={() => {
              setStatus("ready");
              setErrorMessage(null);
            }}
            className="rounded-full border border-gold/40 px-5 py-2 text-sm text-gold"
          >
            Resume mission
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={status === "listening" ? stopListening : startListening}
              disabled={status === "thinking"}
              aria-label={status === "listening" ? "Stop listening" : "Start listening"}
              className={
                "flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-lg active:scale-95 disabled:opacity-40 " +
                (status === "listening" ? "bg-gold listening-rings" : "bg-primary")
              }
            >
              {status === "listening" ? (
                <Square className="h-7 w-7" fill="currentColor" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
            <p className="text-sm text-muted-foreground">
              {status === "listening"
                ? "Listening… tap Stop when you finish"
                : status === "thinking"
                  ? "Partner is replying…"
                  : "Tap the microphone and answer in Spanish"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
