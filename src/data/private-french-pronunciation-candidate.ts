/** Exact French→English pronunciation draft inspection. No production route imports this. */
export const FRENCH_PRONUNCIATION_RELEASE_ENABLED = false as const;
export const FRENCH_PRONUNCIATION_PAIR = Object.freeze({ target: "French", native: "English" });
export const FRENCH_PRONUNCIATION_STAGE_IDS = Object.freeze([
  "foundation-french-sound-like-a-native",
  "core-french-sound-like-a-native",
  "master-french-sound-like-a-native",
] as const);

type Pair = { target: string; native: string };
type Word = { fr: string; en: string; kind: string };
type Line = { fr: string; en: string };
type Activity = { prompt: string; wordRefs?: string[]; requiredRefs?: string[]; choices?: string[]; answerRef?: string; audioRequired?: boolean; reviewedAudioRequired?: boolean };
type Lesson = {
  id: string;
  n: number;
  sourceSpanishLesson: number;
  words: Word[];
  reader: Line[];
  speaking: { scene: string; opening: string; closure: string };
  practice: Record<string, Activity>;
  regionalAudioEvidence?: { speakerRegionProvenanceReviewed: boolean; phoneticContrastReviewed: boolean; hearPlayable: boolean };
};
type Batch = {
  moduleId: string;
  targetLanguage: string;
  nativeLanguage: string;
  stage: string;
  reviewed: boolean;
  runtimeRegistered: boolean;
  audioPublished: boolean;
  lessons: Lesson[];
};

const stages = ["foundation", "core", "master"] as const;
const limits: Record<string, number> = { foundation: 10, core: 30, master: 20 };
const modes = ["hear", "recall", "say", "see", "type", "write"];
const exactPair = (pair: Pair) => pair.target === "French" && pair.native === "English";

/** Reads caller-supplied private JSON; never installs catalog, audio, offline, or progress data. */
export function inspectPrivateFrenchPronunciation(batches: Batch[]) {
  const lessons = new Map<string, Lesson>();
  for (const batch of batches) {
    if (batch.moduleId !== "french-sound-like-a-native" || batch.targetLanguage !== "French" ||
        batch.nativeLanguage !== "English" || !stages.includes(batch.stage as typeof stages[number]) ||
        batch.reviewed || batch.runtimeRegistered || batch.audioPublished)
      throw new Error("invalid or released French pronunciation batch");
    for (const lesson of batch.lessons) {
      const expectedId = `${batch.stage}-french-sound-like-a-native:${lesson.n}:fr-en`;
      if (lesson.id !== expectedId || lessons.has(expectedId) || !Number.isInteger(lesson.n) ||
          lesson.n < 1 || lesson.n > limits[batch.stage] || lesson.sourceSpanishLesson !== lesson.n ||
          lesson.words.length !== 10 || lesson.reader.length !== 4 ||
          !lesson.speaking.scene || !lesson.speaking.opening || !lesson.speaking.closure ||
          JSON.stringify(Object.keys(lesson.practice).sort()) !== JSON.stringify(modes))
        throw new Error(`invalid French pronunciation lesson ${expectedId}`);
      const wordPairs = new Map<string, string>();
      for (const word of lesson.words) {
        if (!word.fr || !word.en || wordPairs.has(word.fr))
          throw new Error(`invalid French pronunciation word pair ${expectedId}`);
        wordPairs.set(word.fr, word.en);
      }
      if (lesson.reader.some(line => !line.fr || !line.en))
        throw new Error(`invalid French pronunciation Reader ${expectedId}`);
      for (const mode of modes) {
        const activity = lesson.practice[mode];
        if (!activity.prompt || [...(activity.wordRefs ?? []), ...(activity.requiredRefs ?? []),
          ...(activity.choices ?? []), ...(activity.answerRef ? [activity.answerRef] : [])]
          .some(ref => !wordPairs.has(ref)))
          throw new Error(`invalid French pronunciation ${mode} source reference ${expectedId}`);
      }
      if (lesson.practice.hear.audioRequired !== true)
        throw new Error(`French pronunciation Hear requires recorded audio ${expectedId}`);
      if (batch.stage === "master" && (lesson.n === 16 || lesson.n === 17) &&
          (lesson.regionalAudioEvidence?.hearPlayable !== false ||
           lesson.regionalAudioEvidence.speakerRegionProvenanceReviewed ||
           lesson.regionalAudioEvidence.phoneticContrastReviewed ||
           lesson.practice.hear.reviewedAudioRequired !== true))
        throw new Error(`unreviewed regional Hear must remain unavailable ${expectedId}`);
      lessons.set(expectedId, lesson);
    }
  }
  if (lessons.size !== 60 || stages.some(stage => Array.from({ length: limits[stage] }, (_, i) =>
    `${stage}-french-sound-like-a-native:${i + 1}:fr-en`).some(id => !lessons.has(id))))
    throw new Error("French pronunciation requires 10/30/20 private lessons");

  return {
    releaseEnabled: FRENCH_PRONUNCIATION_RELEASE_ENABLED,
    pair: FRENCH_PRONUNCIATION_PAIR,
    candidateStageIds: FRENCH_PRONUNCIATION_STAGE_IDS,
    stage: (stageId: string, pair: Pair) => exactPair(pair)
      ? [...lessons.values()].filter(lesson => lesson.id.startsWith(`${stageId}:`)) : [],
    lesson: (stage: string, n: number, pair: Pair) => exactPair(pair)
      ? lessons.get(`${stage}-french-sound-like-a-native:${n}:fr-en`) ?? null : null,
    practice: (stage: string, n: number, mode: string, pair: Pair) => exactPair(pair)
      ? lessons.get(`${stage}-french-sound-like-a-native:${n}:fr-en`)?.practice[mode] ?? null : null,
  };
}

export function releasedFrenchPronunciation(): null {
  return null;
}
