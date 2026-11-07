/** Inspection-only inputs. No public route, catalog, worker, or progress writer imports this file. */
export const JAPANESE_TRAVEL_BREAKFAST_RELEASED = false as const;
export const JAPANESE_TRAVEL_BREAKFAST_MODES = ["see", "recall", "hear", "type", "say", "write"] as const;

const PAIR = "Japanese:English";
const MODULE = "travel-breakfast";
const STAGES = {
  "foundation-travel-breakfast": {
    count: 10,
    source: "94621cca4158b76c69435f35eb1dfdc4893df553afaccb8a1963bdd9e6d80e79",
  },
  "travel-breakfast": {
    count: 30,
    source: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8",
    reader: "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc",
  },
  "master-travel-breakfast": {
    count: 20,
    source: "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b",
    reader: "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348",
  },
} as const;

type StageId = keyof typeof STAGES;
type Card = { ja: string; en: string; kind: string; note?: string };
type ReaderLine = { speaker?: string; ja: string; en: string };
type Speaking = {
  role: string; partnerRole: string; opening: string; goal: string; closure: string; wordBank: string[];
};
type Lesson = {
  n: number; stableId: string; title: string; objective: string; cards: Card[];
  reader: ReaderLine[]; speaking: Speaking; modes: Record<(typeof JAPANESE_TRAVEL_BREAKFAST_MODES)[number], string>;
};
export type PrivateJapaneseTravelBundle = {
  schema: 1; state: "authored-draft-partial" | "authored-draft"; moduleId: typeof MODULE;
  stageId: StageId; target: "Japanese"; native: "English";
  registered: false; reviewed: false; audio: "none";
  source: { sha256?: string; curriculumSha256?: string; readerSha256?: string };
  lessons: Lesson[];
};

export type PrivateJapaneseTravelInput = {
  registration: "disabled";
  pairKey: typeof PAIR;
  stageId: StageId;
  lessonId: string;
  cacheNamespace: string;
  readerHandoff: { lessonId: string; lines: ReaderLine[] };
  cards: Array<Card & { cardId: string }>;
  speaking: Speaking & { locale: "ja-JP" };
  modeInputs: Lesson["modes"];
};

const japaneseScript = /[\u3040-\u30ff\u3400-\u9fff]/u;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const exactSharedLoanword = (card: Card) => card.ja === "Wi-Fi" && card.en === "Wi-Fi";

/** Joins source-pinned Master draft segments for private inspection only. */
export function assemblePrivateJapaneseTravelMaster(
  chunks: PrivateJapaneseTravelBundle[],
): PrivateJapaneseTravelBundle {
  const stage = STAGES["master-travel-breakfast"];
  if (chunks.length !== 7 || chunks.some((chunk) =>
    chunk.schema !== 1 || chunk.moduleId !== MODULE || chunk.stageId !== "master-travel-breakfast" ||
    chunk.target !== "Japanese" || chunk.native !== "English" ||
    chunk.registered !== false || chunk.reviewed !== false || chunk.audio !== "none" ||
    (chunk.state !== "authored-draft-partial" && chunk.state !== "authored-draft") ||
    chunk.source.curriculumSha256 !== stage.source || chunk.source.readerSha256 !== stage.reader
  )) throw new Error("Invalid private Japanese Breakfast Master segment");
  const lessons = chunks.flatMap((chunk) => chunk.lessons);
  if (lessons.length !== stage.count || lessons.some((lesson, index) =>
    lesson.n !== index + 1 || lesson.stableId !== `master-travel-breakfast:${index + 1}:ja-en`
  )) throw new Error("Private Japanese Breakfast Master sequence changed");
  return { ...chunks[0], state: "authored-draft", lessons };
}

