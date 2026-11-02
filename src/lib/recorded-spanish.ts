import recordings from "../data/spanish-next-recordings.json" with { type: "json" };
/** Public authored lesson audio only. Live conversation and device-only exams use their own routes. */
export interface SpanishRecordings {
  version: number;
  entries: Record<string, Partial<Record<"female" | "male", string>>>;
}
export function normalizedRecordingText(text: string): string {
  return text
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .replace(/[.!?¿¡,;:]+$/, "");
}
export function recordingGender(voiceName: string, locale: string): "female" | "male" | null {
  if (!/^es(?:-|$)/i.test(locale) || /^es-ES/i.test(locale)) return null;
  if (/Chirp3-HD-Aoede$/.test(voiceName)) return "female";
  if (/Chirp3-HD-Charon$/.test(voiceName)) return "male";
  return null;
}
export function spanishRecordingPath(
  manifest: SpanishRecordings,
  text: string,
  gender: "female" | "male",
): string | null {
  if (manifest.version !== 1) return null;
  const name = manifest.entries[normalizedRecordingText(text)]?.[gender];
  return name && /^es-next-[a-f0-9]{20}-(female|male)$/.test(name)
    ? `/audio/spanish-next/${name}.mp3`
    : null;
}
export function recordedSpanishPath(
  text: string,
  voiceName: string,
  locale: string,
): string | null {
  const gender = recordingGender(voiceName, locale);
  return gender ? spanishRecordingPath(recordings as SpanishRecordings, text, gender) : null;
}
