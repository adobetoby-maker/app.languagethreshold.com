export interface CharGroup {
  id: string;
  name: string;
  chars: string[];
  romaji: string[];
}

export interface PracticeWord {
  kana: string;
  romaji: string;
  meaning: string;
}

export interface PracticeSentence {
  kana: string;
  romaji: string;
  meaning: string;
}

export const HIRAGANA_GROUPS: CharGroup[] = [
  {
    id: "h-vowels",
    name: "Vowels あいうえお",
    chars: ["あ", "い", "う", "え", "お"],
    romaji: ["a", "i", "u", "e", "o"],
  },
  {
    id: "h-k",
    name: "K-row かきくけこ",
    chars: ["か", "き", "く", "け", "こ"],
    romaji: ["ka", "ki", "ku", "ke", "ko"],
  },
  {
    id: "h-s",
    name: "S-row さしすせそ",
    chars: ["さ", "し", "す", "せ", "そ"],
    romaji: ["sa", "shi", "su", "se", "so"],
  },
  {
    id: "h-t",
    name: "T-row たちつてと",
    chars: ["た", "ち", "つ", "て", "と"],
    romaji: ["ta", "chi", "tsu", "te", "to"],
  },
  {
    id: "h-n",
    name: "N-row なにぬねの",
    chars: ["な", "に", "ぬ", "ね", "の"],
    romaji: ["na", "ni", "nu", "ne", "no"],
  },
  {
    id: "h-h",
    name: "H-row はひふへほ",
    chars: ["は", "ひ", "ふ", "へ", "ほ"],
    romaji: ["ha", "hi", "fu", "he", "ho"],
  },
  {
    id: "h-m",
    name: "M-row まみむめも",
    chars: ["ま", "み", "む", "め", "も"],
    romaji: ["ma", "mi", "mu", "me", "mo"],
  },
  { id: "h-y", name: "Y-row やゆよ", chars: ["や", "ゆ", "よ"], romaji: ["ya", "yu", "yo"] },
  {
    id: "h-r",
    name: "R-row らりるれろ",
    chars: ["ら", "り", "る", "れ", "ろ"],
    romaji: ["ra", "ri", "ru", "re", "ro"],
  },
  { id: "h-w", name: "W-row わをん", chars: ["わ", "を", "ん"], romaji: ["wa", "wo", "n"] },
];

export const KATAKANA_GROUPS: CharGroup[] = [
  {
    id: "k-vowels",
    name: "Vowels アイウエオ",
    chars: ["ア", "イ", "ウ", "エ", "オ"],
    romaji: ["a", "i", "u", "e", "o"],
  },
  {
    id: "k-k",
    name: "K-row カキクケコ",
    chars: ["カ", "キ", "ク", "ケ", "コ"],
    romaji: ["ka", "ki", "ku", "ke", "ko"],
  },
  {
    id: "k-s",
    name: "S-row サシスセソ",
    chars: ["サ", "シ", "ス", "セ", "ソ"],
    romaji: ["sa", "shi", "su", "se", "so"],
  },
  {
    id: "k-t",
    name: "T-row タチツテト",
    chars: ["タ", "チ", "ツ", "テ", "ト"],
    romaji: ["ta", "chi", "tsu", "te", "to"],
  },
  {
    id: "k-n",
    name: "N-row ナニヌネノ",
    chars: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    romaji: ["na", "ni", "nu", "ne", "no"],
  },
  {
    id: "k-h",
    name: "H-row ハヒフヘホ",
    chars: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    romaji: ["ha", "hi", "fu", "he", "ho"],
  },
  {
    id: "k-m",
    name: "M-row マミムメモ",
    chars: ["マ", "ミ", "ム", "メ", "モ"],
    romaji: ["ma", "mi", "mu", "me", "mo"],
  },
  { id: "k-y", name: "Y-row ヤユヨ", chars: ["ヤ", "ユ", "ヨ"], romaji: ["ya", "yu", "yo"] },
  {
    id: "k-r",
    name: "R-row ラリルレロ",
    chars: ["ラ", "リ", "ル", "レ", "ロ"],
    romaji: ["ra", "ri", "ru", "re", "ro"],
  },
  { id: "k-w", name: "W-row ワヲン", chars: ["ワ", "ヲ", "ン"], romaji: ["wa", "wo", "n"] },
];

