/** Review-only integration for the authored Japanese 101 modes. No production route imports it. */
import { getCurriculum } from './curriculum.ts';
import { japaneseBasicsLesson } from './japanese-basics.ts';
import { JAPANESE_BASICS_READERS } from './japanese-basics-readers.ts';

export const JAPANESE_101_MODES_RELEASE_ENABLED = false as const;
export const JAPANESE_101_MODE_STAGE_IDS = [
  'foundation-japanese-basics', 'japanese-basics', 'master-japanese-basics',
] as const;
const stageCounts = [10, 30, 20] as const;
const modeNames = ['see', 'recall', 'hear', 'type', 'say', 'write'] as const;
type StageId = (typeof JAPANESE_101_MODE_STAGE_IDS)[number];
type Mode = (typeof modeNames)[number];
type Pair = { target: string; native: string };
type Activity = {
  id: string;
  prompt: string;
  sourceDialogueTurn: number;
  targetText: string;
  nativeText: string;
};
type StagePreview = {
  pairKey: string;
  registered: boolean;
  reviewed: boolean;
  lessonCount: number;
  activityCount: number;
  lessons: {
    moduleId: string;
    lessonNumber: number;
    stableLessonKey: string;
    reviewed: boolean;
    modes: Record<Mode, Activity>;
  }[];
};
export type Japanese101ModeInputs = {
  foundation: StagePreview;
  core: StagePreview;
  master: StagePreview;
};

function exactPair(pair: Pair): boolean {
  return pair.target === 'Japanese' && pair.native === 'English';
}

/** Inspect a private fixture against the existing lesson, Reader, and speaking identities. */
export function inspectPrivateJapanese101Modes(inputs: Japanese101ModeInputs) {
  const previews = [inputs.foundation, inputs.core, inputs.master];
  const stages = new Map<StageId, NonNullable<ReturnType<typeof getCurriculum>>>();
  const activities = new Map<string, Activity>();
  for (const [index, id] of JAPANESE_101_MODE_STAGE_IDS.entries()) {
    const preview = previews[index];
    const expected = stageCounts[index];
    if (preview.pairKey !== 'Japanese:English' || preview.registered || preview.reviewed ||
        preview.lessonCount !== expected || preview.activityCount !== expected * 6 ||
        preview.lessons.length !== expected)
      throw new Error(`${id}: wrong pair, count, or private review gate`);
    const curriculum = getCurriculum(id, 'Japanese', 'English');
    if (!curriculum || curriculum.lessons.length !== expected)
      throw new Error(`${id}: existing curriculum identity changed`);
    stages.set(id, curriculum);
    for (const [lessonIndex, entry] of preview.lessons.entries()) {
      const n = lessonIndex + 1;
      if (entry.moduleId !== id || entry.lessonNumber !== n ||
          entry.stableLessonKey !== `${id}:${n}` || entry.reviewed || curriculum.lessons[lessonIndex].n !== n)
        throw new Error(`${id}:${n}: unstable lesson identity`);
      const practice = japaneseBasicsLesson(id, n);
      const reader = JAPANESE_BASICS_READERS.find(seed => seed.id === `seed-ja-${id}-lesson-${n}`);
      if (!practice?.speaking || !practice.openingLine || !practice.reading || !reader ||
          !curriculum.lessons[lessonIndex].words?.length)
        throw new Error(`${id}:${n}: missing existing reading, words, Reader, or speaking`);
      if (JSON.stringify(Object.keys(entry.modes).sort()) !== JSON.stringify([...modeNames].sort()))
        throw new Error(`${id}:${n}: missing authored practice mode`);
      if (new Set(modeNames.map(mode => entry.modes[mode].prompt.trim())).size !== modeNames.length)
        throw new Error(`${id}:${n}: repeated authored practice prompt`);
      for (const mode of modeNames) {
        const activity = entry.modes[mode];
        const sourceLine = Number.isInteger(activity.sourceDialogueTurn)
          ? reader.sentences[activity.sourceDialogueTurn - 1]
          : null;
        if (activity.id !== `ja101:${index === 0 ? 'foundation' : index === 1 ? 'core' : 'master'}:${n}:${mode}` ||
            !activity.prompt.trim() || !activity.targetText.trim() || !activity.nativeText.trim() ||
            sourceLine?.target !== activity.targetText || sourceLine.en !== activity.nativeText)
          throw new Error(`${id}:${n}:${mode}: activity is not its cited Reader turn`);
        if (activities.has(activity.id)) throw new Error(`${id}:${n}:${mode}: duplicate activity identity`);
        activities.set(activity.id, activity);
      }
    }
  }
  return {
    releaseEnabled: JAPANESE_101_MODES_RELEASE_ENABLED,
    stageIds: JAPANESE_101_MODE_STAGE_IDS,
    supportsPair: exactPair,
    stage: (id: string, pair: Pair) => exactPair(pair) ? stages.get(id as StageId) ?? null : null,
    activity: (id: string, n: number, mode: Mode, pair: Pair) =>
      exactPair(pair) && Number.isInteger(n) && n > 0 && modeNames.includes(mode)
        ? activities.get(`ja101:${id === JAPANESE_101_MODE_STAGE_IDS[0] ? 'foundation' : id === JAPANESE_101_MODE_STAGE_IDS[1] ? 'core' : id === JAPANESE_101_MODE_STAGE_IDS[2] ? 'master' : 'unknown'}:${n}:${mode}`) ?? null
        : null,
    candidateActivityCount: activities.size,
  };
}

/** This adapter cannot publish the private prompts. */
export function releasedJapanese101Modes(): null {
  return null;
}
