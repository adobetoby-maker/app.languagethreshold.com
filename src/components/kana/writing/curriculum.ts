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

export function kanaPatternNote(word: string): string | null {
  const hasSmallTsu = /[っッ]/u.test(word);
  const hasContractedSound = /[ゃゅょャュョ]/u.test(word);
  if (hasSmallTsu && hasContractedSound)
    return "Small っ/ッ doubles the next consonant; small ゃ/ゅ/ょ or ャ/ュ/ョ joins the preceding sound. Say and write each as part of this word.";
  if (hasSmallTsu)
    return "Small っ/ッ doubles the next consonant, as in きっぷ (kippu). Say and write it as part of the word.";
  if (hasContractedSound)
    return "Small ゃ/ゅ/ょ or ャ/ュ/ョ joins the preceding sound, as in しゃ (sha). Say and write it as part of the word.";
  return null;
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
  {
    id: "h-g",
    name: "G-row (voiced) がぎぐげご",
    chars: ["が", "ぎ", "ぐ", "げ", "ご"],
    romaji: ["ga", "gi", "gu", "ge", "go"],
  },
  {
    id: "h-z",
    name: "Z-row (voiced) ざじずぜぞ",
    chars: ["ざ", "じ", "ず", "ぜ", "ぞ"],
    romaji: ["za", "ji", "zu", "ze", "zo"],
  },
  {
    id: "h-d",
    name: "D-row (voiced) だぢづでど",
    chars: ["だ", "ぢ", "づ", "で", "ど"],
    romaji: ["da", "ji", "zu", "de", "do"],
  },
  {
    id: "h-b",
    name: "B-row (voiced) ばびぶべぼ",
    chars: ["ば", "び", "ぶ", "べ", "ぼ"],
    romaji: ["ba", "bi", "bu", "be", "bo"],
  },
  {
    id: "h-p",
    name: "P-row ぱぴぷぺぽ",
    chars: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
    romaji: ["pa", "pi", "pu", "pe", "po"],
  },
  { id: "h-small-tsu", name: "Small っ", chars: ["っ"], romaji: ["small tsu"] },
  {
    id: "h-contracted",
    name: "Contracted ゃゅょ",
    chars: ["ゃ", "ゅ", "ょ"],
    romaji: ["small ya", "small yu", "small yo"],
  },
  { id: "h-long-vowels", name: "Long vowels う・い", chars: ["う", "い"], romaji: ["u", "i"] },
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
  {
    id: "k-g",
    name: "G-row (voiced) ガギグゲゴ",
    chars: ["ガ", "ギ", "グ", "ゲ", "ゴ"],
    romaji: ["ga", "gi", "gu", "ge", "go"],
  },
  {
    id: "k-z",
    name: "Z-row (voiced) ザジズゼゾ",
    chars: ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
    romaji: ["za", "ji", "zu", "ze", "zo"],
  },
  {
    id: "k-d",
    name: "D-row (voiced) ダヂヅデド",
    chars: ["ダ", "ヂ", "ヅ", "デ", "ド"],
    romaji: ["da", "ji", "zu", "de", "do"],
  },
  {
    id: "k-b",
    name: "B-row (voiced) バビブベボ",
    chars: ["バ", "ビ", "ブ", "ベ", "ボ"],
    romaji: ["ba", "bi", "bu", "be", "bo"],
  },
  {
    id: "k-p",
    name: "P-row パピプペポ",
    chars: ["パ", "ピ", "プ", "ペ", "ポ"],
    romaji: ["pa", "pi", "pu", "pe", "po"],
  },
  { id: "k-small-tsu", name: "Small ッ", chars: ["ッ"], romaji: ["small tsu"] },
  {
    id: "k-contracted",
    name: "Contracted ャュョ",
    chars: ["ャ", "ュ", "ョ"],
    romaji: ["small ya", "small yu", "small yo"],
  },
  { id: "k-long-vowel", name: "Long vowel ー", chars: ["ー"], romaji: ["long vowel mark"] },
];

