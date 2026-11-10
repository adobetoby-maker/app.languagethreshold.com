/**
 * Romaji → Hiragana / Katakana converter (Hepburn romanization).
 *
 * Rules (applied left-to-right, greedy):
 *  1. Double consonant (except nn) → っ/ッ + single consonant start
 *  2. "n" before consonant, end-of-input, or when followed by "n" → ん/ン
 *  3. Longest-match lookup in ROMAJI table
 *  4. Unrecognised characters pass through unchanged
 */

type KanaMap = [string, string][];

// ── Hiragana ──────────────────────────────────────────────────────────────────
const H: KanaMap = [
  // 4-char
  ["tchi", "っち"],
  ["ttsu", "っつ"],
  // 3-char compounds (must precede 2-char)
  ["sha", "しゃ"],
  ["shu", "しゅ"],
  ["she", "しぇ"],
  ["sho", "しょ"],
  ["chi", "ち"],
  ["cha", "ちゃ"],
  ["chu", "ちゅ"],
  ["che", "ちぇ"],
  ["cho", "ちょ"],
  ["tsa", "つぁ"],
  ["tsu", "つ"],
  ["tse", "つぇ"],
  ["tso", "つぉ"],
  ["tya", "ちゃ"],
  ["tyu", "ちゅ"],
  ["tyo", "ちょ"],
  ["shi", "し"],
  ["kya", "きゃ"],
  ["kyi", "きぃ"],
  ["kyu", "きゅ"],
  ["kye", "きぇ"],
  ["kyo", "きょ"],
  ["nya", "にゃ"],
  ["nyi", "にぃ"],
  ["nyu", "にゅ"],
  ["nye", "にぇ"],
  ["nyo", "にょ"],
  ["hya", "ひゃ"],
  ["hyu", "ひゅ"],
  ["hye", "ひぇ"],
  ["hyo", "ひょ"],
  ["mya", "みゃ"],
  ["myu", "みゅ"],
  ["mye", "みぇ"],
  ["myo", "みょ"],
  ["rya", "りゃ"],
  ["ryu", "りゅ"],
  ["rye", "りぇ"],
  ["ryo", "りょ"],
  ["gya", "ぎゃ"],
  ["gyu", "ぎゅ"],
  ["gye", "ぎぇ"],
  ["gyo", "ぎょ"],
  ["zya", "じゃ"],
  ["zyu", "じゅ"],
  ["zye", "じぇ"],
  ["zyo", "じょ"],
  ["dya", "ぢゃ"],
  ["dyu", "ぢゅ"],
  ["dyo", "ぢょ"],
  ["bya", "びゃ"],
  ["byu", "びゅ"],
  ["bye", "びぇ"],
  ["byo", "びょ"],
  ["pya", "ぴゃ"],
  ["pyu", "ぴゅ"],
  ["pye", "ぴぇ"],
  ["pyo", "ぴょ"],
  ["ja", "じゃ"],
  ["ju", "じゅ"],
  ["je", "じぇ"],
  ["jo", "じょ"],
  // 2-char
  ["ka", "か"],
  ["ki", "き"],
  ["ku", "く"],
  ["ke", "け"],
  ["ko", "こ"],
  ["sa", "さ"],
  ["si", "し"],
  ["su", "す"],
  ["se", "せ"],
  ["so", "そ"],
  ["ta", "た"],
  ["ti", "ち"],
  ["tu", "つ"],
  ["te", "て"],
  ["to", "と"],
  ["na", "な"],
  ["ni", "に"],
  ["nu", "ぬ"],
  ["ne", "ね"],
  ["no", "の"],
  ["ha", "は"],
  ["hi", "ひ"],
  ["fu", "ふ"],
  ["hu", "ふ"],
  ["he", "へ"],
  ["ho", "ほ"],
  ["ma", "ま"],
  ["mi", "み"],
  ["mu", "む"],
  ["me", "め"],
  ["mo", "も"],
  ["ya", "や"],
  ["yi", "い"],
  ["yu", "ゆ"],
  ["ye", "いぇ"],
  ["yo", "よ"],
  ["ra", "ら"],
  ["ri", "り"],
  ["ru", "る"],
  ["re", "れ"],
  ["ro", "ろ"],
  ["wa", "わ"],
  ["wi", "ゐ"],
  ["we", "ゑ"],
  ["wo", "を"],
  ["ga", "が"],
  ["gi", "ぎ"],
  ["gu", "ぐ"],
  ["ge", "げ"],
  ["go", "ご"],
  ["za", "ざ"],
  ["zi", "じ"],
  ["ji", "じ"],
  ["zu", "ず"],
  ["ze", "ぜ"],
  ["zo", "ぞ"],
  ["da", "だ"],
  ["di", "ぢ"],
  ["du", "づ"],
  ["de", "で"],
  ["do", "ど"],
  ["ba", "ば"],
  ["bi", "び"],
  ["bu", "ぶ"],
  ["be", "べ"],
  ["bo", "ぼ"],
  ["pa", "ぱ"],
  ["pi", "ぴ"],
  ["pu", "ぷ"],
  ["pe", "ぺ"],
  ["po", "ぽ"],
  // 1-char vowels
  ["a", "あ"],
  ["i", "い"],
  ["u", "う"],
  ["e", "え"],
  ["o", "お"],
];

