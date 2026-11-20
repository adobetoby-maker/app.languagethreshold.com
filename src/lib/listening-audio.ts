// Pure routing for the learner's listening voice (no React, no DOM, no network).
// Shared by the speech provider, the owned-speaker hooks, Settings and the node tests so
// every surface (word matching, cards, verb forms, reading) makes the same decision:
//
//   HD voice     recorded HD audio first (public files, no account), then the HD cloud voice.
//                A device voice is never substituted without the learner saying so, signed
//                in or not: a signed-out learner hears the recordings and is asked first.
//   Device voice the voice installed on this device: when the learner chose it, when the
//                language has no HD voice, or for text that is not in the language being
//                learned (the HD choice is saved per learning language).

import {
  decodeGoogleVoicePreference,
  languageFamily,
  type MissionPartnerVersion,
} from "../data/mission-tts.ts";
import { DEVICE_DEFAULT_VOICE } from "../data/mobile-voice.ts";
import type { ListeningAudioSource } from "../data/standard-voices.ts";

export type RecordingGender = "female" | "male";

/** Why HD audio could not play. Each one maps to plain learner-facing wording below. */
export type ListeningIssueReason = "loading" | "sign-in" | "offline" | "busy" | "unavailable";

/** What actually produced the sound, so nothing but HD audio is ever called HD. */
export type ListeningPlaybackSource = "recording" | "hd" | "device";

/** Language families that have an HD listening voice. Others read with the device voice. */
const HD_LISTENING_FAMILIES = new Set(["es", "fr", "de", "it", "ja", "ko", "pt", "en"]);

export function hdListeningSupported(locale: string): boolean {
  return HD_LISTENING_FAMILIES.has(languageFamily(locale));
}

export const recordingGender = (gender: MissionPartnerVersion): RecordingGender =>
  gender === "man" ? "male" : "female";

/** One notice at a time: a newer miss replaces the older one. */
export const LISTENING_NOTICE_ID = "listening-hd-unavailable";

/**
 * Each notice is its own toast. Withdrawing one and raising the next are then independent, so
 * a notice raised straight after another was withdrawn is never taken down with it.
 */
export const listeningNoticeId = (serial: number): string => `${LISTENING_NOTICE_ID}:${serial}`;

/** The HD voice last resolved for a language, valid only for the same accent and gender. */
export interface RememberedHdVoice {
  accent: string;
  gender: MissionPartnerVersion;
  voiceURI: string;
}

/**
 * The saved HD voice for a language, reused only for exactly the accent and gender it was
 * resolved for. It lets recorded and saved clips play at once on a return visit and while
 * the voice list cannot be fetched (offline).
 */
export function rememberedHdVoice(
  saved: unknown,
  language: string,
  accent: string,
  gender: MissionPartnerVersion,
): string | null {
  const record = (saved as { hdVoiceByLang?: Record<string, RememberedHdVoice> } | null)
    ?.hdVoiceByLang?.[language];
  if (!record || record.accent !== accent || record.gender !== gender) return null;
  return typeof record.voiceURI === "string" && decodeGoogleVoicePreference(record.voiceURI)
    ? record.voiceURI
    : null;
}

export interface ListeningPlanInput {
  /** Locale that will be spoken. */
  locale: string;
  /**
   * The learner's accent for the language being learned. The HD listening choice covers that
   * language only; text in any other language (a native-language card back) is read by the
   * device voice as before and is never described as HD. Omit when `locale` is that accent.
   */
  learningLocale?: string;
  source: ListeningAudioSource;
  gender: MissionPartnerVersion;
  /** Resolved listening voice: an encoded cloud preference, a device voice, or null while resolving. */
  voiceURI: string | null;
  signedIn: boolean;
  /** The learner allowed this device's voice to fill in until HD audio plays again. */
  deviceFallback: boolean;
}

export interface ListeningPlan {
  /**
   * What the learner is told is reading aloud.
   * "hd": recorded HD audio and the HD cloud voice.
   * "recordings": recorded HD audio only (signed out: the HD cloud voice needs an account).
   * "device": this device's voice only.
   */
  mode: "hd" | "recordings" | "device";
  /** Voice preference handed to the audio router; never a cloud voice on a device route. */
  voiceURI: string | null;
  /** Public recorded audio may play for this voice gender without a cloud voice or an account. */
  recordedGender: RecordingGender | null;
  /** Never substitute a device voice: report why HD audio could not play instead. */
  strict: boolean;
  /** Set when no HD cloud voice is selected yet, so a miss can say why. */
  pending: ListeningIssueReason | null;
}

