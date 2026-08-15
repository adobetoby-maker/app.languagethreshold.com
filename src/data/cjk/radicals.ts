import type { RadicalEntry } from "./types";

/**
 * High-frequency radicals used in JLPT N5 / HSK 1 and street-safety characters.
 * This is a teaching set, not a complete Kangxi list.
 */
export const CORE_RADICALS: RadicalEntry[] = [
  { glyph: "人", meaning: "person", variants: ["亻"], strokeCount: 2, japaneseName: "ひと", pinyin: "rén" },
  { glyph: "口", meaning: "mouth / opening", strokeCount: 3, japaneseName: "くち", pinyin: "kǒu" },
  { glyph: "日", meaning: "sun / day", strokeCount: 4, japaneseName: "ひ", pinyin: "rì" },
  { glyph: "月", meaning: "moon / month / flesh", strokeCount: 4, japaneseName: "つき", pinyin: "yuè" },
  { glyph: "木", meaning: "tree / wood", strokeCount: 4, japaneseName: "き", pinyin: "mù" },
  { glyph: "水", meaning: "water", variants: ["氵"], strokeCount: 4, japaneseName: "みず", pinyin: "shuǐ" },
  { glyph: "火", meaning: "fire", variants: ["灬"], strokeCount: 4, japaneseName: "ひ", pinyin: "huǒ" },
  { glyph: "土", meaning: "earth / ground", strokeCount: 3, japaneseName: "つち", pinyin: "tǔ" },
  { glyph: "金", meaning: "metal / gold", variants: ["钅", "釒"], strokeCount: 8, japaneseName: "かね", pinyin: "jīn" },
  { glyph: "心", meaning: "heart / mind", variants: ["忄"], strokeCount: 4, japaneseName: "こころ", pinyin: "xīn" },
  { glyph: "手", meaning: "hand", variants: ["扌"], strokeCount: 4, japaneseName: "て", pinyin: "shǒu" },
  { glyph: "言", meaning: "speech / words", variants: ["讠"], strokeCount: 7, japaneseName: "ごんべん", pinyin: "yán" },
  { glyph: "女", meaning: "woman", strokeCount: 3, japaneseName: "おんな", pinyin: "nǚ" },
  { glyph: "子", meaning: "child", strokeCount: 3, japaneseName: "こ", pinyin: "zǐ" },
  { glyph: "山", meaning: "mountain", strokeCount: 3, japaneseName: "やま", pinyin: "shān" },
  { glyph: "門", meaning: "gate / door", variants: ["门"], strokeCount: 8, japaneseName: "もん", pinyin: "mén" },
  { glyph: "車", meaning: "vehicle", variants: ["车"], strokeCount: 7, japaneseName: "くるま", pinyin: "chē" },
  { glyph: "止", meaning: "stop", strokeCount: 4, japaneseName: "とめる", pinyin: "zhǐ" },
  { glyph: "刀", meaning: "knife / blade", variants: ["刂"], strokeCount: 2, japaneseName: "かたな", pinyin: "dāo" },
  { glyph: "力", meaning: "power / strength", strokeCount: 2, japaneseName: "ちから", pinyin: "lì" },
  { glyph: "大", meaning: "big", strokeCount: 3, japaneseName: "だい", pinyin: "dà" },
  { glyph: "小", meaning: "small", strokeCount: 3, japaneseName: "しょう", pinyin: "xiǎo" },
  { glyph: "上", meaning: "up / above", strokeCount: 3, japaneseName: "うえ", pinyin: "shàng" },
  { glyph: "下", meaning: "down / below", strokeCount: 3, japaneseName: "した", pinyin: "xià" },
  { glyph: "中", meaning: "middle / center", strokeCount: 4, japaneseName: "なか", pinyin: "zhōng" },
  { glyph: "雨", meaning: "rain", strokeCount: 8, japaneseName: "あめ", pinyin: "yǔ" },
  { glyph: "食", meaning: "eat / food", variants: ["饣"], strokeCount: 9, japaneseName: "しょく", pinyin: "shí" },
  { glyph: "糸", meaning: "thread / silk", variants: ["纟"], strokeCount: 6, japaneseName: "いと", pinyin: "sī" },
  { glyph: "目", meaning: "eye", strokeCount: 5, japaneseName: "め", pinyin: "mù" },
  { glyph: "足", meaning: "foot / enough", strokeCount: 7, japaneseName: "あし", pinyin: "zú" },
];

export function findRadical(glyph: string): RadicalEntry | undefined {
  return CORE_RADICALS.find(
    (r) => r.glyph === glyph || r.variants?.includes(glyph),
  );
}
