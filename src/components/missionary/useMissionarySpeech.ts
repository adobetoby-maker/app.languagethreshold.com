import { useCallback, useEffect, useState } from "react";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote, stopRemoteTTS } from "@/lib/tts";
import { useSpeech } from "@/state/speech-state";
import type { Language } from "@/state/app-state";

const RATE_KEY = "lt.missionary.rate.v1";
export const MISSIONARY_RATES = [0.5, 0.75, 1] as const;
export type MissionaryRate = (typeof MISSIONARY_RATES)[number];

const LOCALE: Record<Language, string> = {
  Spanish: "es-CR",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Portuguese: "pt-PT",
  Pashto: "ps-AF",
  English: "en-US",
};

/**
 * Shared TTS helper for the Missionary tab. Speaks a phrase one word at a
 * time so the in-line "currently reading" indicator advances reliably with
 * Google voices (which don't fire `onboundary`). Rate is shared across the
 * whole tab and persisted between sessions (0.5 / 0.75 / 1).
 */
export function useMissionarySpeech() {
  const { accent, voiceURI } = useSpeech();
  const [rate, setRateState] = useState<MissionaryRate>(1);
  const [speaking, setSpeaking] = useState<{
    id: string;
    index: number;
    fading: boolean;
  } | null>(null);

  // Hydrate persisted rate.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RATE_KEY);
      const n = raw ? Number(raw) : NaN;
      if (MISSIONARY_RATES.includes(n as MissionaryRate)) {
        setRateState(n as MissionaryRate);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setRate = useCallback((n: MissionaryRate) => {
    setRateState(n);
    try {
      localStorage.setItem(RATE_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, []);

  const cycleRate = useCallback(() => {
    setRateState((prev) => {
      const i = MISSIONARY_RATES.indexOf(prev);
      const next = MISSIONARY_RATES[(i + 1) % MISSIONARY_RATES.length];
      try {
        localStorage.setItem(RATE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const speak = useCallback(
    (id: string, text: string, lang: Language) => {
      if (typeof window === "undefined") return;
      const localeCode = accent || LOCALE[lang];
      const words = text.match(/\S+/g) ?? [];
      if (words.length === 0) return;

      if (needsRemoteTTS(localeCode, voiceURI)) {
        stopRemoteTTS();
        setSpeaking({ id, index: 0, fading: false });
        void speakRemote(text, localeCode, {
          rate,
          voiceURI,
          onend: () => {
            setSpeaking((s) => (s && s.id === id ? { ...s, fading: true } : s));
            window.setTimeout(() => {
              setSpeaking((s) => (s && s.id === id ? null : s));
            }, 450);
          },
        });
        return;
      }

      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();
      setSpeaking({ id, index: 0, fading: false });

      const speakAt = (i: number) => {
        if (i >= words.length) {
          setSpeaking((s) => (s && s.id === id ? { ...s, fading: true } : s));
          window.setTimeout(() => {
            setSpeaking((s) => (s && s.id === id ? null : s));
          }, 450);
          return;
        }
        setSpeaking({ id, index: i, fading: false });
        const u = new SpeechSynthesisUtterance(words[i]);
        configureUtterance(u, localeCode, voiceURI);
        u.rate = rate;
        u.onend = () => speakAt(i + 1);
        u.onerror = () => speakAt(i + 1);
        window.speechSynthesis.speak(u);
      };
      window.setTimeout(() => speakAt(0), 30);
    },
    [accent, voiceURI, rate],
  );

  return { rate, setRate, cycleRate, speak, speaking };
}
