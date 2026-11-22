// Built by TAC — 2026-11-21
// How a view gets its language pack. App state and many props still carry a stored display name
// ("Spanish") until the Language → LanguageCode state migration; resolve it here, once, at the top
// of the component, then pass the pack to every audio, speech, grading, keyboard and API call.
//
//   const pack = useTargetPack();             // the learner's selected target language (use-target-pack)
//   const pack = usePack(lessonLanguage);     // a lesson / module whose language may differ
//   const pack = useModulePack(moduleId);     // a module's own authored language (use-module-pack)
//   if (!pack) return <Unavailable />;        // fail closed: never borrow another language
//
// Both return the same object for the same language, so a pack is a stable hook dependency.

import { packFor, type LanguagePack } from "@/data/language-packs/registry";

/** The pack for a code or stored legacy name, or null (fail closed). */
export function usePack(codeOrName: string | null | undefined): LanguagePack | null {
  return packFor(codeOrName);
}