// ── Katakana (same order, katakana equivalents) ───────────────────────────────
const K: KanaMap = [
  ["tchi", "ッチ"],
  ["ttsu", "ッツ"],
  ["sha", "シャ"],
  ["shu", "シュ"],
  ["she", "シェ"],
  ["sho", "ショ"],
  ["chi", "チ"],
  ["cha", "チャ"],
  ["chu", "チュ"],
  ["che", "チェ"],
  ["cho", "チョ"],
  ["tsa", "ツァ"],
  ["tsu", "ツ"],
  ["tse", "ツェ"],
  ["tso", "ツォ"],
  ["tya", "チャ"],
  ["tyu", "チュ"],
  ["tyo", "チョ"],
  ["shi", "シ"],
  ["kya", "キャ"],
  ["kyu", "キュ"],
  ["kyo", "キョ"],
  ["nya", "ニャ"],
  ["nyu", "ニュ"],
  ["nyo", "ニョ"],
  ["hya", "ヒャ"],
  ["hyu", "ヒュ"],
  ["hyo", "ヒョ"],
  ["mya", "ミャ"],
  ["myu", "ミュ"],
  ["myo", "ミョ"],
  ["rya", "リャ"],
  ["ryu", "リュ"],
  ["ryo", "リョ"],
  ["gya", "ギャ"],
  ["gyu", "ギュ"],
  ["gyo", "ギョ"],
  ["zya", "ジャ"],
  ["zyu", "ジュ"],
  ["zyo", "ジョ"],
  ["bya", "ビャ"],
  ["byu", "ビュ"],
  ["byo", "ビョ"],
  ["pya", "ピャ"],
  ["pyu", "ピュ"],
  ["pyo", "ピョ"],
  ["ja", "ジャ"],
  ["ju", "ジュ"],
  ["je", "ジェ"],
  ["jo", "ジョ"],
  ["ka", "カ"],
  ["ki", "キ"],
  ["ku", "ク"],
  ["ke", "ケ"],
  ["ko", "コ"],
  ["sa", "サ"],
  ["si", "シ"],
  ["su", "ス"],
  ["se", "セ"],
  ["so", "ソ"],
  ["ta", "タ"],
  ["ti", "チ"],
  ["tu", "ツ"],
  ["te", "テ"],
  ["to", "ト"],
  ["na", "ナ"],
  ["ni", "ニ"],
  ["nu", "ヌ"],
  ["ne", "ネ"],
  ["no", "ノ"],
  ["ha", "ハ"],
  ["hi", "ヒ"],
  ["fu", "フ"],
  ["hu", "フ"],
  ["he", "ヘ"],
  ["ho", "ホ"],
  ["ma", "マ"],
  ["mi", "ミ"],
  ["mu", "ム"],
  ["me", "メ"],
  ["mo", "モ"],
  ["ya", "ヤ"],
  ["yu", "ユ"],
  ["yo", "ヨ"],
  ["ra", "ラ"],
  ["ri", "リ"],
  ["ru", "ル"],
  ["re", "レ"],
  ["ro", "ロ"],
  ["wa", "ワ"],
  ["wi", "ヰ"],
  ["we", "ヱ"],
  ["wo", "ヲ"],
  ["ga", "ガ"],
  ["gi", "ギ"],
  ["gu", "グ"],
  ["ge", "ゲ"],
  ["go", "ゴ"],
  ["za", "ザ"],
  ["zi", "ジ"],
  ["ji", "ジ"],
  ["zu", "ズ"],
  ["ze", "ゼ"],
  ["zo", "ゾ"],
  ["da", "ダ"],
  ["di", "ヂ"],
  ["du", "ヅ"],
  ["de", "デ"],
  ["do", "ド"],
  ["ba", "バ"],
  ["bi", "ビ"],
  ["bu", "ブ"],
  ["be", "ベ"],
  ["bo", "ボ"],
  ["pa", "パ"],
  ["pi", "ピ"],
  ["pu", "プ"],
  ["pe", "ペ"],
  ["po", "ポ"],
  ["a", "ア"],
  ["i", "イ"],
  ["u", "ウ"],
  ["e", "エ"],
  ["o", "オ"],
];