// Words built from early hiragana groups — shown after the group is practiced
export const PRACTICE_WORDS: Record<string, PracticeWord[]> = {
  "h-vowels": [
    { kana: "あお", romaji: "ao", meaning: "blue" },
    { kana: "うえ", romaji: "ue", meaning: "above" },
    { kana: "いえ", romaji: "ie", meaning: "house" },
  ],
  "h-k": [
    { kana: "かお", romaji: "kao", meaning: "face" },
    { kana: "いく", romaji: "iku", meaning: "to go" },
    { kana: "きく", romaji: "kiku", meaning: "to listen" },
  ],
  "h-s": [
    { kana: "すき", romaji: "suki", meaning: "like / love" },
    { kana: "さかな", romaji: "sakana", meaning: "fish" },
    { kana: "そこ", romaji: "soko", meaning: "there" },
  ],
  "h-t": [
    { kana: "たべる", romaji: "taberu", meaning: "to eat" },
    { kana: "ちいさい", romaji: "chiisai", meaning: "small" },
    { kana: "とける", romaji: "tokeru", meaning: "to melt" },
  ],
  "h-n": [
    { kana: "なに", romaji: "nani", meaning: "what" },
    { kana: "にほん", romaji: "nihon", meaning: "Japan" },
    { kana: "ねこ", romaji: "neko", meaning: "cat" },
  ],
};

// Simple sentences for sentence-level practice
export const PRACTICE_SENTENCES: PracticeSentence[] = [
  { kana: "あいうえお", romaji: "a i u e o", meaning: "The five vowels" },
  { kana: "おはよう", romaji: "ohayou", meaning: "Good morning" },
  { kana: "ありがとう", romaji: "arigatou", meaning: "Thank you" },
  { kana: "いいえ", romaji: "iie", meaning: "No / Not at all" },
  { kana: "すきです", romaji: "suki desu", meaning: "I like it" },
  {
    kana: "にほんごをべんきょうする",
    romaji: "nihongo wo benkyou suru",
    meaning: "I study Japanese",
  },
];

export const PEN_PAL_PROMPTS = [
  {
    id: "intro",
    title: "Introduce Yourself",
    recipient: "ゆき (Yuki)",
    city: "Osaka",
    scenario:
      "Write to Yuki and introduce yourself — your name, where you're from, and what you like.",
    starterKana: "はじめまして。わたしは",
    starterRomaji: "Hajimemashite. Watashi wa",
    practiceWords: [
      { kana: "はじめまして", romaji: "hajimemashite", meaning: "Nice to meet you" },
      { kana: "わたし", romaji: "watashi", meaning: "I / me" },
      { kana: "すきです", romaji: "suki desu", meaning: "I like" },
      { kana: "よろしく", romaji: "yoroshiku", meaning: "Nice to meet you (closing)" },
    ],
  },
  {
    id: "food",
    title: "Favourite Food",
    recipient: "はな (Hana)",
    city: "Tokyo",
    scenario: "Tell Hana about your favourite food and ask about hers.",
    starterKana: "わたしのすきなたべものは",
    starterRomaji: "Watashi no suki na tabemono wa",
    practiceWords: [
      { kana: "たべもの", romaji: "tabemono", meaning: "food" },
      { kana: "すきな", romaji: "suki na", meaning: "favourite / liked" },
      { kana: "おいしい", romaji: "oishii", meaning: "delicious" },
      { kana: "なに", romaji: "nani", meaning: "what" },
    ],
  },
  {
    id: "weather",
    title: "Today's Weather",
    recipient: "れん (Ren)",
    city: "Kyoto",
    scenario: "Tell Ren what the weather is like where you are today.",
    starterKana: "きょうのてんきは",
    starterRomaji: "Kyou no tenki wa",
    practiceWords: [
      { kana: "きょう", romaji: "kyou", meaning: "today" },
      { kana: "てんき", romaji: "tenki", meaning: "weather" },
      { kana: "あつい", romaji: "atsui", meaning: "hot" },
      { kana: "さむい", romaji: "samui", meaning: "cold" },
    ],
  },
];
