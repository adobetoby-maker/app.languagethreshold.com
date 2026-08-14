import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Language } from "./app-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";

export type SpeechMode = "word" | "sentence" | "paragraph";

export interface AccentOption {
  code: string;
  label: string;
}

export const ACCENTS_BY_LANGUAGE: Record<Language, AccentOption[]> = {
  Spanish: [
    { code: "es-CR", label: "Costa Rica (es-CR)" },
    { code: "es-MX", label: "México (es-MX)" },
    { code: "es-US", label: "US Spanish (es-US)" },
    { code: "es-ES", label: "Spain (es-ES)" },
    { code: "es-AR", label: "Argentina (es-AR)" },
  ],
  French: [
    { code: "fr-FR", label: "France (fr-FR)" },
    { code: "fr-CA", label: "Québec (fr-CA)" },
  ],
  German: [
    { code: "de-DE", label: "Germany (de-DE)" },
    { code: "de-AT", label: "Austria (de-AT)" },
    { code: "de-CH", label: "Switzerland (de-CH)" },
  ],
  Italian: [{ code: "it-IT", label: "Italy (it-IT)" }],
  Japanese: [{ code: "ja-JP", label: "Japan (ja-JP)" }],
  Korean: [{ code: "ko-KR", label: "South Korea (ko-KR)" }],
  Portuguese: [
    { code: "pt-BR", label: "Brazil (pt-BR)" },
    { code: "pt-PT", label: "Portugal (pt-PT)" },
  ],
  Pashto: [{ code: "ps-AF", label: "Afghanistan (ps-AF)" }],
  English: [
    { code: "en-US", label: "United States (en-US)" },
    { code: "en-GB", label: "United Kingdom (en-GB)" },
    { code: "en-CA", label: "Canada (en-CA)" },
    { code: "en-IE", label: "Ireland (en-IE)" },
    { code: "en-AU", label: "Australia (en-AU)" },
    { code: "en-NZ", label: "New Zealand (en-NZ)" },
    { code: "en-ZA", label: "South Africa (en-ZA)" },
  ],
};

interface PlaybackInfo {
  mode: SpeechMode;
  sentenceIndex: number; // -1 for word mode
  text: string;
}

interface SpeechCtx {
  // Settings
  rate: number;
  setRate: (n: number) => void;
  accent: string;
  setAccent: (code: string) => void;
  accentsForLanguage: AccentOption[];
  voiceURI: string | null;
  setVoiceURI: (uri: string | null) => void;

  // Last clicked word (from WordCard)
  lastWord: string | null;
  setLastWord: (w: string) => void;

  // Live playback
  playing: boolean;
  current: PlaybackInfo | null;
  activeSentenceIndex: number; // -1 if none

  // Controls
  speakWord: (word?: string) => void;
  speakSentence: (text: string, sentenceIndex: number) => void;
  speakSentences: (
    sentences: { text: string; index: number }[],
    onMove?: (i: number) => void,
  ) => void;
  stop: () => void;

  listenedCount: number;
}

const Ctx = createContext<SpeechCtx | null>(null);

const ACHIEVEMENT_LISTENER = "Good Listener 👂";
const STORAGE_KEY = "lt.speech.v1";

