import {
  languageFamily,
  type GoogleTtsVoice,
  type MissionPartnerVersion,
} from "../data/mission-tts.ts";
import { standardGoogleVoice } from "../data/standard-voices.ts";
/** Conversation keeps V3's Chirp 3 HD pair; never downgrade to a device/standard voice. */
export function conversationGoogleVoice(
  voices: GoogleTtsVoice[],
  locale: string,
  gender: MissionPartnerVersion,
) {
  const family = languageFamily(locale);
  const compatible = voices.filter(
    (voice) =>
      voice.name.includes("-Chirp3-HD-") &&
      voice.languageCodes.some((code) => languageFamily(code) === family) &&
      voice.ssmlGender === (gender === "man" ? "MALE" : "FEMALE"),
  );
  const preferred = `${family === "es" ? "es-US" : locale}-Chirp3-HD-${gender === "man" ? "Charon" : "Aoede"}`;
  return (
    compatible.find((voice) => voice.name === preferred) ??
    standardGoogleVoice(compatible, locale, gender)
  );
}
