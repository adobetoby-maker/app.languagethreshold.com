import type { CognateRule } from "../cognate-patterns.ts";
import { cognateRule } from "./helpers.ts";

// Cognate rules whose TARGET language is Japanese, for English speakers.
// English and Japanese share almost no inherited vocabulary, so the bridge is
// gairaigo (loanwords from English, written in katakana). Patterns start with
// "~" because the checker cannot compare letters across scripts; ids are explicit
// because the default slug of a non-Latin pattern would be empty.
// Example format: target = "katakana (romaji)".

const ja = (o: Omit<Parameters<typeof cognateRule>[0], "target" | "source">) =>
  cognateRule({ ...o, target: "Japanese", source: "English" });

const EN_TO_JA: CognateRule[] = [
  ja({
    id: "er-long-vowel",
    frequency: "ultra",
    from: "~-er / -or (agent and machine nouns)",
    to: "~-ー (long vowel mark), often -ター / -ダー / -カー",
    name: "-er / -or becomes a long ー",
    reliability: 90,
    hook: "Drop the r and stretch the last vowel with ー: computer becomes konpyūtā. Say the final -ā long and you are understood.",
    examples: [
      ["computer", "コンピューター (konpyūtā)", "computer"],
      ["printer", "プリンター (purintā)", "printer"],
      ["elevator", "エレベーター (erebētā)", "elevator"],
      ["speaker", "スピーカー (supīkā)", "speaker"],
      ["heater", "ヒーター (hītā)", "heater"],
      ["waiter", "ウェイター (weitā)", "waiter"],
    ],
    watchOut:
      "Some words are also written without the final ー (コンピュータ, プリンタ), especially in technical writing. Both are read the same way.",
  }),
  ja({
    id: "cluster-vowels",
    frequency: "ultra",
    from: "~consonant clusters (str-, sp-, gl-, br-, cr-)",
    to: "~a vowel inserted between consonants (mostly ス, ト, ク, ブ, プ, グ)",
    name: "Clusters broken by vowels",
    reliability: 95,
    hook: "Japanese syllables are consonant plus vowel, so every English cluster gets an 'o' or 'u' wedged in: strike becomes sutoraiku.",
    examples: [
      ["strike", "ストライク (sutoraiku)", "strike (baseball, bowling)"],
      ["stress", "ストレス (sutoresu)", "stress"],
      ["spoon", "スプーン (supūn)", "spoon"],
      ["glass", "グラス (gurasu)", "drinking glass"],
      ["brush", "ブラシ (burashi)", "brush"],
      ["present", "プレゼント (purezento)", "gift"],
      ["Christmas", "クリスマス (kurisumasu)", "Christmas"],
    ],
    watchOut:
      "Which vowel goes in is mostly 'o' after t and d, and 'u' elsewhere. Predict it, then check by sound.",
  }),
  ja({
    id: "final-consonant-vowel",
    frequency: "ultra",
    from: "~word-final consonants (-d, -s, -t, -g, -ch, -l)",
    to: "~a vowel added at the end (ド, ス, ト, グ, チ, ル)",
    name: "Final consonants get a vowel",
    reliability: 90,
    hook: "A Japanese word cannot end in a bare consonant (except n), so English endings take a vowel: bed is beddo, bus is basu.",
    examples: [
      ["bed", "ベッド (beddo)", "bed"],
      ["bus", "バス (basu)", "bus"],
      ["test", "テスト (tesuto)", "test"],
      ["bag", "バッグ (baggu)", "bag"],
      ["lunch", "ランチ (ranchi)", "lunch"],
      ["hotel", "ホテル (hoteru)", "hotel"],
    ],
    watchOut:
      "Short English vowels before a final consonant usually double it (ベッド, バッグ). Words ending in -n or -m keep ン (ペン pen) or take ム (チーム chīmu).",
  }),
  ja({
    id: "l-r-merge",
    frequency: "high",
    from: "~English l and r",
    to: "~both written with the r-row (ラ, リ, ル, レ, ロ)",
    name: "L and R both become r",
    reliability: 95,
    hook: "Japanese has one liquid sound. Light and right are both raito; lemon is remon. Spell with the ラ-row whichever you hear.",
    examples: [
      ["lemon", "レモン (remon)", "lemon"],
      ["light", "ライト (raito)", "light"],
      ["rule", "ルール (rūru)", "rule"],
      ["radio", "ラジオ (rajio)", "radio"],
      ["robot", "ロボット (robotto)", "robot"],
      ["rice", "ライス (raisu)", "cooked rice (western-style)"],
    ],
    watchOut:
      "Because l and r merge, ライト can mean light or right, and context decides. For plain rice as a meal, Japanese uses ご飯 (gohan); ライス is the restaurant, curry-and-rice word.",
  }),
  ja({
    id: "long-vowel-stress",
    frequency: "high",
    from: "~English stressed long vowels (-ee, -oo, -oa, -a-e, -y at word end)",
    to: "~vowel stretched with ー",
    name: "Long English vowels take ー",
    reliability: 85,
    hook: "A long English vowel is mirrored with ー: coffee is kōhī, beer is bīru, cake is kēki.",
    examples: [
      ["coffee", "コーヒー (kōhī)", "coffee"],
      ["beer", "ビール (bīru)", "beer"],
      ["team", "チーム (chīmu)", "team"],
      ["suit", "スーツ (sūtsu)", "suit"],
      ["ski", "スキー (sukī)", "skiing"],
      ["cake", "ケーキ (kēki)", "cake"],
    ],
    watchOut:
      "Length matters in Japanese. ケキ would be a different, wrong sound, so keep the ー. Not every long vowel is marked in every word (スキー vs. ski in old texts).",
  }),
  ja({
    id: "v-to-b",
    frequency: "medium",
    from: "~English v",
    to: "~b-row (バ, ビ, ブ, ベ, ボ); rarely ヴ",
    name: "V becomes b",
    reliability: 85,
    hook: "There is no v in everyday Japanese, so v turns into b: video is bideo, vitamin is bitamin.",
    examples: [
      ["video", "ビデオ (bideo)", "video"],
      ["violin", "バイオリン (baiorin)", "violin"],
      ["volume", "ボリューム (boryūmu)", "volume"],
      ["vitamin", "ビタミン (bitamin)", "vitamin"],
      ["visa", "ビザ (biza)", "visa"],
      ["veranda", "ベランダ (beranda)", "balcony / veranda"],
    ],
    watchOut:
      "Some modern or brand words use ヴ (ヴァイオリン is an alternate spelling), but the b-row is the normal everyday spelling.",
  }),
  ja({
    id: "tion-shon",
    frequency: "high",
    from: "~-tion / -sion",
    to: "~-ション (-shon)",
    name: "-tion becomes -ション",
    reliability: 90,
    hook: "Every -tion ending lands on ション (shon): station is sutēshon, action is akushon.",
    examples: [
      ["station", "ステーション (sutēshon)", "station"],
      ["action", "アクション (akushon)", "action"],
      ["collection", "コレクション (korekushon)", "collection"],
      ["position", "ポジション (pojishon)", "position"],
      ["mission", "ミッション (misshon)", "mission"],
      ["information", "インフォメーション (infomēshon)", "information (as a service desk)"],
    ],
    watchOut:
      "Many abstract -tion ideas have native Japanese words used in ordinary speech (情報 jōhō is the usual word for 'information'). The katakana form is common for desks, signs and branded things.",
  }),
  ja({
    id: "ing-ingu",
    frequency: "high",
    from: "~-ing (gerund and activity nouns)",
    to: "~-ィング (-ingu)",
    name: "-ing becomes -ング",
    reliability: 85,
    hook: "Add ング: shopping is shoppingu, meeting is mītingu. Activity nouns stay in English shape.",
    examples: [
      ["shopping", "ショッピング (shoppingu)", "shopping"],
      ["meeting", "ミーティング (mītingu)", "meeting"],
      ["training", "トレーニング (torēningu)", "training / workout"],
      ["running", "ランニング (ranningu)", "running"],
      ["jogging", "ジョギング (jogingu)", "jogging"],
      ["briefing", "ブリーフィング (burīfingu)", "briefing"],
    ],
    watchOut:
      "Often the plain stem is the normal word: キャンプ (kyanpu) is camping, not キャンピング. Check before adding ング to a new verb.",
  }),
  ja({
    id: "food-drink",
    frequency: "ultra",
    from: "~food and drink words",
    to: "~katakana loanwords",
    name: "Food and drink family",
    reliability: 90,
    hook: "Menus lean on gairaigo. If it is a western dish or drink, say the English word with Japanese sounds and read the katakana.",
    examples: [
      ["hamburger", "ハンバーガー (hanbāgā)", "hamburger"],
      ["sandwich", "サンドイッチ (sandoicchi)", "sandwich"],
      ["salad", "サラダ (sarada)", "salad"],
      ["steak", "ステーキ (sutēki)", "steak"],
      ["cheese", "チーズ (chīzu)", "cheese"],
      ["juice", "ジュース (jūsu)", "juice / soft drink"],
      ["ice cream", "アイスクリーム (aisukurīmu)", "ice cream"],
    ],
    watchOut:
      "A few foods are short forms (アイス for ice cream) and some are not from English at all (パン 'bread' is Portuguese-origin). ジュース can mean soft drinks in general.",
  }),
  ja({
    id: "technology",
    frequency: "ultra",
    from: "~technology and computing words",
    to: "~katakana loanwords",
    name: "Technology family",
    reliability: 90,
    hook: "Nearly all device and internet vocabulary is borrowed: internet, software and game are read straight from English.",
    examples: [
      ["internet", "インターネット (intānetto)", "internet"],
      ["software", "ソフトウェア (sofutowea)", "software"],
      ["game", "ゲーム (gēmu)", "game"],
      ["keyboard", "キーボード (kībōdo)", "keyboard"],
      ["camera", "カメラ (kamera)", "camera"],
      ["email", "メール (mēru)", "email"],
      ["smartphone", "スマートフォン (sumātofon)", "smartphone"],
    ],
    watchOut:
      "Japanese often clips long words: スマートフォン is shortened to スマホ (sumaho), and テレビ (terebi) is television. メール is email or a message in general.",
  }),
  ja({
    id: "sports",
    frequency: "high",
    from: "~sports and exercise words",
    to: "~katakana loanwords",
    name: "Sports family",
    reliability: 90,
    hook: "Team sports, racket sports and golf come from English. The sport name is the English word plus Japanese sounds.",
    examples: [
      ["soccer", "サッカー (sakkā)", "soccer"],
      ["tennis", "テニス (tenisu)", "tennis"],
      ["golf", "ゴルフ (gorufu)", "golf"],
      ["basketball", "バスケットボール (basukettobōru)", "basketball"],
      ["marathon", "マラソン (marason)", "marathon"],
      ["goal", "ゴール (gōru)", "goal"],
    ],
    watchOut:
      "Baseball is both 野球 (yakyū) and ベースボール. Traditional sports (sumo, judo) have their own names.",
  }),
  ja({
    id: "clothing",
    frequency: "high",
    from: "~clothing and fashion words",
    to: "~katakana loanwords",
    name: "Clothing family",
    reliability: 85,
    hook: "Western garments kept their English names. Kimono-world clothing keeps Japanese names.",
    examples: [
      ["shirt", "シャツ (shatsu)", "shirt"],
      ["skirt", "スカート (sukāto)", "skirt"],
      ["jeans", "ジーンズ (jīnzu)", "jeans"],
      ["sweater", "セーター (sētā)", "sweater"],
      ["jacket", "ジャケット (jaketto)", "jacket"],
      ["dress", "ドレス (doresu)", "dress"],
      ["boots", "ブーツ (būtsu)", "boots"],
    ],
    watchOut:
      "Not all clothing words are English: ズボン (zubon) for trousers is from French, and パンツ (pantsu) often means underwear. Use ジーンズ or スラックス for trousers.",
  }),
  ja({
    id: "travel-transport",
    frequency: "high",
    from: "~travel and transport words",
    to: "~katakana loanwords",
    name: "Travel and transport family",
    reliability: 85,
    hook: "Hotels, taxis, tickets and passports are all gairaigo. A little katakana reading covers most of a travel day.",
    examples: [
      ["taxi", "タクシー (takushī)", "taxi"],
      ["passport", "パスポート (pasupōto)", "passport"],
      ["ticket", "チケット (chiketto)", "ticket"],
      ["truck", "トラック (torakku)", "truck"],
      ["suitcase", "スーツケース (sūtsukēsu)", "suitcase"],
      ["escalator", "エスカレーター (esukarētā)", "escalator"],
    ],
    watchOut:
      "Trains, platforms and station signs are mostly native words (電車 densha, 駅 eki). Use katakana as a bonus, not as your only route.",
  }),
  ja({
    id: "school-office",
    frequency: "medium",
    from: "~school and office words",
    to: "~katakana loanwords",
    name: "School and office family",
    reliability: 80,
    hook: "Everyday study and work tools are borrowed: class, report, copy, file, desk.",
    examples: [
      ["class", "クラス (kurasu)", "class / school class"],
      ["report", "レポート (repōto)", "report / written assignment"],
      ["copy", "コピー (kopī)", "photocopy / copy"],
      ["file", "ファイル (fairu)", "file / folder"],
      ["desk", "デスク (desuku)", "desk"],
      ["project", "プロジェクト (purojekuto)", "project"],
    ],
    watchOut:
      "ノート (nōto) means a notebook, not a written note. レポート is typically a student paper, not just any report.",
  }),
  ja({
    id: "meaning-shifted",
    frequency: "medium",
    from: "~loanwords whose meaning is not the English meaning",
    to: "~katakana words that mean something else in Japanese",
    name: "Words that changed meaning",
    reliability: 20,
    hook: "These look English but are Japanese-made meanings. Learn them as separate words and do not trust the English sense.",
    examples: [
      ["mansion", "マンション (manshon)", "apartment building (condo), not a mansion"],
      ["service", "サービス (sābisu)", "a free extra, good customer service"],
      ["claim", "クレーム (kurēmu)", "a complaint"],
      ["trump", "トランプ (toranpu)", "a deck of playing cards (not a politician)"],
      ["consent (plug)", "コンセント (konsento)", "electrical wall outlet"],
      ["handle", "ハンドル (handoru)", "steering wheel (also a handle)"],
    ],
    watchOut:
      "This is the rule to treat with caution. Each word is real, common Japanese, but the English meaning will mislead you.",
  }),
];

export const JAPANESE_COGNATE_RULES: CognateRule[] = [...EN_TO_JA];
