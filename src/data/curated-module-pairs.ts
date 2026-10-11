import type { Language } from "@/state/app-state";

export interface CuratedModulePair {
  english: string;
  translation: string;
  kind: "term" | "phrase";
}

type BilingualPhrase = { en: string; translations: Record<string, string> };

/** Reuse translations already visible in the specialty tools as study cards. */
export async function getCuratedModulePairs(
  moduleId: string,
  language: Language,
): Promise<CuratedModulePair[]> {
  const rows: CuratedModulePair[] = [];
  const addPhrases = (phrases: BilingualPhrase[], kind: CuratedModulePair["kind"] = "phrase") => {
    for (const phrase of phrases) {
      const translation = phrase.translations[language];
      if (translation) rows.push({ english: phrase.en, translation, kind });
    }
  };

  if (moduleId === "rock-climbing") {
    const climbing = await import("./climbing-practice");
    addPhrases(climbing.TRAVEL_PHRASES);
    addPhrases(climbing.KNOT_STEPS);
    addPhrases(climbing.COMMANDS);
    addPhrases(climbing.PHRASES);
    for (const item of climbing.GEAR_ITEMS) {
      const english = item.names.English;
      const translation = item.names[language];
      if (english && translation) rows.push({ english, translation, kind: "term" });
    }
  } else if (moduleId === "sport-fishing") {
    const fishing = await import("./fishing-practice");
    addPhrases(fishing.BOAT_COMMANDS);
    addPhrases(fishing.TRAVEL_PHRASES);
    addPhrases(fishing.SPECIES, "term");
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.english.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
