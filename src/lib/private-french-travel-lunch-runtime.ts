/** Inspection-only French Lunch adapter. No learner route or progress writer imports it. */
export const FRENCH_TRAVEL_LUNCH_RELEASED = false as const;

const STAGES = [
  ["foundation-travel-lunch-fr", 10],
  ["travel-lunch", 30],
  ["master-travel-lunch-fr", 20],
] as const;
const MODES = ["see", "recall", "hear", "type", "say", "write"] as const;
type Mode = typeof MODES[number];
type Card = { id: string; fr: string; en: string; kind: string; dictionaryId: string };
type ReaderLine = { speaker: string; fr: string; en: string };
type Activity = { id: string; mode: Mode; cueEnglish: string; sourceCardId: string;
  modelFrench: string; modelEnglish: string; responseKind: string; readyForLearner: boolean };
type Verb = { infinitive: string; native: string; forms: Record<string, string>;
  example: { target: string; native: string } };
type SupplementalWord = { es: string; en: string; kind: string;
  sourceReaderIndex?: number; sourceCardIndex?: number };
type Lesson = { moduleId: string; lessonNumber: number; stableId: string;
  title: string; objective: string; focus: string; scene: string;
  cards: Card[]; reader: ReaderLine[]; passage: { title: string; target: string[]; native: string[] };
  speaking: { role: string; partnerRole: string; opening: string; goal: string;
    closure: string; wordBank: string[] };
  modes: Record<Mode, Activity>; verbs: Verb[]; supplementalWords: SupplementalWord[];
  sourceBatch: string; reviewed: boolean; readyForLearner: boolean };
export type PrivateFrenchTravelLunchCandidate = {
  schema: number; pairKey: string; courseId: string; locale: string; registration: string;
  reviewed: boolean; audioListeningReviewed: boolean;
  lessonCount: number; cardCount: number; readerTurnCount: number;
  passageLineCount: number; activityCount: number;
  sourceFiles: { path: string; sha256: string }[];
  contentFiles: { path: string; sha256: string }[];
  dictionarySha256: string; lessons: Lesson[];
};

const nonempty = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const hash = (value: string) => /^[0-9a-f]{64}$/.test(value);

