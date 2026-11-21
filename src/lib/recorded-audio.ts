// One lookup for the public recorded lesson audio (the RECORDING_SOURCES below).
// These are static files anyone may fetch, so finding one never depends on a cloud voice
// selection or an account.
import { recordedFrenchPath, recordedFrenchVoice } from "./recorded-french.ts";
import { recordedJapanesePath, recordedJapaneseVoice } from "./recorded-japanese.ts";
import { recordedSpanishPath, recordedSpanishPathForGender } from "./recorded-spanish.ts";

/**
 * One recorded-audio source per language family. A source answers only for its own language and
 * locales (it returns null otherwise), so the lookup tries them in order and the first hit wins.
 * Adding a family is adding a row here; a pack's `audio.coverage` says whether one is expected.
 */
interface RecordingSource {
  /** The pack code this source serves (the pack's audio block names its manifest). */
  code: string;
  pathForVoice(text: string, voiceName: string, locale: string): string | null;
  pathForGender(text: string, gender: "female" | "male", locale: string): string | null;
}

const RECORDING_SOURCES: readonly RecordingSource[] = [
  {
    code: "ja",
    pathForVoice: recordedJapanesePath,
    pathForGender: (text, gender, locale) => {
      const voice = recordedJapaneseVoice(gender);
      return voice ? recordedJapanesePath(text, voice, locale) : null;
    },
  },
  {
    code: "fr",
    pathForVoice: recordedFrenchPath,
    pathForGender: (text, gender, locale) => {
      const voice = recordedFrenchVoice(gender);
      return voice ? recordedFrenchPath(text, voice, locale) : null;
    },
  },
  {
    code: "es",
    pathForVoice: recordedSpanishPath,
    pathForGender: (text, gender, locale) => recordedSpanishPathForGender(text, gender, locale),
  },
];

/** A recording made by exactly the selected cloud voice. */
export function recordedPathForVoice(
  text: string,
  voiceName: string,
  locale: string,
): string | null {
  for (const source of RECORDING_SOURCES) {
    const path = source.pathForVoice(text, voiceName, locale);
    if (path) return path;
  }
  return null;
}

/** A recording for the learner's accent and chosen voice gender, with no cloud voice selected. */
export function recordedPathForGender(
  text: string,
  locale: string,
  gender: "female" | "male",
): string | null {
  for (const source of RECORDING_SOURCES) {
    const path = source.pathForGender(text, gender, locale);
    if (path) return path;
  }
  return null;
}
