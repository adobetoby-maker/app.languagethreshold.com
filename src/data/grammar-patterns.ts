import type { Language } from "@/state/app-state";

export type PatternFrequency = "ultra" | "high" | "medium";
export type PatternPhase = 1 | 2;
export type PatternCategory =
  | "identity" // I am / I have — describing yourself
  | "obligation" // have to / must
  | "intention" // want to / going to
  | "ability" // can / be able to
  | "action" // progressive — currently doing
  | "cause" // because / so
  | "purpose" // in order to / so that — para que and its cross-language cousins
  | "sequence" // first, then, finally
  | "opinion" // I think / it seems
  | "preference" // I like / I love
  | "description" // adjective / state patterns
  | "form"; // the dictionary/infinitive form itself, and how it plugs into modals

export interface PatternExample {
  target: string; // full sentence in target language
  english: string; // English translation
  breakdown?: string; // "tener [que] + [aprender] — verb is infinitive"
}

export interface GrammarPattern {
  id: string;
  language: Language;
  phase: PatternPhase;
  frequency: PatternFrequency;
  category: PatternCategory;
  pattern: string; // formula: "tener que + [verb]"
  name: string; // short label: "Obligation"
  meaning: string; // English equivalent: "have to / must"
  hook: string; // 1-sentence "why this unlocks everything"
  examples: PatternExample[];
}

// ─── FREQUENCY BADGE METADATA ─────────────────────────────────────────────

export const FREQUENCY_META: Record<
  PatternFrequency,
  { label: string; color: string; bg: string; desc: string }
> = {
  ultra: {
    label: "ULTRA",
    color: "text-gold",
    bg: "bg-gold/15 border-gold/30",
    desc: "You will hear and use this every single day.",
  },
  high: {
    label: "HIGH",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    desc: "Weekly staple — shows up in nearly every conversation.",
  },
  medium: {
    label: "MEDIUM",
    color: "text-muted-foreground",
    bg: "bg-border/20 border-border/40",
    desc: "Situational but very useful once you know it.",
  },
};

// ─── SPANISH ──────────────────────────────────────────────────────────────

const SPANISH_PATTERNS: GrammarPattern[] = [
  // Phase 1 — Your Story
  {
    id: "es-be-identity",
    language: "Spanish",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Soy + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "One word opens every self-introduction in Spanish.",
    examples: [
      {
        target: "Soy médico.",
        english: "I am a doctor.",
        breakdown: "Soy = ser (to be), 1st person singular",
      },
      { target: "Soy de Idaho, Estados Unidos.", english: "I am from Idaho, USA." },
      { target: "Soy estudiante de idiomas.", english: "I am a language student." },
    ],
  },
  {
    id: "es-have",
    language: "Spanish",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Tengo + [noun]",
    name: "I have",
    meaning: "I have / I am [age] years old",
    hook: "Tener expresses possession AND age — two essentials in one verb.",
    examples: [
      {
        target: "Tengo cuarenta años.",
        english: "I am forty years old.",
        breakdown: "Tengo años = I have [X] years",
      },
      { target: "Tengo dos hijos.", english: "I have two children." },
      { target: "Tengo un consultorio en Twin Falls.", english: "I have an office in Twin Falls." },
    ],
  },
  {
    id: "es-like",
    language: "Spanish",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "Me gusta + [noun / infinitive]",
    name: "I like / I love",
    meaning: "I like [thing] / I like to [do something]",
    hook: "Gustar works backwards — the thing 'pleases you.' Learn it once, describe everything you enjoy.",
    examples: [
      {
        target: "Me gusta jugar al golf.",
        english: "I like to play golf.",
        breakdown: "Me gusta + infinitive = I like to...",
      },
      {
        target: "Me encanta aprender idiomas.",
        english: "I love learning languages.",
        breakdown: "Me encanta = stronger version of me gusta",
      },
      { target: "Me gusta leer por las noches.", english: "I like to read at night." },
    ],
  },
  {
    id: "es-want",
    language: "Spanish",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "Quiero + [infinitive]",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Quiero + any verb = any desire. The most natural way to express what you want.",
    examples: [
      {
        target: "Quiero hablar español con fluidez.",
        english: "I want to speak Spanish fluently.",
      },
      { target: "Quiero ayudar a mis pacientes.", english: "I want to help my patients." },
      { target: "Quiero aprender más vocabulario.", english: "I want to learn more vocabulary." },
    ],
  },
  // Phase 2 — Your World
  {
    id: "es-have-to",
    language: "Spanish",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Tengo que + [infinitive]",
    name: "I have to",
    meaning: "I have to / I must [do something]",
    hook: "This single pattern turns every verb you know into an obligation sentence. The most productive pattern in Spanish.",
    examples: [
      {
        target: "Tengo que operar a las siete.",
        english: "I have to perform surgery at seven.",
        breakdown: "Tengo que + [operar] — any infinitive works",
      },
      { target: "Tienes que descansar.", english: "You have to rest." },
      { target: "Tenemos que hablar.", english: "We have to talk." },
    ],
  },
  {
    id: "es-going-to",
    language: "Spanish",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "Voy a + [infinitive]",
    name: "Going to",
    meaning: "I'm going to [do something]",
    hook: "The near-future tense — simpler than the future conjugation and used far more in everyday speech.",
    examples: [
      {
        target: "Voy a explicar el procedimiento.",
        english: "I'm going to explain the procedure.",
      },
      { target: "Vamos a llegar a las tres.", english: "We're going to arrive at three." },
      { target: "¿Qué vas a hacer después?", english: "What are you going to do after?" },
    ],
  },
  {
    id: "es-can",
    language: "Spanish",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "Puedo + [infinitive]",
    name: "I can",
    meaning: "I can / I am able to [do something]",
    hook: "Ability, permission, possibility — poder covers all three with one conjugation.",
    examples: [
      { target: "Puedo ayudarte con eso.", english: "I can help you with that." },
      { target: "¿Puedes explicarlo más despacio?", english: "Can you explain it more slowly?" },
      { target: "No puedo venir mañana.", english: "I can't come tomorrow." },
    ],
  },
  {
    id: "es-because",
    language: "Spanish",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] porque [reason]",
    name: "Because",
    meaning: "... because [reason]",
    hook: "Porque connects any two ideas with cause and effect. Master this and you can explain anything.",
    examples: [
      {
        target: "Estudio español porque quiero comunicarme con mis pacientes.",
        english: "I study Spanish because I want to communicate with my patients.",
      },
      {
        target: "No puedo ir porque tengo que trabajar.",
        english: "I can't go because I have to work.",
      },
      {
        target: "Llegué tarde porque había mucho tráfico.",
        english: "I arrived late because there was a lot of traffic.",
      },
    ],
  },
];

