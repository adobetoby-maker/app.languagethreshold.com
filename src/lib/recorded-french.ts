import pilot from "../data/french-101-recordings.json" with { type: "json" };

type Gender = "female" | "male";
type Clip = {
  name: string;
  text: string;
  voice: string;
  locale: string;
  sha256: string;
  bytes: number;
  durationSeconds: number;
  listeningReviewed: boolean;
};
type Manifest = {
  version: number;
  pairKey: string;
  locale: string;
  sourceModule: string;
  sourceLesson: number;
  listeningReviewed: boolean;
  listeningReview: { reviewer: string; decision: string };
  voices: Record<Gender, string>;
  entries: Record<string, Record<Gender, Clip>>;
};

/** Exact, owner-accepted French 101 pilot audio; the draft course remains unregistered. */
export function recordedFrenchPath(
  text: string,
  voiceName: string,
  locale: string,
  manifest: Manifest = pilot as Manifest,
): string | null {
  if (manifest.version !== 1 || manifest.pairKey !== "French:English" || manifest.locale !== "fr-FR" || locale !== "fr-FR") return null;
  if (manifest.sourceModule !== "foundation-french-basics" || manifest.sourceLesson !== 1 || manifest.listeningReviewed !== true) return null;
  if (manifest.listeningReview?.reviewer !== "owner" || manifest.listeningReview?.decision !== "accepted-all-pilot-clips") return null;
  const gender = (Object.keys(manifest.voices) as Gender[]).find((candidate) => manifest.voices[candidate] === voiceName);
  if (!gender) return null;
  const clip = manifest.entries[text]?.[gender];
  if (!clip || clip.text !== text || clip.listeningReviewed !== true || clip.voice !== voiceName || clip.locale !== locale) return null;
  if (!/^fr-FR-[a-f0-9]{20}-(?:female|male)\.mp3$/.test(clip.name) || !clip.name.endsWith(`-${gender}.mp3`)) return null;
  if (!Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1 || clip.durationSeconds >= 120) return null;
  if (!Number.isSafeInteger(clip.bytes) || clip.bytes < 500 || !/^[a-f0-9]{64}$/.test(clip.sha256)) return null;
  return `/audio/french-101/${clip.name}`;
}
