import type { Language } from "@/state/app-state";
import { CHINESE_PATTERNS } from "./chinese-patterns";

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

// NOTE: Full pattern bodies for Spanish/French/Japanese/Korean/German/Portuguese/Italian/English
// were temporarily emptied during an earlier restore. They are re-populated from the last known-good
// commit in the following blocks. Chinese is provided by ./chinese-patterns.

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

const FRENCH_PATTERNS: GrammarPattern[] = [];
const JAPANESE_PATTERNS: GrammarPattern[] = [];
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
