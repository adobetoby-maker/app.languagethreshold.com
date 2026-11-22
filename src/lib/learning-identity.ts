import { isBundledPack, packFor } from "../data/language-packs/registry.ts";
import { nativeLanguageCode } from "../data/languages.ts";

/**
 * Stable lesson objective identity shared by practice, speaking and assessment mappings, for one
 * learning pair. A module id may repeat across languages (the French and Spanish catalogs both
 * have `orthopedics`), so a language whose lessons come from its pack catalog (a bundled pack
 * without legacy ids: French, Italian) carries the pair: `<target>.<native>.<module>.lesson.<n>`.
 * Every other language (Spanish, Japanese, and the languages still on the legacy adapter) keeps
 * the unscoped id `<module>.lesson.<n>` it has always stored, so its records keep matching.
 * An unregistered target throws (never another language's objective).
 */
export function lessonObjectiveId(
  moduleId: string,
  lessonNumber: number,
  targetLanguage: string,
  nativeLanguage: string,
): string {
  if (
    !/^[a-z][a-z0-9-]{0,79}$/.test(moduleId) ||
    !Number.isInteger(lessonNumber) ||
    lessonNumber < 1 ||
    lessonNumber > 1000
  )
    throw new Error("Invalid lesson identity.");
  const pack = packFor(targetLanguage);
  const native = nativeLanguageCode(nativeLanguage) ?? packFor(nativeLanguage)?.code ?? null;
  if (!pack || !native) throw new Error("Invalid lesson identity.");
  const unscoped = `${moduleId}.lesson.${lessonNumber}`;
  return isBundledPack(pack) && !pack.ids.legacyUnscopedStorage
    ? `${pack.code}.${native}.${unscoped}`
    : unscoped;
}

/** The module and lesson number of an objective id, scoped (`fr.en.<module>.lesson.<n>`) or not. */
export function parseLessonObjectiveId(id: string): { moduleId: string; lessonNumber: number } | null {
  const match = /^(?:[a-z]{2,3}(?:-[A-Za-z]+)?\.[a-z]{2,3}\.)?([a-z][a-z0-9-]*)\.lesson\.(\d+)$/.exec(id);
  return match ? { moduleId: match[1], lessonNumber: Number(match[2]) } : null;
}
