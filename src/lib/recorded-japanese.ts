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
};
type Manifest = {
  version: number;
  locale: string;
  listeningReviewed: boolean;
  voices: Record<Gender, string>;
  entries: Record<string, Record<Gender, Clip>>;
};

type CourseClip = Clip & { listeningReviewed: boolean };
type CourseManifest = {
  schema: number;
  locale: string;
  voices: Record<Gender, string>;
  sourceSHA256: string;
  scope: { module: string; lesson: number };
  registered?: boolean;
  listeningReviewed: boolean;
  clips: Record<string, Record<Gender, CourseClip>>;
};

/** The current 60-lesson Japanese source fingerprint; a source edit must revalidate audio. */
export const JAPANESE_101_COURSE_SOURCE_SHA256 =
  "8cfce671c012ea7e9be2128c9fad74aa4082560105eb1d9b0efbf63eb8d7d411";
export const JAPANESE_101_COURSE_AUDIO_REGISTERED = false as const;

const COURSE_STAGES: Record<string, { folder: string; count: number }> = {
  "foundation-japanese-basics": { folder: "foundation", count: 10 },
  "japanese-basics": { folder: "core", count: 30 },
  "master-japanese-basics": { folder: "master", count: 20 },
};

/** Resolve a lesson-scoped, reviewed course clip only after a manifest is explicitly supplied. */
export function recordedJapaneseCoursePath(
  text: string,
  voiceName: string,
  locale: string,
  moduleId: string,
  lessonNumber: number,
  manifest: CourseManifest | null | undefined,
): string | null {
  const stage = COURSE_STAGES[moduleId];
  if (!manifest || !stage || !Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > stage.count ||
      manifest.schema !== 1 || manifest.locale !== "ja-JP" || locale !== "ja-JP" ||
      manifest.sourceSHA256 !== JAPANESE_101_COURSE_SOURCE_SHA256 ||
      manifest.scope?.module !== moduleId || manifest.scope?.lesson !== lessonNumber ||
      manifest.registered !== true || manifest.listeningReviewed !== true ||
      manifest.voices?.female !== "ja-JP-Chirp3-HD-Aoede" ||
      manifest.voices?.male !== "ja-JP-Chirp3-HD-Charon") return null;
  const gender: Gender | null = manifest.voices.female === voiceName ? "female"
    : manifest.voices.male === voiceName ? "male" : null;
  if (!gender) return null;
  const key = text.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ja-JP");
  const clip = manifest.clips?.[key]?.[gender];
  if (!clip || clip.listeningReviewed !== true || clip.voice !== voiceName || clip.locale !== locale ||
      clip.spokenText !== text.normalize("NFC").replace(/\s+/gu, "") ||
      !/^ja-101-[a-f0-9]{20}-(?:female|male)\.mp3$/.test(clip.name) ||
      !clip.name.endsWith(`-${gender}.mp3`) ||
      !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1 || clip.durationSeconds >= 120 ||
      !Number.isSafeInteger(clip.bytes) || clip.bytes < 500 || !/^[a-f0-9]{64}$/.test(clip.sha256))
    return null;
  return `/audio/japanese-101/course/${stage.folder}-${lessonNumber}/${clip.name}`;
}

/** Only exact Japanese 101 pilot lines and exact selected Chirp 3 HD voices. */
export function recordedJapanesePath(
  text: string,
  voiceName: string,
  locale: string,
  manifest: Manifest = pilot as Manifest,
): string | null {
  if (manifest.version !== 1 || manifest.locale !== "ja-JP" || locale !== "ja-JP" || manifest.listeningReviewed !== true) return null;
  const gender = (Object.keys(manifest.voices) as Gender[]).find((candidate) => manifest.voices[candidate] === voiceName);
  if (!gender) return null;
  const key = text.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ja-JP");
  const clip = manifest.entries[key]?.[gender];
  if (!clip || clip.voice !== voiceName || clip.locale !== locale) return null;
  if (clip.spokenText !== text.normalize("NFC").replace(/\s+/gu, "")) return null;
  if (!/^ja-101-[a-f0-9]{20}-(?:female|male)\.mp3$/.test(clip.name) || !clip.name.endsWith(`-${gender}.mp3`)) return null;
  if (!Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0.1 || clip.durationSeconds >= 120) return null;
  if (!Number.isSafeInteger(clip.bytes) || clip.bytes < 500 || !/^[a-f0-9]{64}$/.test(clip.sha256)) return null;
  return `/audio/japanese-101/${clip.name}`;
}
