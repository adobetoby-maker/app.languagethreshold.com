import { useCallback, useRef } from "react";
import { languageFamily } from "@/data/mission-tts";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { ACCENTS_BY_LANGUAGE, useSpeech } from "@/state/speech-state";
import type { Language } from "@/state/app-state";

/**
 * The locale a surface speaks: the learner's accent when it belongs to the language being
 * practised (es-MX for Spanish), otherwise that language's first accent.
 */
export function listeningLocale(accent: string, language?: string): string {
  const accents = language ? ACCENTS_BY_LANGUAGE[language as Language] : undefined;
  if (!accents?.length) return accent;
  const fallback = accents[0].code;
  return accent && languageFamily(accent) === languageFamily(fallback) ? accent : fallback;
}

/**
 * Component-owned playback of a target-language word in the learner's listening voice.
 * One rule for word matching, cards, verb forms and reading: recorded HD audio first, then
 * the HD voice, and never a device voice in its place unless the learner chose one. When HD
 * audio cannot play, the learner is told and can retry or use this device's voice.
 *
 * The HD choice covers the language being learned. Text in another language (a
 * native-language card back) is read by this device's voice as before, and is not called HD.
 *
 * Ownership and cancellation are exactly `useOwnedPlayback`'s: unmounting, a new scope or
 * another account stops this surface's playback and drops its late callbacks.
 */
export function useListeningSpeaker(
  scope: string,
  /** The language being practised when it may differ from the learner's selected language. */
  language?: string,
) {
  const {
    accent,
    rate,
    voiceURI,
    voiceSettings,
    listeningPlan,
    reportListeningIssue,
    noteListeningPlayed,
  } = useSpeech();
  const locale = listeningLocale(accent, language);
  const source = voiceSettings.listeningAudioSource;
  const gender = voiceSettings.listeningGender;
  const playback = useOwnedPlayback(
    JSON.stringify(["listening", scope, locale, voiceURI, source, gender]),
  );
  const { speak: speakOwned, stop } = playback;
  const latest = useRef<(text: string, options?: ListeningSpeakOptions) => void>(() => {});

  const speak = useCallback(
    (text: string, options?: ListeningSpeakOptions) => {
      if (!text) return;
      // The provider plans with the learner's real account state and choice for this locale,
      // and never hands over a cloud voice that belongs to another language.
      const plan = listeningPlan(locale);
      speakOwned(text, locale, plan.voiceURI, options?.rate ?? rate, {
        cloudOnly: plan.strict,
        recordedGender: plan.recordedGender ?? undefined,
        unavailableReason: plan.pending ?? undefined,
        onstart: noteListeningPlayed,
        onerror: (reason) => {
          options?.onerror?.();
          // A retry goes through the newest speaker, so it follows the learner's answer
          // ("Try again" stays HD; "Use device voice" lets the device voice fill in).
          if (plan.strict) reportListeningIssue(reason, () => latest.current(text, options));
        },
      });
    },
    [listeningPlan, locale, speakOwned, rate, noteListeningPlayed, reportListeningIssue],
  );
  latest.current = speak;
  return { speak, stop, locale };
}

export interface ListeningSpeakOptions {
  /** Defaults to the learner's playback speed. */
  rate?: number;
  /** Told when nothing could be played, for surfaces with their own "read it instead" state. */
  onerror?: () => void;
}
