/** Private Japanese Foreman speaking missions; no live AI route imports these drafts. */
export const JAPANESE_FOREMAN_SPEAKING_RELEASED = false as boolean;

type Stage = "foundation" | "core" | "master";
const courseIds: Record<Stage, string> = {
  foundation: "foundation-construction-foreman-ja-en",
  core: "construction-foreman-ja-en",
  master: "master-construction-foreman-ja-en",
};

export interface PrivateForemanSpeakingWord {
  target: string;
  english: string;
  kind: "term" | "phrase";
  cardId: string;
  dictionaryId: string;
}

export interface PrivateForemanSpeakingMission {
  id: string;
  stage: Stage;
  courseId: string;
  lesson: number;
  sourceLessonId: string;
  sourceFile: string;
  locale: "ja-JP";
  briefEnglish: string;
  partnerRoleEnglish: string;
  openingLineJapanese: string;
  sourceSpeakingJapanese: string | null;
  wordBank: PrivateForemanSpeakingWord[];
  reviewed: false;
}

export interface PrivateForemanSpeakingInventory {
  schema: 1;
  state: "private-speaking-missions-draft";
  targetLanguage: "Japanese";
  supportLanguage: "English";
  pairKey: "Japanese:English";
  locale: "ja-JP";
  registered: false;
  reviewed: false;
  counts: { missions: number; wordPlacements: number };
  missions: PrivateForemanSpeakingMission[];
}

export type PrivateForemanSpeakingLookup = (
  stage: Stage,
  lesson: number,
  targetLanguage: string,
  supportLanguage: string,
) => PrivateForemanSpeakingMission | undefined;

/** Preserves each authored stage/lesson ID and its own vocabulary; no fallback pair. */
export function buildPrivateForemanSpeaking(inventory: PrivateForemanSpeakingInventory): PrivateForemanSpeakingLookup {
  if (
    inventory.schema !== 1 || inventory.state !== "private-speaking-missions-draft" ||
    inventory.targetLanguage !== "Japanese" || inventory.supportLanguage !== "English" ||
    inventory.pairKey !== "Japanese:English" || inventory.locale !== "ja-JP" ||
    inventory.registered !== false || inventory.reviewed !== false ||
    inventory.counts.missions !== 60 || inventory.missions.length !== 60
  ) throw new Error("Invalid private Japanese Foreman speaking inventory");

  const byLesson = new Map<string, PrivateForemanSpeakingMission>();
  let placements = 0;
  for (const mission of inventory.missions) {
    const courseId = courseIds[mission.stage];
    const limit = mission.stage === "foundation" ? 10 : mission.stage === "core" ? 30 : 20;
    if (
      !courseId || mission.courseId !== courseId || !Number.isInteger(mission.lesson) ||
      mission.lesson < 1 || mission.lesson > limit ||
      mission.id !== `speak-${courseId}:lesson:${mission.lesson}` ||
      mission.locale !== "ja-JP" || mission.reviewed !== false ||
      !mission.briefEnglish.trim() || !mission.partnerRoleEnglish.trim() ||
      !mission.openingLineJapanese.trim() || mission.wordBank.length < 8 ||
      mission.wordBank.some((word) => !word.target.trim() || !word.english.trim() ||
        !word.cardId.startsWith("card-ja-en-") || !word.dictionaryId.startsWith("dict-ja-en-"))
    ) throw new Error(`Invalid private Foreman speaking mission ${mission.id}`);
    const key = `${mission.stage}:${mission.lesson}`;
    if (byLesson.has(key)) throw new Error(`Duplicate private Foreman speaking mission ${key}`);
    byLesson.set(key, mission);
    placements += mission.wordBank.length;
  }
  if (placements !== inventory.counts.wordPlacements) throw new Error("Private speaking word count mismatch");
  return (stage, lesson, targetLanguage, supportLanguage) =>
    targetLanguage === "Japanese" && supportLanguage === "English"
      ? byLesson.get(`${stage}:${lesson}`)
      : undefined;
}

/** Hard release gate: private missions cannot enter live conversation. */
export function privateForemanSpeakingMission(
  lookup: PrivateForemanSpeakingLookup,
  stage: Stage,
  lesson: number,
  targetLanguage: string,
  supportLanguage: string,
): PrivateForemanSpeakingMission | undefined {
  if (!JAPANESE_FOREMAN_SPEAKING_RELEASED) return undefined;
  return lookup(stage, lesson, targetLanguage, supportLanguage);
}
