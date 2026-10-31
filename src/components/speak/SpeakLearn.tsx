import { RecordedReplyControl } from "./RecordedReplyControl";
import { supportsReplyRecording } from "@/lib/reply-audio-capture";
import { watchRecognition } from "@/lib/recognition-watchdog";
import { speechRecognitionErrorMessage } from "@/lib/speech-recognition-errors";
import { recognitionConstructor, type SpeechRecognitionLike } from "@/lib/phone-dictation";
import { bestAvailableSpeechTranscript } from "@/lib/speaking-transcript";
import { SPEAKING_CONSENT_CHANGED } from "@/lib/speaking-consent-events";
import { usePracticeViewport } from "@/hooks/use-practice-viewport";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { useApp, type Language } from "@/state/app-state";
import { useSpeak } from "@/state/speak-state";
import { ACCENTS_BY_LANGUAGE, useSpeech } from "@/state/speech-state";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { useAuth } from "@/state/auth-state";
import { celebrate, looseIncludes } from "@/lib/confetti";
import { getModule } from "@/data/modules";
import { matchesFocus } from "@/lib/module-filter";
import { ChallengePanel, type SpeakChallenge } from "@/components/speak/ChallengePanel";
import { SpeakingMissionsPreview } from "@/components/speak/SpeakingMissionsPreview";
import { ModuleMatchPanel } from "@/components/modules/ModuleMatchPanel";
import { useAiGate } from "@/state/ai-gate-state";
import { getSpeakingAgeAttestation, speakingRequestHeaders } from "@/lib/speaking-client";
import { setSpeakingPrivacyMode } from "@/lib/speaking-privacy";
import { LessonReturnPill } from "@/components/core30/LessonReturnPill";

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
  Chinese: [
    "跟我说说你的城市 🏙️",
    "描述一下你的早晨 ☀️",
    "你最喜欢的食物是什么? 🍽️",
    "我们聊聊旅行吧 ✈️",
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

  const [useRecordedAudio, setUseRecordedAudio] = useState(false);
  const [audioCaptureBusy, setAudioCaptureBusy] = useState(false);
  const [audioCaptureKey, setAudioCaptureKey] = useState(0);
  useEffect(() => {
    setUseRecordedAudio(supportsReplyRecording());
  }, []);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [automaticReplyAudio, setAutomaticReplyAudio] = useState(false);
  const [startingMic, setStartingMic] = useState(false);
  const micActive = listening || startingMic;
  const [interim, setInterim] = useState("");
  const [thinking, setThinking] = useState(false);
  const [typedTurn, setTypedTurn] = useState("");
  const [conversationError, setConversationError] = useState<string | null>(null);
  const finishRecognitionRef = useRef<(() => void) | null>(null);
  const [challenge, setChallenge] = useState<SpeakChallenge | null>(null);
  const [missionFocused, setMissionFocused] = useState(false);
  const [surface, setSurface] = useState<"missions" | "conversation">("missions");
  const conversationViewport = usePracticeViewport(surface);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const { isCurrentUser } = useAuth();
  const {
    key: lifecycleKey,
    actor,
    capture,
    cancel,
  } = usePracticeLifecycle(
    JSON.stringify([
      language,
      state.nativeLanguage,
      state.activeModuleId,
      accent,
      voiceURI,
      surface,
    ]),
  );
  const { speak: speakOwned, stop: stopOwned } = useOwnedPlayback(lifecycleKey);
  const [consentStatus, setConsentStatus] = useState<{ owner: string | null; allowed: boolean }>({
    owner: null,
    allowed: false,
  });
  const [consentRevision, setConsentRevision] = useState(0);
  const conversationAllowed = !!actor && consentStatus.owner === actor && consentStatus.allowed;
  useEffect(() => {
    const refresh = () => setConsentRevision((value) => value + 1);
    window.addEventListener(SPEAKING_CONSENT_CHANGED, refresh);
    return () => window.removeEventListener(SPEAKING_CONSENT_CHANGED, refresh);
  }, []);
  useEffect(() => {
    setConsentStatus({ owner: actor, allowed: false });
    if (!actor || surface !== "conversation") return;
    const controller = new AbortController();
    getSpeakingAgeAttestation(controller.signal, {
      userId: actor,
      isCurrent: () => !controller.signal.aborted && isCurrentUser(actor),
    })
      .then((allowed) => {
        if (!controller.signal.aborted && isCurrentUser(actor))
          setConsentStatus({ owner: actor, allowed });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [actor, surface, isCurrentUser, consentRevision]);

  useEffect(() => {
    setListening(false);
    setStartingMic(false);
    setInterim("");
    setThinking(false);
    setTypedTurn("");
    setConversationError(null);
  }, [lifecycleKey]);
  const stopPractice = () => {
    if (!capture().isCurrent()) return;
    cancel();
    setAudioCaptureKey((value) => value + 1);
    stopOwned();
    setListening(false);
    setStartingMic(false);
    setInterim("");
    setThinking(false);
  };

  useEffect(() => {
    setSpeakingPrivacyMode(true);
    return () => setSpeakingPrivacyMode(false);
  }, []);

  useEffect(() => {
    setSupported(recognitionConstructor() !== null);
  }, []);

  useEffect(() => {
    setChallenge(null);
  }, [language]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, interim, thinking]);

  // Track conversation minutes — start clock on first user turn, flush on unmount
  useEffect(() => {
    return () => {
      if (sessionStartRef.current != null) {
        const secs = Math.round((Date.now() - sessionStartRef.current) / 1000);
        if (actor !== null && !isCurrentUser(actor)) {
          sessionStartRef.current = null;
          return;
        }
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
  }, [addSeconds, dispatch, language, actor, isCurrentUser]);

  const speakAloud = useCallback(
    (text: string) => {
      if (!audioCaptureBusy) speakOwned(text, accent, voiceURI, 1);
    },
    [speakOwned, accent, voiceURI, audioCaptureBusy],
  );

  const awardExchange = () => {
    dispatch({ type: "ADD_XP", payload: 10 });
    dispatch({ type: "INC_COUNTER", payload: "conversationExchanges" });
  };

  const fetchGrammarTip = async (userId: string, userText: string) => {
    const lease = capture();
    if (!lease.isCurrent()) return;
    const ctrl = new AbortController();
    const release = lease.own(() => ctrl.abort());
    const current = () => lease.isCurrent() && !ctrl.signal.aborted;
    try {
      const headers = await speakingRequestHeaders(
        { userId: actor ?? "", isCurrent: current },
        ctrl.signal,
      );
      if (!current()) return;
      const res = await fetch("/api/speak", {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          mode: "tip",
          language,
          level: state.level,
          nativeLanguage: state.nativeLanguage,
          userText,
        }),
      });
      if (!current() || !res.ok) return;
      const data = (await res.json()) as { tip: string | null };
      if (current() && data.tip) setTipFor(userId, data.tip);
    } catch {
      /* Optional tip; cancellation is silent. */
    } finally {
      release();
    }
  };

  const streamReply = async (userText: string) => {
    const lease = capture();
    if (!lease.isCurrent() || abortRef.current) return;
    setThinking(true);
    setConversationError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const release = lease.own(() => {
      ctrl.abort();
      if (abortRef.current === ctrl) abortRef.current = null;
    });
    const current = () => lease.isCurrent() && !ctrl.signal.aborted && abortRef.current === ctrl;
    let closeReader: (() => void) | undefined;
    const timeout = window.setTimeout(() => {
      if (!current()) return;
      setThinking(false);
      setTypedTurn(userText);
      setConversationError(
        "The reply took too long. Send your answer again, or reset the conversation.",
      );
      abortRef.current = null;
      ctrl.abort();
      closeReader?.();
    }, 45_000);
    const releaseTimeout = lease.own(() => window.clearTimeout(timeout));

    // Build history payload from existing turns + new user turn
    const history = [
      ...turns
        .filter((t) => t.text.trim())
        .slice(-38)
        .map((t) => ({
          role: t.role === "user" ? ("user" as const) : ("assistant" as const),
          content: t.text,
        })),
      { role: "user" as const, content: userText },
    ];

    try {
      const headers = await speakingRequestHeaders(
        { userId: actor ?? "", isCurrent: current },
        ctrl.signal,
      );
      if (!current()) return;
      const res = await fetch("/api/speak", {
        method: "POST",
        headers,
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

      if (!current()) {
        void res.body?.cancel().catch(() => {});
        return;
      }
      if (!res.ok) {
        let msg = "AI reply failed.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        if (!current()) return;
        setTypedTurn(userText);
        setConversationError(msg);
        toast("Conversation paused", { description: msg });
        setThinking(false);
        return;
      }
      if (!res.body) throw new Error("The partner returned no reply. Please try again.");

      const aiTurn = addTurn("ai", "");
      const reader = res.body.getReader();
      const disposeReader = () => {
        void reader.cancel().catch(() => {});
      };
      const releaseReader = lease.own(disposeReader);
      closeReader = () => {
        releaseReader();
        disposeReader();
      };
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (!current()) return;
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

      if (!current()) return;
      setThinking(false);
      if (!done) throw new Error("The reply was interrupted. Please try again.");
      if (!full.trim()) throw new Error("The partner returned no reply. Please try again.");
      if (full.trim()) {
        if (automaticReplyAudio) speakAloud(full);
        incrementExchanges();
        awardExchange();
      }
    } catch (e: unknown) {
      if (!current()) return;
      setThinking(false);
      setTypedTurn(userText);
      setConversationError(
        "Could not finish the reply. Send your answer again, or reset the conversation.",
      );
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast("Network error", {
          description: "Couldn't reach the conversation partner.",
        });
      }
    } finally {
      window.clearTimeout(timeout);
      releaseTimeout();
      closeReader?.();
      if (current()) {
        setThinking(false);
        abortRef.current = null;
      }
      release();
    }
  };

  const submitTurn = (text: string) => {
    if (!conversationAllowed) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    gated(() => doSubmitTurn(trimmed));
  };

  const doSubmitTurn = (trimmed: string) => {
    if (!capture().isCurrent() || abortRef.current || !learningPairIsValid) return;
    if (sessionStartRef.current == null) sessionStartRef.current = Date.now();
    setTypedTurn("");
    setConversationError(null);
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
    if (!conversationAllowed) return;
    const lease = capture();
    if (!lease.isCurrent() || recognitionRef.current || abortRef.current) return;
    const Ctor = recognitionConstructor();
    if (!Ctor) {
      toast("Speech recognition not supported", {
        description: "Try Chrome or Edge for the best Speak & Learn experience.",
      });
      return;
    }
    try {
      stopOwned();
      if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending)
        window.speechSynthesis.cancel();
      const rec = new Ctor();
      rec.lang = accent;
      rec.continuous = false;
      rec.interimResults = true;

      let finalText = "";
      let latestInterim = "";
      let stopTimer: number | undefined;
      let ended = false;
      let stopping = false;
      const current = () => lease.isCurrent() && recognitionRef.current === rec && !ended;
      const dispose = () => {
        readiness.dispose();
        window.clearTimeout(stopTimer);
        if (recognitionRef.current === rec) finishRecognitionRef.current = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        if (recognitionRef.current === rec) recognitionRef.current = null;
        try {
          rec.abort();
        } catch {
          /* Browser may already have stopped. */
        }
      };
      const readiness = watchRecognition(
        rec,
        () => current() && !stopping,
        () => {
          setStartingMic(false);
          setListening(true);
        },
        () => {
          setStartingMic(true);
          setListening(false);
        },
      );
      const release = lease.own(dispose);
      const finalResults = new Map<number, string>();
      rec.onresult = (e) => {
        if (!current()) return;
        readiness.progress();
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalResults.set(i, r[0].transcript);
          else interimText += r[0].transcript;
        }
        finalText = [...finalResults]
          .sort(([a], [b]) => a - b)
          .map(([, value]) => value)
          .join(" ");
        if (interimText) latestInterim = interimText;
        setInterim([finalText, interimText].filter(Boolean).join(" "));
      };
      rec.onerror = (e) => {
        if (!current()) return;
        ended = true;
        release();
        dispose();
        setListening(false);
        setStartingMic(false);
        setInterim("");
        const draft = bestAvailableSpeechTranscript(finalText, latestInterim);
        if (draft) setTypedTurn(draft);
        setConversationError(speechRecognitionErrorMessage(e?.error ?? "unknown"));
        if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
          toast("Mic error", { description: String(e.error) });
        }
      };
      const finish = () => {
        if (!current()) return;
        ended = true;
        release();
        dispose();
        setListening(false);
        setStartingMic(false);
        setInterim("");
        const text = bestAvailableSpeechTranscript(finalText, latestInterim);
        if (text) {
          setTypedTurn(text);
          setConversationError(null);
        } else
          setConversationError(
            "No speech was returned. Try the microphone again, or type your answer.",
          );
      };
      rec.onend = finish;
      finishRecognitionRef.current = () => {
        if (!current() || stopping) return;
        if (!readiness.hasStarted()) {
          ended = true;
          release();
          dispose();
          setListening(false);
          setStartingMic(false);
          setConversationError(null);
          return;
        }
        stopping = true;
        try {
          rec.stop();
        } catch {
          finish();
          return;
        }
        if (current())
          stopTimer = window.setTimeout(
            finish,
            finalText.trim() || latestInterim.trim() ? 800 : 5000,
          );
      };

      recognitionRef.current = rec;
      try {
        setConversationError(null);
        setStartingMic(true);
        setListening(false);
        rec.start();
      } catch (err) {
        release();
        dispose();
        throw err;
      }
    } catch (err) {
      if (!lease.isCurrent()) return;
      setStartingMic(false);
      setListening(false);
      setConversationError("The microphone could not start. Tap it to retry, or type your answer.");
      toast("Could not start mic", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const stopListening = () => finishRecognitionRef.current?.();

  const sendChip = (text: string) => {
    if (!conversationAllowed) return;
    if (!capture().isCurrent() || abortRef.current) return;
    speakAloud(text);
    submitTurn(text);
  };

  const isEmpty = turns.length === 0;

  const transcript = useMemo(
    () => (
      <div
        ref={transcriptRef}
        role="region"
        aria-label="Conversation replies"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur"
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
                <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-dashed border-primary/50 bg-primary/10 px-4 py-2.5 text-sm text-foreground/80">
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
      <LessonReturnPill kind="say" />
      <header
        hidden={surface === "missions" && missionFocused}
        className="mb-3 flex items-end justify-between"
      >
        <div>
          <h1 className="font-serif text-2xl text-foreground">Speak & Learn</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {surface === "missions"
              ? `Practice a focused ${language} situation with a clear goal.`
              : exchanges < 4
                ? `${exchanges} / 4 exchanges`
                : `${exchanges} exchanges · Goal reached`}
          </p>
        </div>
        {surface === "conversation" && (
          <button
            onClick={() => {
              stopPractice();
              clear();
              setTypedTurn("");
              setConversationError(null);
              sessionStartRef.current = null;
            }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </header>

      <div
        hidden={surface === "missions" && missionFocused}
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
        <SpeakingMissionsPreview onFocusChange={setMissionFocused} />
      ) : !learningPairIsValid ? (
        <div className="mt-4 rounded-3xl border border-gold/30 bg-card/50 p-6 text-center">
          <p className="font-serif text-xl text-foreground">Choose your native language</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your native language and study language must be different before starting a
            conversation.
          </p>
        </div>
      ) : (
        <section
          ref={conversationViewport.ref}
          style={conversationViewport.style}
          className="lt-speaking-frame mt-3 flex min-h-0 flex-col gap-2 overflow-hidden"
          aria-label="Free conversation practice"
        >
          {transcript}
          {conversationError && (
            <p role="alert" className="shrink-0 text-sm text-foreground">
              {conversationError}
            </p>
          )}

          {!conversationAllowed && (
            <p role="status" className="text-center text-xs text-muted-foreground">
              AI conversation is off. Sign in and enable it in Settings → Speaking privacy. Other
              lessons stay available.
            </p>
          )}
          <div className="flex shrink-0 items-center justify-center gap-3">
            {useRecordedAudio ? (
              <RecordedReplyControl
                key={`${lifecycleKey}:${audioCaptureKey}:${conversationAllowed}`}
                scope={`${lifecycleKey}:${audioCaptureKey}`}
                locale={accent}
                disabled={thinking || !conversationAllowed}
                onBegin={stopOwned}
                onBusyChange={setAudioCaptureBusy}
                onTranscript={(text) => {
                  setTypedTurn(text);
                  setConversationError(null);
                }}
              />
            ) : supported === false ? (
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-center text-sm text-muted-foreground">
                Speech recognition isn’t available in this browser.
                <br />
                Try Chrome or Edge for the full Speak & Learn experience.
              </div>
            ) : (
              <>
                <button
                  onClick={micActive ? stopListening : startListening}
                  disabled={thinking || !conversationAllowed}
                  aria-label={
                    startingMic
                      ? "Cancel microphone"
                      : listening
                        ? "Stop listening"
                        : "Start listening"
                  }
                  className={
                    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-50 " +
                    (listening
                      ? "bg-gold listening-rings"
                      : "tutor-pulse bg-primary hover:bg-primary/90")
                  }
                >
                  {micActive ? (
                    <Square className="h-7 w-7" fill="currentColor" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
                <p role="status" className="text-sm text-muted-foreground">
                  {startingMic
                    ? "Starting microphone… tap to cancel"
                    : listening
                      ? interim.trim()
                        ? "Words received — tap Stop to review"
                        : "Microphone started — waiting for words…"
                      : thinking
                        ? "Partner is replying…"
                        : "Tap the mic to speak"}
                </p>
              </>
            )}
          </div>
          {!micActive && !thinking && !audioCaptureBusy && typedTurn.trim() && (
            <p
              role="status"
              className="shrink-0 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground"
            >
              Reply ready. Review or edit the words below, then tap Send answer to confirm.
            </p>
          )}
          <form
            className="flex shrink-0 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!thinking && !micActive && !audioCaptureBusy) submitTurn(typedTurn);
            }}
          >
            <input
              aria-label={`Type an answer in ${language}`}
              value={typedTurn}
              onChange={(event) => setTypedTurn(event.target.value)}
              disabled={thinking || micActive || audioCaptureBusy || !conversationAllowed}
              maxLength={2000}
              placeholder={`Type an answer in ${language}…`}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base"
            />
            <button
              type="submit"
              aria-label="Send answer"
              disabled={
                !typedTurn.trim() ||
                thinking ||
                micActive ||
                audioCaptureBusy ||
                !conversationAllowed
              }
              className="flex min-h-11 min-w-11 items-center rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
              <span className="ml-2">Send</span>
            </button>
          </form>
          <details className="relative shrink-0 rounded-xl border border-border px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm">Topics & challenges</summary>
            <div className="absolute bottom-12 inset-x-0 z-30 max-h-[45dvh] overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl">
              <label className="flex shrink-0 items-center justify-between gap-2 text-sm text-foreground">
                <span>V3 capture test · Reply audio</span>
                <select
                  aria-label="Reply audio"
                  disabled={thinking || micActive}
                  value={automaticReplyAudio ? "automatic" : "manual"}
                  onChange={(event) => {
                    stopOwned();
                    setAutomaticReplyAudio(event.target.value === "automatic");
                  }}
                  className="min-h-11 rounded-xl border border-border bg-background px-2"
                >
                  <option value="manual">Tap to play</option>
                  <option value="automatic">Automatic</option>
                </select>
              </label>
              <label className="mb-3 flex items-center justify-between gap-2 text-sm">
                <span>Voice input</span>
                <select
                  aria-label="Voice input"
                  value={useRecordedAudio ? "audio" : "browser"}
                  disabled={thinking || micActive || audioCaptureBusy}
                  onChange={(event) => {
                    stopOwned();
                    setUseRecordedAudio(event.target.value === "audio");
                  }}
                  className="min-h-11 rounded-xl border border-border bg-background px-2"
                >
                  <option value="audio">Audio recording</option>
                  <option value="browser">Browser dictation</option>
                </select>
              </label>
              <ModuleMatchPanel surface="Speak & Learn" className="mb-4" />

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
                          disabled={micActive || thinking}
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
                          disabled={micActive || thinking}
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
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
