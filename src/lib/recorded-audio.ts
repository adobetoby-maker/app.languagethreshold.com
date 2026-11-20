// One lookup for the public recorded lesson audio (Spanish, Japanese 101, French 101).
// These are static files anyone may fetch, so finding one never depends on a cloud voice
// selection or an account.
import { recordedFrenchPath, recordedFrenchVoice } from "./recorded-french.ts";
import { recordedJapanesePath, recordedJapaneseVoice } from "./recorded-japanese.ts";
import { recordedSpanishPath, recordedSpanishPathForGender } from "./recorded-spanish.ts";

/** A recording made by exactly the selected cloud voice. */
export function recordedPathForVoice(
  text: string,
  voiceName: string,
  locale: string,
): string | null {
  return (
    recordedJapanesePath(text, voiceName, locale) ??
    recordedFrenchPath(text, voiceName, locale) ??
    recordedSpanishPath(text, voiceName, locale)
  );
}

/** A recording for the learner's accent and chosen voice gender, with no cloud voice selected. */
export function recordedPathForGender(
  text: string,
  locale: string,
  gender: "female" | "male",
): string | null {
  const japanese = recordedJapaneseVoice(gender);
  const french = recordedFrenchVoice(gender);
  return (
    (japanese ? recordedJapanesePath(text, japanese, locale) : null) ??
    (french ? recordedFrenchPath(text, french, locale) : null) ??
    recordedSpanishPathForGender(text, gender, locale)
  );
}
