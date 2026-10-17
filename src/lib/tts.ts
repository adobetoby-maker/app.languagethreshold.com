// Site-wide TTS routing. A learner-selected Google Cloud voice follows them
// across Reader, cards, games, listening drills, Speak, and specialty modules.
// Device speech remains the no-cost fallback. Pashto keeps the ElevenLabs
// fallback when neither a Google preference nor an on-device voice exists.

import { decodeGoogleVoicePreference, languageFamily } from "@/data/mission-tts";
import { isIosDevice } from "@/lib/pwa-install";
import { speakMissionTts, stopMissionTts } from "@/lib/mission-tts";
import { configureUtterance, getVoicesForLocale } from "@/lib/voices";
import { toast } from "sonner";

const REMOTE_TTS_BY_FAMILY: Record<string, string> = {
  ps: "ps",
};

let shared: HTMLAudioElement | null = null;
let generation = 0;
let cancelPlayback: (() => void) | null = null;
let warnedAboutMobileFallback = false;
function audioEl(): HTMLAudioElement {
  if (!shared) shared = new Audio();
  return shared;
}

function selectedGoogleVoice(locale: string, preferredVoiceURI?: string | null) {
  return decodeGoogleVoicePreference(preferredVoiceURI ?? null);
}

/** True when playback should use a selected server voice or needs the Pashto fallback. */
export function needsRemoteTTS(locale: string, preferredVoiceURI?: string | null): boolean {
  if (selectedGoogleVoice(locale, preferredVoiceURI)) return true;
  const family = languageFamily(locale);
  if (!(family in REMOTE_TTS_BY_FAMILY)) return false;
  return getVoicesForLocale(locale).length === 0;
}

export function stopRemoteTTS(): void {
  generation += 1;
  const cancel = cancelPlayback;
  cancelPlayback = null;
  cancel?.();
  stopMissionTts();
  if (shared) {
    shared.pause();
    shared.onended = null;
    shared.onerror = null;
    shared.removeAttribute("src");
    shared.load();
  }
}

function speakOnDevice(
  text: string,
  locale: string,
  rate: number,
  preferredVoiceURI: string | null | undefined,
  current: () => boolean,
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }
  const utterance = new SpeechSynthesisUtterance(text);
  configureUtterance(
    utterance,
    locale,
    decodeGoogleVoicePreference(preferredVoiceURI) ? null : preferredVoiceURI,
  );
  utterance.rate = rate;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      utterance.onend = null;
      utterance.onerror = null;
      if (current()) cancelPlayback = null;
      resolve(current());
    };
    cancelPlayback = () => {
      done();
      window.speechSynthesis.cancel();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.cancel();
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      done();
    }
  });
}

/**
 * Play through the selected Google voice, or the Pashto fallback. Google
 * failures fall back to an installed device voice so learning remains usable.
 */
export async function speakRemote(
  text: string,
  locale: string,
  opts?: {
    rate?: number;
    onend?: () => void;
    voiceURI?: string | null;
    usage?: "learning" | "mission";
  },
): Promise<void> {
  stopRemoteTTS();
  const playbackGeneration = generation;
  const current = () => generation === playbackGeneration;
  let notified = false;
  const notify = () => {
    if (!current() || notified) return;
    notified = true;
    opts?.onend?.();
  };
  const rate = opts?.rate ?? 1;
  const googleVoice = selectedGoogleVoice(locale, opts?.voiceURI);
  if (googleVoice) {
    try {
      await speakMissionTts({
        text,
        voiceName: googleVoice.voiceName,
        languageCode: googleVoice.languageCode,
        speakingRate: rate,
        usage: opts?.usage ?? "learning",
      });
      notify();
      return;
    } catch (error) {
      if (!current() || (error instanceof DOMException && error.name === "AbortError")) return;
      if (
        !warnedAboutMobileFallback &&
        typeof navigator !== "undefined" &&
        isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
      ) {
        warnedAboutMobileFallback = true;
        toast.warning("Clear voice unavailable", {
          description:
            "Using this phone's voice for now. Check your connection or open Voice to choose a downloaded voice.",
          duration: 7000,
        });
      }
      if (await speakOnDevice(text, locale, rate, opts?.voiceURI, current)) notify();
      return;
    }
  }

  const lang = REMOTE_TTS_BY_FAMILY[languageFamily(locale)];
  if (!lang) {
    if (await speakOnDevice(text, locale, rate, opts?.voiceURI, current)) notify();
    return;
  }

  const el = audioEl();
  el.pause();
  el.src = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
  el.playbackRate = rate;

  const completed = await new Promise<boolean>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (current()) {
        cancelPlayback = null;
        el.onended = null;
        el.onerror = null;
        el.removeAttribute("src");
        el.load();
      }
      resolve(current());
    };
    cancelPlayback = done;
    el.onended = done;
    el.onerror = done;
    try {
      el.play().catch(done);
    } catch {
      done();
    }
  });
  if (completed) notify();
}
