import { getCurriculum } from "../data/curriculum.ts";
import { getLessonDefinition, modulePracticeVersion } from "./lesson-definition.ts";
import { cleanLessonWords, hasEnoughWords } from "./lesson-words-core.ts";
import type { ModuleDeckPair } from "./module-deck-core.ts";

/** Reuse all authored lesson vocabulary for the exact track; structural coverage is not approval. */
export function authoredModuleDeck(
  moduleId: string | null | undefined,
  target: string,
  native: string,
) {
  if (!moduleId) return null;
  const curriculum = getCurriculum(moduleId);
  if (!curriculum || curriculum.lessons.length !== 30) return null;
  const contentVersion = modulePracticeVersion(moduleId, target, native);
  if (contentVersion === "unversioned-app-draft") return null;
  const pairs: ModuleDeckPair[] = [],
    seen = new Set<string>();
  for (const [index, lesson] of curriculum.lessons.entries()) {
    if (lesson.n !== index + 1) return null;
    const definition = getLessonDefinition({
      moduleId,
      lessonNumber: lesson.n,
      targetLanguage: target,
      instructionLanguage: native,
      contentVersion,
    });
    const words = cleanLessonWords(definition?.words);
    if (!definition?.teaching || !hasEnoughWords(words)) return null;
    for (const word of words) {
      const english = word.en.normalize("NFC").trim(),
        translation = word.es.normalize("NFC").trim();
      const key = JSON.stringify([
        english.toLocaleLowerCase("en"),
        translation.toLocaleLowerCase("en"),
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ english, translation, kind: word.kind });
    }
  }
  return {
    pairs,
    lessonCount: curriculum.lessons.length,
    contentVersion,
    readiness: "draft" as const,
  };
}