export function SpeechProvider({
  children,
  language,
  onXp,
  onAchievement,
  hasAchievement,
}: {
  children: ReactNode;
  language: Language;
  onXp: (n: number) => void;
  onAchievement: (name: string) => void;
  hasAchievement: (name: string) => boolean;
}) {
  const accentsForLanguage = ACCENTS_BY_LANGUAGE[language];
  const [rate, setRateState] = useState(1);
  const [accent, setAccentState] = useState(accentsForLanguage[0].code);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const [lastWord, setLastWordState] = useState<string | null>(null);
  const [current, setCurrent] = useState<PlaybackInfo | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [listenedCount, setListenedCount] = useState(0);

  // Hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.rate === "number") setRateState(parsed.rate);
        if (typeof parsed.listenedCount === "number") setListenedCount(parsed.listenedCount);
        if (parsed.voiceByLang && typeof parsed.voiceByLang === "object") {
          const v = parsed.voiceByLang[language];
          if (typeof v === "string") setVoiceURIState(v);
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const voiceByLang = { ...(prev.voiceByLang ?? {}) };
      if (voiceURI) voiceByLang[language] = voiceURI;
      else delete voiceByLang[language];
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, listenedCount, voiceByLang }));
    } catch {
      /* ignore */
    }
  }, [rate, listenedCount, voiceURI, language]);

  // Reset accent + voice when language changes (load voice for new language)
  useEffect(() => {
    setAccentState(accentsForLanguage[0].code);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const v = parsed.voiceByLang?.[language];
      setVoiceURIState(typeof v === "string" ? v : null);
    } catch {
      setVoiceURIState(null);
    }
    // Stop any active speech
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopRemoteTTS();
    setPlaying(false);
    setCurrent(null);
    setActiveSentenceIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopRemoteTTS();
    };
  }, []);

  const queueRef = useRef<Array<{ text: string; index: number }>>([]);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopRemoteTTS();
    setPlaying(false);
    setCurrent(null);
    setActiveSentenceIndex(-1);
  }, []);

  const setRate = useCallback((n: number) => {
    setRateState(n);
  }, []);
  const setAccent = useCallback((c: string) => setAccentState(c), []);
  const setVoiceURI = useCallback((uri: string | null) => setVoiceURIState(uri), []);
  const setLastWord = useCallback((w: string) => setLastWordState(w), []);

  const incListened = useCallback(() => {
    setListenedCount((c) => {
      const next = c + 1;
      onXp(1);
      if (next === 10 && !hasAchievement(ACHIEVEMENT_LISTENER)) {
        onAchievement(ACHIEVEMENT_LISTENER);
        toast("👂 Achievement unlocked", {
          description: `${ACHIEVEMENT_LISTENER} — 10 sentences read aloud`,
        });
      }
      return next;
    });
  }, [hasAchievement, onAchievement, onXp]);

  const speakOne = useCallback(
    (text: string, sentenceIndex: number, mode: SpeechMode, onEnd?: () => void) => {
      if (typeof window === "undefined") return;
      if (needsRemoteTTS(accent, voiceURI)) {
        setPlaying(true);
        setCurrent({ mode, sentenceIndex, text });
        if (sentenceIndex >= 0) setActiveSentenceIndex(sentenceIndex);
        void speakRemote(text, accent, {
          rate,
          voiceURI,
          onend: () => {
            if (sentenceIndex >= 0) incListened();
            onEnd?.();
          },
        });
        return;
      }
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      configureUtterance(u, accent, voiceURI);
      u.rate = rate;
      u.onstart = () => {
        setPlaying(true);
        setCurrent({ mode, sentenceIndex, text });
        if (sentenceIndex >= 0) setActiveSentenceIndex(sentenceIndex);
      };
      u.onend = () => {
        if (sentenceIndex >= 0) incListened();
        onEnd?.();
      };
      u.onerror = () => {
        onEnd?.();
      };
      window.speechSynthesis.speak(u);
    },
    [accent, rate, voiceURI, incListened],
  );

  const speakWord = useCallback(
    (word?: string) => {
      const target = (word ?? lastWord ?? "").trim();
      if (!target) {
        toast("No word selected yet", {
          description: "Click a word in the reader first.",
        });
        return;
      }
      stop();
      cancelledRef.current = false;
      setTimeout(() => {
        speakOne(target, -1, "word", () => {
          setPlaying(false);
          setCurrent(null);
        });
      }, 30);
    },
    [lastWord, speakOne, stop],
  );

  const speakSentence = useCallback(
    (text: string, sentenceIndex: number) => {
      stop();
      cancelledRef.current = false;
      setTimeout(() => {
        speakOne(text, sentenceIndex, "sentence", () => {
          setPlaying(false);
          setCurrent(null);
          setActiveSentenceIndex(-1);
        });
      }, 30);
    },
    [speakOne, stop],
  );

  const speakSentences = useCallback(
    (sentences: { text: string; index: number }[], onMove?: (i: number) => void) => {
      if (sentences.length === 0) return;
      stop();
      cancelledRef.current = false;
      queueRef.current = [...sentences];

      const next = () => {
        if (cancelledRef.current) return;
        const item = queueRef.current.shift();
        if (!item) {
          setPlaying(false);
          setCurrent(null);
          setActiveSentenceIndex(-1);
          return;
        }
        onMove?.(item.index);
        speakOne(item.text, item.index, "paragraph", next);
      };

      setTimeout(next, 30);
    },
    [speakOne, stop],
  );

  const value = useMemo(
    () => ({
      rate,
      setRate,
      accent,
      setAccent,
      accentsForLanguage,
      voiceURI,
      setVoiceURI,
      lastWord,
      setLastWord,
      playing,
      current,
      activeSentenceIndex,
      speakWord,
      speakSentence,
      speakSentences,
      stop,
      listenedCount,
    }),
    [
      rate,
      setRate,
      accent,
      setAccent,
      accentsForLanguage,
      voiceURI,
      setVoiceURI,
      lastWord,
      setLastWord,
      playing,
      current,
      activeSentenceIndex,
      speakWord,
      speakSentence,
      speakSentences,
      stop,
      listenedCount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeech() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpeech must be used inside SpeechProvider");
  return c;
}