// ─── FRENCH ───────────────────────────────────────────────────────────────

const FRENCH_PATTERNS: GrammarPattern[] = [
  {
    id: "fr-be-identity",
    language: "French",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Je suis + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "Être is the first verb you internalize — it introduces you to the entire language.",
    examples: [
      { target: "Je suis médecin.", english: "I am a doctor." },
      { target: "Je suis américain, de l'Idaho.", english: "I am American, from Idaho." },
      { target: "Je suis passionné par les langues.", english: "I am passionate about languages." },
    ],
  },
  {
    id: "fr-like",
    language: "French",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "J'aime + [noun / infinitive]",
    name: "I like / I love",
    meaning: "I like / love [thing or activity]",
    hook: "Aimer is the simplest, most expressive word in French — it means both 'like' and 'love.'",
    examples: [
      {
        target: "J'aime jouer au golf.",
        english: "I like to play golf.",
        breakdown: "J'aime + infinitive = I like to...",
      },
      { target: "J'adore apprendre les langues.", english: "I love learning languages." },
      { target: "J'aime lire le soir.", english: "I like to read in the evenings." },
    ],
  },
  {
    id: "fr-want",
    language: "French",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "Je veux + [infinitive]",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Vouloir unlocks every desire — from ordering coffee to describing life goals.",
    examples: [
      {
        target: "Je veux parler français couramment.",
        english: "I want to speak French fluently.",
      },
      { target: "Je veux aider mes patients.", english: "I want to help my patients." },
      {
        target: "Je voudrais un café, s'il vous plaît.",
        english: "I would like a coffee, please.",
        breakdown: "Voudrais = polite 'would like'",
      },
    ],
  },
  {
    id: "fr-have",
    language: "French",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "J'ai + [noun / years]",
    name: "I have",
    meaning: "I have / I am [age] years old",
    hook: "In French, you 'have' years — the same verb handles age, possession, and experience.",
    examples: [
      {
        target: "J'ai quarante ans.",
        english: "I am forty years old.",
        breakdown: "J'ai [X] ans = I have [X] years",
      },
      { target: "J'ai deux enfants.", english: "I have two children." },
      {
        target: "J'ai de l'expérience en chirurgie orthopédique.",
        english: "I have experience in orthopedic surgery.",
      },
    ],
  },
  // Phase 2
  {
    id: "fr-have-to",
    language: "French",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Je dois + [infinitive]",
    name: "I have to / I must",
    meaning: "I must / have to [do something]",
    hook: "Devoir + infinitive = obligation, duty, strong advice. One pattern, infinite applications.",
    examples: [
      { target: "Je dois opérer à sept heures.", english: "I have to perform surgery at seven." },
      { target: "Tu dois te reposer.", english: "You must rest." },
      { target: "Nous devons parler.", english: "We have to talk." },
    ],
  },
  {
    id: "fr-going-to",
    language: "French",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "Je vais + [infinitive]",
    name: "Going to",
    meaning: "I'm going to [do something]",
    hook: "The near-future — simpler than the future tense and how French speakers actually talk about what's coming.",
    examples: [
      { target: "Je vais expliquer la procédure.", english: "I'm going to explain the procedure." },
      { target: "Nous allons arriver à trois heures.", english: "We're going to arrive at three." },
      { target: "Qu'est-ce que tu vas faire après ?", english: "What are you going to do after?" },
    ],
  },
  {
    id: "fr-can",
    language: "French",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "Je peux + [infinitive]",
    name: "I can",
    meaning: "I can / I am able to [do something]",
    hook: "Pouvoir is the key to asking permission, expressing ability, and offering help — all in one verb.",
    examples: [
      { target: "Je peux vous aider avec ça.", english: "I can help you with that." },
      { target: "Pouvez-vous répéter plus lentement ?", english: "Can you repeat more slowly?" },
      { target: "Je ne peux pas venir demain.", english: "I can't come tomorrow." },
    ],
  },
  {
    id: "fr-because",
    language: "French",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] parce que [reason]",
    name: "Because",
    meaning: "... because [reason]",
    hook: "Parce que connects cause to effect — every explanation in French runs through this pattern.",
    examples: [
      {
        target: "J'étudie le français parce que je veux communiquer avec mes patients.",
        english: "I study French because I want to communicate with my patients.",
      },
      {
        target: "Je ne peux pas venir parce que je dois travailler.",
        english: "I can't come because I have to work.",
      },
      {
        target: "Je suis en retard parce qu'il y avait du trafic.",
        english: "I am late because there was traffic.",
      },
    ],
  },
];

