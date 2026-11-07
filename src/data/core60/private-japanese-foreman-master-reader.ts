/**
 * Private inspection adapter for the Japanese→English Foreman Master drafts.
 * This file is deliberately absent from the Core 60 manifest, module registry,
 * Reader library and offline packs. It does not create or migrate progress.
 */

export const JAPANESE_FOREMAN_MASTER_READER_REGISTERED = false as const;

export const JAPANESE_FOREMAN_MASTER_MODES = [
  "see", "recall", "hear", "type", "say", "write",
] as const;

const COURSE_ID = "master-construction-foreman-ja-en";
const PAIR_KEY = "Japanese:English";

type Sentence = { target: string; native: string };
type Word = { es: string; en: string; kind: string; cardId: string };
type Check = { prompt: string; hint: string; answer: string; explanation: string };

export type PrivateForemanMasterBundle = {
  state: string;
  reviewed: boolean;
  courseId: string;
  pairKey: string;
  target: string;
  native: string;
  locale: string;
  sourceEnglishSubsetSha256: string;
  lessons: Array<{
    id: string;
    n: number;
    title: string;
    words: Word[];
    modes: string[];
    reader: { id: string; title: string; state: string; sentences: Sentence[] };
    speaking: { id: string; locale: string };
    checks: Check[];
    reviewed: boolean;
  }>;
};

export type PrivateForemanMasterReaderSource = {
  state: string;
  reviewed: boolean;
  courseId: string;
  target: string;
  native: string;
  sourceEnglishSubsetSha256: string;
  lessons: Array<{ n: number; title: string; sentences: Sentence[]; checkAnswers: string[] }>;
};

export type PrivateForemanMasterReaderInput = {
  registration: "disabled";
  pairKey: typeof PAIR_KEY;
  courseId: typeof COURSE_ID;
  lessonId: string;
  lessonNumber: number;
  title: string;
  readerHandoff: {
    readerId: string;
    lessonId: string;
    sentences: Sentence[];
  };
  modeInputs: {
    see: Word[];
    recall: Word[];
    hear: Word[];
    type: Word[];
    say: { speakingId: string; locale: "ja-JP"; words: Word[] };
    write: Check[];
  };
};

/**
 * Build an inspectable input for one private lesson. A wrong pair returns null;
 * malformed or cross-wired private source throws so it cannot be quietly used.
 * No application route imports this adapter while registration is disabled.
 */
export function inspectPrivateForemanMasterReader(
  bundle: PrivateForemanMasterBundle,
  source: PrivateForemanMasterReaderSource,
  lessonNumber: number,
  target: string,
  native: string,
): PrivateForemanMasterReaderInput | null {
  if (target !== "Japanese" || native !== "English") return null;
  if (bundle.state !== "private-runtime-draft" || bundle.reviewed !== false ||
      bundle.courseId !== COURSE_ID || bundle.pairKey !== PAIR_KEY ||
      bundle.target !== target || bundle.native !== native || bundle.locale !== "ja-JP") {
    throw new Error("Invalid private Japanese Foreman Master bundle");
  }
  if (source.state !== "original-contextual-reader-draft" || source.reviewed !== false ||
      source.courseId !== COURSE_ID || source.target !== target || source.native !== native ||
      source.sourceEnglishSubsetSha256 !== bundle.sourceEnglishSubsetSha256) {
    throw new Error("Reader source does not match the private Master bundle");
  }
  const lesson = bundle.lessons.find((item) => item.n === lessonNumber);
  const reader = source.lessons.find((item) => item.n === lessonNumber);
  if (!lesson || !reader) return null;
  if (lesson.id !== `${COURSE_ID}:lesson:${lessonNumber}` || lesson.reviewed !== false ||
      lesson.reader.id !== `reader-${lesson.id}` ||
      lesson.reader.state !== "original-contextual-draft" ||
      lesson.speaking.id !== `speak-${lesson.id}` || lesson.speaking.locale !== "ja-JP" ||
      lesson.modes.join("|") !== JAPANESE_FOREMAN_MASTER_MODES.join("|") ||
      lesson.reader.title !== reader.title ||
      JSON.stringify(lesson.reader.sentences) !== JSON.stringify(reader.sentences) ||
      lesson.reader.sentences.length !== 8 || lesson.checks.length !== 3 ||
      lesson.checks.some((check, index) =>
        check.answer !== reader.checkAnswers[index] ||
        !lesson.reader.sentences.some((line) =>
          line.target === check.prompt.replace("____", check.answer) && line.native === check.hint))) {
    throw new Error(`Private Master Reader handoff is inconsistent at lesson ${lessonNumber}`);
  }
  if (lesson.words.some((word) => !word.es || !word.en || !word.cardId)) {
    throw new Error(`Private Master word pair is incomplete at lesson ${lessonNumber}`);
  }
  // Reuse source IDs. Neither this adapter nor its tests allocate progress IDs.
  return {
    registration: "disabled",
    pairKey: PAIR_KEY,
    courseId: COURSE_ID,
    lessonId: lesson.id,
    lessonNumber,
    title: lesson.title,
    readerHandoff: {
      readerId: lesson.reader.id,
      lessonId: lesson.id,
      sentences: lesson.reader.sentences,
    },
    modeInputs: {
      see: lesson.words,
      recall: lesson.words,
      hear: lesson.words,
      type: lesson.words,
      say: { speakingId: lesson.speaking.id, locale: "ja-JP", words: lesson.words },
      write: lesson.checks,
    },
  };
}
