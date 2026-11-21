// Built by TAC — 2026-11-21
// The pack of a module-bound surface (see use-language-pack.ts for the other ways to get a pack).
import { packFor, type LanguagePack } from "@/data/language-packs/registry";
import { getModule } from "@/data/modules";

/**
 * The pack a module was authored for (its authoredPair target), or null when the module does not
 * declare one. Use it for module-bound surfaces (Sound Like a Native, verb series) instead of a
 * language literal.
 */
export function useModulePack(moduleId: string | null | undefined): LanguagePack | null {
  return packFor(getModule(moduleId)?.authoredPair?.target);
}
