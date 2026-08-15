import type { CharacterCategory, CjkCharacter, CjkLanguage } from "./types";
import { JAPANESE_CHARACTERS } from "./japanese-core";
import { CHINESE_CHARACTERS } from "./chinese-core";
import { CORE_RADICALS, findRadical } from "./radicals";

export type { CharacterCategory, CjkCharacter, CjkLanguage, RadicalPart, RadicalEntry } from "./types";
export { CORE_RADICALS, findRadical };

export function getCharactersForLanguage(language: CjkLanguage): CjkCharacter[] {
  return language === "Japanese" ? JAPANESE_CHARACTERS : CHINESE_CHARACTERS;
}

export function getCharactersByCategory(
  language: CjkLanguage,
  category: CharacterCategory | "all",
): CjkCharacter[] {
  const all = getCharactersForLanguage(language);
  if (category === "all") return all;
  return all.filter((c) => c.categories.includes(category));
}

export function findCharacter(
  language: CjkLanguage,
  char: string,
): CjkCharacter | undefined {
  return getCharactersForLanguage(language).find((c) => c.char === char);
}

/** Best-effort lookup by any CJK glyph for Reader long-press expand. */
export function findCharacterAny(char: string): CjkCharacter | undefined {
  return (
    JAPANESE_CHARACTERS.find((c) => c.char === char) ??
    CHINESE_CHARACTERS.find((c) => c.char === char)
  );
}

export const CHARACTER_CATEGORY_LABELS: Record<CharacterCategory | "all", string> = {
  all: "All",
  core: "Core",
  "street-safety": "Street & Safety",
  "jlpt-n5": "JLPT N5",
  "jlpt-n4": "JLPT N4",
  "jlpt-n3": "JLPT N3",
  "hsk-1": "HSK 1",
  "hsk-2": "HSK 2",
  "radical-focus": "Radicals",
};
