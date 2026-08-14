import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  ArrowLeft,
  BookOpenCheck,
  Mic,
  MicOff,
  Send,
  Volume2,
  MessageSquareQuote,
  RotateCcw,
  MessageSquareDot,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/app-state";
import { useSpeech } from "@/state/speech-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { getMissionArea } from "@/data/missionary-content";
import {
  ROLEPLAY_SCENARIOS,
  DIFFICULTY_LABELS,
  DIFFICULTY_BADGE,
  type RoleplayScenario,
} from "@/data/roleplay-scenarios";
import { MissionBanner } from "./MissionBanner";
import { PostSessionFeedback } from "./PostSessionFeedback";
import { ltAnalytics } from "@/lib/lt-analytics";
import { cn } from "@/lib/utils";
import { useAiGate } from "@/state/ai-gate-state";

const VOICE_MODE_KEY = "lt.fieldPrep.voiceMode.v1";

interface FieldPrepMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isFeedback: boolean;
  createdAt: number;
}

// Maps Language → BCP-47 locale, biased toward the mission area's dialect
function speechLocale(language: string, missionAreaName?: string): string {
  if (language === "Spanish") {
    const area = missionAreaName?.toLowerCase() ?? "";
    if (area.includes("mexico")) return "es-MX";
    if (area.includes("spain") || area.includes("iberia")) return "es-ES";
    return "es-419";
  }
  const map: Record<string, string> = {
    French: "fr-FR",
    German: "de-DE",
    Italian: "it-IT",
    Japanese: "ja-JP",
    Korean: "ko-KR",
    Portuguese: missionAreaName?.toLowerCase().includes("brazil") ? "pt-BR" : "pt-PT",
    English: "en-US",
  };
  return map[language] ?? "es-419";
}

