import type { Language } from "@/state/app-state";
import { CHINESE_PATTERNS } from "./chinese-patterns";

export type PatternFrequency = "ultra" | "high" | "medium";
export type PatternPhase = 1 | 2;
export type PatternCategory =
  | "identity"
  | "obligation"
  | "intention"
  | "ability"
  | "action"
  | "cause"
  | "purpose"
  | "sequence"
  | "opinion"
  | "preference"
  | "description"
  | "form";

export interface PatternExample {
  target: string;
  english: string;
  breakdown?: string;
}

export interface GrammarPattern {
  id: string;
  language: Language;
  phase: PatternPhase;
  frequency: PatternFrequency;
  category: PatternCategory;
  pattern: string;
  name: string;
  meaning: string;
  hook: string;
  examples: PatternExample[];
}

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

const SPANISH_PATTERNS: GrammarPattern[] = [
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
      { target: "Soy médico.", english: "I am a doctor.", breakdown: "Soy = ser (to be), 1st person singular" },
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
      { target: "Tengo cuarenta años.", english: "I am forty years old.", breakdown: "Tengo años = I have [X] years" },
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
      { target: "Me gusta jugar al golf.", english: "I like to play golf.", breakdown: "Me gusta + infinitive = I like to..." },
      { target: "Me encanta aprender idiomas.", english: "I love learning languages.", breakdown: "Me encanta = stronger version of me gusta" },
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
      { target: "Quiero hablar español con fluidez.", english: "I want to speak Spanish fluently." },
      { target: "Quiero ayudar a mis pacientes.", english: "I want to help my patients." },
      { target: "Quiero aprender más vocabulario.", english: "I want to learn more vocabulary." },
    ],
  },
  {
    id: "es-have-to",
    language: "Spanish",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "Tengo que + [infinitive]",
    name: "I have to",
    meaning: "I have to / I must [do something]",
    hook: "This single pattern turns every verb you know into an obligation sentence.",
    examples: [
      { target: "Tengo que operar a las siete.", english: "I have to perform surgery at seven.", breakdown: "Tengo que + [operar] — any infinitive works" },
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
      { target: "Voy a explicar el procedimiento.", english: "I'm going to explain the procedure." },
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
    hook: "Porque connects any two ideas with cause and effect.",
    examples: [
      { target: "Estudio español porque quiero comunicarme con mis pacientes.", english: "I study Spanish because I want to communicate with my patients." },
      { target: "No puedo ir porque tengo que trabajar.", english: "I can't go because I have to work." },
      { target: "Llegué tarde porque había mucho tráfico.", english: "I arrived late because there was a lot of traffic." },
    ],
  },
];

