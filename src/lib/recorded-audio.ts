// One lookup for the public recorded lesson audio (the readers below, chosen by each language's
// app data).
// These are static files anyone may fetch, so finding one never depends on a cloud voice
// selection or an account.
import { recordedFrenchPath, recordedFrenchVoice } from "./recorded-french.ts";
import { recordedJapanesePath, recordedJapaneseVoice } from "./recorded-japanese.ts";
import { recordedSpanishPath, recordedSpanishPathForGender } from "./recorded-spanish.ts";
import { PACKS } from "../data/language-packs/registry.ts";
import { appData } from "../data/language-packs/app-data.ts";

/**
 * Recorded-audio readers, by the id a language's app file names (app/<code>.json recordedAudio).
 * Each reader knows one manifest format and answers only for its own locales (null otherwise).
 * A language whose app file names no reader has no recordings (fail closed: never another
 * language's clips).
 */
interface RecordingReader {
  pathForVoice(text: string, voiceName: string, locale: string): string | null;
  pathForGender(text: string, gender: "female" | "male", locale: string): string | null;
}

const RECORDING_READERS: Record<string, RecordingReader> = {
  "japanese-101-pilot": {
    pathForVoice: recordedJapanesePath,
    pathForGender: (text, gender, locale) => {
      const voice = recordedJapaneseVoice(gender);
      return voice ? recordedJapanesePath(text, voice, locale) : null;
    },
  },
  "french-101-pilot": {
    pathForVoice: recordedFrenchPath,
    pathForGender: (text, gender, locale) => {
      const voice = recordedFrenchVoice(gender);
      return voice ? recordedFrenchPath(text, voice, locale) : null;
    },
  },
  "trade-recordings": {
    pathForVoice: recordedSpanishPath,
    pathForGender: (text, gender, locale) => recordedSpanishPathForGender(text, gender, locale),
  },
};

/** The readers of the registered languages, in registry order. */
function readers(): RecordingReader[] {
  return PACKS.flatMap((pack) => {
    const id = appData(pack).recordedAudio;
    const reader = id ? RECORDING_READERS[id] : undefined;
    return reader ? [reader] : [];
  });
}

/** A recording made by exactly the selected cloud voice. */
export function recordedPathForVoice(
  text: string,
  voiceName: string,
  locale: string,
): string | null {
  for (const source of readers()) {
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
  for (const source of readers()) {
    const path = source.pathForGender(text, gender, locale);
    if (path) return path;
  }
  return null;
}
