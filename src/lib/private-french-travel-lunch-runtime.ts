/** Inspection-only French Lunch adapter. No learner route or progress writer imports it. */
export const FRENCH_TRAVEL_LUNCH_RELEASED = false as const;

const STAGES = [
  ["foundation-travel-lunch-fr", 10],
  ["travel-lunch", 30],
  ["master-travel-lunch-fr", 20],
] as const;
const MODES = ["see", "recall", "hear", "type", "say", "write"] as const;
const PINNED_SOURCE_HASHES: Record<string, string> = {
  "content/french-travel-lunch/foundation-1-3-draft.json": "c685153c7d1581fa58624f2d774a8a80c78ab4b941f273f2a7a8fc0c6d647385",
  "content/french-travel-lunch/foundation-4-10-draft.json": "3417074d7398c07f02dde920661ce98f7ca7969d558436fbc14a1b390f62ea76",
  "content/french-travel-lunch/core-1-5-draft.json": "8a9efdbaaa6a0f58a88e2d44c3065437aca47eeb8d114a15bd0d04c52c3a9a5d",
  "content/french-travel-lunch/core-6-10-draft.json": "3e6830181e6e1b7590f29c9e6c4086569ec999500f5e9c6f5cfc59c1fc8ef57e",
  "content/french-travel-lunch/core-11-15-draft.json": "ce9f0a21540dc21c3e9e70047f1a0469057a97a0005f55197eafa1d80429c92d",
  "content/french-travel-lunch/core-16-20-draft.json": "6c045464d1af55d44fcd853a3f3e5bd3b366ad9b29f7388ac56d52b2dba65d9d",
  "content/french-travel-lunch/core-21-25-draft.json": "58409024a57e5de54f7284e1c5f4b7d9bc5a664d98bf0f8cd209bad982f83f13",
  "content/french-travel-lunch/core-26-30-draft.json": "43065579efd649001cc2450c21d32ca1243e4e2c5bac398219585affc5965423",
  "content/french-travel-lunch/master-1-5-draft.json": "802c8178beb929663fe9c9ecd85930eb91f72d2e7755120d69a1fad304ab81d0",
  "content/french-travel-lunch/master-6-10-draft.json": "1715128d15925a41cb0fe601e237d5e4b5e191236f26d76fc815ff1d5154b8fb",
  "content/french-travel-lunch/master-11-15-draft.json": "d53e5fc1dacd1b72aad737d478947a189463505fe546921092f0a4bb50ff3ce0",
  "content/french-travel-lunch/master-16-20-draft.json": "5e79a97bb029a32f879d6efffb62fd9fdf001098da64af896cb9bb63e7e088e8",
};
const PINNED_CONTENT_HASHES: Record<string, string> = {
  "content/french-travel-lunch/foundation-lesson-content-candidate.json": "c1775aa0b19ed39aed1d5ecd302b9a14bf520440a8f871a45acff0099e577a47",
  "content/french-travel-lunch/core-lesson-content-candidate.json": "3d6b2fcc68bfcfd3626181923dc8e626f680e96c85d7a47a464810117de5598b",
  "content/french-travel-lunch/master-lesson-content-candidate.json": "80be06e9eb4fa369be419cf87f996012e9a574f1c99d272382f1275b6593cb80",
};
const PINNED_DICTIONARY_HASH = "c174fc58addccbe7bee08c4cbc8c014d506a625732ebea2ebce2b0ab3de445ed";
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
function privateLessonId(moduleId: string, n: number): string | null {
  const stage = STAGES.find(([id]) => id === moduleId);
  if (!stage || !Number.isInteger(n) || n < 1 || n > stage[1]) return null;
  const prefix = moduleId === "travel-lunch" ? "core" : moduleId.split("-")[0];
  return `${prefix}-travel-lunch:${n}:fr-en`;
}

export function inspectPrivateFrenchTravelLunch(candidate: PrivateFrenchTravelLunchCandidate) {
  if (candidate.schema !== 1 || candidate.pairKey !== "French:English" ||
      candidate.courseId !== "travel-lunch" || candidate.locale !== "fr-FR" ||
      candidate.registration !== "disabled" || candidate.reviewed !== false ||
      candidate.audioListeningReviewed !== false || candidate.lessonCount !== 60 ||
      candidate.cardCount !== 948 || candidate.readerTurnCount !== 556 ||
      candidate.passageLineCount !== 587 || candidate.activityCount !== 360 ||
      candidate.lessons.length !== 60 || candidate.sourceFiles.length !== 12 ||
      candidate.contentFiles.length !== 3 || candidate.dictionarySha256 !== PINNED_DICTIONARY_HASH)
    throw new Error("Wrong French Lunch pair, source counts, or private release gate");
  const sources = new Map(candidate.sourceFiles.map(file => [file.path, file.sha256]));
  const contents = new Map(candidate.contentFiles.map(file => [file.path, file.sha256]));
  if (sources.size !== 12 || contents.size !== 3 ||
      [...sources].some(([path, value]) => PINNED_SOURCE_HASHES[path] !== value) ||
      [...contents].some(([path, value]) => PINNED_CONTENT_HASHES[path] !== value))
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
    getLesson: (moduleId: string, n: number, target: string, native: string) => {
      const id = privateLessonId(moduleId, n);
      return target === "French" && native === "English" && id
        ? lessons.get(id) ?? null : null;
    },
    cacheNamespace: (moduleId: string, n: number, target: string, native: string) => {
      const id = privateLessonId(moduleId, n);
      return target === "French" && native === "English" && id && lessons.has(id)
        ? `private:French:English:travel-lunch:${moduleId}:${n}` : null;
    },
  };
}

export function releasedFrenchTravelLunch(): null {
  return null;
}
