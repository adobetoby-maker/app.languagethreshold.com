import { useCallback, useEffect, useRef, useState } from "react";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { useSpeech } from "@/state/speech-state";
import { useAuth } from "@/state/auth-state";
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
export function useMissionarySpeech(context?: string) {
  const { accent, voiceURI } = useSpeech();
  const [rate, setRateState] = useState<MissionaryRate>(1);
  const rateRef = useRef<MissionaryRate>(1);
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const scope = JSON.stringify([actor, accent, voiceURI, rate, context]);
  const activeScope = useRef<string | null>(null);
  const epoch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    epoch.current += 1;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    controller.current?.abort();
    controller.current = null;
  }, []);
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
        rateRef.current = n as MissionaryRate;
        setRateState(n as MissionaryRate);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setRate = useCallback((n: MissionaryRate) => {
    if (!MISSIONARY_RATES.includes(n)) return;
    rateRef.current = n;
    setRateState(n);
    try {
      localStorage.setItem(RATE_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, []);

  const cycleRate = useCallback(() => {
    const i = MISSIONARY_RATES.indexOf(rateRef.current);
    setRate(MISSIONARY_RATES[(i + 1) % MISSIONARY_RATES.length]);
  }, [setRate]);

  useEffect(() => {
    activeScope.current = scope;
    setSpeaking(null);
    return () => {
      activeScope.current = null;
      cancel();
    };
  }, [scope, cancel]);

  const speak = useCallback(
    (id: string, text: string, lang: Language) => {
      if (
        typeof window === "undefined" ||
        activeScope.current !== scope ||
        (actor !== null && !isCurrentUser(actor))
      )
        return;
      const words = text.match(/\S+/g) ?? [];
      if (!words.length) return;
      cancel();
      const playbackEpoch = epoch.current;
      const abort = new AbortController();
      controller.current = abort;
      const current = () =>
        epoch.current === playbackEpoch &&
        activeScope.current === scope &&
        !abort.signal.aborted &&
        (actor === null || isCurrentUser(actor));
      const later = (fn: () => void, ms: number) => {
        const handle = setTimeout(() => {
          if (!current()) return;
          if (timer.current === handle) timer.current = null;
          fn();
        }, ms);
        timer.current = handle;
      };
      const localeCode = accent || LOCALE[lang];
      const remote = needsRemoteTTS(localeCode, voiceURI);
      const finish = () => {
        if (!current()) return;
        setSpeaking({ id, index: remote ? 0 : words.length - 1, fading: true });
        later(() => {
          setSpeaking(null);
          if (controller.current === abort) controller.current = null;
        }, 450);
      };
      const play = (phrase: string, onEnd: () => void) => {
        let settled = false;
        const done = (success: boolean) => {
          if (settled || !current()) return;
          settled = true;
          if (success) onEnd();
          else {
            setSpeaking(null);
            if (controller.current === abort) controller.current = null;
          }
        };
        void speakRemote(phrase, localeCode, {
          rate,
          voiceURI,
          signal: abort.signal,
          onend: () => done(true),
          onerror: () => done(false),
        }).catch(() => done(false));
      };
      setSpeaking({ id, index: 0, fading: false });
      if (remote) {
        play(text, finish);
      } else {
        const speakAt = (i: number) => {
          if (!current()) return;
          if (i >= words.length) {
            finish();
            return;
          }
          setSpeaking({ id, index: i, fading: false });
          play(words[i], () => speakAt(i + 1));
        };
        later(() => speakAt(0), 30);
      }
    },
    [accent, voiceURI, rate, actor, isCurrentUser, scope, cancel],
  );

  return { rate, setRate, cycleRate, speak, speaking };
}
