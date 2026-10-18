// Site-wide TTS routing. A learner-selected Google Cloud voice follows them
// across Reader, cards, games, listening drills, Speak, and specialty modules.
// Device speech remains the no-cost fallback. Pashto keeps the ElevenLabs
// fallback when neither a Google preference nor an on-device voice exists.

import { decodeGoogleVoicePreference, languageFamily } from "@/data/mission-tts";
import { isIosDevice } from "@/lib/pwa-install";
import { speakMissionTts, stopMissionTts } from "@/lib/mission-tts";
import { configureUtterance, getVoicesForLocale } from "@/lib/voices";
import type { SpeakingRequestOwner } from "@/lib/speaking-client";
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
    shared.onplaying = null;
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
  onPlaybackStart?: () => void,
  ownsGeneration = current,
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false as boolean | null);
  }
  const utterance = new SpeechSynthesisUtterance(text);
  configureUtterance(
    utterance,
    locale,
    decodeGoogleVoicePreference(preferredVoiceURI) ? null : preferredVoiceURI,
  );
  utterance.rate = rate;
  return new Promise<boolean | null>((resolve) => {
    let settled = false;
    const done = (heard: boolean | null) => {
      if (settled) return;
      settled = true;
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      if (ownsGeneration()) cancelPlayback = null;
      resolve(current() ? heard : null);
    };
    cancelPlayback = () => {
      done(null);
      window.speechSynthesis.cancel();
    };
    utterance.onstart = () => {
      if (!settled && current()) onPlaybackStart?.();
    };
    utterance.onend = () => done(true);
    utterance.onerror = () => done(false);
    window.speechSynthesis.cancel();
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      done(false);
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
    onerror?: () => void;
    voiceURI?: string | null;
    usage?: "learning" | "mission";
    signal?: AbortSignal;
    owner?: SpeakingRequestOwner;
    /** Protected QA listening text must never fall back to a remote provider. */
    deviceOnly?: boolean;
    onPlaybackStart?: () => void;
  },
): Promise<void> {
  if (opts?.signal?.aborted || (opts?.owner && !opts.owner.isCurrent())) return;
  stopRemoteTTS();
  const playbackGeneration = generation;
  const ownsGeneration = () => generation === playbackGeneration;
  const current = () =>
    ownsGeneration() && !opts?.signal?.aborted && (!opts?.owner || opts.owner.isCurrent());
  const abortOwned = () => {
    if (ownsGeneration()) stopRemoteTTS();
  };
  opts?.signal?.addEventListener("abort", abortOwned, { once: true });
  try {
    let started = false;
    const notifyStart = () => {
      if (current() && !started) {
        started = true;
        opts?.onPlaybackStart?.();
      }
    };
    let notified = false;
    const notify = (heard = true) => {
      if (!current() || notified) return;
      notified = true;
      if (heard) opts?.onend?.();
      else opts?.onerror?.();
    };
    const rate = opts?.rate ?? 1;
    const googleVoice = opts?.deviceOnly ? null : selectedGoogleVoice(locale, opts?.voiceURI);
    if (googleVoice) {
      if (opts?.owner && !opts.owner.userId) {
        const heard = await speakOnDevice(
          text,
          locale,
          rate,
          opts.voiceURI,
          current,
          notifyStart,
          ownsGeneration,
        );
        if (heard !== null) notify(heard);
        return;
      }
      try {
        await speakMissionTts({
          text,
          voiceName: googleVoice.voiceName,
          languageCode: googleVoice.languageCode,
          speakingRate: rate,
          usage: opts?.usage ?? "learning",
          onPlaybackStart: notifyStart,
          owner: opts?.owner,
          signal: opts?.signal,
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
        const heard = await speakOnDevice(
          text,
          locale,
          rate,
          opts?.voiceURI,
          current,
          notifyStart,
          ownsGeneration,
        );
        if (heard !== null) notify(heard);
        return;
      }
    }

    const lang =
      !opts?.deviceOnly && needsRemoteTTS(locale, opts?.voiceURI)
        ? REMOTE_TTS_BY_FAMILY[languageFamily(locale)]
        : undefined;
    if (!lang) {
      const heard = await speakOnDevice(
        text,
        locale,
        rate,
        opts?.voiceURI,
        current,
        notifyStart,
        ownsGeneration,
      );
      if (heard !== null) notify(heard);
      return;
    }

    const el = audioEl();
    el.pause();
    el.src = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
    el.playbackRate = rate;
    el.onplaying = notifyStart;

    const completed = await new Promise<boolean | null>((resolve) => {
      let settled = false;
      const done = (heard: boolean | null) => {
        if (settled) return;
        settled = true;
        if (ownsGeneration()) {
          cancelPlayback = null;
          el.onplaying = null;
          el.onended = null;
          el.onerror = null;
          el.removeAttribute("src");
          el.load();
        }
        resolve(current() ? heard : null);
      };
      cancelPlayback = () => done(null);
      el.onended = () => done(true);
      el.onerror = () => done(false);
      try {
        el.play().catch(() => done(false));
      } catch {
        done(false);
      }
    });
    if (completed !== null) notify(completed);
  } finally {
    opts?.signal?.removeEventListener("abort", abortOwned);
  }
}
