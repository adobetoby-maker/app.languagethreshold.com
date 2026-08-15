import type { CjkCharacter } from "./types";
import { JAPANESE_STREET_SAFETY } from "./street-safety";

const EXTRA: CjkCharacter[] = [
  {
    char: "一",
    language: "Japanese",
    meanings: ["one"],
    onyomi: ["イチ", "イツ"],
    kunyomi: ["ひと-", "ひと.つ"],
    radicals: [{ glyph: "一", meaning: "one", position: "other" }],
    strokeCount: 1,
    strokeOrderHint: "1 left-to-right horizontal",
    mnemonic: "A single stroke — one.",
    categories: ["core", "jlpt-n5"],
  },
];

function dedupeByChar(list: CjkCharacter[]): CjkCharacter[] {
  const seen = new Set<string>();
  const out: CjkCharacter[] = [];
  for (const item of list) {
    if (seen.has(item.char)) continue;
    seen.add(item.char);
    out.push(item);
  }
  return out;
}

export const JAPANESE_CHARACTERS: CjkCharacter[] = dedupeByChar([
  ...JAPANESE_STREET_SAFETY,
  ...EXTRA,
]);
