import type { LibraryEntry } from "@/state/library-state";
import { MODULES } from "./modules";
import { getLessons } from "./module-starters";
import { matchesFocus } from "@/lib/module-filter";

// General reading shared by every module. Professional and faith passages belong
// to module packs, even when their historical category happens to be "Culture".
const CORE_IDS = new Set([
  "culture-espana-seed",
  "culture-it-piccolo-principe",
  "culture-it-calvino-marcovaldo",
  "culture-ja-tsuru-no-ongaeshi",
  "culture-ja-murakami-kaze",
  "culture-ko-heungbu-nolbu",
  "culture-ko-seoul-cafe",
  "seed-es-travel-train-ticket",
  "seed-ps-cricket-match",
]);
export function planLibraryPacks(entries: LibraryEntry[]) {
  const core = entries.filter((entry) => entry.section === "classic" || CORE_IDS.has(entry.id));
  // Every authored language gets a usable general starter even without a module.
  for (const language of new Set(entries.map((entry) => entry.language))) {
    const starterId = getLessons("international-travel", language)[0];
    const starter = entries.find((entry) => entry.id === starterId && entry.available);
    if (starter && !core.some((entry) => entry.id === starter.id)) core.push(starter);
    if (!core.some((entry) => entry.language === language && entry.available)) {
      const fallback =
        entries.find(
          (entry) => entry.language === language && entry.available && entry.category === "Culture",
        ) ?? entries.find((entry) => entry.language === language && entry.available);
      if (fallback) core.push(fallback);
    }
  }
  const coreIds = new Set(core.map((entry) => entry.id));
  const authoredIds = new Set(
    MODULES.flatMap((module) =>
      [...new Set(entries.map((entry) => entry.language))].flatMap((language) =>
        getLessons(module.id, language),
      ),
    ),
  );
  const modules: Record<string, LibraryEntry[]> = {};
  for (const module of MODULES) {
    modules[module.id] = entries.filter((entry) => {
      if (coreIds.has(entry.id)) return false;
      // Explicit lesson ownership wins over keyword overlap. Stage modules can
      // reuse their parent trade's authored readings without fetching other trades.
      const parentId = module.id.replace(/^(foundation|master)-/, "");
      if (
        getLessons(module.id, entry.language).includes(entry.id) ||
        getLessons(parentId, entry.language).includes(entry.id)
      )
        return true;
      if (authoredIds.has(entry.id)) return false;
      const sentences = entry.chapters
        ? entry.chapters.flatMap((chapter) => chapter.sentences)
        : entry.sentences;
      const haystack = `${entry.title} ${entry.subtitle ?? ""} ${sentences
        .slice(0, 6)
        .map((sentence) => `${sentence.en} ${sentence.target}`)
        .join(" ")}`;
      return matchesFocus(haystack, module.vocabFocus);
    });
  }
  return { core, modules };
}
