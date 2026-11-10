import pilot from "../data/japanese-101-recordings.json" with { type: "json" };

type Gender = "female" | "male";
type Clip = {
  name: string;
  voice: string;
  locale: string;
  spokenText: string;
  bytes: number;
  durationSeconds: number;
  sha256: string;
  listeningReviewed: boolean;
};
type Manifest = {
  version: number;
  locale: string;
  sourceModule: string;
  sourceLesson: number;
  listeningReviewed: boolean;
  listeningReview: { reviewer: string; decision: string };
  voices: Record<Gender, string>;
  entries: Record<string, Record<Gender, Clip>>;
};

/** Only exact Japanese 101 pilot lines and exact selected Chirp 3 HD voices. */
export function recordedJapanesePath(
  text: string,
  voiceName: string,
  locale: string,
  manifest: Manifest = pilot as Manifest,
): string | null {
  if (manifest.version !== 1 || manifest.locale !== "ja-JP" || locale !== "ja-JP" || manifest.listeningReviewed !== true) return null;
  if (manifest.sourceModule !== "foundation-japanese-basics" || manifest.sourceLesson !== 1) return null;
  if (manifest.listeningReview?.reviewer !== "owner" || manifest.listeningReview?.decision !== "accepted-all-pilot-clips") return null;
  const gender = (Object.keys(manifest.voices) as Gender[]).find((candidate) => manifest.voices[candidate] === voiceName);
  if (!gender) return null;
  const key = text.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ja-JP");
  const clip = manifest.entries[key]?.[gender];
  if (!clip || clip.listeningReviewed !== true || clip.voice !== voiceName || clip.locale !== locale) return null;
  if (clip.spokenText !== text.normalize("NFC").replace(/\s+/gu, "")) return null;
  if (!/^ja-101-[a-f0-9]{20}-(?:female|male)\.mp3$/.test(clip.name) || !clip.name.endsWith(`-${gender}.mp3`)) return null;
  if (!Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1 || clip.durationSeconds >= 120) return null;
  if (!Number.isSafeInteger(clip.bytes) || clip.bytes < 500 || !/^[a-f0-9]{64}$/.test(clip.sha256)) return null;
  return `/audio/japanese-101/${clip.name}`;
}
