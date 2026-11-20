import { recordedPathForGender, recordedPathForVoice } from "./recorded-audio";
import {
  listeningIssueReason,
  type ListeningIssueReason,
  type ListeningPlaybackSource,
  type RecordingGender,
} from "./listening-audio";
import { prepareBrowserPlayback } from "./browser-audio-session";
// Site-wide TTS routing. A learner-selected Google Cloud voice follows them
// across Reader, cards, games, listening drills, Speak, and specialty modules.
// Public recorded audio plays first and never needs an account. Device speech is the
// no-cost fallback unless the caller asked for HD only (`cloudOnly`), in which case the
// caller is told why HD audio could not play. Pashto keeps the ElevenLabs fallback when
// neither a Google preference nor an on-device voice exists.

import { decodeGoogleVoicePreference, languageFamily } from "@/data/mission-tts";
import { isIosDevice } from "@/lib/pwa-install";
import { speakMissionTts, stopMissionTts } from "@/lib/mission-tts";
import { decideStickyRetry } from "@/lib/tts-audio-cache";
import { configureUtterance, getVoicesForLocale } from "@/lib/voices";
import type { SpeakingRequestOwner } from "@/lib/speaking-client";
import { toast } from "sonner";

const REMOTE_TTS_BY_FAMILY: Record<string, string> = {
  ps: "ps",
};

let shared: HTMLAudioElement | null = null;
let generation = 0;
let cancelPlayback: (() => void) | null = null;
let warnedAboutDeviceFallback = false;
const VOICE_WAIT_TOAST_ID = "tts-voice-wait";
/** Waits shorter than this stay silent; longer ones tell the learner the voice is coming. */
const VOICE_WAIT_TOAST_AFTER_MS = 1500;
function audioEl(): HTMLAudioElement {
  if (!shared) shared = new Audio();
  return shared;
}

/** Status and Retry-After carried by a failed /api/mission-tts call (MissionTtsHttpError). */
function httpHint(error: unknown): { status: number | null; retryAfterSeconds: number | null } {
  const hint = error as { status?: unknown; retryAfterSeconds?: unknown } | null;
  return {
    status: typeof hint?.status === "number" ? hint.status : null,
    retryAfterSeconds: typeof hint?.retryAfterSeconds === "number" ? hint.retryAfterSeconds : null,
  };
}

function selectedGoogleVoice(locale: string, preferredVoiceURI?: string | null) {
  return decodeGoogleVoicePreference(preferredVoiceURI ?? null);
}

/** Why an HD request failed, in the learner-facing categories of listening-audio.ts. */
function hdFailureReason(error: unknown, owner?: SpeakingRequestOwner): ListeningIssueReason {
  return listeningIssueReason({
    status: httpHint(error).status,
    online: typeof navigator === "undefined" || navigator.onLine !== false,
    signedIn: !owner || Boolean(owner.userId),
    network: error instanceof TypeError,
    needsSignIn: error instanceof Error && /^Sign in\b/.test(error.message),
  });
}

/** True when playback should use a selected server voice or needs the Pashto fallback. */
export function needsRemoteTTS(locale: string, preferredVoiceURI?: string | null): boolean {
  if (selectedGoogleVoice(locale, preferredVoiceURI)) return true;
  const family = languageFamily(locale);
  if (!(family in REMOTE_TTS_BY_FAMILY)) return false;
  return getVoicesForLocale(locale).length === 0;
}

/**
 * True when public recorded audio exists for this text, accent and voice gender. Lets a
 * surface keep its own device-speech path unless a recording will really play.
 */
export function hasRecordedListeningAudio(
  text: string,
  locale: string,
  gender: RecordingGender,
): boolean {
  return recordedPathForGender(text, locale, gender) !== null;
}

function stopRoutedPlayback(): void {
  generation += 1;
  const cancel = cancelPlayback;
  cancelPlayback = null;
  cancel?.();
  if (shared) {
    shared.pause();
    shared.onplaying = null;
    shared.onended = null;
    shared.onerror = null;
    shared.removeAttribute("src");
    shared.load();
  }
}

export function stopRemoteTTS(): void {
  stopRoutedPlayback();
  stopMissionTts();
}

/** How long a device utterance may take to start before the caller gives up on it. */
const DEVICE_SPEECH_START_MS = 5000;
let heldUtterance: SpeechSynthesisUtterance | null = null;

