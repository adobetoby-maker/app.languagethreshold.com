/** Private content-addressed French Roofing text candidate; no worker or route imports it. */
import {
  FRENCH_ROOFING_PAIR,
  FRENCH_ROOFING_RELEASE_ENABLED,
  inspectPrivateFrenchRoofing,
} from "./private-french-roofing-candidate.ts";

type Pair = { target: string; native: string };
type Inputs = Parameters<typeof inspectPrivateFrenchRoofing>;
type LessonFile = {
  path: string;
  stageId: string;
  lessonNumber: number;
  stableLessonKey: string;
  cacheNamespace: string;
  sha256: string;
  bytes: number;
  body: string;
};
export type FrenchRoofingPrivateOfflineCandidate = {
  schema: 1;
  releaseEnabled: false;
  registered: false;
  reviewed: false;
  recordedAudio: false;
  target: "French";
  native: "English";
  cacheNamespace: string;
  sourceSha256: string;
  files: LessonFile[];
};

const PRIVATE_ROOT = "private-review://french-roofing/fr-en/v1";
const stages = [
  { stage: "foundation", id: "foundation-roofing", count: 10 },
  { stage: "core", id: "roofing", count: 30 },
  { stage: "master", id: "master-roofing", count: 20 },
] as const;
const modes = ["see", "recall", "hear", "type", "say", "write"];
const encoder = new TextEncoder();

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function expectedFiles(inputs: Inputs): Promise<LessonFile[]> {
  const candidate = inspectPrivateFrenchRoofing(...inputs);
  const files: LessonFile[] = [];
  for (const { stage, id, count } of stages) {
    if (candidate.stage(id, FRENCH_ROOFING_PAIR).length !== count)
      throw new Error(`${id} has no exact-pair private stage`);
    for (let n = 1; n <= count; n++) {
      const lesson = candidate.lesson(stage, n, FRENCH_ROOFING_PAIR);
      const activities = Object.fromEntries(modes.map(mode => [mode, candidate.activity(stage, n, mode, FRENCH_ROOFING_PAIR)]));
      if (!lesson || Object.values(activities).some(value => !value))
        throw new Error(`${stage}:${n} has incomplete private inputs`);
      const stableLessonKey = `${stage}:${n}`;
      const body = JSON.stringify({
        schema: 1,
        target: "French",
        native: "English",
        stageId: id,
        lessonNumber: n,
        stableLessonKey,
        words: lesson.words,
        reader: lesson.reader,
        speakingOpeningFrench: lesson.speakingOpeningFrench,
        practicePromptsFrench: lesson.practicePromptsFrench,
        activities,
        recordedAudio: false,
      });
      files.push({
        path: `${PRIVATE_ROOT}/${id}/${n}.json`,
        stageId: id,
        lessonNumber: n,
        stableLessonKey,
        cacheNamespace: `${PRIVATE_ROOT}/${id}`,
        sha256: await sha256(body),
        bytes: encoder.encode(body).byteLength,
        body,
      });
    }
  }
  return files;
}

export async function buildPrivateFrenchRoofingOffline(...inputs: Inputs): Promise<FrenchRoofingPrivateOfflineCandidate> {
  if (FRENCH_ROOFING_RELEASE_ENABLED) throw new Error("French Roofing review gate must stay closed");
  return {
    schema: 1,
    releaseEnabled: false,
    registered: false,
    reviewed: false,
    recordedAudio: false,
    target: "French",
    native: "English",
    cacheNamespace: PRIVATE_ROOT,
    sourceSha256: await sha256(JSON.stringify(inputs)),
    files: await expectedFiles(inputs),
  };
}

/** Rejects wrong pairs, changed source, rehashed bodies, namespace swaps and release flags. */
export async function verifyPrivateFrenchRoofingOffline(
  manifest: FrenchRoofingPrivateOfflineCandidate,
  inputs: Inputs,
  pair: Pair,
): Promise<boolean> {
  if (pair.target !== "French" || pair.native !== "English" || FRENCH_ROOFING_RELEASE_ENABLED) return false;
  if (manifest.schema !== 1 || manifest.releaseEnabled !== false || manifest.registered !== false ||
      manifest.reviewed !== false || manifest.recordedAudio !== false ||
      manifest.target !== "French" || manifest.native !== "English" ||
      manifest.cacheNamespace !== PRIVATE_ROOT ||
      manifest.sourceSha256 !== await sha256(JSON.stringify(inputs))) return false;
  try {
    const expected = await expectedFiles(inputs);
    if (!Array.isArray(manifest.files) || manifest.files.length !== 60) return false;
    for (let index = 0; index < expected.length; index++) {
      const actual = manifest.files[index];
      const source = expected[index];
      if (!actual || actual.path !== source.path || actual.stageId !== source.stageId ||
          actual.lessonNumber !== source.lessonNumber || actual.stableLessonKey !== source.stableLessonKey ||
          actual.cacheNamespace !== source.cacheNamespace || actual.bytes !== source.bytes ||
          actual.sha256 !== source.sha256 || actual.body !== source.body ||
          await sha256(actual.body) !== actual.sha256) return false;
    }
    return true;
  } catch {
    return false;
  }
}