// ─── JAPANESE ─────────────────────────────────────────────────────────────

const JAPANESE_PATTERNS: GrammarPattern[] = [
  {
    id: "ja-be-identity",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "〜は〜です",
    name: "I am / This is",
    meaning: "[Subject] is [noun/adjective] (polite)",
    hook: "The fundamental sentence structure of Japanese — subject + topic marker + predicate.",
    examples: [
      {
        target: "わたしはいしゃです。",
        english: "I am a doctor.",
        breakdown: "わたしは [subject] + いしゃ [noun] + です [polite copula]",
      },
      { target: "わたしはアメリカじんです。", english: "I am American." },
      { target: "これはにほんごのほんです。", english: "This is a Japanese language book." },
    ],
  },
  {
    id: "ja-like",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "〜が すきです",
    name: "I like",
    meaning: "I like [noun/activity]",
    hook: "すき (suki) — the first step to describing your personality in Japanese.",
    examples: [
      {
        target: "ゴルフが すきです。",
        english: "I like golf.",
        breakdown: "[thing] + が すきです",
      },
      { target: "にほんごを まなぶことが すきです。", english: "I like learning Japanese." },
      {
        target: "よむことが だいすきです。",
        english: "I love reading.",
        breakdown: "だいすき = love (stronger)",
      },
    ],
  },
  {
    id: "ja-want",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "〜たいです",
    name: "I want to",
    meaning: "I want to [do verb]",
    hook: "Attach たい to any verb stem and express desire. One suffix, every wish.",
    examples: [
      {
        target: "にほんごを はなしたいです。",
        english: "I want to speak Japanese.",
        breakdown: "はなす → はなしたい",
      },
      { target: "にほんに いきたいです。", english: "I want to go to Japan." },
      { target: "もっと べんきょうしたいです。", english: "I want to study more." },
    ],
  },
  {
    id: "ja-have",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "〜が あります / います",
    name: "I have / There is",
    meaning: "I have [thing] / There is [thing or person]",
    hook: "あります (objects) vs います (living things) — one key distinction covers all possession and existence.",
    examples: [
      {
        target: "こどもが ふたりいます。",
        english: "I have two children.",
        breakdown: "います = for people/animals",
      },
      {
        target: "じかんが あります。",
        english: "I have time.",
        breakdown: "あります = for objects/abstract things",
      },
      { target: "しごとが あります。", english: "I have work." },
    ],
  },
  // Phase 2
  {
    id: "ja-have-to",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "〜なければなりません",
    name: "I have to / I must",
    meaning: "I must / have to [do verb]",
    hook: "The gold-standard obligation pattern — long but unmistakable. You will hear this in every professional setting.",
    examples: [
      {
        target: "まいにち べんきょうしなければなりません。",
        english: "I must study every day.",
        breakdown: "べんきょうする → べんきょうしなければなりません",
      },
      { target: "てを あらわなければなりません。", english: "I must wash my hands." },
      { target: "もう いかなければなりません。", english: "I must go now." },
    ],
  },
  {
    id: "ja-can",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "〜ことが できます",
    name: "I can",
    meaning: "I can / am able to [do verb]",
    hook: "Combine this with any verb dictionary form to express ability at any level.",
    examples: [
      {
        target: "にほんごを はなすことが できます。",
        english: "I can speak Japanese.",
        breakdown: "はなす [dict form] + ことができます",
      },
      { target: "くるまを うんてんすることが できます。", english: "I can drive a car." },
      { target: "てつだうことが できます。", english: "I can help." },
    ],
  },
  {
    id: "ja-currently-doing",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "action",
    pattern: "〜ています",
    name: "Currently doing",
    meaning: "I am [doing verb] / I am in a state of [verb]",
    hook: "〜ています works like English '-ing' but also expresses ongoing states — essential for describing your situation.",
    examples: [
      {
        target: "びょういんで はたらいています。",
        english: "I am working at a hospital.",
        breakdown: "はたらく → はたらいている + ます",
      },
      { target: "にほんごを べんきょうしています。", english: "I am studying Japanese." },
      { target: "アイダホに すんでいます。", english: "I am living in Idaho." },
    ],
  },
  {
    id: "ja-because",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "〜から、〜",
    name: "Because / So",
    meaning: "Because [reason], [result]",
    hook: "〜から connects cause to effect — use it to explain decisions, situations, and actions.",
    examples: [
      {
        target: "にほんにいったから、にほんごを べんきょうしています。",
        english: "Because I went to Japan, I am studying Japanese.",
      },
      { target: "いそがしいから、いけません。", english: "Because I'm busy, I can't go." },
      {
        target: "おもしろいから、まいにち れんしゅうしています。",
        english: "Because it's interesting, I practice every day.",
      },
    ],
  },
];

// ─── KOREAN ───────────────────────────────────────────────────────────────