function speakAloud(
  text: string,
  locale: string,
  voiceURI: string | null | undefined,
  onEnd?: () => void,
) {
  const clean = text.replace(/[*_`~#[\]]/g, "").trim();
  if (!clean) {
    onEnd?.();
    return;
  }
  if (needsRemoteTTS(locale, voiceURI)) {
    void speakRemote(clean, locale, { voiceURI, onend: onEnd });
    return;
  }
  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }
  const utter = new SpeechSynthesisUtterance(clean);
  configureUtterance(utter, locale, voiceURI);
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function FieldPrepMode() {
  const { state, dispatch } = useApp();
  const { gated } = useAiGate();
  const { voiceURI } = useSpeech();
  const [phase, setPhase] = useState<"select" | "roleplay">("select");
  const [scenario, setScenario] = useState<RoleplayScenario | null>(null);
  const [messages, setMessages] = useState<FieldPrepMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);
  const [listening, setListening] = useState(false);
  const [interimBubble, setInterimBubble] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VOICE_MODE_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const sessionStartRef = useRef<number>(0);
  const feedbackCountRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  const assignmentId = state.moduleAssignments["lds-missionary"] ?? null;
  const area = getMissionArea(assignmentId);
  const locale = speechLocale(state.selectedLanguage, area?.name);

  function toggleVoiceMode() {
    setVoiceMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_MODE_KEY, next ? "on" : "off");
      } catch {
        /* */
      }
      if (!next) {
        stopRemoteTTS();
        window.speechSynthesis?.cancel();
        recRef.current?.stop();
        setSpeaking(false);
        setListening(false);
        setInterimBubble("");
        setInterimTranscript("");
      }
      return next;
    });
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const startScenario = (s: RoleplayScenario) => {
    gated(() => doStartScenario(s));
  };

  const doStartScenario = async (s: RoleplayScenario) => {
    setScenario(s);
    setMessages([]);
    setInput("");
    setPhase("roleplay");
    setUsedVoice(false);
    feedbackCountRef.current = 0;
    sessionStartRef.current = Date.now();
    dispatch({ type: "ADD_XP", payload: 10 });
    ltAnalytics.appEvent("field_prep_start", {
      language: state.selectedLanguage,
      missionArea: area?.id,
      metadata: { scenario_id: s.id },
    });
    // Trigger opening line from the investigator
    await callFieldPrep(s, [], false);
  };

  const exitToSelect = (s: RoleplayScenario | null, currentMessages: FieldPrepMessage[]) => {
    const exchanges = currentMessages.filter((m) => m.role === "user").length;
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    if (exchanges > 0 && s) {
      ltAnalytics.fieldPrepSession({
        scenarioId: s.id,
        language: state.selectedLanguage,
        missionArea: area?.id,
        exchangesCount: exchanges,
        feedbackRequestedCount: feedbackCountRef.current,
        usedVoice,
        durationSeconds: duration,
        completed: exchanges >= 3,
      });
      if (exchanges >= 2) {
        setShowFeedback(true);
        return; // feedback dialog will then close and navigate
      }
    }
    setPhase("select");
    setScenario(null);
    setMessages([]);
  };

  const callFieldPrep = async (
    s: RoleplayScenario,
    history: FieldPrepMessage[],
    requestFeedback: boolean,
  ) => {
    if (streaming) return;
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    const placeholder: FieldPrepMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      isFeedback: requestFeedback,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, placeholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/field-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          scenarioId: s.id,
          investigatorName: s.investigatorName,
          investigatorBackground: s.investigatorBackground,
          openingSetup: s.openingSetup,
          language: state.selectedLanguage,
          level: state.level,
          missionArea: area
            ? {
                name: area.name,
                region: area.region,
                languages: area.languages,
                cultureNote: area.cultureNote,
              }
            : undefined,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          requestFeedback,
        }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(j.error ?? `Request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let accumulated = "";

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (!requestFeedback) {
        dispatch({ type: "INC_COUNTER", payload: "conversationExchanges" });
        // Voice mode: speak the full response, then auto-activate mic
        if (voiceMode && accumulated) {
          setSpeaking(true);
          speakAloud(accumulated, locale, voiceURI, () => {
            setSpeaking(false);
            startListening(true);
          });
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error("Field Prep error", { description: msg });
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !scenario) return;
    gated(() => doSendMessage(trimmed));
  };

  const doSendMessage = async (trimmed: string) => {
    if (!scenario) return;

    const userMsg: FieldPrepMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      isFeedback: false,
      createdAt: Date.now(),
    };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    dispatch({ type: "ADD_XP", payload: 8 });

    await callFieldPrep(scenario, newHistory, false);
  };

  const requestFeedback = async () => {
    if (!scenario || streaming) return;
    feedbackCountRef.current += 1;
    await callFieldPrep(scenario, messages, true);
  };

  const startListening = (autoSend = false) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not available in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = locale;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      if (autoSend) {
        // Voice mode: show forming bubble in chat, never touch textarea
        setInterimBubble(interim || final);
      } else {
        // Text mode: show in status bar only
        setInterimTranscript(interim || final);
      }

      if (final) {
        const transcript = final.trim();
        setInterimBubble("");
        setInterimTranscript("");
        setUsedVoice(true);
        setListening(false);
        if (autoSend && transcript && scenario) {
          const userMsg: FieldPrepMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: transcript,
            isFeedback: false,
            createdAt: Date.now(),
          };
          setMessages((prev) => {
            const next = [...prev, userMsg];
            dispatch({ type: "ADD_XP", payload: 8 });
            callFieldPrep(scenario, next, false);
            return next;
          });
        } else {
          setInput((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
        }
      }
    };
    rec.onerror = () => {
      setListening(false);
      setInterimBubble("");
      setInterimTranscript("");
    };
    rec.onend = () => {
      setListening(false);
      setInterimBubble("");
      setInterimTranscript("");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
    setInterimBubble("");
    setInterimTranscript("");
  };

  if (phase === "select") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <MissionBanner />

        <div>
          <h2 className="font-display text-lg text-foreground">Field Prep Mode</h2>
          <p className="mt-1 font-mono text-[12px] text-muted-foreground max-w-xl">
            Practice real missionary conversations with an AI investigator. The AI stays in
            character — in {state.selectedLanguage} — and only breaks out when you ask for language
            feedback.
          </p>
        </div>

        {(["greenie", "intermediate", "advanced"] as const).map((tier) => {
          const group = ROLEPLAY_SCENARIOS.filter((s) => s.difficulty === tier);
          if (!group.length) return null;
          return (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`rounded-full border px-3 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${DIFFICULTY_BADGE[tier]}`}
                >
                  {DIFFICULTY_LABELS[tier]}
                </span>
                {tier === "greenie" && (
                  <span className="font-mono text-[10px] text-muted-foreground/50">
                    ← Start here
                  </span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} onClick={() => startScenario(s)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Roleplay phase
  return (
    <>
      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}
      {showFeedback && scenario && (
        <PostSessionFeedback
          scenarioId={scenario.id}
          scenarioTitle={scenario.title}
          language={state.selectedLanguage}
          missionArea={area?.id}
          onClose={() => {
            setShowFeedback(false);
            setPhase("select");
            setScenario(null);
            setMessages([]);
          }}
        />
      )}
      <div className="mx-auto max-w-3xl flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Header */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                abortRef.current?.abort();
                exitToSelect(scenario, messages);
              }}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold"
            >
              <ArrowLeft className="h-3 w-3" />
              Scenarios
            </button>
            {scenario && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none">{scenario.emoji}</span>
                <span className="font-display text-sm text-foreground truncate">
                  {scenario.title}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  · {scenario.investigatorName}
                </span>
              </div>
            )}
          </div>
          <MissionBanner compact />
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="custom-scroll flex-1 overflow-y-auto space-y-3 rounded-2xl border border-border/40 bg-card/20 p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="animate-pulse flex gap-1.5">
                {[0, 120, 240].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 rounded-full bg-gold/40"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.isFeedback ? (
              <FeedbackBubble key={m.id} message={m} />
            ) : m.role === "user" ? (
              <UserBubble key={m.id} message={m} />
            ) : (
              <InvestigatorBubble
                key={m.id}
                message={m}
                name={scenario?.investigatorName ?? "Investigator"}
                locale={locale}
                voiceURI={voiceURI}
                language={state.selectedLanguage}
                onWordTap={(word, sentence, x, y) => {
                  speakAloud(word, locale, voiceURI);
                  setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
                }}
              />
            ),
          )}

          {/* Interim voice bubble — shows user's words as they speak in voice mode */}
          {interimBubble && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-midnight/60 px-4 py-2.5 text-sm text-ivory/60 shadow-sm leading-relaxed italic border border-border/30">
                {interimBubble}
                <span className="inline-block w-1.5 h-4 bg-gold/60 ml-1 animate-pulse rounded-sm align-middle" />
              </div>
            </div>
          )}

          {streaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-1.5 px-2">
              {[0, 120, 240].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-pulse rounded-full bg-gold/50"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-3 space-y-2">
          {/* Feedback + Restart row */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={requestFeedback}
              disabled={
                streaming || speaking || messages.filter((m) => m.role === "user").length === 0
              }
              className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-gold/80 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BookOpenCheck className="h-3 w-3" />
              Get Feedback
            </button>
            <button
              onClick={() => scenario && startScenario(scenario)}
              disabled={streaming}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3 w-3" />
              Restart
            </button>
            <button
              onClick={() => {
                if (scenario) setShowFeedback(true);
              }}
              disabled={streaming || messages.filter((m) => m.role === "user").length === 0}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MessageSquareDot className="h-3 w-3" />
              Review
            </button>

            {/* Voice mode toggle */}
            <button
              onClick={toggleVoiceMode}
              title={
                voiceMode
                  ? "Voice conversation on — click to switch to text"
                  : "Text mode — click to enable voice conversation"
              }
              className={cn(
                "ml-auto flex items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all",
                voiceMode
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Radio className={cn("h-3 w-3", voiceMode && speaking && "animate-pulse")} />
              {voiceMode ? "Voice On" : "Voice Off"}
            </button>

            {(streaming || speaking) && (
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  stopRemoteTTS();
                  window.speechSynthesis?.cancel();
                  setSpeaking(false);
                  recRef.current?.stop();
                  setListening(false);
                  setInterimBubble("");
                  setInterimTranscript("");
                }}
                className="rounded-full border border-border/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-destructive/60 hover:text-destructive"
              >
                Stop
              </button>
            )}
          </div>

          {/* Voice mode active indicator */}
          {voiceMode && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/30 bg-card/30 py-2">
              {speaking ? (
                <>
                  <span className="flex gap-0.5">
                    {[0, 80, 160, 240, 320].map((d) => (
                      <span
                        key={d}
                        className="inline-block h-3 w-0.5 animate-bounce rounded-full bg-gold/60"
                        style={{ animationDelay: `${d}ms`, animationDuration: "0.7s" }}
                      />
                    ))}
                  </span>
                  <span className="font-mono text-[10px] text-gold/70 uppercase tracking-widest">
                    Speaking…
                  </span>
                </>
              ) : listening ? (
                <>
                  <Mic className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                  <span className="font-mono text-[10px] text-rose-400/80 uppercase tracking-widest">
                    Listening…
                  </span>
                </>
              ) : streaming ? (
                <>
                  <span className="flex gap-1">
                    {[0, 120, 240].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/50"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                    Thinking…
                  </span>
                </>
              ) : (
                <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  Voice conversation · speak when mic activates
                </span>
              )}
            </div>
          )}

          {/* Input row — shown in text mode, or as fallback in voice mode */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className={cn(
              "flex items-end gap-2",
              voiceMode && "opacity-60 focus-within:opacity-100 transition-opacity",
            )}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                voiceMode
                  ? `Type if needed — mic activates automatically…`
                  : `Reply as the missionary in ${state.selectedLanguage}…`
              }
              rows={1}
              disabled={streaming || speaking}
              className="custom-scroll max-h-32 flex-1 resize-none rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none disabled:opacity-50"
            />
            {!voiceMode && (
              <button
                type="button"
                onClick={listening ? stopListening : () => startListening(false)}
                disabled={streaming}
                title={listening ? "Stop listening" : "Speak your response"}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all disabled:opacity-40",
                  listening
                    ? "border-rose-400/60 bg-rose-400/10 text-rose-400 animate-pulse"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-gold/50 hover:text-gold",
                )}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || streaming || speaking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-midnight transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function ScenarioCard({ scenario, onClick }: { scenario: RoleplayScenario; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-5 text-left transition-all hover:border-gold/40 hover:bg-card/70 hover:shadow-luxe focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{scenario.emoji}</span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
            DIFFICULTY_BADGE[scenario.difficulty],
          )}
        >
          {DIFFICULTY_LABELS[scenario.difficulty]}
        </span>
      </div>

      <div>
        <p className="font-display text-sm text-foreground leading-snug">{scenario.title}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground leading-relaxed">
          {scenario.description}
        </p>
      </div>

      {scenario.tip && (
        <p className="font-mono text-[10px] text-gold/60 leading-relaxed border-t border-border/30 pt-2 mt-1">
          {scenario.tip}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <MessageSquareQuote className="h-3 w-3 text-muted-foreground/50" />
        <span className="font-mono text-[10px] text-muted-foreground/60 truncate">
          {scenario.investigatorName}, {scenario.investigatorAge}
        </span>
      </div>

      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gold opacity-0 transition-opacity group-hover:opacity-30" />
    </button>
  );
}

function InvestigatorBubble({
  message,
  name,
  locale,
  voiceURI,
  language,
  onWordTap,
}: {
  message: FieldPrepMessage;
  name: string;
  locale: string;
  voiceURI?: string | null;
  language: string;
  onWordTap: (word: string, sentence: string, x: number, y: number) => void;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/8 font-mono text-[11px] text-gold/80">
        {name[0]}
      </div>
      <div className="group max-w-[85%] space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
          {name}
        </p>
        <div className="rounded-2xl rounded-tl-sm border border-border/40 bg-card/60 px-4 py-2.5 text-sm text-foreground/90 leading-relaxed">
          {message.content ? (
            <ClickableText text={message.content.replace(/[*_`~#]/g, "")} onWordClick={onWordTap} />
          ) : (
            <span className="text-muted-foreground/40 italic">…</span>
          )}
        </div>
        {message.content && (
          <button
            onClick={() => speakAloud(message.content, locale, voiceURI)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono text-[9px] text-muted-foreground/50 hover:text-gold"
          >
            <Volume2 className="h-3 w-3" />
            Listen again
          </button>
        )}
        <p className="font-mono text-[9px] text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">
          Tap any word to hear it · see definition
        </p>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: FieldPrepMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-midnight px-4 py-2.5 text-sm text-ivory shadow-sm leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}

function FeedbackBubble({ message }: { message: FieldPrepMessage }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-4 space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <BookOpenCheck className="h-3.5 w-3.5 text-gold" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80">
          Language Feedback
        </span>
      </div>
      <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-gold [&_code]:font-mono [&_code]:text-xs [&_code]:text-gold/80 leading-relaxed">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{message.content || " "}</ReactMarkdown>
      </div>
    </div>
  );
}
