import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp, type Language } from "@/state/app-state";
import { useSpeak } from "@/state/speak-state";
import { ACCENTS_BY_LANGUAGE, useSpeech } from "@/state/speech-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";
import { celebrate, looseIncludes } from "@/lib/confetti";
import { getModule } from "@/data/modules";
import { matchesFocus } from "@/lib/module-filter";
import { ChallengePanel, type SpeakChallenge } from "@/components/speak/ChallengePanel";
import { SpeakingMissionsPreview } from "@/components/speak/SpeakingMissionsPreview";
import { ModuleMatchPanel } from "@/components/modules/ModuleMatchPanel";
import { useAiGate } from "@/state/ai-gate-state";
import { speakingRequestHeaders } from "@/lib/speaking-client";
import { setSpeakingPrivacyMode } from "@/lib/speaking-privacy";

const TOPIC_CHIPS: Record<Language, string[]> = {
  Spanish: [
    "Cuéntame sobre tu ciudad 🏙️",
    "Describe tu mañana ☀️",
    "¿Cuál es tu comida favorita? 🍽️",
    "Hablemos de viajes ✈️",
  ],
  French: [
    "Parle-moi de ta ville 🏙️",
    "Décris ta matinée ☀️",
    "Quel est ton plat préféré ? 🍽️",
    "Parlons de voyages ✈️",
  ],
  German: [
    "Erzähl mir von deiner Stadt 🏙️",
    "Beschreibe deinen Morgen ☀️",
    "Was ist dein Lieblingsessen? 🍽️",
    "Lass uns über Reisen reden ✈️",
  ],
  Italian: [
    "Raccontami della tua città 🏙️",
    "Descrivi la tua mattina ☀️",
    "Qual è il tuo piatto preferito? 🍽️",
    "Parliamo di viaggi ✈️",
  ],
  Japanese: [
    "あなたの街について教えて 🏙️",
    "朝のことを話して ☀️",
    "好きな食べ物は? 🍽️",
    "旅行について話そう ✈️",
  ],
  Korean: [
    "당신의 도시에 대해 말해주세요 🏙️",
    "아침에 대해 이야기해 봅시다 ☀️",
    "좋아하는 음식이 무엇입니까? 🍽️",
    "여행에 대해 이야기합시다 ✈️",
  ],
  Portuguese: [
    "Fale sobre sua cidade 🏙️",
    "Descreva sua manhã ☀️",
    "Qual é sua comida favorita? 🍽️",
    "Vamos falar sobre viagens ✈️",
  ],
  Pashto: [
    "خپل ښار راته وښایه 🏙️",
    "خپل سهار تشریح کړه ☀️",
    "ستا خوښ خواړه کوم دي؟ 🍽️",
    "راځه چې د سفر خبرې وکړو ✈️",
  ],
  English: [
    "Tell me about your city 🏙️",
    "Describe your morning ☀️",
    "What's your favorite food? 🍽️",
    "Let's talk about travel ✈️",
  ],
};

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

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function SpeakLearn() {
  const { state, dispatch } = useApp();
  const { gated } = useAiGate();
  const {
    turns,
    exchanges,
    addTurn,
    appendToTurn,
    setTipFor,
    incrementExchanges,
    addSeconds,
    clear,
  } = useSpeak();
  const language = state.selectedLanguage;
  const learningPairIsValid = language !== state.nativeLanguage;
  const { accent: chosenAccent, voiceURI } = useSpeech();
  const accent = chosenAccent || ACCENTS_BY_LANGUAGE[language][0].code;
  const chips = TOPIC_CHIPS[language];

  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [thinking, setThinking] = useState(false);
  const [challenge, setChallenge] = useState<SpeakChallenge | null>(null);
  const [surface, setSurface] = useState<"missions" | "conversation">("missions");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    setSpeakingPrivacyMode(true);
    return () => setSpeakingPrivacyMode(false);
  }, []);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    setChallenge(null);
  }, [language]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns.length, interim, thinking]);

  // Track conversation minutes — start clock on first user turn, flush on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      abortRef.current?.abort();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopRemoteTTS();
      if (sessionStartRef.current != null) {
        const secs = Math.round((Date.now() - sessionStartRef.current) / 1000);
        addSeconds(secs);
        if (secs > 0) {
          dispatch({
            type: "ADD_SPEAK_SECONDS",
            payload: { lang: language, seconds: secs },
          });
        }
        sessionStartRef.current = null;
      }
    };
  }, [addSeconds, dispatch, language]);

  const speakAloud = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      if (needsRemoteTTS(accent, voiceURI)) {
        void speakRemote(text, accent, { rate: 1, voiceURI });
        return;
      }
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      configureUtterance(u, accent, voiceURI);
      u.rate = 1;
      window.speechSynthesis.speak(u);
    },
    [accent, voiceURI],
  );

  const awardExchange = () => {
    dispatch({ type: "ADD_XP", payload: 10 });
    dispatch({ type: "INC_COUNTER", payload: "conversationExchanges" });
  };

  const fetchGrammarTip = async (userId: string, userText: string) => {
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: await speakingRequestHeaders(),
        body: JSON.stringify({
          mode: "tip",
          language,
          level: state.level,
          nativeLanguage: state.nativeLanguage,
          userText,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { tip: string | null };
      if (data.tip) setTipFor(userId, data.tip);
    } catch {
      /* soft-fail */
    }
  };

  const streamReply = async (userText: string) => {
    setThinking(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Build history payload from existing turns + new user turn
    const history = [
      ...turns.map((t) => ({
        role: t.role === "user" ? ("user" as const) : ("assistant" as const),
        content: t.text,
      })),
      { role: "user" as const, content: userText },
    ];

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: await speakingRequestHeaders(),
        body: JSON.stringify({
          mode: "chat",
          language,
          level: state.level,
          nativeLanguage: state.nativeLanguage,
          messages: history,
          userVocabWords:
            state.vocabLang === language && state.userVocab.length
              ? state.userVocab.slice(0, 15).map((v) => v.word)
              : undefined,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let msg = "AI reply failed.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast("Conversation paused", { description: msg });
        setThinking(false);
        return;
      }
      if (!res.body) {
        setThinking(false);
        return;
      }

      const aiTurn = addTurn("ai", "");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              full += delta;
              appendToTurn(aiTurn.id, delta);
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      setThinking(false);
      if (full.trim()) {
        speakAloud(full);
        incrementExchanges();
        awardExchange();
      }
    } catch (e: unknown) {
      setThinking(false);
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast("Network error", {
          description: "Couldn't reach the conversation partner.",
        });
      }
    }
  };

  const submitTurn = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    gated(() => doSubmitTurn(trimmed));
  };

  const doSubmitTurn = (trimmed: string) => {
    if (sessionStartRef.current == null) sessionStartRef.current = Date.now();
    const userTurn = addTurn("user", trimmed);

    // Challenge completion check
    if (challenge) {
      const target = challenge.keyword || challenge.target;
      if (looseIncludes(trimmed, target)) {
        celebrate();
        const bonus = challenge.kind === "reach" ? 30 : 20;
        dispatch({ type: "ADD_XP", payload: bonus });
        dispatch({
          type: "RECORD_CHALLENGE",
          payload: {
            id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: challenge.kind,
            hint: challenge.hint,
            sentence: trimmed,
            language,
            xp: bonus,
            clearedAt: Date.now(),
          },
        });
        toast(
          challenge.kind === "reach" ? "🎉 Reach word nailed!" : "🎉 Grammar challenge cleared!",
          { description: `+${bonus} XP — ${challenge.hint}` },
        );
        setTipFor(userTurn.id, `Challenge complete: ${challenge.hint}`);
        setChallenge(null);
      }
    }

    void streamReply(trimmed);
    void fetchGrammarTip(userTurn.id, trimmed);
  };

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast("Speech recognition not supported", {
        description: "Try Chrome or Edge for the best Speak & Learn experience.",
      });
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = accent;
      rec.continuous = false;
      rec.interimResults = true;

      let finalText = "";
      rec.onresult = (e) => {
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interimText += r[0].transcript;
        }
        setInterim(interimText);
      };
      rec.onerror = (e) => {
        if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
          toast("Mic error", { description: String(e.error) });
        }
      };
      rec.onend = () => {
        setListening(false);
        setInterim("");
        if (finalText.trim()) submitTurn(finalText);
      };

      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch (err) {
      toast("Could not start mic", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const sendChip = (text: string) => {
    speakAloud(text);
    submitTurn(text);
  };

  const isEmpty = turns.length === 0;

  const transcript = useMemo(
    () => (
      <div
        ref={transcriptRef}
        className="h-[420px] overflow-y-auto rounded-3xl border border-border/60 bg-card/40 p-5 backdrop-blur"
      >
        {isEmpty && !interim ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-serif text-2xl text-foreground/70">Your conversation begins here</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Tap the microphone or pick a topic chip to start speaking {language}.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {turns.map((t) => (
              <li
                key={t.id}
                className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div className="max-w-[85%]">
                  <div
                    className={
                      t.role === "user"
                        ? "rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm"
                        : "flex items-start gap-2 rounded-2xl rounded-bl-sm border border-gold/30 bg-background/60 px-4 py-2.5 text-sm text-foreground shadow-sm"
                    }
                  >
                    {t.role === "ai" && (
                      <button
                        onClick={() => speakAloud(t.text)}
                        className="mt-0.5 shrink-0 text-gold transition-opacity hover:opacity-80"
                        aria-label="Replay"
                      >
                        🔊
                      </button>
                    )}
                    <span className="leading-relaxed whitespace-pre-wrap">
                      {t.text || (t.role === "ai" ? "…" : "")}
                    </span>
                  </div>
                  {t.tip && (
                    <div className="mt-1 inline-block rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
                      💡 Tip: {t.tip}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {interim && (
              <li className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-dashed border-primary/50 bg-primary/10 px-4 py-2.5 text-sm italic text-foreground/80">
                  {interim}
                </div>
              </li>
            )}
            {thinking && (
              <li className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-gold/20 bg-background/40 px-4 py-2 text-xs text-muted-foreground">
                  thinking…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    ),
    [turns, interim, isEmpty, language, thinking, speakAloud],
  );

  return (
    <div className="fade-in mx-auto max-w-3xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-foreground">Speak & Learn</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {surface === "missions"
              ? `Practice a focused ${language} situation with a clear goal.`
              : `A patient ${language} conversation partner. Tap, talk, learn.`}
            {surface === "conversation" && exchanges > 0 && (
              <span className="ml-2 text-gold">· {exchanges} exchanges</span>
            )}
          </p>
        </div>
        {surface === "conversation" && turns.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Speaking practice type"
        className="grid grid-cols-2 rounded-2xl border border-border/70 bg-card/40 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={surface === "missions"}
          onClick={() => setSurface("missions")}
          className={
            "rounded-xl px-3 py-2 text-sm transition-colors " +
            (surface === "missions"
              ? "bg-gold text-black"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Scenario missions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={surface === "conversation"}
          onClick={() => setSurface("conversation")}
          className={
            "rounded-xl px-3 py-2 text-sm transition-colors " +
            (surface === "conversation"
              ? "bg-gold text-black"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Free conversation
        </button>
      </div>

      {surface === "missions" ? (
        <SpeakingMissionsPreview />
      ) : !learningPairIsValid ? (
        <div className="mt-4 rounded-3xl border border-gold/30 bg-card/50 p-6 text-center">
          <p className="font-serif text-xl text-foreground">Choose your native language</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your native language and study language must be different before starting a
            conversation.
          </p>
        </div>
      ) : (
        <>
          <ModuleMatchPanel surface="Speak & Learn" className="mb-4" />

          {transcript}

          <ChallengePanel
            language={language}
            nativeLanguage={state.nativeLanguage}
            level={state.level}
            active={challenge}
            onStart={(c) => setChallenge(c)}
            onSpeakAloud={speakAloud}
          />

          {(() => {
            const mod = getModule(state.activeModuleId);
            if (!mod) return null;
            return (
              <div className="mt-6 rounded-3xl border border-gold/40 bg-gold/10 p-4 backdrop-blur">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base leading-none">{mod.emoji}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                    ◈ In {mod.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · roleplay as {mod.userRole}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {mod.challengePrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendChip(p)}
                      disabled={listening || thinking}
                      className="shrink-0 rounded-full border border-gold/50 bg-background/70 px-4 py-1.5 text-sm text-foreground transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-40"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Topic starters
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {(() => {
                const mod = getModule(state.activeModuleId);
                const focus = mod?.vocabFocus ?? null;
                const ordered = focus
                  ? [...chips].sort((a, b) => {
                      const am = matchesFocus(a, focus) ? 1 : 0;
                      const bm = matchesFocus(b, focus) ? 1 : 0;
                      return bm - am;
                    })
                  : chips;
                return ordered.map((chip) => {
                  const inMod = !!focus && matchesFocus(chip, focus);
                  return (
                    <button
                      key={chip}
                      onClick={() => sendChip(chip)}
                      disabled={listening || thinking}
                      className={
                        "shrink-0 rounded-full border bg-background/60 px-4 py-1.5 text-sm text-foreground transition-all hover:bg-gold/10 disabled:opacity-40 " +
                        (inMod
                          ? "border-gold/60 hover:border-gold"
                          : "border-gold/30 hover:border-gold/60")
                      }
                    >
                      {inMod && <span className="mr-1 text-gold">◈</span>}
                      {chip}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            {supported === false ? (
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-center text-sm text-muted-foreground">
                Speech recognition isn’t available in this browser.
                <br />
                Try Chrome or Edge for the full Speak & Learn experience.
              </div>
            ) : (
              <>
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={thinking}
                  aria-label={listening ? "Stop listening" : "Start listening"}
                  className={
                    "relative flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-50 " +
                    (listening
                      ? "bg-gold listening-rings"
                      : "tutor-pulse bg-primary hover:bg-primary/90")
                  }
                >
                  {listening ? (
                    <Square className="h-7 w-7" fill="currentColor" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
                <p className="text-sm text-muted-foreground">
                  {listening
                    ? "Listening… speak naturally"
                    : thinking
                      ? "Partner is replying…"
                      : "Tap the mic to speak"}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