const CONSONANTS = new Set("bcdfghjklmnpqrstvwxyz");
const VOWELS = new Set("aeiou");

function convert(input: string, map: KanaMap, sokuon: string, nasal: string): string {
  const s = input.toLowerCase();
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    // Standalone "n" handling: ん/ン when followed by consonant (not y), end, or "n"
    if (ch === "n" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "n") {
        out += nasal;
        // Before a vowel or y, the second n starts the next syllable:
        // konnichiha → こんにちは, onna → おんな.
        i += i + 2 < s.length && (VOWELS.has(s[i + 2]) || s[i + 2] === "y") ? 1 : 2;
        continue;
      }
      if (CONSONANTS.has(next) && next !== "y") {
        out += nasal;
        i++;
        continue;
      }
    } else if (ch === "n" && i === s.length - 1) {
      out += nasal;
      i++;
      continue;
    }

    // Double consonant → sokuon + rest
    if (CONSONANTS.has(ch) && i + 1 < s.length && s[i + 1] === ch && ch !== "n") {
      out += sokuon;
      i++; // skip first of the double; loop processes single consonant next
      continue;
    }

    // Long vowel in katakana input (aa, ii, uu, ee, oo → ー)
    // Not needed for hiragana — we just repeat the vowel.

    // Greedy longest-match
    let matched = false;
    for (const [romaji, kana] of map) {
      if (s.startsWith(romaji, i)) {
        out += kana;
        i += romaji.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += input[i]; // preserve original casing for unmatched chars
      i++;
    }
  }
  return out;
}

export function toHiragana(romaji: string): string {
  return convert(romaji, H, "っ", "ん");
}

export function toKatakana(romaji: string): string {
  return convert(romaji, K, "ッ", "ン");
}

/** Check if a string is already hiragana / katakana / kanji (i.e. not romaji). */
export function isJapanese(s: string): boolean {
  return /[぀-ゟ゠-ヿ一-鿿]/.test(s);
}

/** Convert hiragana to katakana (block-shift by 0x60). */
export function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCodePoint(c.codePointAt(0)! + 0x60));
}

/** Convert katakana to hiragana. */
export function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCodePoint(c.codePointAt(0)! - 0x60));
}

/** Detect if all non-space chars are already romaji (ASCII). */
export function isRomaji(s: string): boolean {
  return /^[a-zA-Z\s.,!?'-]*$/.test(s);
}

export const VOWEL_RE = VOWELS;
export const CONSONANT_RE = CONSONANTS;
