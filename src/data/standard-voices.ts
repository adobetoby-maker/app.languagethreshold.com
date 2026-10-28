import {
  googleVoicesForLocale,
  type GoogleTtsVoice,
  type MissionPartnerVersion,
} from "./mission-tts.ts";

export type SpeakingAudioSource = "google" | "device" | "text";
export interface StandardVoiceSettings {
  listeningGender: MissionPartnerVersion;
  speakingGender: MissionPartnerVersion;
  speakingAudioSource: SpeakingAudioSource;
}
export const DEFAULT_STANDARD_VOICES: StandardVoiceSettings = {
  listeningGender: "woman",
  speakingGender: "woman",
  speakingAudioSource: "google",
};
export function readStandardVoiceSettings(value: unknown): StandardVoiceSettings {
  const v = value as Partial<StandardVoiceSettings> | null;
  return {
    listeningGender: v?.listeningGender === "man" ? "man" : "woman",
    speakingGender: v?.speakingGender === "man" ? "man" : "woman",
    speakingAudioSource:
      v?.speakingAudioSource === "device" || v?.speakingAudioSource === "text"
        ? v.speakingAudioSource
        : "google",
  };
}

/** Curated pair within the best available accent; never substitute the other gender. */
export function standardGoogleVoice(
  voices: GoogleTtsVoice[],
  locale: string,
  gender: MissionPartnerVersion,
): GoogleTtsVoice | null {
  const matches = googleVoicesForLocale(voices, locale).filter(
    (v) => v.ssmlGender === (gender === "woman" ? "FEMALE" : "MALE"),
  );
  if (!matches.length) return null;
  const preferredLocale = matches[0].languageCodes[0];
  const regional = matches.filter((v) => v.languageCodes[0] === preferredLocale);
  const name = gender === "woman" ? "Aoede" : "Charon";
  return regional.find((v) => v.name.endsWith(`-Chirp3-HD-${name}`)) ?? regional[0];
}
export function openVoiceSettings() {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Learning settings"], button[aria-label="App settings"]',
    ),
  ].find((node) => node.getClientRects().length > 0);
  if (button?.getAttribute("aria-expanded") !== "true") button?.click();
}
