import { getModule } from "../data/modules.ts";

/** Valid module links already select the learning context; generic onboarding must not replace it. */
export function directLearningEntry(
  search: string,
  nativeLanguage: string,
): { moduleId: string; tab: "flashcards" | "core30" } | null {
  const params = new URLSearchParams(search);
  const module = getModule(params.get("module"));
  const tab = params.get("tab");
  if (!module || (tab !== "flashcards" && tab !== "core30")) return null;
  // English-for-work still needs an instruction language before starting.
  if (module.learnDirection === "en-target" && nativeLanguage === "English") return null;
  return { moduleId: module.id, tab };
}
