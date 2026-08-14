// Site-wide TTS routing. A learner-selected Google Cloud voice follows them
// across Reader, cards, games, listening drills, Speak, and specialty modules.
// Device speech remains the no-cost fallback. Pashto keeps the ElevenLabs
// fallback when neither a Google preference nor an on-device voice exists.

import { decodeGoogleVoicePreference, languageFamily } from "@/data/mission-tts";
import { speakMissionTts, stopMissionTts } from "@/lib/mission-tts";
import { configureUtterance, getStoredVoicePreference, getVoicesForLocale } from "@/lib/voices";

const REMOTE_TTS_BY_FAMILY: Record<string, string> = {
  ps: "ps",
};

let shared: HTMLAudioElement | null = null;
function audioEl(): HTMLAudioElement {
  if (!shared) shared = new Audio();
  return shared;
}

function selectedGoogleVoice(locale: string, preferredVoiceURI?: string | null) {
  const preference =
    preferredVoiceURI === undefined ? getStoredVoicePreference(locale) : preferredVoiceURI;
  return decodeGoogleVoicePreference(preference);
}

/** True when playback should use a selected server voice or needs the Pashto fallback. */
export function needsRemoteTTS(locale: string, preferredVoiceURI?: string | null): boolean {
  if (selectedGoogleVoice(locale, preferredVoiceURI)) return true;
  const family = languageFamily(locale);
  if (!(family in REMOTE_TTS_BY_FAMILY)) return false;
  return getVoicesForLocale(locale).length === 0;
}

export function stopRemoteTTS(): void {
  stopMissionTts();
  if (shared) {
    shared.pause();
    shared.currentTime = 0;
  }
}

function speakOnDevice(
  text: string,
  locale: string,
  rate: number,
  preferredVoiceURI: string | null | undefined,
  onend?: () => void,
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onend?.();
    return Promise.resolve();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  configureUtterance(
    utterance,
    locale,
    decodeGoogleVoicePreference(preferredVoiceURI) ? null : preferredVoiceURI,
  );
  utterance.rate = rate;
  return new Promise<void>((resolve) => {
    const done = () => {
      onend?.();
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
      opts?.onend?.();
      return;
    } catch {
      await speakOnDevice(text, locale, rate, opts?.voiceURI, opts?.onend);
      return;
    }
  }

  const lang = REMOTE_TTS_BY_FAMILY[languageFamily(locale)];
  if (!lang) {
    await speakOnDevice(text, locale, rate, opts?.voiceURI, opts?.onend);
    return;
  }

  const el = audioEl();
  el.pause();
  el.src = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
  el.playbackRate = rate;

  await new Promise<void>((resolve) => {
    const done = () => {
      el.onended = null;
      el.onerror = null;
      opts?.onend?.();
      resolve();
    };
    el.onended = done;
    el.onerror = done;
    el.play().catch(done);
  });
}
