export type MissionPartnerVersion = "woman" | "man";

export const MISSION_TTS_SUPPORTED_LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
] as const;

export type MissionTtsLanguage = (typeof MISSION_TTS_SUPPORTED_LANGUAGES)[number];

export const MISSION_TTS_SPEEDS = [0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5] as const;

export type MissionTtsSpeed = (typeof MISSION_TTS_SPEEDS)[number];

export type GoogleTtsGender = "FEMALE" | "MALE" | "NEUTRAL" | "SSML_VOICE_GENDER_UNSPECIFIED";

export interface GoogleTtsVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: GoogleTtsGender;
  naturalSampleRateHertz: number;
  label: string;
  tier: "Chirp 3 HD" | "Chirp HD" | "Studio" | "Neural2" | "WaveNet" | "Standard" | "Other";
}

const VOICE_PREFIX = "google:";

export function isMissionTtsSpeed(value: number): value is MissionTtsSpeed {
  return MISSION_TTS_SPEEDS.some((speed) => speed === value);
}

export function languageFamily(locale: string): string {
  return locale.trim().split("-")[0]?.toLowerCase() ?? "";
}

export function isSupportedGoogleTtsLocale(locale: string): boolean {
  return ["es", "fr", "de", "it", "ja", "ko", "pt", "ps", "en"].includes(languageFamily(locale));
}

export function googleVoiceTier(name: string): GoogleTtsVoice["tier"] {
  if (name.includes("Chirp3-HD")) return "Chirp 3 HD";
  if (name.includes("Chirp-HD")) return "Chirp HD";
  if (name.includes("Studio")) return "Studio";
  if (name.includes("Neural2")) return "Neural2";
  if (name.includes("Wavenet")) return "WaveNet";
  if (name.includes("Standard")) return "Standard";
  return "Other";
}

const VOICE_TIER_ORDER: Record<GoogleTtsVoice["tier"], number> = {
  "Chirp 3 HD": 0,
  "Chirp HD": 1,
  Studio: 2,
  Neural2: 3,
  WaveNet: 4,
  Standard: 5,
  Other: 6,
};

export function googleVoiceLabel(voice: Pick<GoogleTtsVoice, "name" | "ssmlGender">): string {
  const tier = googleVoiceTier(voice.name);
  const voiceName = voice.name.split("-").at(-1) ?? voice.name;
  const gender =
    voice.ssmlGender === "FEMALE" ? "woman" : voice.ssmlGender === "MALE" ? "man" : "neutral";
  return `${tier} · ${voiceName} · ${gender}`;
}

export function sortGoogleTtsVoices(voices: GoogleTtsVoice[]): GoogleTtsVoice[] {
  return [...voices].sort((a, b) => {
    const tier = VOICE_TIER_ORDER[a.tier] - VOICE_TIER_ORDER[b.tier];
    if (tier !== 0) return tier;
    const locale = (a.languageCodes[0] ?? "").localeCompare(b.languageCodes[0] ?? "");
    return locale !== 0 ? locale : a.name.localeCompare(b.name);
  });
}

export function googleVoicesForLocale(voices: GoogleTtsVoice[], locale: string): GoogleTtsVoice[] {
  const normalizedLocale = locale.trim().toLowerCase();
  const exactMatches = voices.filter((voice) =>
    voice.languageCodes.some((code) => code.trim().toLowerCase() === normalizedLocale),
  );
  if (exactMatches.length > 0) return sortGoogleTtsVoices(exactMatches);

  const family = languageFamily(locale);
  return sortGoogleTtsVoices(
    voices.filter((voice) => voice.languageCodes.some((code) => languageFamily(code) === family)),
  );
}

export function recommendedGoogleVoices(
  voices: GoogleTtsVoice[],
  locale: string,
  partnerVersion: MissionPartnerVersion,
  limit = 6,
): GoogleTtsVoice[] {
  const compatible = googleVoicesForLocale(voices, locale);
  const targetGender = partnerVersion === "woman" ? "FEMALE" : "MALE";
  const genderMatches = compatible.filter(
    (voice) =>
      voice.ssmlGender === targetGender ||
      voice.ssmlGender === "NEUTRAL" ||
      voice.ssmlGender === "SSML_VOICE_GENDER_UNSPECIFIED",
  );
  return (genderMatches.length > 0 ? genderMatches : compatible).slice(0, Math.max(1, limit));
}

export function defaultGoogleVoice(
  voices: GoogleTtsVoice[],
  locale: string,
  partnerVersion: MissionPartnerVersion,
): GoogleTtsVoice | null {
  const targetGender = partnerVersion === "woman" ? "FEMALE" : "MALE";
  const compatible = googleVoicesForLocale(voices, locale);
  return compatible.find((voice) => voice.ssmlGender === targetGender) ?? compatible[0] ?? null;
}

export function encodeGoogleVoicePreference(voice: Pick<GoogleTtsVoice, "name" | "languageCodes">) {
  const languageCode = voice.languageCodes[0];
  if (!languageCode) throw new Error("Google voice has no language code.");
  return `${VOICE_PREFIX}${encodeURIComponent(languageCode)}:${encodeURIComponent(voice.name)}`;
}

export function decodeGoogleVoicePreference(value?: string | null): {
  languageCode: string;
  voiceName: string;
} | null {
  if (!value?.startsWith(VOICE_PREFIX)) return null;
  const [languageCode, voiceName] = value.slice(VOICE_PREFIX.length).split(":", 2);
  if (!languageCode || !voiceName) return null;
  try {
    return {
      languageCode: decodeURIComponent(languageCode),
      voiceName: decodeURIComponent(voiceName),
    };
  } catch {
    return null;
  }
}

// Chirp HD (formerly Journey) rejects speakingRate. Chirp 3 HD supports it.
export function googleVoiceSupportsSpeakingRate(name: string): boolean {
  return !name.includes("-Chirp-HD-");
}