const KOREAN_PATTERNS: GrammarPattern[] = [
  {
    id: "ko-be-identity",
    language: "Korean",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "저는 ~입니다 / ~예요",
    name: "I am (identity)",
    meaning: "I am [noun] (formal / informal polite)",
    hook: "The opening line of every Korean introduction — formal 입니다 or casual 이에요/예요.",
    examples: [
      {
        target: "저는 의사입니다.",
        english: "I am a doctor.",
        breakdown: "저는 = I (formal) + 의사 + 입니다",
      },
      {
        target: "저는 미국 사람이에요.",
        english: "I am American.",
        breakdown: "이에요 after consonant",
      },
      { target: "저는 정형외과 의사예요.", english: "I am an orthopedic surgeon." },
    ],
  },
  {
    id: "ko-like",
    language: "Korean",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "~을/를 좋아해요",
    name: "I like",
    meaning: "I like [noun/activity]",
    hook: "좋아하다 — one verb handles all your likes and preferences.",
    examples: [
      { target: "골프를 좋아해요.", english: "I like golf." },
      { target: "책 읽기를 좋아해요.", english: "I like reading books." },
      { target: "한국어 배우는 것을 좋아해요.", english: "I like learning Korean." },
    ],
  },
  {
    id: "ko-want",
    language: "Korean",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "~고 싶어요",
    name: "I want to",
    meaning: "I want to [do verb]",
    hook: "Add 고 싶어요 to any verb stem and express any desire. Universal and natural.",
    examples: [
      {
        target: "한국어를 말하고 싶어요.",
        english: "I want to speak Korean.",
        breakdown: "말하다 → 말하 + 고 싶어요",
      },
      { target: "한국에 가고 싶어요.", english: "I want to go to Korea." },
      { target: "더 공부하고 싶어요.", english: "I want to study more." },
    ],
  },
  {
    id: "ko-have",
    language: "Korean",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "~이/가 있어요",
    name: "I have / There is",
    meaning: "I have [thing] / There is [thing]",
    hook: "있다 is the workhorse of possession and existence in Korean.",
    examples: [
      { target: "아이가 두 명 있어요.", english: "I have two children." },
      { target: "시간이 있어요.", english: "I have time." },
      { target: "병원에서 일이 있어요.", english: "I have work at the hospital." },
    ],
  },
  // Phase 2
  {
    id: "ko-have-to",
    language: "Korean",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "~아/어야 해요",
    name: "I have to",
    meaning: "I have to / must [do verb]",
    hook: "The everyday obligation marker — you'll hear this dozens of times a day in Korean.",
    examples: [
      {
        target: "매일 공부해야 해요.",
        english: "I have to study every day.",
        breakdown: "공부하다 → 공부해야 해요",
      },
      { target: "손을 씻어야 해요.", english: "I have to wash my hands." },
      { target: "지금 가야 해요.", english: "I have to go now." },
    ],
  },
  {
    id: "ko-can",
    language: "Korean",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "~(으)ㄹ 수 있어요",
    name: "I can",
    meaning: "I can / am able to [do verb]",
    hook: "Ability marker that attaches to any verb — expressing what you can and can't do.",
    examples: [
      {
        target: "한국어를 말할 수 있어요.",
        english: "I can speak Korean.",
        breakdown: "말하다 → 말할 수 있어요",
      },
      { target: "도와드릴 수 있어요.", english: "I can help you." },
      { target: "운전할 수 없어요.", english: "I can't drive." },
    ],
  },
  {
    id: "ko-currently-doing",
    language: "Korean",
    phase: 2,
    frequency: "ultra",
    category: "action",
    pattern: "~고 있어요",
    name: "Currently doing",
    meaning: "I am [doing verb] right now",
    hook: "The Korean progressive — attach to any verb stem to describe what's happening right now.",
    examples: [
      {
        target: "병원에서 일하고 있어요.",
        english: "I am working at the hospital.",
        breakdown: "일하다 → 일하고 있어요",
      },
      { target: "한국어를 공부하고 있어요.", english: "I am studying Korean." },
      { target: "지금 뭐 하고 있어요?", english: "What are you doing right now?" },
    ],
  },
  {
    id: "ko-because",
    language: "Korean",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "~니까 / ~기 때문에",
    name: "Because / So",
    meaning: "Because [reason], [result]",
    hook: "Two forms — 니까 for spoken conversation, 기 때문에 for formal contexts. Both essential.",
    examples: [
      {
        target: "바쁘니까 못 가요.",
        english: "I can't go because I'm busy.",
        breakdown: "바쁘다 → 바쁘니까",
      },
      {
        target: "시간이 없기 때문에 빨리 가야 해요.",
        english: "I have to go quickly because I don't have time.",
      },
      { target: "피곤하니까 자고 싶어요.", english: "Because I'm tired, I want to sleep." },
    ],
  },
];

// ─── GERMAN ───────────────────────────────────────────────────────────────

