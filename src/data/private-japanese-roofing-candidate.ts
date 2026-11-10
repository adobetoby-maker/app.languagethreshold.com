/** Private Japanese→English Roofing inspection only. No production route imports this file. */
export const JAPANESE_ROOFING_RELEASE_ENABLED = false as const;
export const JAPANESE_ROOFING_PAIR = Object.freeze({ target: "Japanese", native: "English" });
export const JAPANESE_ROOFING_CANDIDATE_STAGE_IDS = Object.freeze([
  "foundation-japanese-roofing", "japanese-roofing", "master-japanese-roofing",
] as const);

type Pair = { target: string; native: string };
type TextPair = { ja: string; en: string };
type Lesson = {
  n: number;
  stableId: string;
  reviewed?: boolean;
  sourceEnglishObjective: string;
  cards: TextPair[];
  reader: TextPair[];
  speaking: { opening: string };
  modes: Record<string, string>;
};
type LessonBatch = {
  moduleId: string;
  stage?: string;
  stageId?: string;
  target: string;
  native: string;
  reviewed: boolean;
  registered: boolean;
  lessons: Lesson[];
};
type Activity = {
  id: string;
  lessonId: string;
  mode: string;
  sourceRef: string;
  modelJapanese: string;
  modelEnglish: string;
  recordedAudioRequired: boolean;
  readyForLearner: boolean;
};
type ActivityBatch = {
  pairKey: string;
  reviewed: boolean;
  registered: boolean;
  audioListeningReviewed: boolean;
  activities: Activity[];
};

const sourceStageIds = ["foundation-roofing", "roofing", "master-roofing"] as const;
const stageLimits: Record<string, number> = {
  "foundation-roofing": 10, roofing: 30, "master-roofing": 20,
};
const candidateBySource: Record<string, string> = Object.fromEntries(
  sourceStageIds.map((id, index) => [id, JAPANESE_ROOFING_CANDIDATE_STAGE_IDS[index]]),
);
const modes = ["hear", "recall", "say", "see", "type", "write"];
const samePair = (pair: Pair) => pair.target === "Japanese" && pair.native === "English";

/** Caller supplies private draft JSON. This only verifies and inspects it; it registers nothing. */
export function inspectPrivateJapaneseRoofing(lessonBatches: LessonBatch[], activityBatches: ActivityBatch[]) {
  const lessons = new Map<string, Lesson>();
  for (const batch of lessonBatches) {
    const sourceStage = batch.stageId ?? (batch.stage === "core" ? "roofing" : batch.stage === "master" ? "master-roofing" : "");
    if (batch.moduleId !== (sourceStage === "master-roofing" ? "master-roofing" : "roofing") ||
        batch.target !== "Japanese" || batch.native !== "English" ||
        batch.reviewed || batch.registered || !stageLimits[sourceStage])
      throw new Error("invalid or released Japanese Roofing lesson batch");
    for (const lesson of batch.lessons) {
      const id = `${sourceStage}:${lesson.n}:ja-en`;
      if (lesson.stableId !== id || lesson.reviewed === true || lessons.has(id) ||
          !Number.isInteger(lesson.n) || lesson.n < 1 || lesson.n > stageLimits[sourceStage] ||
          !lesson.sourceEnglishObjective || !lesson.cards.length || !lesson.reader.length ||
          !lesson.speaking.opening || JSON.stringify(Object.keys(lesson.modes).sort()) !== JSON.stringify(modes) ||
          Object.values(lesson.modes).some(prompt => !prompt.trim()))
        throw new Error(`invalid Japanese Roofing lesson ${id}`);
      lessons.set(id, lesson);
    }
  }
  if (lessons.size !== 60 || sourceStageIds.some(stage =>
    Array.from({ length: stageLimits[stage] }, (_, i) => `${stage}:${i + 1}:ja-en`).some(id => !lessons.has(id))))
    throw new Error("Japanese Roofing requires 10/30/20 private lessons");

  const activities = new Map<string, Activity>();
  for (const batch of activityBatches) {
    if (batch.pairKey !== "Japanese:English" || batch.reviewed || batch.registered || batch.audioListeningReviewed)
      throw new Error("invalid or released Japanese Roofing activity batch");
    for (const activity of batch.activities) {
      const lesson = lessons.get(activity.lessonId);
      const expectedId = `${activity.lessonId}:${activity.mode}:private-1`;
      if (!lesson || !modes.includes(activity.mode) || activity.id !== expectedId || activities.has(expectedId) ||
          activity.readyForLearner || activity.recordedAudioRequired !== (activity.mode === "hear"))
        throw new Error(`invalid Japanese Roofing activity ${activity.id}`);
      const source = activity.sourceRef.match(/^(.*):(cards|reader):(\d+)$/);
      const entry = source?.[1] === activity.lessonId
        ? lesson[source[2] as "cards" | "reader"][Number(source[3]) - 1] : undefined;
      if (!entry || activity.modelJapanese !== entry.ja || activity.modelEnglish !== entry.en)
        throw new Error(`Japanese Roofing source pair mismatch ${activity.id}`);
      activities.set(expectedId, activity);
    }
  }
  if (activities.size !== 360 || [...lessons.keys()].some(id =>
    modes.some(mode => !activities.has(`${id}:${mode}:private-1`))))
    throw new Error("Japanese Roofing requires 360 private six-mode activities");

  return {
    releaseEnabled: JAPANESE_ROOFING_RELEASE_ENABLED,
    pair: JAPANESE_ROOFING_PAIR,
    candidateStageIds: JAPANESE_ROOFING_CANDIDATE_STAGE_IDS,
    candidateOfflinePackIds: JAPANESE_ROOFING_CANDIDATE_STAGE_IDS.map(id => `${id}-ja-en`),
    stage: (candidateId: string, pair: Pair) => samePair(pair)
      ? [...lessons.values()].filter(lesson => candidateBySource[lesson.stableId.split(":")[0]] === candidateId) : [],
    lesson: (sourceStage: string, n: number, pair: Pair) => samePair(pair)
      ? lessons.get(`${sourceStage}:${n}:ja-en`) ?? null : null,
    activity: (sourceStage: string, n: number, mode: string, pair: Pair) => samePair(pair)
      ? activities.get(`${sourceStage}:${n}:ja-en:${mode}:private-1`) ?? null : null,
  };
}

export function releasedJapaneseRoofing(): null {
  return null;
}
