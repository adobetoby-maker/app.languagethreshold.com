/** Inspection-only Japanese Lunch adapter. No public route or progress writer imports it. */
export const JAPANESE_TRAVEL_LUNCH_RELEASED = false as const;

const STAGES = [
  ["foundation-travel-lunch", 10],
  ["travel-lunch", 30],
  ["master-travel-lunch", 20],
] as const;
const MODES = ["see", "recall", "hear", "type", "say", "write"] as const;
type Mode = typeof MODES[number];
type Card = { id: string; ja: string; en: string; kind: string; dictionaryId: string; note?: string };
type ReaderLine = { speaker?: string; ja: string; en: string };
type Activity = {
  id: string; lessonId: string; mode: Mode; cueEnglish: string;
  sourceRef: string; modelJapanese: string; modelEnglish: string;
  responseKind: string; recordedAudioRequired: boolean; readyForLearner: boolean;
};
type Lesson = {
  moduleId: string; lessonNumber: number; stableId: string;
  title: string; objective: string; focus: string; scene: string;
  cards: Card[]; reader: ReaderLine[];
  speaking: { role: string; partnerRole: string; opening: string;
              goal: string; closure: string; wordBank: string[] };
  modes: Record<Mode, Activity>; sourceBatch: string; reviewed: boolean;
};
export type PrivateJapaneseTravelLunchCandidate = {
  schema: number; pairKey: string; moduleId: string; registration: string;
  reviewed: boolean; audioListeningReviewed: boolean;
  lessonCount: number; cardCount: number; readerTurnCount: number; activityCount: number;
  dictionarySha256: string; dictionaryEntryCount: number;
  sourceFiles: { path: string; sha256: string }[]; lessons: Lesson[];
};

const japaneseScript = /[\u3040-\u30ff\u3400-\u9fff]/u;
const nonempty = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());

export function inspectPrivateJapaneseTravelLunch(candidate: PrivateJapaneseTravelLunchCandidate) {
  if (candidate.schema !== 1 || candidate.pairKey !== "Japanese:English" ||
      candidate.moduleId !== "travel-lunch" || candidate.registration !== "disabled" ||
      candidate.reviewed !== false || candidate.audioListeningReviewed !== false ||
      candidate.lessonCount !== 60 || candidate.cardCount !== 1099 ||
      candidate.readerTurnCount !== 760 || candidate.activityCount !== 360 ||
      candidate.dictionaryEntryCount !== 955 ||
      candidate.dictionarySha256 !== "e4bddd31a0965548fe1f76b1791ca7150fbf0689e4c3bb88fc663591c930c6e1" ||
      candidate.lessons.length !== 60 || candidate.sourceFiles.length !== 40)
    throw new Error("Wrong Japanese Lunch pair, course count, or private release gate");
  const sources = new Map(candidate.sourceFiles.map(item => [item.path, item.sha256]));
  if (sources.size !== 40 || [...sources.values()].some(hash => !/^[0-9a-f]{64}$/.test(hash)))
    throw new Error("Changed Japanese Lunch source-file identities");

  let lessonIndex = 0;
  let cardCount = 0;
  let readerCount = 0;
  const dictionaryIds = new Set<string>();
  const lessons = new Map<string, Lesson>();
  for (const [moduleId, count] of STAGES) {
    for (let n = 1; n <= count; n++) {
      const lesson = candidate.lessons[lessonIndex++];
      const id = `${moduleId}:${n}:ja-en`;
      if (lesson.moduleId !== moduleId || lesson.lessonNumber !== n ||
          lesson.stableId !== id || lesson.reviewed !== false ||
          !sources.has(lesson.sourceBatch) ||
          ![lesson.title, lesson.objective, lesson.focus, lesson.scene].every(nonempty))
        throw new Error(`${id}: changed lesson identity or source`);
      if (!Array.isArray(lesson.cards) || !lesson.cards.length ||
          lesson.cards.some((card, i) => card.id !== `${id}:card:${i + 1}` ||
            !nonempty(card.ja) || !japaneseScript.test(card.ja) || !nonempty(card.en) ||
            !/^ja-en-lunch-[0-9a-f]{16}$/.test(card.dictionaryId)) ||
          !Array.isArray(lesson.reader) || lesson.reader.length < 8 ||
          lesson.reader.some(line => !nonempty(line.ja) || !japaneseScript.test(line.ja) || !nonempty(line.en)))
        throw new Error(`${id}: missing exact-pair cards or Reader`);
      const speaking = lesson.speaking;
      if (!speaking || ![speaking.role, speaking.partnerRole, speaking.opening,
                          speaking.goal, speaking.closure].every(nonempty) ||
          !japaneseScript.test(speaking.opening) ||
          !Array.isArray(speaking.wordBank) || speaking.wordBank.length !== lesson.cards.length ||
          speaking.wordBank.some((word, i) => word !== lesson.cards[i].ja))
        throw new Error(`${id}: missing speaking scene or target word bank`);
      if (JSON.stringify(Object.keys(lesson.modes).sort()) !== JSON.stringify([...MODES].sort()))
        throw new Error(`${id}: missing authored practice mode`);
      const cards = new Map(lesson.cards.map(card => [card.id, card]));
      for (const mode of MODES) {
        const activity = lesson.modes[mode];
        const card = cards.get(activity?.sourceRef);
        if (activity?.id !== `${id}:${mode}:private-1` || activity.lessonId !== id ||
            activity.mode !== mode || !nonempty(activity.cueEnglish) ||
            activity.readyForLearner !== false ||
            activity.recordedAudioRequired !== (mode === "hear") ||
            !card || activity.modelJapanese !== card.ja || activity.modelEnglish !== card.en)
          throw new Error(`${id}:${mode}: activity is not its authored source card`);
      }
      if (lessons.has(id)) throw new Error(`${id}: duplicate lesson`);
      lessons.set(id, lesson);
      lesson.cards.forEach(card => dictionaryIds.add(card.dictionaryId));
      cardCount += lesson.cards.length;
      readerCount += lesson.reader.length;
    }
  }
  if (cardCount !== candidate.cardCount || readerCount !== candidate.readerTurnCount ||
      dictionaryIds.size !== candidate.dictionaryEntryCount)
    throw new Error("Japanese Lunch card or Reader totals changed");
  return {
    releaseEnabled: JAPANESE_TRAVEL_LUNCH_RELEASED,
    lessonCount: lessons.size,
    getLesson: (moduleId: string, n: number, target: string, native: string) =>
      target === "Japanese" && native === "English" && Number.isInteger(n)
        ? lessons.get(`${moduleId}:${n}:ja-en`) ?? null : null,
    cacheNamespace: (moduleId: string, n: number, target: string, native: string) =>
      target === "Japanese" && native === "English" &&
      Number.isInteger(n) && lessons.has(`${moduleId}:${n}:ja-en`)
        ? `private:Japanese:English:travel-lunch:${moduleId}:${n}` : null,
  };
}

export function releasedJapaneseTravelLunch(): null {
  return null;
}