const GERMAN_PATTERNS: GrammarPattern[] = [
  {
    id: "de-be-identity",
    language: "German",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Ich bin + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "Sein is the foundation — the first verb you learn, the one you use forever.",
    examples: [
      {
        target: "Ich bin Arzt.",
        english: "I am a doctor.",
        breakdown: "Ich bin + job title (no article for professions)",
      },
      { target: "Ich bin aus Idaho, USA.", english: "I am from Idaho, USA." },
      { target: "Ich bin Linguist und Orthopäde.", english: "I am a linguist and orthopedist." },
    ],
  },
  {
    id: "de-like",
    language: "German",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "Ich mag / Ich liebe + [noun/infinitive]",
    name: "I like / I love",
    meaning: "I like / love [thing or activity]",
    hook: "Mögen for preferences, lieben for deep love — both open the door to expressing your personality.",
    examples: [
      { target: "Ich mag Golf spielen.", english: "I like to play golf." },
      { target: "Ich liebe Sprachen lernen.", english: "I love learning languages." },
      { target: "Ich mag Lesen.", english: "I like reading." },
    ],
  },
  {
    id: "de-want",
    language: "German",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "Ich möchte / Ich will + [infinitive]",
    name: "I want to",
    meaning: "I would like to / I want to [do something]",
    hook: "Möchte is polite desire, wollen is direct — both attach to any infinitive and describe any intention.",
    examples: [
      {
        target: "Ich möchte Deutsch fließend sprechen.",
        english: "I would like to speak German fluently.",
        breakdown: "möchte = polite want",
      },
      {
        target: "Ich will meinen Patienten helfen.",
        english: "I want to help my patients.",
        breakdown: "will = direct want",
      },
      {
        target: "Ich möchte mehr Vokabeln lernen.",
        english: "I would like to learn more vocabulary.",
      },
    ],
  },
  {
    id: "de-have",
    language: "German",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Ich habe + [noun]",
    name: "I have",
    meaning: "I have [thing/person]",
    hook: "Haben handles possession, age, and experience — one verb, three uses.",
    examples: [
      {
        target: "Ich bin vierzig Jahre alt.",
        english: "I am forty years old.",
        breakdown: "German uses sein (be) for age, not haben",
      },
      { target: "Ich habe zwei Kinder.", english: "I have two children." },
      {
        target: "Ich habe Erfahrung in der Orthopädie.",
        english: "I have experience in orthopedics.",
      },
    ],
  },
  // Phase 2
  {
    id: "de-have-to",
    language: "German",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Ich muss + [infinitive] (verb at end)",
    name: "I have to / I must",
    meaning: "I must / have to [do something]",
    hook: "Müssen is German's obligation motor — the verb goes to the END, which is the key German sentence pattern.",
    examples: [
      {
        target: "Ich muss jeden Tag Deutsch üben.",
        english: "I have to practice German every day.",
        breakdown: "muss [modal] + ... + üben [infinitive at end]",
      },
      { target: "Du musst dich ausruhen.", english: "You must rest." },
      { target: "Wir müssen reden.", english: "We have to talk." },
    ],
  },
  {
    id: "de-going-to",
    language: "German",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "Ich werde + [infinitive] (verb at end)",
    name: "I will / going to",
    meaning: "I will / am going to [do something]",
    hook: "Werden + infinitive at end = future tense and intention. One structure for all future plans.",
    examples: [
      { target: "Ich werde die Prozedur erklären.", english: "I will explain the procedure." },
      { target: "Wir werden um drei Uhr ankommen.", english: "We will arrive at three o'clock." },
      { target: "Was wirst du danach machen?", english: "What will you do after?" },
    ],
  },
  {
    id: "de-can",
    language: "German",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "Ich kann + [infinitive] (verb at end)",
    name: "I can",
    meaning: "I can / am able to [do something]",
    hook: "Können + infinitive to the end = ability in any context. The German modal pattern.",
    examples: [
      { target: "Ich kann Ihnen damit helfen.", english: "I can help you with that." },
      {
        target: "Können Sie das langsamer wiederholen?",
        english: "Can you repeat that more slowly?",
      },
      { target: "Ich kann morgen nicht kommen.", english: "I can't come tomorrow." },
    ],
  },
  {
    id: "de-because",
    language: "German",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause], weil + [verb at end]",
    name: "Because (verb to end!)",
    meaning: "... because [reason — verb goes to END]",
    hook: "Weil sends the verb to the end of the clause — this single word reveals the most important German grammar rule.",
    examples: [
      {
        target: "Ich lerne Deutsch, weil ich Patienten helfen will.",
        english: "I'm learning German because I want to help patients.",
        breakdown: "weil... will [at end]",
      },
      {
        target: "Ich kann nicht kommen, weil ich arbeiten muss.",
        english: "I can't come because I have to work.",
      },
      {
        target: "Er ist müde, weil er lange gearbeitet hat.",
        english: "He is tired because he worked a long time.",
      },
    ],
  },
];

// ─── PORTUGUESE ───────────────────────────────────────────────────────────