export function planListening(input: ListeningPlanInput): ListeningPlan {
  const cloud = decodeGoogleVoicePreference(input.voiceURI);
  const cloudMatches =
    cloud !== null && languageFamily(cloud.languageCode) === languageFamily(input.locale);
  // A cloud preference must never be handed to the device route as if it were a device voice.
  const deviceVoice = cloud || input.voiceURI === null ? DEVICE_DEFAULT_VOICE : input.voiceURI;
  const otherLanguage =
    input.learningLocale !== undefined &&
    languageFamily(input.learningLocale) !== languageFamily(input.locale);
  if (input.source === "device" || !hdListeningSupported(input.locale) || otherLanguage) {
    return {
      mode: "device",
      voiceURI: deviceVoice,
      recordedGender: null,
      strict: false,
      pending: null,
    };
  }
  const recordedGender = recordingGender(input.gender);
  // HD means HD for everyone: until the learner allows it, a device voice never fills in.
  const strict = !input.deviceFallback;
  if (!input.signedIn) {
    // Public recordings need no account; only the HD cloud voice does. A miss says so.
    return {
      mode: "recordings",
      voiceURI: deviceVoice,
      recordedGender,
      strict,
      pending: "sign-in",
    };
  }
  if (cloudMatches) {
    return { mode: "hd", voiceURI: input.voiceURI, recordedGender, strict, pending: null };
  }
  return {
    mode: "hd",
    voiceURI: deviceVoice,
    recordedGender,
    strict,
    pending: input.voiceURI === null ? "loading" : "unavailable",
  };
}

/** Classify a failed HD request. A status is an HTTP answer; none means it never arrived. */
export function listeningIssueReason(input: {
  status: number | null;
  online: boolean;
  signedIn: boolean;
  /** The request failed before any answer (a dropped or blocked connection). */
  network?: boolean;
  /** The saved session was missing or belonged to another account. */
  needsSignIn?: boolean;
}): ListeningIssueReason {
  if (!input.signedIn || input.needsSignIn || input.status === 401 || input.status === 403)
    return "sign-in";
  if (!input.online || input.network) return "offline";
  if (input.status === 429) return "busy";
  return "unavailable";
}

export interface ListeningIssueCopy {
  title: string;
  description: string;
}

/** Learner-facing wording. No provider, model or engine names. */
export function listeningIssueCopy(reason: ListeningIssueReason): ListeningIssueCopy {
  switch (reason) {
    case "loading":
      return {
        title: "The HD voice is getting ready",
        description: "Try again in a moment.",
      };
    case "sign-in":
      return {
        title: "Sign in to hear this in the HD voice",
        description: "This audio has no recording yet, and the HD voice needs your account.",
      };
    case "offline":
      return {
        title: "The HD voice needs a connection",
        description: "This audio is not saved on this device yet.",
      };
    case "busy":
      return {
        title: "The HD voice is busy",
        description: "Too many requests right now. Try again in a moment.",
      };
    default:
      return {
        title: "The HD voice could not play this",
        description: "Nothing was played in a different voice.",
      };
  }
}

export interface ListeningStatusInput {
  mounted: boolean;
  signedIn: boolean;
  /** The HD cloud voices answered and have a voice for this accent. */
  cloudReady: boolean;
  hdSupported: boolean;
  /** Name of the language being learned, for the unsupported-language sentence. */
  language: string;
}

/** The single availability line in Settings. Says what will really be heard. */
export function listeningStatus(input: ListeningStatusInput): string {
  if (!input.mounted) return "Checking audio…";
  if (!input.hdSupported)
    return `HD voices are not available for ${input.language} yet. Listening and voice tests use this device’s voice.`;
  if (!input.signedIn)
    return "Sign in to use the HD voices everywhere. Recorded HD audio plays without an account; for anything else you are asked before this device’s voice is used.";
  if (!input.cloudReady)
    return "The HD voices are temporarily unavailable. Recorded HD audio still plays. Other listening audio will say when it cannot play in HD; for conversation playback, choose Device voice under Speaking audio.";
  return "HD voices are ready. New audio needs internet access; recorded and saved clips can replay offline.";
}

/** One line under the listening choice: what is reading aloud right now. */
export function listeningNowUsing(
  plan: Pick<ListeningPlan, "mode" | "strict" | "pending">,
  gender: MissionPartnerVersion,
): string {
  const voice = gender === "man" ? "male" : "female";
  if (plan.mode === "device")
    return "Now reading with this device’s voice. It may sound different from the HD voice, and it cannot guarantee a male or female voice.";
  if (plan.mode === "recordings")
    return plan.strict
      ? `Now reading with recorded HD audio (${voice}). Anything not recorded needs you to sign in for the HD voice; it is never swapped for a different voice without asking.`
      : `Now reading with recorded HD audio (${voice}) where it exists. This device’s voice is filling in for now, as you chose.`;
  if (!plan.strict)
    return `Now reading with the HD voice (${voice}) when it can play. This device’s voice is filling in for now, as you chose.`;
  if (plan.pending === "unavailable")
    return `Now reading with recorded HD audio (${voice}). Other audio will say when the HD voice cannot play; it is never swapped for a different voice.`;
  return `Now reading with the HD voice (${voice}). If HD audio cannot play, you are told; it is never swapped for a different voice.`;
}
