/** No URLs or object paths are accepted from the browser. */
export const ASSESSMENT_SPEECH_BUCKET = "assessment-speech-private";
export const MAX_SPEECH_BYTES = 4 * 1024 * 1024;
export const MAX_SPEECH_MS = 120000;
export const SPEECH_MIMES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"] as const;
export type SpeechMime = (typeof SPEECH_MIMES)[number];
export function speechObjectPath(id: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))
    throw new Error("Invalid speech evidence identifier.");
  return `evidence/${id}`;
}
export function speechSignatureMatches(bytes: Uint8Array, mime: SpeechMime) {
  if (bytes.length < 32 || bytes.length > MAX_SPEECH_BYTES) return false;
  const ascii = (offset: number, value: string) =>
    [...value].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  if (mime === "audio/webm") return [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v);
  if (mime === "audio/ogg") return ascii(0, "OggS");
  if (mime === "audio/mp4") return ascii(4, "ftyp");
  return mime === "audio/wav" && ascii(0, "RIFF") && ascii(8, "WAVE");
}
/** A missing/false approval cannot be treated as permission by the UI or upload handler. */
export function speechPolicyEnabled(
  policy:
    | {
        collection_enabled?: boolean;
        approved_at?: string | null;
        approved_by?: string | null;
        retention_days?: number | null;
      }
    | null
    | undefined,
) {
  return Boolean(
    policy?.collection_enabled === true &&
    policy.approved_at &&
    policy.approved_by &&
    Number.isInteger(policy.retention_days) &&
    policy.retention_days! >= 1 &&
    policy.retention_days! <= 90,
  );
}