/** Upper bound for a started device utterance: generous per-character time plus slack. */
function deviceSpeechLimitMs(text: string, rate: number) {
  return Math.min(90_000, 5000 + (text.length * 110) / Math.max(rate, 0.5));
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
  prepareBrowserPlayback();
  const utterance = new SpeechSynthesisUtterance(text);
  configureUtterance(
    utterance,
    locale,
    decodeGoogleVoicePreference(preferredVoiceURI) ? null : preferredVoiceURI,
  );
  utterance.rate = rate;
  return new Promise<boolean | null>((resolve) => {
    let settled = false;
    // Chrome and simulator Safari can drop an utterance without firing any event; never wait forever.
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number, heard: boolean) => {
      if (watchdog !== undefined) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        if (settled) return;
        done(heard);
        window.speechSynthesis.cancel();
      }, ms);
      (watchdog as { unref?: () => void }).unref?.();
    };
    const done = (heard: boolean | null) => {
      if (settled) return;
      settled = true;
      if (watchdog !== undefined) clearTimeout(watchdog);
      if (heldUtterance === utterance) heldUtterance = null;
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
      if (settled) return;
      arm(deviceSpeechLimitMs(text, rate), true);
      if (current()) onPlaybackStart?.();
    };
    utterance.onend = () => done(true);
    utterance.onerror = () => done(false);
    window.speechSynthesis.cancel();
    // Holding a reference stops Chrome from collecting the utterance before onend fires.
    heldUtterance = utterance;
    arm(DEVICE_SPEECH_START_MS, false);
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {
      done(false);
    }
  });
}

/**
 * Play through recorded audio, the selected Google voice, or the Pashto fallback. Google
 * failures fall back to an installed device voice so learning remains usable, unless the
 * caller set `cloudOnly`: then nothing else is played and `onerror` receives the reason.
 */