const PORTUGUESE_PATTERNS: GrammarPattern[] = [
  {
    id: "pt-be-identity",
    language: "Portuguese",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Sou + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "Ser is the identity verb — the cornerstone of every introduction in Portuguese.",
    examples: [
      { target: "Sou médico.", english: "I am a doctor." },
      {
        target: "Sou dos Estados Unidos, do Idaho.",
        english: "I am from the United States, from Idaho.",
      },
      { target: "Sou cirurgião ortopédico.", english: "I am an orthopedic surgeon." },
    ],
  },
  {
    id: "pt-like",
    language: "Portuguese",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "Eu gosto de + [noun / infinitive]",
    name: "I like",
    meaning: "I like [thing or activity]",
    hook: "Gostar de is the preference verb — the 'de' is mandatory and changes with what follows.",
    examples: [
      {
        target: "Gosto de jogar golfe.",
        english: "I like to play golf.",
        breakdown: "gostar de + infinitive",
      },
      {
        target: "Adoro aprender idiomas.",
        english: "I love learning languages.",
        breakdown: "adorar = stronger",
      },
      { target: "Gosto de ler à noite.", english: "I like to read at night." },
    ],
  },
  {
    id: "pt-want",
    language: "Portuguese",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "Quero + [infinitive]",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Querer + any infinitive = any desire. Identical structure to Spanish — easy transfer.",
    examples: [
      {
        target: "Quero falar português fluentemente.",
        english: "I want to speak Portuguese fluently.",
      },
      { target: "Quero ajudar meus pacientes.", english: "I want to help my patients." },
      { target: "Quero aprender mais vocabulário.", english: "I want to learn more vocabulary." },
    ],
  },
  {
    id: "pt-have",
    language: "Portuguese",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Tenho + [noun / years]",
    name: "I have",
    meaning: "I have / I am [age] years old",
    hook: "Ter handles age and possession — same structure as Spanish tener.",
    examples: [
      { target: "Tenho quarenta anos.", english: "I am forty years old." },
      { target: "Tenho dois filhos.", english: "I have two children." },
      { target: "Tenho experiência em cirurgia.", english: "I have experience in surgery." },
    ],
  },
  // Phase 2
  {
    id: "pt-have-to",
    language: "Portuguese",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Tenho que + [infinitive]",
    name: "I have to",
    meaning: "I have to / must [do something]",
    hook: "Ter que + infinitive = obligation. Every verb you know becomes something you 'have to' do.",
    examples: [
      { target: "Tenho que operar às sete horas.", english: "I have to perform surgery at seven." },
      { target: "Você tem que descansar.", english: "You have to rest." },
      {
        target: "Precisamos conversar.",
        english: "We need to talk.",
        breakdown: "precisar de = need to (synonym)",
      },
    ],
  },
  {
    id: "pt-going-to",
    language: "Portuguese",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "Vou + [infinitive]",
    name: "Going to",
    meaning: "I'm going to [do something]",
    hook: "Ir + infinitive = near future. Natural and direct — how Brazilians and Portuguese actually talk.",
    examples: [
      { target: "Vou explicar o procedimento.", english: "I'm going to explain the procedure." },
      { target: "Vamos chegar às três.", english: "We're going to arrive at three." },
      { target: "O que você vai fazer depois?", english: "What are you going to do after?" },
    ],
  },
  {
    id: "pt-can",
    language: "Portuguese",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "Posso + [infinitive]",
    name: "I can",
    meaning: "I can / am able to [do something]",
    hook: "Poder + infinitive = ability, permission, or possibility — three meanings, one verb.",
    examples: [
      { target: "Posso te ajudar com isso.", english: "I can help you with that." },
      { target: "Você pode repetir mais devagar?", english: "Can you repeat more slowly?" },
      { target: "Não posso vir amanhã.", english: "I can't come tomorrow." },
    ],
  },
  {
    id: "pt-because",
    language: "Portuguese",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] porque [reason]",
    name: "Because",
    meaning: "... because [reason]",
    hook: "Porque (one word) connects any cause to any effect. Every explanation runs through this.",
    examples: [
      {
        target: "Estudo português porque quero me comunicar com meus pacientes.",
        english: "I study Portuguese because I want to communicate with my patients.",
      },
      {
        target: "Não posso ir porque tenho que trabalhar.",
        english: "I can't go because I have to work.",
      },
      {
        target: "Cheguei atrasado porque havia muito trânsito.",
        english: "I arrived late because there was a lot of traffic.",
      },
    ],
  },
];

// ─── ITALIAN ──────────────────────────────────────────────────────────────

