/**
 * Shared CJK character study model for Japanese kanji and Chinese hanzi.
 * Designed for radical breakdown, stroke hints, mnemonics, and long-press expand UX.
 */

export type CjkLanguage = "Japanese" | "Chinese";

export type CharacterCategory =
  | "core"
  | "jlpt-n5"
  | "jlpt-n4"
  | "hsk-1"
  | "hsk-2"
  | "street-safety"
  | "radical-focus";

export interface RadicalPart {
  /** The radical glyph (may be a standalone character or a component form). */
  glyph: string;
  /** English meaning of the radical. */
  meaning: string;
  /** Optional reading (Japanese) or pinyin (Chinese). */
  reading?: string;
  /** How this radical contributes to the whole character's meaning. */
  role?: string;
  /** Position within the character (left, right, top, bottom, enclosure, phonetic…). */
  position?: "left" | "right" | "top" | "bottom" | "enclosure" | "phonetic" | "other";
}

export interface CjkCharacter {
  char: string;
  language: CjkLanguage;
  meanings: string[];
  /** Japanese on'yomi readings (katakana convention in data, display any). */
  onyomi?: string[];
  /** Japanese kun'yomi readings. */
  kunyomi?: string[];
  /** Mandarin pinyin with tone marks. */
  pinyin?: string[];
  radicals: RadicalPart[];
  strokeCount: number;
  /**
   * Plain-language stroke order hint for practice (full animated SVG later).
   * e.g. "1 horizontal · 2 vertical through · 3 left sweep · 4 right sweep"
   */
  strokeOrderHint?: string;
  /** Story / confluence of radicals that makes the meaning memorable. */
  mnemonic?: string;
  categories: CharacterCategory[];
  /** Example compounds or phrases useful for street/safety or core vocab. */
  examples?: { text: string; reading?: string; meaning: string }[];
}

export interface RadicalEntry {
  glyph: string;
  meaning: string;
  /** Alternate forms of the same radical. */
  variants?: string[];
  strokeCount: number;
  /** Japanese name if relevant. */
  japaneseName?: string;
  /** Pinyin if relevant. */
  pinyin?: string;
}
