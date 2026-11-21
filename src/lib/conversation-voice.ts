import {
  languageFamily,
  packForVoiceLocale,
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
  // The pack names its partner voice (speech.partnerVoice: HD locale and the woman/man voice
  // names). A locale of another pack, or a pack without one, asks for the locale it was given.
  const partner = packForVoiceLocale(locale)?.speech.partnerVoice;
  const named = partner?.available ? (gender === "man" ? partner.male : partner.female) : null;
  const hdLocale = named && partner?.locale ? partner.locale : locale;
  const voiceName = named ?? (gender === "man" ? "Charon" : "Aoede");
  const preferred = `${hdLocale}-Chirp3-HD-${voiceName}`;
  return (
    compatible.find((voice) => voice.name === preferred) ??
    standardGoogleVoice(compatible, locale, gender)
  );
}