const ITALIAN_PATTERNS: GrammarPattern[] = [
  {
    id: "it-infinitive-form",
    language: "Italian",
    phase: 1,
    frequency: "ultra",
    category: "form",
    pattern: "-are / -ere / -ire",
    name: "The dictionary form (infinitive)",
    meaning: "The unconjugated 'lookup' form of any Italian verb",
    hook: "This is the key that unlocks every modal pattern below — Devo, Voglio, Posso, and every one of the other Ultra patterns on this list just plug a dictionary-form verb in after them. Learn to recognize -are/-ere/-ire and you can generate hundreds of sentences from patterns you already know. If you know Spanish, this is nearly free: Spanish infinitives end -ar/-er/-ir — Italian just adds one 'e'.",
    examples: [
      {
        target: "parlare",
        english: "to speak (-are family — the largest and most regular)",
        breakdown: "Devo parlare italiano. = I have to speak Italian. Same infinitive, any modal in front.",
      },
      {
        target: "leggere",
        english: "to read (-ere family)",
        breakdown: "Voglio leggere questo libro. = I want to read this book.",
      },
      {
        target: "dormire",
        english: "to sleep (-ire family)",
        breakdown: "Posso dormire qui? = Can I sleep here?",
      },
    ],
  },
  {
    id: "it-be-identity",
    language: "Italian",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Sono + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "Essere is the verb of identity — every Italian introduction starts here.",
    examples: [
      { target: "Sono medico.", english: "I am a doctor." },
      { target: "Sono americano, dell'Idaho.", english: "I am American, from Idaho." },
      { target: "Sono chirurgo ortopedico.", english: "I am an orthopedic surgeon." },
    ],
  },
  {
    id: "it-like",
    language: "Italian",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "Mi piace + [noun / infinitive]",
    name: "I like",
    meaning: "I like [thing or activity]",
    hook: "Piacere works like Spanish gustar — the thing 'pleases you.' Learn the inversion once, apply it forever.",
    examples: [
      {
        target: "Mi piace giocare a golf.",
        english: "I like to play golf.",
        breakdown: "Mi piace + infinitive = I like to...",
      },
      {
        target: "Mi piace moltissimo imparare le lingue.",
        english: "I love learning languages.",
        breakdown: "moltissimo = very much",
      },
      { target: "Mi piace leggere la sera.", english: "I like to read in the evening." },
    ],
  },
  {
    id: "it-want",
    language: "Italian",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "Voglio + [infinitive]",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Volere + infinitive = any desire. Direct and natural in Italian everyday speech.",
    examples: [
      {
        target: "Voglio parlare italiano fluentemente.",
        english: "I want to speak Italian fluently.",
      },
      { target: "Voglio aiutare i miei pazienti.", english: "I want to help my patients." },
      { target: "Voglio imparare più vocabolario.", english: "I want to learn more vocabulary." },
    ],
  },
  {
    id: "it-have",
    language: "Italian",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "Ho + [noun / years]",
    name: "I have",
    meaning: "I have / I am [age] years old",
    hook: "Avere handles age and possession — 'ho quarant'anni' (I have 40 years) is how Italians express age.",
    examples: [
      {
        target: "Ho quarant'anni.",
        english: "I am forty years old.",
        breakdown: "Ho [anni] = I have [years]",
      },
      { target: "Ho due figli.", english: "I have two children." },
      {
        target: "Ho esperienza in chirurgia ortopedica.",
        english: "I have experience in orthopedic surgery.",
      },
    ],
  },
  // Phase 2
  {
    id: "it-have-to",
    language: "Italian",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Devo + [infinitive]",
    name: "I have to / I must",
    meaning: "I must / have to [do something]",
    hook: "Dovere conjugated + any infinitive = obligation. Italian's most powerful modal.",
    examples: [
      { target: "Devo operare alle sette.", english: "I have to operate at seven." },
      { target: "Devi riposare.", english: "You must rest." },
      { target: "Dobbiamo parlare.", english: "We have to talk." },
    ],
  },
  {
    id: "it-going-to",
    language: "Italian",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "Sto per + [infinitive]",
    name: "About to / going to",
    meaning: "I'm about to [do something] (imminent)",
    hook: "This is a false-friend trap: Spanish voy a and English going to stretch to cover any future plan, but Italian andare a doesn't work the same way — it stays tied to literal motion ('vado a comprare il pane' = I go [somewhere] to buy bread). Stare per + infinitive is the real periphrastic for 'about to.' For a scheduled future plan with no urgency, Italians just use the future tense instead (arriverò, non 'vado ad arrivare').",
    examples: [
      { target: "Sto per operare.", english: "I'm about to operate." },
      { target: "Stiamo per arrivare.", english: "We're about to arrive." },
      {
        target: "Che cosa stai per fare?",
        english: "What are you about to do?",
        breakdown: "For a further-out plan, use the future tense instead: 'Che cosa farai dopo?'",
      },
    ],
  },
  {
    id: "it-can",
    language: "Italian",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "Posso + [infinitive]",
    name: "I can",
    meaning: "I can / am able to [do something]",
    hook: "Potere + infinitive = ability or permission. Three meanings, one pattern.",
    examples: [
      { target: "Posso aiutarti con questo.", english: "I can help you with that." },
      { target: "Puoi ripetere più lentamente?", english: "Can you repeat more slowly?" },
      { target: "Non posso venire domani.", english: "I can't come tomorrow." },
    ],
  },
  {
    id: "it-because",
    language: "Italian",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] perché [reason]",
    name: "Because",
    meaning: "... because [reason]",
    hook: "Perché connects cause and effect — the same word also means 'why,' which helps you ask AND answer.",
    examples: [
      {
        target: "Studio italiano perché voglio parlare con i miei pazienti.",
        english: "I study Italian because I want to talk with my patients.",
      },
      {
        target: "Non posso venire perché devo lavorare.",
        english: "I can't come because I have to work.",
      },
      {
        target: "Sono arrivato tardi perché c'era molto traffico.",
        english: "I arrived late because there was a lot of traffic.",
      },
    ],
  },
  {
    id: "it-purpose",
    language: "Italian",
    phase: 2,
    frequency: "high",
    category: "purpose",
    pattern: "per + [infinitive] (same subject) / affinché + [congiuntivo] (different subject)",
    name: "Purpose — in order to / so that",
    meaning: "[action], in order to / so that [goal happens]",
    hook: "This is Italian's answer to Spanish para que — but it doesn't work the same way. Para que always triggers the subjunctive, no matter who's doing what. Italian splits the decision on subject: if the SAME person does both actions, use per + the plain infinitive — no subjunctive needed at all. Only switch to affinché (or perché in this same 'so that' sense) + congiuntivo when the two actions have DIFFERENT subjects. Assuming Italian always needs the subjunctive here, the way para que does, is the single most common mistake a Spanish speaker makes with this pattern.",
    examples: [
      {
        target: "Studio italiano per capire meglio i miei pazienti.",
        english: "I study Italian in order to understand my patients better.",
        breakdown: "Same subject (io studio, io capisco) — per + infinitive, no subjunctive.",
      },
      {
        target: "Ti spiego la procedura affinché tu capisca cosa succederà.",
        english: "I'm explaining the procedure to you so that you understand what will happen.",
        breakdown: "Different subjects (io spiego / tu capisci) — affinché + congiuntivo: capisca, not capisci.",
      },
      {
        target: "Parlo lentamente perché tu possa seguire meglio.",
        english: "I speak slowly so that you can follow better.",
        breakdown: "perché doubles as 'because' AND 'so that' — the mood tells you which: indicativo = because, congiuntivo (possa) = so that.",
      },
    ],
  },
];

// ─── ENGLISH (ESL) ────────────────────────────────────────────────────────

