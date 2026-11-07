/** Review-only offline candidate. No public route, worker, or download allowlist imports this file. */
import {
  FRENCH_101_PAIR,
  FRENCH_101_RELEASE_ENABLED,
  FRENCH_101_STAGE_IDS,
  inspectPrivateFrench101,
  type French101PrivateInputs,
} from "./private-french-101-candidate.ts";

type Pair = { target: string; native: string };
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
export type French101PrivateOfflineCandidate = {
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

const PRIVATE_ROOT = "private-review://french-101/fr-en/v1";
const STAGE_COUNTS = [10, 30, 20] as const;
const encoder = new TextEncoder();

function exactPair(pair: Pair): boolean {
  return pair.target === FRENCH_101_PAIR.target && pair.native === FRENCH_101_PAIR.native;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function expectedFiles(inputs: French101PrivateInputs): Promise<LessonFile[]> {
  const candidate = inspectPrivateFrench101(inputs);
  const files: LessonFile[] = [];
  for (const [stageIndex, stageId] of FRENCH_101_STAGE_IDS.entries()) {
    const curriculum = candidate.stage(stageId, FRENCH_101_PAIR);
    if (!curriculum || curriculum.lessons.length !== STAGE_COUNTS[stageIndex])
      throw new Error(`${stageId} has no exact-pair curriculum`);
    for (let n = 1; n <= STAGE_COUNTS[stageIndex]; n++) {
      const activity = candidate.activity(stageId, n, FRENCH_101_PAIR);
      if (!activity) throw new Error(`${stageId}:${n} has no activity`);
      const stableLessonKey = `${stageId}:${n}`;
      const body = JSON.stringify({
        schema: 1,
        target: "French",
        native: "English",
        stageId,
        lessonNumber: n,
        stableLessonKey,
        lesson: curriculum.lessons[n - 1],
        reader: activity.reader,
        cards: activity.cards,
        dictionaryEntries: activity.dictionaryEntries,
        speaking: activity.speaking,
        modes: activity.modes,
        recordedAudio: false,
      });
      if (!body) throw new Error(`Cannot serialize ${stableLessonKey}`);
      files.push({
        path: `${PRIVATE_ROOT}/${stageId}/${n}.json`,
        stageId,
        lessonNumber: n,
        stableLessonKey,
        cacheNamespace: `${PRIVATE_ROOT}/${stageId}`,
        sha256: await sha256(body),
        bytes: encoder.encode(body).byteLength,
        body,
      });
    }
  }
  return files;
}

export async function buildPrivateFrench101Offline(
  inputs: French101PrivateInputs,
): Promise<French101PrivateOfflineCandidate> {
  if (FRENCH_101_RELEASE_ENABLED) throw new Error("French 101 review gate must stay closed");
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

/** Fail closed even when a changed body is rehashed or another pair's cache is substituted. */
export async function verifyPrivateFrench101Offline(
  manifest: French101PrivateOfflineCandidate,
  inputs: French101PrivateInputs,
  pair: Pair,
): Promise<boolean> {
  if (!exactPair(pair) || FRENCH_101_RELEASE_ENABLED) return false;
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
