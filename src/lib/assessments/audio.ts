/** Immutable references stay in private form snapshots, never public question JSON. */
export const ASSESSMENT_AUDIO_BUCKET = "assessment-listening-private";
export const MAX_ASSESSMENT_AUDIO_BYTES = 4 * 1024 * 1024;
export interface AssessmentAudioAsset {
  sha256: string;
  bytes: number;
  mime: "audio/mpeg" | "audio/wav" | "audio/ogg";
}
export function validAssessmentAudioAsset(value: unknown): value is AssessmentAudioAsset {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const asset = value as Record<string, unknown>;
  return (
    Object.keys(asset).length === 3 &&
    typeof asset.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(asset.sha256) &&
    typeof asset.bytes === "number" &&
    Number.isInteger(asset.bytes) &&
    asset.bytes >= 32 &&
    asset.bytes <= MAX_ASSESSMENT_AUDIO_BYTES &&
    ["audio/mpeg", "audio/wav", "audio/ogg"].includes(String(asset.mime))
  );
}
export function assessmentAudioPath(asset: AssessmentAudioAsset): string {
  if (!validAssessmentAudioAsset(asset)) throw new Error("Invalid assessment audio reference.");
  const extension = { "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg" }[asset.mime];
  return `sha256/${asset.sha256}.${extension}`;
}
export function audioSignatureMatches(bytes: Uint8Array, mime: AssessmentAudioAsset["mime"]) {
  const ascii = (offset: number, text: string) =>
    [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  if (mime === "audio/wav") return ascii(0, "RIFF") && ascii(8, "WAVE");
  if (mime === "audio/ogg") return ascii(0, "OggS");
  return ascii(0, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
}
