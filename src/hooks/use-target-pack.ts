// Built by TAC — 2026-11-21
// The learner's selected target language as a pack (see use-language-pack.ts).
import { packFor, type LanguagePack } from "@/data/language-packs/registry";
import { useApp } from "@/state/app-state";

/** The pack of the learner's selected target language, or null when it has none. */
export function useTargetPack(): LanguagePack | null {
  const { state } = useApp();
  return packFor(state.selectedLanguage);
}

