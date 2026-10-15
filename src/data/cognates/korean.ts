import type { CognateRule } from "../cognate-patterns.ts";
import { cognateRule } from "./helpers.ts";

// Cognate rules whose TARGET language is Korean, for English speakers.
// English and Korean share almost no inherited vocabulary, so the bridge is
// English loanwords (konglish-aware) written in hangul. Patterns start with "~"
// because the checker cannot compare letters across scripts; ids are explicit
// because the default slug of a non-Latin pattern would be empty.
// Example format: target = "hangul (Revised Romanization)".

const ko = (o: Omit<Parameters<typeof cognateRule>[0], "target" | "source">) =>
  cognateRule({ ...o, target: "Korean", source: "English" });

const EN_TO_KO: CognateRule[] = [
  ko({
    id: "er-eo-ending",
    frequency: "ultra",
    from: "~-er / -or (agent and machine nouns)",
    to: "~-터 / -너 / -저 / -커 (final -eo)",
    name: "-er / -or becomes -어 (-eo)",
    reliability: 90,
    hook: "The r at the end is dropped and the vowel is written 어 (eo): computer becomes keompyuteo.",
    examples: [
      ["computer", "컴퓨터 (keompyuteo)", "computer"],
      ["printer", "프린터 (peurinteo)", "printer"],
      ["elevator", "엘리베이터 (ellibeiteo)", "elevator"],
      ["manager", "매니저 (maenijeo)", "manager"],
      ["designer", "디자이너 (dijaineo)", "designer"],
      ["speaker", "스피커 (seupikeo)", "speaker"],
    ],
    watchOut:
      "The consonant before 어 follows the English sound (t, g, k, n), so read each syllable aloud. Do not copy English spelling letter by letter.",
  }),
  ko({
    id: "cluster-eu",
    frequency: "ultra",
    from: "~consonant clusters (str-, sp-, cr-, pr-, tr-)",
    to: "~a vowel 으 (eu) between consonants",
    name: "Clusters broken by 으 (eu)",
    reliability: 95,
    hook: "Korean syllables cannot hold a cluster, so the neutral vowel 으 (eu) is slipped in: stress becomes seuteureseu.",
    examples: [
      ["stress", "스트레스 (seuteureseu)", "stress"],
      ["sports", "스포츠 (seupocheu)", "sports"],
      ["cream", "크림 (keurim)", "cream"],
      ["program", "프로그램 (peurogeuraem)", "program"],
      ["truck", "트럭 (teureok)", "truck"],
      ["smartphone", "스마트폰 (seumateupon)", "smartphone"],
    ],
    watchOut:
      "The vowel is always 으 (eu) for clusters, but a word-final -y sound is written with 이 (i), as in party, 파티 (pati).",
  }),
  ko({
    id: "final-consonant-eu",
    frequency: "ultra",
    from: "~word-final consonants (-s, -t, -d, -ch, -g, -b)",
    to: "~a final 으 or 트 / 스 / 드 syllable added",
    name: "Final consonants get 으 (eu)",
    reliability: 85,
    hook: "English endings that Korean cannot hold are given 으: bus is beoseu, test is teseuteu.",
    examples: [
      ["bus", "버스 (beoseu)", "bus"],
      ["test", "테스트 (teseuteu)", "test"],
      ["concert", "콘서트 (konseoteu)", "concert"],
      ["hotel", "호텔 (hotel)", "hotel"],
    ],
    watchOut:
      "Short endings are often kept as final consonants (컵 keop, 팀 tim) with no added vowel, so the rule is not uniform.",
  }),
  ko({
    id: "aspirated-tpk",
    frequency: "high",
    from: "~initial t, p, k (and ch)",
    to: "~aspirated ㅌ, ㅍ, ㅋ",
    name: "T, P, K use the aspirated letters",
    reliability: 90,
    hook: "English starts words with puffed-up t, p, k, so Korean uses ㅌ ㅍ ㅋ rather than ㄷ ㅂ ㄱ: taxi is taeksi, cake is keikeu.",
    examples: [
      ["taxi", "택시 (taeksi)", "taxi"],
      ["table", "테이블 (teibeul)", "table"],
      ["ticket", "티켓 (tiket)", "ticket"],
      ["camera", "카메라 (kamera)", "camera"],
      ["cake", "케이크 (keikeu)", "cake"],
      ["coffee", "커피 (keopi)", "coffee"],
    ],
    watchOut:
      "Using ㄷ instead of ㅌ changes the sound to a d, so 테이블 and 데이블 are not interchangeable.",
  }),
  ko({
    id: "f-to-p",
    frequency: "high",
    from: "~English f",
    to: "~ㅍ (p)",
    name: "F becomes ㅍ (p)",
    reliability: 95,
    hook: "Korean has no f. Anything with an f is written with ㅍ (p): file is pail, party is pati.",
    examples: [
      ["file", "파일 (pail)", "file"],
      ["film", "필름 (pilleum)", "film"],
      ["fan", "팬 (paen)", "fan (supporter)"],
      ["fork", "포크 (pokeu)", "fork"],
      ["coffee", "커피 (keopi)", "coffee"],
      ["party", "파티 (pati)", "party"],
    ],
    watchOut:
      "Coffee shows that ff and f both end up as ㅍ. The English f/p difference is lost, so context tells apart words like fan and pan.",
  }),
  ko({
    id: "l-r-merge",
    frequency: "high",
    from: "~English l and r",
    to: "~ㄹ (r / l)",
    name: "L and R share ㄹ",
    reliability: 95,
    hook: "One letter, ㄹ, covers both: it sounds r at the start of a syllable and l at the end. Lemon is remon, rule is rul.",
    examples: [
      ["radio", "라디오 (radio)", "radio"],
      ["lemon", "레몬 (remon)", "lemon"],
      ["robot", "로봇 (robot)", "robot"],
      ["rule", "룰 (rul)", "rule"],
      ["lighter", "라이터 (raiteo)", "lighter"],
      ["ball", "볼 (bol)", "ball"],
    ],
    watchOut:
      "Double ㄹㄹ appears when English has double l or a stressed l in the middle (볼륨 bollyum for volume).",
  }),
  ko({
    id: "v-to-b",
    frequency: "medium",
    from: "~English v",
    to: "~ㅂ (b)",
    name: "V becomes ㅂ (b)",
    reliability: 90,
    hook: "No v in Korean either: write it with ㅂ. Video becomes bidio, vitamin becomes bitamin.",
    examples: [
      ["video", "비디오 (bidio)", "video"],
      ["vitamin", "비타민 (bitamin)", "vitamin"],
      ["violin", "바이올린 (baiollin)", "violin"],
      ["volume", "볼륨 (bollyum)", "volume"],
      ["visa", "비자 (bija)", "visa"],
      ["veranda", "베란다 (beranda)", "balcony / veranda"],
    ],
    watchOut: "Because v and b merge, Korean speakers distinguish them by context, not by sound.",
  }),
  ko({
    id: "tion-syeon",
    frequency: "high",
    from: "~-tion / -sion",
    to: "~-션 (-syeon)",
    name: "-tion becomes -션",
    reliability: 90,
    hook: "Close the word with 션 (syeon): station is seuteisyeon, action is aeksyeon.",
    examples: [
      ["station", "스테이션 (seuteisyeon)", "station"],
      ["action", "액션 (aeksyeon)", "action"],
      ["collection", "컬렉션 (keolleksyeon)", "collection"],
      ["position", "포지션 (pojisyeon)", "position (also a role)"],
      ["mission", "미션 (misyeon)", "mission"],
      ["communication", "커뮤니케이션 (keomyunikeisyeon)", "communication"],
    ],
    watchOut:
      "Korean often prefers its own Sino-Korean words for formal ideas (정보 jeongbo for information), so -션 words feel modern or branded.",
  }),
  ko({
    id: "food-drink",
    frequency: "ultra",
    from: "~food and drink words",
    to: "~hangul loanwords",
    name: "Food and drink family",
    reliability: 90,
    hook: "Western food and cafe vocabulary is borrowed: read the hangul out loud and you will usually hear English.",
    examples: [
      ["hamburger", "햄버거 (haembeogeo)", "hamburger"],
      ["sandwich", "샌드위치 (saendeuwichi)", "sandwich"],
      ["salad", "샐러드 (saelleodeu)", "salad"],
      ["pizza", "피자 (pija)", "pizza"],
      ["steak", "스테이크 (seuteikeu)", "steak"],
      ["cheese", "치즈 (chijeu)", "cheese"],
      ["juice", "주스 (juseu)", "juice"],
    ],
    watchOut:
      "Native dishes keep Korean names. Some drinks are shortened in speech, so expect 주스 to cover many soft drinks.",
  }),
  ko({
    id: "technology",
    frequency: "ultra",
    from: "~technology and computing words",
    to: "~hangul loanwords",
    name: "Technology family",
    reliability: 90,
    hook: "Devices, software and the web are mostly English words in hangul clothes.",
    examples: [
      ["internet", "인터넷 (inteonet)", "internet"],
      ["software", "소프트웨어 (sopeuteuweeo)", "software"],
      ["game", "게임 (geim)", "game"],
      ["email", "이메일 (imeil)", "email"],
      ["keyboard", "키보드 (kibodeu)", "keyboard"],
      ["mouse", "마우스 (mauseu)", "computer mouse"],
    ],
    watchOut:
      "Korean often says 핸드폰 (haendeupon) or 휴대폰 (hyudaepon) for mobile phone, not simply 폰. Check which one signs and shops use.",
  }),
  ko({
    id: "sports",
    frequency: "high",
    from: "~sports and exercise words",
    to: "~hangul loanwords",
    name: "Sports family",
    reliability: 90,
    hook: "Most Western sports kept their English names.",
    examples: [
      ["golf", "골프 (golpeu)", "golf"],
      ["tennis", "테니스 (teniseu)", "tennis"],
      ["marathon", "마라톤 (maraton)", "marathon"],
      ["goal", "골 (gol)", "goal"],
      ["ski", "스키 (seuki)", "skiing"],
      ["bowling", "볼링 (bolling)", "bowling"],
    ],
    watchOut:
      "Baseball is 야구 (yagu) and soccer is usually 축구 (chukgu), native Sino-Korean words, not loanwords. Taekwondo has its own Korean name.",
  }),
  ko({
    id: "clothing",
    frequency: "high",
    from: "~clothing and fashion words",
    to: "~hangul loanwords",
    name: "Clothing family",
    reliability: 85,
    hook: "Western garments kept their English names.",
    examples: [
      ["shirt", "셔츠 (syeocheu)", "shirt"],
      ["skirt", "스커트 (seukeoteu)", "skirt"],
      ["jacket", "재킷 (jaekit)", "jacket"],
      ["sweater", "스웨터 (seuweteo)", "sweater"],
      ["dress", "드레스 (deureseu)", "dress"],
      ["boots", "부츠 (bucheu)", "boots"],
      ["coat", "코트 (koteu)", "coat"],
    ],
    watchOut:
      "Trousers are 바지 (baji) in Korean, not a loanword, and 청바지 (cheongbaji) is jeans. 원피스 (wonpiseu) is a dress and comes from 'one-piece'.",
  }),
  ko({
    id: "travel-transport",
    frequency: "high",
    from: "~travel and transport words",
    to: "~hangul loanwords",
    name: "Travel and transport family",
    reliability: 85,
    hook: "Hotels, taxis and tickets are the same words you already know, just spelled in hangul.",
    examples: [
      ["hotel", "호텔 (hotel)", "hotel"],
      ["taxi", "택시 (taeksi)", "taxi"],
      ["ticket", "티켓 (tiket)", "ticket"],
      ["terminal", "터미널 (teomineol)", "terminal / bus station"],
      ["escalator", "에스컬레이터 (eseukalleiteo)", "escalator"],
      ["visa", "비자 (bija)", "visa"],
    ],
    watchOut:
      "Train and subway words are native (지하철 jihacheol is subway), so treat these loanwords as a partial shortcut.",
  }),
  ko({
    id: "school-office",
    frequency: "medium",
    from: "~school and office words",
    to: "~hangul loanwords",
    name: "School and office family",
    reliability: 80,
    hook: "Study and work vocabulary leans on English: class, report, project, meeting.",
    examples: [
      ["class", "클래스 (keullaeseu)", "class"],
      ["report", "리포트 (ripoteu)", "report / written assignment"],
      ["project", "프로젝트 (peurojekteu)", "project"],
      ["meeting", "미팅 (miting)", "meeting (often a blind date)"],
      ["file", "파일 (pail)", "file"],
      ["test", "테스트 (teseuteu)", "test"],
    ],
    watchOut:
      "미팅 (miting) can mean a group blind date among students, not only a work meeting. 노트 (noteu) is a notebook, and 회의 (hoeui) is the standard word for a formal meeting.",
  }),
  ko({
    id: "meaning-shifted",
    frequency: "medium",
    from: "~loanwords whose meaning is not the English meaning",
    to: "~hangul words that mean something else in Korean",
    name: "Words that changed meaning",
    reliability: 20,
    hook: "These look English but carry a Korean-made meaning. Learn them as their own words.",
    examples: [
      ["service", "서비스 (seobiseu)", "a free extra given by a shop"],
      ["sharp", "샤프 (syapeu)", "a mechanical pencil"],
      ["handle", "핸들 (haendeul)", "steering wheel of a car"],
      ["consent (plug)", "콘센트 (konsenteu)", "electrical wall outlet"],
      ["auto bike", "오토바이 (otobai)", "motorcycle"],
      ["one-piece", "원피스 (wonpiseu)", "a one-piece dress"],
    ],
    watchOut:
      "Every word here is normal Korean, but guessing the English meaning leads you astray. Treat them as new vocabulary, not cognates.",
  }),
];

export const KOREAN_COGNATE_RULES: CognateRule[] = [...EN_TO_KO];
