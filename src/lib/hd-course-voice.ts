import { decodeGoogleVoicePreference, encodeGoogleVoicePreference } from "../data/mission-tts.ts";
/** Keep a compatible HD selection; course defaults never resolve to device speech. */
export function hdCourseVoice(locale: string, preferred?: string | null): string {
  const family = locale.split("-")[0].toLowerCase();
  const selected = decodeGoogleVoicePreference(preferred);
  if (
    selected?.languageCode.toLowerCase().startsWith(family + "-") &&
    /-Chirp(?:3)?-HD-/.test(selected.voiceName)
  )
    return preferred!;
  const languageCode = family === "es" ? "es-US" : "en-US";
  return encodeGoogleVoicePreference({
    name: `${languageCode}-Chirp3-HD-Aoede`,
    languageCodes: [languageCode],
  });
}
