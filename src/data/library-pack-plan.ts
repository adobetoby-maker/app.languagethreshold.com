import type { LibraryEntry } from "@/state/library-state";
import { MODULES } from "./modules";
import { getLessons } from "./module-starters";

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
  const modules: Record<string, LibraryEntry[]> = {};
  for (const module of MODULES) {
    const parentId = module.id.replace(/^(foundation|master)-/, "");
    modules[module.id] = entries.filter((entry) => {
      if (coreIds.has(entry.id)) return false;
      // Authored lesson ownership is authoritative. Keyword matching also
      // matched software/finance/trade texts to nursing through generic words.
      return (
        getLessons(module.id, entry.language).includes(entry.id) ||
        getLessons(parentId, entry.language).includes(entry.id) ||
        (parentId === "lds-missionary" && entry.section === "missionary")
      );
    });
  }
  // Preserve legacy readings in generated source snapshots, but never fetch this
  // reserved pack automatically or expose it as a selectable app module.
  const assigned = new Set([...core, ...Object.values(modules).flat()].map((entry) => entry.id));
  modules.__unassigned__ = entries.filter((entry) => !assigned.has(entry.id));
  return { core, modules };
}
