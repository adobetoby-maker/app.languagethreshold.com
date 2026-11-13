/** Private FR-001 dictionary candidate. No production route imports this module. */
export const FRENCH_PRONUNCIATION_DICTIONARY_RELEASE_ENABLED = false as const;

type Pair = { target: string; native: string };
type Occurrence = { lessonId: string; card: number; kind: "term" | "phrase" };
type Sense = { englishGlossFromSource: string; occurrences: Occurrence[] };
type Entry = {
  exactFrenchText: string;
  senses: Sense[];
  multipleSourceGlosses: boolean;
  qualifiedFrenchReviewRequired: boolean;
};
type Candidate = {
  moduleId: string;
  pairKey: string;
  state: string;
  lessonCount: number;
  cardPlacements: number;
  exactFrenchEntries: number;
  entriesWithMultipleSourceGlosses: number;
  runtimeRegistered: boolean;
  entries: Entry[];
};

const exactPair = (pair: Pair) => pair.target === "French" && pair.native === "English";

export function inspectPrivateFrenchPronunciationDictionary(data: Candidate) {
  if (data.moduleId !== "french-sound-like-a-native" || data.pairKey !== "French:English" ||
      data.state !== "private-provisional-unreviewed-unregistered" || data.runtimeRegistered ||
      data.lessonCount !== 60 || data.cardPlacements !== 600 ||
      data.entries.length !== data.exactFrenchEntries)
    throw new Error("invalid French pronunciation dictionary candidate");

  const entries = new Map<string, Entry>();
  const cards = new Map<string, { french: string; english: string; kind: Occurrence["kind"] }>();
  let multipleGlosses = 0;
  for (const entry of data.entries) {
    if (!entry.exactFrenchText || entries.has(entry.exactFrenchText) ||
        !entry.qualifiedFrenchReviewRequired || entry.senses.length === 0 ||
        entry.multipleSourceGlosses !== (entry.senses.length > 1))
      throw new Error("invalid French pronunciation dictionary entry");
    if (entry.multipleSourceGlosses) multipleGlosses++;
    const glosses = new Set<string>();
    for (const sense of entry.senses) {
      if (!sense.englishGlossFromSource || glosses.has(sense.englishGlossFromSource) ||
          sense.occurrences.length === 0)
        throw new Error("invalid French pronunciation sense");
      glosses.add(sense.englishGlossFromSource);
      for (const occurrence of sense.occurrences) {
        if (!/^(foundation|core|master)-french-sound-like-a-native:\d+:fr-en$/.test(occurrence.lessonId) ||
            !Number.isInteger(occurrence.card) || occurrence.card < 1 || occurrence.card > 10 ||
            !["term", "phrase"].includes(occurrence.kind))
          throw new Error("invalid French pronunciation card reference");
        const key = `${occurrence.lessonId}#${occurrence.card}`;
        if (cards.has(key)) throw new Error("duplicate French pronunciation card reference");
        cards.set(key, {
          french: entry.exactFrenchText,
          english: sense.englishGlossFromSource,
          kind: occurrence.kind,
        });
      }
    }
    entries.set(entry.exactFrenchText, entry);
  }
  if (cards.size !== 600 || multipleGlosses !== data.entriesWithMultipleSourceGlosses)
    throw new Error("incomplete French pronunciation dictionary candidate");

  return {
    releaseEnabled: FRENCH_PRONUNCIATION_DICTIONARY_RELEASE_ENABLED,
    lookup: (exactFrenchText: string, pair: Pair) => exactPair(pair)
      ? entries.get(exactFrenchText) ?? null : null,
    card: (lessonId: string, card: number, pair: Pair) => exactPair(pair)
      ? cards.get(`${lessonId}#${card}`) ?? null : null,
  };
}