export async function speakRemote(
  text: string,
  locale: string,
  opts?: {
    rate?: number;
    /** Told what produced the sound, so only HD audio is ever described as HD. */
    onend?: (source?: ListeningPlaybackSource) => void;
    /** With `cloudOnly`, told why HD audio could not play. */
    onerror?: (reason?: ListeningIssueReason) => void;
    voiceURI?: string | null;
    usage?: "learning" | "mission";
    signal?: AbortSignal;
    owner?: SpeakingRequestOwner;
    /** Protected QA listening text must never fall back to a remote provider. */
    deviceOnly?: boolean;
    /** HD only: never substitute a device voice. */
    cloudOnly?: boolean;
    /**
     * Public recorded audio for this accent and voice gender may play even when no cloud
     * voice is selected (signed out, offline, voices still loading).
     */
    recordedGender?: RecordingGender;
    /** Why no cloud voice is selected, reported when `cloudOnly` finds no recording either. */
    unavailableReason?: ListeningIssueReason;
    onPlaybackStart?: (source?: ListeningPlaybackSource) => void;
  },
): Promise<void> {
  if (opts?.signal?.aborted || (opts?.owner && !opts.owner.isCurrent())) return;
  stopRemoteTTS();
  const playbackGeneration = generation;
  const ownsGeneration = () => generation === playbackGeneration;
  const current = () =>
    ownsGeneration() && !opts?.signal?.aborted && (!opts?.owner || opts.owner.isCurrent());
  const abortOwned = () => {
    if (ownsGeneration()) stopRoutedPlayback();
  };
  opts?.signal?.addEventListener("abort", abortOwned, { once: true });
  try {
    let started = false;
    let source: ListeningPlaybackSource = "device";
    const notifyStart = () => {
      if (current() && !started) {
        started = true;
        opts?.onPlaybackStart?.(source);
      }
    };
    let notified = false;
    const notify = (heard = true, reason?: ListeningIssueReason) => {
      if (!current() || notified) return;
      notified = true;
      if (heard) opts?.onend?.(source);
      else opts?.onerror?.(reason);
    };
    const rate = opts?.rate ?? 1;
    const googleVoice = opts?.deviceOnly ? null : selectedGoogleVoice(locale, opts?.voiceURI);
    // A recording made by the selected cloud voice, or (when the caller allows it) the public
    // recording for this accent and gender. Neither lookup needs an account.
    const recorded =
      opts?.deviceOnly || opts?.usage === "mission"
        ? null
        : googleVoice
          ? recordedPathForVoice(text, googleVoice.voiceName, googleVoice.languageCode)
          : opts?.recordedGender
            ? recordedPathForGender(text, locale, opts.recordedGender)
            : null;
    const noCloudVoiceReason = () =>
      opts?.unavailableReason ??
      listeningIssueReason({
        status: null,
        online: typeof navigator === "undefined" || navigator.onLine !== false,
        signedIn: !opts?.owner || Boolean(opts.owner.userId),
      });
    // A recording that exists but would not load or play is not a missing recording: the
    // learner is told to check the connection or try again, never to sign in for a clip that
    // needs no account.
    const failedRecordingReason = () =>
      listeningIssueReason({
        status: null,
        online: typeof navigator === "undefined" || navigator.onLine !== false,
        signedIn: true,
      });
    let recordingFailed = false;
    if (opts?.cloudOnly && !googleVoice && !recorded) {
      notify(false, noCloudVoiceReason());
      return;
    }
    if (!current()) return;
    if (recorded) {
      source = "recording";
      const el = audioEl();
      el.src = recorded;
      el.playbackRate = Math.max(0.5, Math.min(2, rate));
      prepareBrowserPlayback();
      el.onplaying = notifyStart;
      const heard = await new Promise<boolean | null>((resolve) => {
        let settled = false;
        const done = (result: boolean | null) => {
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
          resolve(current() ? result : null);
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
      if (heard === null) return;
      if (heard) {
        notify();
        return;
      }
      // A missing or unplayable clip follows the existing Google/device fallback.
      source = "device";
      recordingFailed = true;
      if (opts?.cloudOnly && !googleVoice) {
        notify(false, failedRecordingReason());
        return;
      }
    }
    if (googleVoice) {
      if (opts?.owner && !opts.owner.userId) {
        if (opts.cloudOnly) {
          // Text with no recording needs the cloud voice, and that needs an account.
          notify(false, recordingFailed ? failedRecordingReason() : "sign-in");
          return;
        }
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
      let retried = false;
      for (;;) {
        try {
          source = "hd";
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
          // Rate limited: keep the chosen Google voice and retry once after the server's hint.
          const decision = decideStickyRetry({
            ...httpHint(error),
            alreadyRetried: retried,
          });
          if (decision.action === "retry") {
            retried = true;
            const showToast = decision.waitMs > VOICE_WAIT_TOAST_AFTER_MS;
            if (showToast) {
              toast.message("Loading voice…", {
                id: VOICE_WAIT_TOAST_ID,
                duration: decision.waitMs + 1000,
              });
            }
            const waited = await new Promise<boolean>((resolve) => {
              const done = (completed: boolean) => {
                clearTimeout(timer);
                if (cancelPlayback === cancelWait) cancelPlayback = null;
                resolve(completed);
              };
              const cancelWait = () => done(false);
              const timer = setTimeout(() => done(true), decision.waitMs);
              cancelPlayback = cancelWait;
            });
            if (showToast) toast.dismiss(VOICE_WAIT_TOAST_ID);
            if (!waited || !current()) return;
            continue;
          }
          if (opts?.cloudOnly) {
            notify(false, hdFailureReason(error, opts.owner));
            return;
          }
          source = "device";
          // Say so once: a device voice must never stand in for the HD voice unannounced.
          if (!warnedAboutDeviceFallback && typeof navigator !== "undefined") {
            warnedAboutDeviceFallback = true;
            const phone = isIosDevice(
              navigator.userAgent,
              navigator.platform,
              navigator.maxTouchPoints,
            );
            toast.warning("HD voice unavailable", {
              description: `Using this ${phone ? "phone" : "device"}’s voice for now. Check your connection, or open Settings → Voices & audio.`,
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

    const controller = new AbortController();
    const cancelRequest = () => controller.abort();
    cancelPlayback = cancelRequest;
    let objectUrl: string | null = null;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!current()) return;
      if (!response.ok) throw new Error("TTS unavailable");
      const blob = await response.blob();
      if (!current()) return;
      objectUrl = URL.createObjectURL(blob);
      const el = audioEl();
      el.pause();
      el.src = objectUrl;
      el.playbackRate = rate;
      prepareBrowserPlayback();
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
        cancelPlayback = () => {
          controller.abort();
          done(null);
        };
        el.onended = () => done(true);
        el.onerror = () => done(false);
        try {
          el.play().catch(() => done(false));
        } catch {
          done(false);
        }
      });
      if (completed !== null) notify(completed);
    } catch {
      if (current()) notify(false);
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (cancelPlayback === cancelRequest) cancelPlayback = null;
    }
  } finally {
    opts?.signal?.removeEventListener("abort", abortOwned);
  }
}
