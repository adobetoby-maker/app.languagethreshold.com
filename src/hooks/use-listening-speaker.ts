import { useCallback, useEffect, useRef } from "react";
import { languageFamily } from "@/data/mission-tts";
import { useOwnedPlayback } from "@/hooks/use-owned-speaker";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
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
 * another account stops this surface's playback and drops its late callbacks. The learner's
 * own voice choices (accent, gender, HD or device, a picked voice) end it too. A voice that
 * only finished resolving does not: a word that is already playing is left to finish.
 *
 * The notice for a word that could not play in HD belongs to that request. `stop()`, a newer
 * word, another scope, card or account, and leaving the surface all withdraw it: its "Try
 * again" and "Use device voice" then do nothing, so a saved notice can never play over an
 * open microphone or read out a word the learner has moved on from.
 */
export function useListeningSpeaker(
  scope: string,
  /** The language being practised when it may differ from the learner's selected language. */
  language?: string,
  /**
   * What the surface shows right now, when that changes inside one scope (the card of a deck).
   * A change withdraws the standing notice and leaves audio that is playing alone. Give it
   * only where a word is spoken after its card is shown, never ahead of it.
   */
  card?: string | number | null,
) {
  const {
    accent,
    rate,
    voiceChoice,
    voiceSettings,
    listeningPlan,
    reportListeningIssue,
    noteListeningPlayed,
  } = useSpeech();
  const locale = listeningLocale(accent, language);
  const source = voiceSettings.listeningAudioSource;
  const gender = voiceSettings.listeningGender;
  const owner = JSON.stringify(["listening", scope, locale, voiceChoice, source, gender]);
  const { speak: speakOwned, stop: stopOwned } = useOwnedPlayback(owner);
  // One lease per request: it ends with this owner, this account or this mount, and on
  // `forget`. Whatever it owns (the standing notice) is withdrawn with it.
  const { capture, cancel: forget } = usePracticeLifecycle(owner);
  useEffect(() => forget, [card, forget]);
  const latest = useRef<(text: string, options?: ListeningSpeakOptions) => void>(() => {});

  const speak = useCallback(
    (text: string, options?: ListeningSpeakOptions) => {
      if (!text) return;
      // The newest word is what a notice may retry: an older one is withdrawn.
      forget();
      const lease = capture();
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
          if (!plan.strict) return;
          // A retry goes through the newest speaker, so it follows the learner's answer
          // ("Try again" stays HD; "Use device voice" lets the device voice fill in), with
          // the same text and speed. It runs only while this request still holds its lease.
          lease.own(
            reportListeningIssue(reason, () => latest.current(text, options), lease.isCurrent),
          );
        },
      });
    },
    [
      forget,
      capture,
      listeningPlan,
      locale,
      speakOwned,
      rate,
      noteListeningPlayed,
      reportListeningIssue,
    ],
  );
  latest.current = speak;

  const stop = useCallback(() => {
    forget();
    stopOwned();
  }, [forget, stopOwned]);
  return { speak, stop, locale };
}

export interface ListeningSpeakOptions {
  /** Defaults to the learner's playback speed. */
  rate?: number;
  /** Told when nothing could be played, for surfaces with their own "read it instead" state. */
  onerror?: () => void;
}

/**
 * For a surface that reads through the speech provider (word, sentence, passage): ties the
 * standing "could not play in HD" notice to what the surface shows. When `showing` changes or
 * the surface leaves, the notice is withdrawn and its buttons do nothing. Reading that is
 * already playing is not stopped.
 */
export function useReadingNoticeScope(showing: string | number | null): void {
  const { forgetReadingNotice } = useSpeech();
  useEffect(() => forgetReadingNotice, [showing, forgetReadingNotice]);
}
