/** Private, unreviewed Foreman dictionary adapter. No learner-facing caller imports its inventory. */
export const JAPANESE_FOREMAN_DICTIONARY_RELEASED = false as boolean;

export interface PrivateForemanSense {
  id: string;
  target: string;
  native: string;
  kind: "term" | "phrase";
  partOfSpeech: null;
  inflection: null;
  reviewed: false;
  needsSenseReview: boolean;
  sourceIds: string[];
  occurrences: {
    stage: "foundation" | "core" | "master";
    courseId: string;
    lesson: number;
    sourceFile: string;
    cardId: string;
  }[];
}

export interface PrivateForemanInventory {
  schema: 1;
  state: "private-dictionary-draft";
  reviewed: false;
  registered: false;
  targetLanguage: "Japanese";
  supportLanguage: "English";
  pairKey: "Japanese:English";
  counts: { exactPairs: number; ambiguousHeadwords: number };
  entries: PrivateForemanSense[];
}

export type PrivateForemanLookup = (
  headword: string,
  queryLanguage: "Japanese" | "English",
  targetLanguage: string,
  supportLanguage: string,
) => readonly PrivateForemanSense[];

/** Builds an exact-headword index; each distinct authored gloss keeps its stable sense ID. */
export function buildPrivateForemanDictionary(inventory: PrivateForemanInventory): PrivateForemanLookup {
  if (
    inventory.schema !== 1 || inventory.state !== "private-dictionary-draft" ||
    inventory.reviewed !== false || inventory.registered !== false ||
    inventory.pairKey !== "Japanese:English" || inventory.targetLanguage !== "Japanese" ||
    inventory.supportLanguage !== "English" || inventory.counts.exactPairs !== inventory.entries.length
  ) throw new Error("Invalid private Japanese Foreman dictionary inventory");

  const japanese = new Map<string, PrivateForemanSense[]>();
  const english = new Map<string, PrivateForemanSense[]>();
  const ids = new Set<string>();
  for (const entry of inventory.entries) {
    if (
      !entry.id.startsWith("dict-ja-en-") || ids.has(entry.id) || !entry.target.trim() ||
      !entry.native.trim() || entry.reviewed !== false || entry.partOfSpeech !== null ||
      entry.inflection !== null || !entry.occurrences.length ||
      entry.occurrences.some((occ) => !occ.courseId.endsWith("-ja-en"))
    ) throw new Error(`Invalid private Japanese Foreman sense: ${entry.id}`);
    ids.add(entry.id);
    for (const [table, headword] of [[japanese, entry.target], [english, entry.native]] as const) {
      const key = headword.normalize("NFC").trim().toLocaleLowerCase("en");
      const senses = table.get(key) ?? [];
      senses.push(entry);
      table.set(key, senses);
    }
  }
  return (headword, queryLanguage, targetLanguage, supportLanguage) => {
    if (targetLanguage !== "Japanese" || supportLanguage !== "English") return [];
    const table = queryLanguage === "Japanese" ? japanese : queryLanguage === "English" ? english : null;
    if (!table) return [];
    return table.get(headword.normalize("NFC").trim().toLocaleLowerCase("en")) ?? [];
  };
}

/** Release gate stays closed until qualified language/domain review and app acceptance. */
export function privateForemanDictionaryLookup(
  lookup: PrivateForemanLookup,
  headword: string,
  queryLanguage: "Japanese" | "English",
  targetLanguage: string,
  supportLanguage: string,
): readonly PrivateForemanSense[] {
  if (!JAPANESE_FOREMAN_DICTIONARY_RELEASED) return [];
  return lookup(headword, queryLanguage, targetLanguage, supportLanguage);
}