// Contextual words shown after their character group is practiced.
export const PRACTICE_WORDS: Record<string, PracticeWord[]> = {
  "h-vowels": [
    { kana: "あおい", romaji: "aoi", meaning: "blue" },
    { kana: "うえ", romaji: "ue", meaning: "above/on" },
    { kana: "いい", romaji: "ii", meaning: "good" },
  ],
  "h-k": [
    { kana: "かお", romaji: "kao", meaning: "face" },
    { kana: "いきます", romaji: "ikimasu", meaning: "go" },
    { kana: "きます", romaji: "kimasu", meaning: "come" },
  ],
  "h-s": [
    { kana: "すき", romaji: "suki", meaning: "like" },
    { kana: "さかな", romaji: "sakana", meaning: "fish" },
    { kana: "そこ", romaji: "soko", meaning: "there near you" },
  ],
  "h-t": [
    { kana: "たべます", romaji: "tabemasu", meaning: "eat" },
    { kana: "ちいさい", romaji: "chiisai", meaning: "small" },
    { kana: "ともだち", romaji: "tomodachi", meaning: "friend" },
  ],
  "h-n": [
    { kana: "なに", romaji: "nani", meaning: "what" },
    { kana: "にほん", romaji: "nihon", meaning: "Japan" },
    { kana: "ねこ", romaji: "neko", meaning: "cat" },
  ],
  "h-h": [
    { kana: "ほん", romaji: "hon", meaning: "book" },
    { kana: "へや", romaji: "heya", meaning: "room" },
  ],
  "h-m": [
    { kana: "なまえ", romaji: "namae", meaning: "name" },
    { kana: "まど", romaji: "mado", meaning: "window" },
  ],
  "h-y": [
    { kana: "よん", romaji: "yon", meaning: "four" },
    { kana: "ゆっくり", romaji: "yukkuri", meaning: "slowly" },
  ],
  "h-r": [
    { kana: "だれ", romaji: "dare", meaning: "who" },
    { kana: "ろく", romaji: "roku", meaning: "six" },
  ],
  "h-w": [
    { kana: "わたし", romaji: "watashi", meaning: "I" },
    { kana: "ほん", romaji: "hon", meaning: "book" },
  ],
  "h-g": [
    { kana: "がくせい", romaji: "gakusei", meaning: "student" },
    { kana: "みぎ", romaji: "migi", meaning: "right" },
  ],
  "h-z": [
    { kana: "みず", romaji: "mizu", meaning: "water" },
    { kana: "じかん", romaji: "jikan", meaning: "time" },
  ],
  "h-d": [
    { kana: "ともだち", romaji: "tomodachi", meaning: "friend" },
    { kana: "でんしゃ", romaji: "densha", meaning: "train" },
  ],
  "h-b": [
    { kana: "ことば", romaji: "kotoba", meaning: "word" },
    { kana: "べんきょう", romaji: "benkyou", meaning: "study" },
  ],
  "h-p": [
    { kana: "きっぷ", romaji: "kippu", meaning: "ticket" },
    { kana: "えんぴつ", romaji: "enpitsu", meaning: "pencil" },
  ],
  "h-small-tsu": [
    { kana: "きっぷ", romaji: "kippu", meaning: "ticket" },
    { kana: "ゆっくり", romaji: "yukkuri", meaning: "slowly" },
  ],
  "h-contracted": [
    { kana: "しゃしん", romaji: "shashin", meaning: "photo" },
    { kana: "しゅくだい", romaji: "shukudai", meaning: "homework" },
    { kana: "きょう", romaji: "kyou", meaning: "today" },
  ],
  "h-long-vowels": [
    { kana: "きのう", romaji: "kinou", meaning: "yesterday" },
    { kana: "せんせい", romaji: "sensei", meaning: "teacher" },
    { kana: "えいが", romaji: "eiga", meaning: "movie" },
  ],
  "k-vowels": [
    { kana: "アメリカ", romaji: "amerika", meaning: "United States" },
    { kana: "ドア", romaji: "doa", meaning: "door" },
  ],
  "k-k": [
    { kana: "コピー", romaji: "kopii", meaning: "copy" },
    { kana: "クラス", romaji: "kurasu", meaning: "class" },
  ],
  "k-s": [
    { kana: "クラス", romaji: "kurasu", meaning: "class" },
    { kana: "スタッフ", romaji: "sutaffu", meaning: "staff" },
  ],
  "k-t": [
    { kana: "ノート", romaji: "nooto", meaning: "notebook" },
    { kana: "テスト", romaji: "tesuto", meaning: "test" },
  ],
  "k-n": [
    { kana: "ノート", romaji: "nooto", meaning: "notebook" },
    { kana: "ニュース", romaji: "nyuusu", meaning: "news" },
  ],
  "k-h": [
    { kana: "ホテル", romaji: "hoteru", meaning: "hotel" },
    { kana: "ハム", romaji: "hamu", meaning: "ham" },
  ],
  "k-m": [
    { kana: "メニュー", romaji: "menyuu", meaning: "menu" },
    { kana: "メンバー", romaji: "menbaa", meaning: "member" },
  ],
  "k-y": [
    { kana: "ヨガ", romaji: "yoga", meaning: "yoga" },
    { kana: "ユーロ", romaji: "yuuro", meaning: "euro" },
  ],
  "k-r": [
    { kana: "アメリカ", romaji: "amerika", meaning: "United States" },
    { kana: "グループ", romaji: "guruupu", meaning: "group" },
  ],
  "k-w": [
    { kana: "ペン", romaji: "pen", meaning: "pen" },
    { kana: "パン", romaji: "pan", meaning: "bread" },
  ],
  "k-g": [
    { kana: "グループ", romaji: "guruupu", meaning: "group" },
    { kana: "けしゴム", romaji: "keshigomu", meaning: "eraser" },
  ],
  "k-z": [
    { kana: "メッセージ", romaji: "messeeji", meaning: "message" },
    { kana: "デザート", romaji: "dezaato", meaning: "dessert" },
  ],
  "k-d": [
    { kana: "ドア", romaji: "doa", meaning: "door" },
    { kana: "デパート", romaji: "depaato", meaning: "department store" },
  ],
  "k-b": [
    { kana: "メンバー", romaji: "menbaa", meaning: "member" },
    { kana: "バス", romaji: "basu", meaning: "bus" },
  ],
  "k-p": [
    { kana: "ペン", romaji: "pen", meaning: "pen" },
    { kana: "パン", romaji: "pan", meaning: "bread" },
  ],
  "k-small-tsu": [
    { kana: "チケット", romaji: "chiketto", meaning: "ticket" },
    { kana: "スタッフ", romaji: "sutaffu", meaning: "staff" },
  ],
  "k-contracted": [
    { kana: "シャツ", romaji: "shatsu", meaning: "shirt" },
    { kana: "メニュー", romaji: "menyuu", meaning: "menu" },
    { kana: "ショッピング", romaji: "shoppingu", meaning: "shopping" },
  ],
  "k-long-vowel": [
    { kana: "ノート", romaji: "nooto", meaning: "notebook" },
    { kana: "メニュー", romaji: "menyuu", meaning: "menu" },
    { kana: "コピー", romaji: "kopii", meaning: "copy" },
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

// Supplemental sentence writing after each katakana word group. These are
// writing-pad prompts, separate from the reviewed Japanese 101 lesson pairs.
export const KATAKANA_PRACTICE_SENTENCES: Record<string, PracticeSentence> = {
  "k-vowels": { kana: "アメリカにいます。", romaji: "amerika ni imasu", meaning: "I am in the United States." },
  "k-k": { kana: "クラスにいきます。", romaji: "kurasu ni ikimasu", meaning: "I go to class." },
  "k-s": { kana: "スタッフがきました。", romaji: "sutaffu ga kimashita", meaning: "The staff arrived." },
  "k-t": { kana: "ノートをください。", romaji: "nooto o kudasai", meaning: "Please give me a notebook." },
  "k-n": { kana: "ニュースをみます。", romaji: "nyuusu o mimasu", meaning: "I watch the news." },
  "k-h": { kana: "ホテルはどこですか。", romaji: "hoteru wa doko desu ka", meaning: "Where is the hotel?" },
  "k-m": { kana: "メニューをください。", romaji: "menyuu o kudasai", meaning: "Please give me a menu." },
  "k-y": { kana: "ヨガをします。", romaji: "yoga o shimasu", meaning: "I do yoga." },
  "k-r": { kana: "グループでべんきょうします。", romaji: "guruupu de benkyou shimasu", meaning: "I study in a group." },
  "k-w": { kana: "ペンをかします。", romaji: "pen o kashimasu", meaning: "I lend a pen." },
  "k-g": { kana: "けしゴムをください。", romaji: "keshigomu o kudasai", meaning: "Please give me an eraser." },
  "k-z": { kana: "メッセージをおくります。", romaji: "messeeji o okurimasu", meaning: "I send a message." },
  "k-d": { kana: "ドアをあけます。", romaji: "doa o akemasu", meaning: "I open the door." },
  "k-b": { kana: "バスでいきます。", romaji: "basu de ikimasu", meaning: "I go by bus." },
  "k-p": { kana: "ペンでかきます。", romaji: "pen de kakimasu", meaning: "I write with a pen." },
  "k-small-tsu": { kana: "チケットをください。", romaji: "chiketto o kudasai", meaning: "Please give me a ticket." },
  "k-contracted": { kana: "シャツをきます。", romaji: "shatsu o kimasu", meaning: "I put on a shirt." },
  "k-long-vowel": { kana: "ノートにかきます。", romaji: "nooto ni kakimasu", meaning: "I write in the notebook." },
};

export function practiceSentenceForGroup(group: CharGroup, script: "hiragana" | "katakana"): PracticeSentence | undefined {
  return script === "katakana"
    ? KATAKANA_PRACTICE_SENTENCES[group.id]
    : PRACTICE_SENTENCES.find((sentence) => [...sentence.kana].some((char) => group.chars.includes(char)));
}

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