/** Builds a private candidate from exact-pair source. Malformed same-pair content fails closed. */
export function inspectPrivateJapaneseTravelBreakfast(
  bundle: PrivateJapaneseTravelBundle,
  lessonNumber: number,
  target: string,
  native: string,
): PrivateJapaneseTravelInput | null {
  if (target !== "Japanese" || native !== "English") return null;
  if (!bundle || bundle.schema !== 1 ||
      (bundle.state !== "authored-draft-partial" && bundle.state !== "authored-draft") ||
      bundle.moduleId !== MODULE || bundle.target !== target || bundle.native !== native ||
      bundle.registered !== false || bundle.reviewed !== false || bundle.audio !== "none" ||
      !Object.hasOwn(STAGES, bundle.stageId)) {
    throw new Error("Invalid private Japanese Breakfast bundle or language pair");
  }
  const stage = STAGES[bundle.stageId];
  if (bundle.lessons.length !== stage.count ||
      (bundle.stageId === "foundation-travel-breakfast"
        ? bundle.source.sha256 !== stage.source
        : bundle.source.curriculumSha256 !== stage.source || !("reader" in stage) || bundle.source.readerSha256 !== stage.reader)) {
    throw new Error("Private Japanese Breakfast source or stage count changed");
  }
  const seen = new Set<number>();
  for (const lesson of bundle.lessons) {
    if (!Number.isInteger(lesson.n) || lesson.n < 1 || lesson.n > stage.count || seen.has(lesson.n) ||
        lesson.stableId !== `${bundle.stageId}:${lesson.n}:ja-en`) {
      throw new Error("Private Japanese Breakfast lesson identity changed");
    }
    seen.add(lesson.n);
  }
  const lesson = bundle.lessons.find((item) => item.n === lessonNumber);
  if (!lesson) return null;
  if (!nonempty(lesson.title) || !nonempty(lesson.objective) ||
      !Array.isArray(lesson.cards) || lesson.cards.length === 0 ||
      lesson.cards.some((card) => !nonempty(card.ja) || !nonempty(card.en) ||
        (!japaneseScript.test(card.ja) || card.ja === card.en) && !exactSharedLoanword(card)) ||
      !Array.isArray(lesson.reader) || lesson.reader.length === 0 ||
      lesson.reader.some((line) => !nonempty(line.ja) || !japaneseScript.test(line.ja) || !nonempty(line.en) || line.ja === line.en) ||
      !lesson.speaking || !nonempty(lesson.speaking.opening) || !japaneseScript.test(lesson.speaking.opening) ||
      !nonempty(lesson.speaking.role) || !nonempty(lesson.speaking.partnerRole) ||
      !nonempty(lesson.speaking.goal) || !nonempty(lesson.speaking.closure) ||
      !Array.isArray(lesson.speaking.wordBank) || lesson.speaking.wordBank.length === 0 ||
      lesson.speaking.wordBank.some((word) => !nonempty(word) || (!japaneseScript.test(word) && word !== "Wi-Fi")) ||
      JAPANESE_TRAVEL_BREAKFAST_MODES.some((mode) => !nonempty(lesson.modes?.[mode]))) {
    throw new Error("Private Japanese Breakfast lesson input is incomplete or cross-paired");
  }
  return {
    registration: "disabled",
    pairKey: PAIR,
    stageId: bundle.stageId,
    lessonId: lesson.stableId,
    cacheNamespace: `private:Japanese:English:${MODULE}:${bundle.stageId}:${lesson.n}`,
    readerHandoff: { lessonId: lesson.stableId, lines: lesson.reader },
    cards: lesson.cards.map((card, index) => ({ ...card, cardId: `${lesson.stableId}:card:${index + 1}` })),
    speaking: { ...lesson.speaking, locale: "ja-JP" },
    modeInputs: lesson.modes,
  };
}

/** Hard gate: private inspection cannot become a learner route by changing a caller argument. */
export function releasedJapaneseTravelBreakfastInput(
  bundle: PrivateJapaneseTravelBundle,
  lessonNumber: number,
  target: string,
  native: string,
): PrivateJapaneseTravelInput | null {
  if (!JAPANESE_TRAVEL_BREAKFAST_RELEASED) return null;
  return inspectPrivateJapaneseTravelBreakfast(bundle, lessonNumber, target, native);
}
