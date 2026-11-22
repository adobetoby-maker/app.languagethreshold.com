import { getModule, linkLearningPair, packCourseModuleId } from "../data/modules.ts";

/** Valid module links already select the learning context; generic onboarding must not replace it. */
export function directLearningEntry(
  search: string,
  nativeLanguage: string,
): { moduleId: string; tab: "flashcards" | "core30" } | null {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  // A link to a French or Italian course ("?module=roofing&target=French") already chose the
  // language and opens that course, so the bilingual first-run language picker is not shown.
  const pair = linkLearningPair(params.get("target"), params.get("native"));
  const packModuleId = pair ? packCourseModuleId(params.get("module"), pair.target) : undefined;
  if (packModuleId !== undefined) {
    const packModule = getModule(packModuleId);
    return packModule
      ? { moduleId: packModule.id, tab: tab === "flashcards" ? "flashcards" : "core30" }
      : null;
  }
  const module = getModule(params.get("module"));
  if (!module || (tab !== "flashcards" && tab !== "core30")) return null;
  // English-for-work still needs an instruction language before starting.
  if (module.learnDirection === "en-target" && nativeLanguage === "English") return null;
  return { moduleId: module.id, tab };
}