export function inspectPrivateFrenchTravelLunch(candidate: PrivateFrenchTravelLunchCandidate) {
  if (candidate.schema !== 1 || candidate.pairKey !== "French:English" ||
      candidate.courseId !== "travel-lunch" || candidate.locale !== "fr-FR" ||
      candidate.registration !== "disabled" || candidate.reviewed !== false ||
      candidate.audioListeningReviewed !== false || candidate.lessonCount !== 60 ||
      candidate.cardCount !== 948 || candidate.readerTurnCount !== 556 ||
      candidate.passageLineCount !== 587 || candidate.activityCount !== 360 ||
      candidate.lessons.length !== 60 || candidate.sourceFiles.length !== 12 ||
      candidate.contentFiles.length !== 3 || !hash(candidate.dictionarySha256))
    throw new Error("Wrong French Lunch pair, source counts, or private release gate");
  const sources = new Map(candidate.sourceFiles.map(file => [file.path, file.sha256]));
  const contents = new Map(candidate.contentFiles.map(file => [file.path, file.sha256]));
  if (sources.size !== 12 || contents.size !== 3 ||
      [...sources.values(), ...contents.values()].some(value => !hash(value)))
    throw new Error("French Lunch source identities changed");

  const lessons = new Map<string, Lesson>();
  let index = 0, cardCount = 0, readerCount = 0, passageCount = 0, activityCount = 0;
  for (const [moduleId, count] of STAGES) {
    for (let n = 1; n <= count; n++) {
      const lesson = candidate.lessons[index++];
      const stage = moduleId === "travel-lunch" ? "core" : moduleId.split("-")[0];
      const id = `${stage}-travel-lunch:${n}:fr-en`;
      if (lesson.moduleId !== moduleId || lesson.lessonNumber !== n ||
          lesson.stableId !== id || lesson.reviewed !== false ||
          lesson.readyForLearner !== false || !sources.has(lesson.sourceBatch) ||
          ![lesson.title, lesson.objective, lesson.focus, lesson.scene].every(nonempty))
        throw new Error(`${id}: changed lesson identity or source`);
      if (!Array.isArray(lesson.cards) || !lesson.cards.length ||
          lesson.cards.some((card, i) => card.id !== `${id}:card:${i + 1}` ||
            !nonempty(card.fr) || !nonempty(card.en) || !nonempty(card.kind) ||
            !/^fr-lunch:[0-9a-f]{24}$/.test(card.dictionaryId)) ||
          !Array.isArray(lesson.reader) || lesson.reader.length < 1 ||
          lesson.reader.some(line => ![line.speaker, line.fr, line.en].every(nonempty)))
        throw new Error(`${id}: missing French/English cards, dictionary links or Reader`);
      if (!lesson.passage || !nonempty(lesson.passage.title) ||
          !Array.isArray(lesson.passage.target) || !Array.isArray(lesson.passage.native) ||
          lesson.passage.target.length < 1 ||
          lesson.passage.target.length !== lesson.passage.native.length ||
          [...lesson.passage.target, ...lesson.passage.native].some(line => !nonempty(line)))
        throw new Error(`${id}: incomplete aligned passage`);
      const speaking = lesson.speaking;
      const cardTexts = new Set(lesson.cards.map(card => card.fr));
      if (!speaking || ![speaking.role, speaking.partnerRole, speaking.opening,
                          speaking.goal, speaking.closure].every(nonempty) ||
          !Array.isArray(speaking.wordBank) || !speaking.wordBank.length ||
          speaking.wordBank.some(word => !cardTexts.has(word)))
        throw new Error(`${id}: missing French speaking scene or word bank`);
      if (!lesson.modes || JSON.stringify(Object.keys(lesson.modes).sort()) !==
          JSON.stringify([...MODES].sort()))
        throw new Error(`${id}: missing authored practice mode`);
      const byCard = new Map(lesson.cards.map(card => [card.id, card]));
      for (const mode of MODES) {
        const activity = lesson.modes[mode];
        const card = byCard.get(activity?.sourceCardId);
        if (activity?.id !== `${id}:${mode}:private-1` || activity.mode !== mode ||
            !nonempty(activity.cueEnglish) || activity.readyForLearner !== false ||
            !["fixed", "open"].includes(activity.responseKind) || !card ||
            activity.modelFrench !== card.fr || activity.modelEnglish !== card.en)
          throw new Error(`${id}:${mode}: activity is not its authored source card`);
      }
      if (!Array.isArray(lesson.verbs) || !lesson.verbs.length ||
          lesson.verbs.some(verb => !nonempty(verb.infinitive) || !nonempty(verb.native) ||
            !nonempty(verb.example?.target) || !nonempty(verb.example?.native) ||
            !verb.forms || JSON.stringify(Object.keys(verb.forms).sort()) !==
              JSON.stringify(["je", "tu", "il_elle_on", "nous", "vous", "ils_elles"].sort()) ||
            Object.values(verb.forms).some(form => !nonempty(form))))
        throw new Error(`${id}: missing verb forms`);
      if (!Array.isArray(lesson.supplementalWords) ||
          lesson.supplementalWords.some(word => !nonempty(word.es) || !nonempty(word.en) ||
            !nonempty(word.kind) ||
            (word.sourceReaderIndex === undefined && word.sourceCardIndex === undefined) ||
            (word.sourceReaderIndex !== undefined &&
             (!Number.isInteger(word.sourceReaderIndex) || word.sourceReaderIndex < 1 ||
              word.sourceReaderIndex > lesson.reader.length)) ||
            (word.sourceCardIndex !== undefined &&
             (!Number.isInteger(word.sourceCardIndex) || word.sourceCardIndex < 1 ||
              word.sourceCardIndex > lesson.cards.length))))
        throw new Error(`${id}: invalid supplemental word source`);
      if (lessons.has(id)) throw new Error(`${id}: duplicate lesson`);
      lessons.set(id, lesson);
      cardCount += lesson.cards.length;
      readerCount += lesson.reader.length;
      passageCount += lesson.passage.target.length;
      activityCount += MODES.length;
    }
  }
  if (cardCount !== candidate.cardCount || readerCount !== candidate.readerTurnCount ||
      passageCount !== candidate.passageLineCount || activityCount !== candidate.activityCount)
    throw new Error("French Lunch content totals changed");
  return {
    releaseEnabled: FRENCH_TRAVEL_LUNCH_RELEASED,
    lessonCount: lessons.size,
    getLesson: (moduleId: string, n: number, target: string, native: string) =>
      target === "French" && native === "English" && Number.isInteger(n)
        ? lessons.get(`${moduleId === "travel-lunch" ? "core" : moduleId.split("-")[0]}-travel-lunch:${n}:fr-en`) ?? null
        : null,
    cacheNamespace: (moduleId: string, n: number, target: string, native: string) =>
      target === "French" && native === "English" && Number.isInteger(n) &&
      lessons.has(`${moduleId === "travel-lunch" ? "core" : moduleId.split("-")[0]}-travel-lunch:${n}:fr-en`)
        ? `private:French:English:travel-lunch:${moduleId}:${n}` : null,
  };
}

export function releasedFrenchTravelLunch(): null {
  return null;
}
