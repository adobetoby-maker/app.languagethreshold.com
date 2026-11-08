/** Private exact-pair inspection of French Roofing. No production route imports this module. */

export const FRENCH_ROOFING_RELEASE_ENABLED = false as const;
export const FRENCH_ROOFING_PAIR = Object.freeze({ target: "French", native: "English" });
export const FRENCH_ROOFING_STAGE_IDS = Object.freeze([
  "foundation-roofing", "roofing", "master-roofing",
] as const);

type Pair = { target: string; native: string };
type Word = { id: string; targetFrench: string; supportEnglish: string };
type Line = { id: string; targetFrench: string; supportEnglish: string };
type Lesson = {
  draftLessonKey: string;
  stage: string;
  n: number;
  words: Word[];
  reader: Line[];
  speakingOpeningFrench: string;
  practicePromptsFrench: Record<string, string>;
  reviewed: boolean;
  registered: boolean;
};
type Fixture = {
  targetLanguage: string;
  nativeLanguage: string;
  lessonCount: number;
  releaseGate: {
    enabled: boolean;
    catalogRegistered: boolean;
    runtimeRegistered: boolean;
    offlineRegistered: boolean;
    audioReviewed: boolean;
    humanReviewed: boolean;
  };
  lessons: Lesson[];
};
type Activity = {
  id: string;
  lessonKey: string;
  mode: string;
  sourceRef: string;
  modelFrench: string;
  modelEnglish: string;
  readyForLearner: boolean;
};
type ActivityBatch = { reviewed: boolean; registered: boolean; audioListeningReviewed: boolean; activities: Activity[] };

const modes = ["hear", "recall", "say", "see", "type", "write"];
const stageIds: Record<string, string> = {
  foundation: "foundation-roofing", core: "roofing", master: "master-roofing",
};
const stageCounts: Record<string, number> = { foundation: 10, core: 30, master: 20 };

function exactPair(pair: Pair): boolean {
  return pair.target === FRENCH_ROOFING_PAIR.target && pair.native === FRENCH_ROOFING_PAIR.native;
}

/** Caller-supplied, private JSON only. This does not install catalog, curriculum or offline entries. */
export function inspectPrivateFrenchRoofing(fixture: Fixture, batches: ActivityBatch[]) {
  if (fixture.targetLanguage !== "French" || fixture.nativeLanguage !== "English")
    throw new Error("French Roofing fixture pair mismatch");
  if (Object.values(fixture.releaseGate).some(Boolean))
    throw new Error("French Roofing release gate must remain closed");
  if (fixture.lessonCount !== 60 || fixture.lessons.length !== 60)
    throw new Error("French Roofing requires 60 private lessons");

  const lessons = new Map<string, Lesson>();
  for (const lesson of fixture.lessons) {
    const expected = `${lesson.stage}:${lesson.n}`;
    if (lesson.draftLessonKey !== expected || lesson.reviewed || lesson.registered || lessons.has(expected))
      throw new Error(`unstable or released French Roofing lesson ${expected}`);
    if (!stageIds[lesson.stage] || lesson.n < 1 || lesson.n > stageCounts[lesson.stage])
      throw new Error(`invalid French Roofing stage number ${expected}`);
    if (!lesson.words.length || !lesson.reader.length || !lesson.speakingOpeningFrench)
      throw new Error(`missing French Roofing lesson input ${expected}`);
    if (JSON.stringify(Object.keys(lesson.practicePromptsFrench).sort()) !== JSON.stringify(modes))
      throw new Error(`missing French Roofing prompt mode ${expected}`);
    lessons.set(expected, lesson);
  }

  const activities = new Map<string, Activity>();
  for (const batch of batches) {
    if (batch.reviewed || batch.registered || batch.audioListeningReviewed)
      throw new Error("French Roofing activity batch must remain private");
    for (const activity of batch.activities) {
      const lesson = lessons.get(activity.lessonKey);
      const expectedId = `${activity.lessonKey}:${activity.mode}:pilot-1`;
      if (!lesson || !modes.includes(activity.mode) || activity.id !== expectedId || activity.readyForLearner || activities.has(expectedId))
        throw new Error(`invalid or released French Roofing activity ${activity.id}`);
      const source = [...lesson.words, ...lesson.reader].find(item => item.id === activity.sourceRef);
      if (!source || activity.modelFrench !== source.targetFrench || activity.modelEnglish !== source.supportEnglish)
        throw new Error(`French Roofing activity source pair mismatch ${activity.id}`);
      activities.set(expectedId, activity);
    }
  }
  if (activities.size !== 360 || [...lessons.keys()].some(key => modes.some(mode => !activities.has(`${key}:${mode}:pilot-1`))))
    throw new Error("French Roofing requires 360 private six-mode activities");

  return {
    releaseEnabled: FRENCH_ROOFING_RELEASE_ENABLED,
    pair: FRENCH_ROOFING_PAIR,
    candidateStageIds: FRENCH_ROOFING_STAGE_IDS,
    candidateOfflinePackIds: FRENCH_ROOFING_STAGE_IDS.map(id => `${id}-fr-en`),
    stage: (id: string, pair: Pair) => exactPair(pair) ? fixture.lessons.filter(lesson => stageIds[lesson.stage] === id) : [],
    lesson: (stage: string, n: number, pair: Pair) => exactPair(pair) ? lessons.get(`${stage}:${n}`) ?? null : null,
    activity: (stage: string, n: number, mode: string, pair: Pair) => exactPair(pair) ? activities.get(`${stage}:${n}:${mode}:pilot-1`) ?? null : null,
  };
}

export function releasedFrenchRoofing(): null {
  return null;
}