const JAPANESE_PATTERNS: GrammarPattern[] = [
  {
    id: "ja-desu",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "identity",
    pattern: "[noun] です",
    name: "Is / am (polite)",
    meaning: "I am / it is [noun]",
    hook: "The single most useful ending in Japanese — turns any noun into a complete polite sentence.",
    examples: [
      { target: "医者です。", english: "I am a doctor.", breakdown: "noun + です = polite 'is/am'" },
      { target: "学生です。", english: "I am a student." },
      { target: "これは本です。", english: "This is a book." },
    ],
  },
  {
    id: "ja-masu",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "action",
    pattern: "[verb stem] ます",
    name: "Polite present",
    meaning: "I [do] / [verb] (polite)",
    hook: "-ます is the default polite verb ending. Learn one stem and you can speak politely all day.",
    examples: [
      { target: "食べます。", english: "I eat / I will eat.", breakdown: "食べ + ます" },
      { target: "行きます。", english: "I go / I will go." },
      { target: "使います。", english: "I use / I will use." },
    ],
  },
  {
    id: "ja-tai",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "intention",
    pattern: "[verb stem] たい",
    name: "I want to",
    meaning: "I want to [do something]",
    hook: "Attach -たい to any verb stem and you can express every desire.",
    examples: [
      { target: "日本語を勉強したい。", english: "I want to study Japanese." },
      { target: "食べたい。", english: "I want to eat." },
      { target: "行きたいです。", english: "I want to go (polite)." },
    ],
  },
  {
    id: "ja-te-iru",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "action",
    pattern: "[て-form] いる",
    name: "Is doing / progressive",
    meaning: "I am [doing] / ongoing state",
    hook: "て-form + いる covers progressive actions and resulting states — the workhorse of daily Japanese.",
    examples: [
      { target: "本を読んでいる。", english: "I am reading a book.", breakdown: "読んで + いる" },
      { target: "使っています。", english: "I am using it (polite)." },
      { target: "知っている。", english: "I know (resulting state)." },
    ],
  },
  {
    id: "ja-nakereba",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "obligation",
    pattern: "[ない-stem] なければならない",
    name: "Must / have to",
    meaning: "I must / I have to [do something]",
    hook: "The standard way to express obligation. Shorter なきゃ / なくちゃ appear in speech.",
    examples: [
      { target: "行かなければならない。", english: "I have to go." },
      { target: "勉強しなければいけません。", english: "I must study (polite)." },
      { target: "使わなきゃ。", english: "I gotta use it (casual)." },
    ],
  },
  {
    id: "ja-kara",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "cause",
    pattern: "[clause] から",
    name: "Because",
    meaning: "... because [reason]",
    hook: "から after any clause gives the reason. Pair it with です/ます for polite explanations.",
    examples: [
      { target: "忙しいから行けません。", english: "I can't go because I'm busy." },
      { target: "病気だから休みます。", english: "I'm taking the day off because I'm sick." },
      { target: "使いたいから買いました。", english: "I bought it because I want to use it." },
    ],
  },
  {
    id: "ja-ga-suki",
    language: "Japanese",
    phase: 1,
    frequency: "ultra",
    category: "preference",
    pattern: "[noun] が好きです",
    name: "I like",
    meaning: "I like [thing]",
    hook: "好き is an adjective, not a verb — the thing you like takes が.",
    examples: [
      { target: "日本語が好きです。", english: "I like Japanese." },
      { target: "音楽が好き。", english: "I like music." },
      { target: "これが一番好きです。", english: "I like this the most." },
    ],
  },
  {
    id: "ja-dekiru",
    language: "Japanese",
    phase: 2,
    frequency: "ultra",
    category: "ability",
    pattern: "[noun] ができる / [verb potential]",
    name: "Can / be able to",
    meaning: "I can [do something]",
    hook: "できる after a noun, or the potential form of a verb, both express ability.",
    examples: [
      { target: "日本語ができます。", english: "I can speak Japanese." },
      { target: "泳げます。", english: "I can swim." },
      { target: "使えません。", english: "I can't use it." },
    ],
  },
];

const FRENCH_PATTERNS: GrammarPattern[] = [];
const KOREAN_PATTERNS: GrammarPattern[] = [];
const GERMAN_PATTERNS: GrammarPattern[] = [];
const PORTUGUESE_PATTERNS: GrammarPattern[] = [];
const ITALIAN_PATTERNS: GrammarPattern[] = [];
const ENGLISH_PATTERNS: GrammarPattern[] = [];

export const ALL_PATTERNS: GrammarPattern[] = [
  ...SPANISH_PATTERNS,
  ...FRENCH_PATTERNS,
  ...JAPANESE_PATTERNS,
  ...KOREAN_PATTERNS,
  ...GERMAN_PATTERNS,
  ...PORTUGUESE_PATTERNS,
  ...ITALIAN_PATTERNS,
  ...ENGLISH_PATTERNS,
  ...CHINESE_PATTERNS,
];

export function getPatternsForLanguage(language: Language): GrammarPattern[] {
  return ALL_PATTERNS.filter((p) => p.language === language);
}

export function getUltraPatterns(language: Language): GrammarPattern[] {
  return getPatternsForLanguage(language).filter((p) => p.frequency === "ultra");
}