const ENGLISH_PATTERNS: GrammarPattern[] = [
  {
    id: "en-be-identity",
    language: "English",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "I am + [noun/adjective]",
    name: "I am (identity)",
    meaning: "I am [profession / nationality / trait]",
    hook: "The simplest, most powerful sentence in English — 'I am' begins every introduction.",
    examples: [
      { target: "I am a doctor.", english: "I am a doctor." },
      { target: "I am from the United States.", english: "I am from the United States." },
      {
        target: "I am an orthopedic surgeon in Idaho.",
        english: "I am an orthopedic surgeon in Idaho.",
      },
    ],
  },
  {
    id: "en-like",
    language: "English",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "I like / I love + [noun / gerund]",
    name: "I like / I love",
    meaning: "I like / love [thing or activity]",
    hook: "Like and love describe your whole personality — attach them to any noun or verb+ing.",
    examples: [
      {
        target: "I like playing golf.",
        english: "I like playing golf.",
        breakdown: "like + verb-ing (gerund)",
      },
      { target: "I love learning languages.", english: "I love learning languages." },
      {
        target: "I really enjoy reading in the evenings.",
        english: "I really enjoy reading in the evenings.",
      },
    ],
  },
  {
    id: "en-want",
    language: "English",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "I want to + [verb]",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Want to + base verb = any desire. The most natural way to express intention in English.",
    examples: [
      { target: "I want to speak English fluently.", english: "I want to speak English fluently." },
      { target: "I want to help my patients.", english: "I want to help my patients." },
      {
        target: "I'd like to learn more vocabulary.",
        english: "I'd like to learn more vocabulary.",
        breakdown: "I'd like to = polite version",
      },
    ],
  },
  {
    id: "en-have",
    language: "English",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "I have + [noun]",
    name: "I have",
    meaning: "I have [thing/person/quality]",
    hook: "Have for possession, experience, and relationships — the most versatile verb in English.",
    examples: [
      { target: "I have two children.", english: "I have two children." },
      {
        target: "I have fifteen years of experience in orthopedics.",
        english: "I have fifteen years of experience in orthopedics.",
      },
      {
        target: "I have a clinic in Twin Falls, Idaho.",
        english: "I have a clinic in Twin Falls, Idaho.",
      },
    ],
  },
  // Phase 2
  {
    id: "en-have-to",
    language: "English",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "I have to / I must + [verb]",
    name: "I have to / I must",
    meaning: "I have to / must [do something]",
    hook: "Have to (casual) and must (formal) — both turn any verb into an obligation sentence.",
    examples: [
      {
        target: "I have to perform surgery at seven.",
        english: "I have to perform surgery at seven.",
      },
      {
        target: "You must rest for two weeks.",
        english: "You must rest for two weeks.",
        breakdown: "must = formal/strong obligation",
      },
      {
        target: "We need to talk about your recovery.",
        english: "We need to talk about your recovery.",
        breakdown: "need to = softer obligation",
      },
    ],
  },
  {
    id: "en-going-to",
    language: "English",
    phase: 2,
    frequency: "ultra",
    category: "intention",
    pattern: "I'm going to + [verb]",
    name: "Going to",
    meaning: "I'm going to [do something]",
    hook: "Going to = planned future. More natural than 'will' in most everyday conversations.",
    examples: [
      {
        target: "I'm going to explain the procedure.",
        english: "I'm going to explain the procedure.",
      },
      {
        target: "We're going to arrive at three o'clock.",
        english: "We're going to arrive at three o'clock.",
      },
      {
        target: "What are you going to do after the appointment?",
        english: "What are you going to do after the appointment?",
      },
    ],
  },
  {
    id: "en-can",
    language: "English",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "I can + [verb]",
    name: "I can",
    meaning: "I can [do something]",
    hook: "Can + base verb (no 'to'!) = ability, permission, or offer. The most natural English modal.",
    examples: [
      { target: "I can help you with that.", english: "I can help you with that." },
      {
        target: "Can you repeat that more slowly, please?",
        english: "Can you repeat that more slowly, please?",
      },
      {
        target: "I can't come tomorrow — I'm in surgery.",
        english: "I can't come tomorrow — I'm in surgery.",
      },
    ],
  },
  {
    id: "en-because",
    language: "English",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] because [reason]",
    name: "Because",
    meaning: "... because [reason]",
    hook: "Because connects any two ideas with cause and effect — the foundation of explanation in English.",
    examples: [
      {
        target: "I study languages because I want to connect with my patients.",
        english: "I study languages because I want to connect with my patients.",
      },
      {
        target: "I can't come because I have to operate.",
        english: "I can't come because I have to operate.",
      },
      {
        target: "I was late because there was a lot of traffic.",
        english: "I was late because there was a lot of traffic.",
      },
    ],
  },
];

// ─── Master export ─────────────────────────────────────────────────────────

export const ALL_PATTERNS: GrammarPattern[] = [
  ...SPANISH_PATTERNS,
  ...FRENCH_PATTERNS,
  ...JAPANESE_PATTERNS,
  ...KOREAN_PATTERNS,
  ...GERMAN_PATTERNS,
  ...PORTUGUESE_PATTERNS,
  ...ITALIAN_PATTERNS,
  ...ENGLISH_PATTERNS,
];

export function getPatternsForLanguage(language: Language): GrammarPattern[] {
  return ALL_PATTERNS.filter((p) => p.language === language);
}

export function getUltraPatterns(language: Language): GrammarPattern[] {
  return getPatternsForLanguage(language).filter((p) => p.frequency === "ultra");
}
