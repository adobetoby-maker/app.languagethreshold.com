// Built by TAC — 2026-10-22
// The site voice as the learner hears it: Google and device catalogs for the
// current accent, the resolved current voice, and its friendly label. Shared by
// the top-bar VoicePicker and the Reader woman/man quick switch.

import { useEffect, useMemo, useState } from "react";
import {
  decodeGoogleVoicePreference,
  googleVoicesForLocale,
  type GoogleTtsVoice,
} from "@/data/mission-tts";
import {
  deviceVoiceIdentity,
  formatVoiceLabel,
  googleVoiceIdentity,
  type VoiceIdentity,
  type VoiceLabel,
} from "@/data/voice-identity";
import { getMissionTtsCapabilities } from "@/lib/mission-tts";
import { getVoicesForLocale, pickVoice, subscribeVoices } from "@/lib/voices";
import { useAuth } from "@/state/auth-state";
import { useSpeech } from "@/state/speech-state";

export interface SiteVoice {
  mounted: boolean;
  googleVoices: GoogleTtsVoice[];
  googleReady: boolean;
  deviceVoices: SpeechSynthesisVoice[];
  current: VoiceIdentity | null;
  label: VoiceLabel | null;
  /** Voices the learner can switch to right now, in the existing preferred-locale order. */
  candidates: VoiceIdentity[];
}

export function useSiteVoice(): SiteVoice {
  const { accent, voiceURI } = useSpeech();
  const { session } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [googleVoices, setGoogleVoices] = useState<GoogleTtsVoice[]>([]);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDeviceVoices(getVoicesForLocale(accent));
    return subscribeVoices(() => setDeviceVoices(getVoicesForLocale(accent)));
  }, [accent]);

  useEffect(() => {
    const controller = new AbortController();
    getMissionTtsCapabilities(accent, controller.signal)
      .then((capabilities) => {
        if (controller.signal.aborted) return;
        setGoogleReady(capabilities.ready);
        setGoogleVoices(googleVoicesForLocale(capabilities.voices, accent));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGoogleReady(false);
        setGoogleVoices([]);
      });
    return () => controller.abort();
  }, [accent]);

  const current = useMemo((): VoiceIdentity | null => {
    if (!mounted) return null;
    const preference = decodeGoogleVoicePreference(voiceURI);
    if (preference && voiceURI) {
      const match = googleVoices.find((voice) => voice.name === preference.voiceName);
      return (
        (match && googleVoiceIdentity(match)) ?? {
          id: voiceURI,
          kind: "google",
          rawName: preference.voiceName,
          locale: preference.languageCode,
          gender: null,
        }
      );
    }
    // deviceVoices is a dependency so the label follows late-loading browser voices.
    const device = deviceVoices.length > 0 ? pickVoice(accent, voiceURI) : null;
    return device ? deviceVoiceIdentity(device) : null;
  }, [mounted, voiceURI, googleVoices, deviceVoices, accent]);

  const label = useMemo(() => (current ? formatVoiceLabel(current) : null), [current]);

  const candidates = useMemo(() => {
    // Signed-out playback of a Google voice falls back to the device, so only
    // offer cloud voices when they will actually be heard.
    const cloud =
      session && googleReady
        ? googleVoices.flatMap((voice) => {
            const identity = googleVoiceIdentity(voice);
            return identity ? [identity] : [];
          })
        : [];
    return [...cloud, ...deviceVoices.map(deviceVoiceIdentity)];
  }, [session, googleReady, googleVoices, deviceVoices]);

  return { mounted, googleVoices, googleReady, deviceVoices, current, label, candidates };
}
