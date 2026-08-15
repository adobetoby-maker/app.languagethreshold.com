import { MODULES, moduleSupportsLearningPair, type AppModule } from "./modules.ts";
import type { NativeLanguage } from "@/state/app-state";
import { CURRICULA, type Lesson } from "./curriculum.ts";
import {
  CORE_SPEAKING_MODULE,
  CORE_GRAMMAR_EXTENSIONS,
  CORE_VERBS,
  DAILY_LIVING_TOPICS,
  RELATIONSHIPS_INTIMACY_TOPICS,
  type CoreSpeakingSection,
  type CoreGrammarPattern,
  type CoreVerb,
  type DailyLivingTopic,
} from "./core-speaking.ts";
import { getPatternsForLanguage } from "./grammar-patterns.ts";

export type SpeakingMissionSpecialty = "Core" | AppModule["category"];
export type SpeakingMissionLanguage = "Spanish" | "Italian" | "Japanese" | "Chinese" | "English";
export type SpeakingMissionLocale = "es-419" | "it-IT" | "ja-JP" | "zh-CN" | "en-US";
type SpeakingMissionCode = "es" | "it" | "ja" | "zh" | "en";
export type SpeakingMissionRisk =
  | "medical"
  | "emergency"
  | "financial"
  | "legal"
  | "minor-data"
  | "intimacy";

export interface SpeakingModuleDefinition {
  id: string;
  name: string;
  emoji: string;
  category: SpeakingMissionSpecialty;
  blurb: string;
  userRole: string;
}

export interface SpeakingMissionObjective {
  id: string;
  description: string;
  critical: boolean;
}

export interface SpeakingMission {
  id: string;
  scenarioId: string;
  version: 1;
  title: string;
  summary: string;
  specialty: SpeakingMissionSpecialty;
  moduleId: string;
  moduleName: string;
  moduleEmoji: string;
  learnerRole: string;
  partnerRole: string;
  level: "A1" | "A2";
  quickMinutes: number;
  targetMinutes: number;
  language: SpeakingMissionLanguage;
  locale: SpeakingMissionLocale;
  vocabulary: string[];
  sourcePrompts?: string[];
  coreSection?: CoreSpeakingSection;
  coreOrder?: number;
  objectives: SpeakingMissionObjective[];
  openingLine: string;
  safetyRules: string[];
  riskClass?: SpeakingMissionRisk;
}

export const SPEAKING_LANGUAGES: Array<{
  language: SpeakingMissionLanguage;
  code: SpeakingMissionCode;
  locale: SpeakingMissionLocale;
}> = [
  { language: "Spanish", code: "es", locale: "es-419" },
  { language: "Italian", code: "it", locale: "it-IT" },
  { language: "Japanese", code: "ja", locale: "ja-JP" },
  { language: "Chinese", code: "zh", locale: "zh-CN" },
  { language: "English", code: "en", locale: "en-US" },
];

// NOTE: Full curated missions and opening-line maps restored in follow-up.
// Minimal stub so TypeScript and language picker stay green while Chinese is wired.
const CURATED_SPEAKING_MISSIONS: SpeakingMission[] = [];

const OPENING_LINES: Record<SpeakingMissionLanguage, Record<SpeakingMissionSpecialty, string>> = {
  Spanish: {
    Core: "Hola. ¿En qué puedo ayudarle hoy?",
    Faith: "Hola. Gracias por venir.",
    Medical: "Hola. Gracias por atenderme.",
    Trades: "Buenos días.",
    Service: "Hola. Necesito ayuda.",
    Education: "Hola. Quisiera entender mejor la situación.",
    Agriculture: "Buenos días.",
    Sports: "Entrenador, ¿cuál es el plan?",
    Travel: "Disculpe, necesito ayuda.",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  Italian: {
    Core: "Buongiorno. Come posso aiutarla oggi?",
    Faith: "Buongiorno. Grazie di essere venuto.",
    Medical: "Buongiorno. Grazie per avermi ricevuto.",
    Trades: "Buongiorno.",
    Service: "Buongiorno. Ho bisogno di aiuto.",
    Education: "Buongiorno. Vorrei capire meglio la situazione.",
    Agriculture: "Buongiorno.",
    Sports: "Mister, qual è il piano?",
    Travel: "Mi scusi, ho bisogno di aiuto.",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  Japanese: {
    Core: "こんにちは。今日はどうされましたか。",
    Faith: "こんにちは。来てくださってありがとうございます。",
    Medical: "こんにちは。診ていただきありがとうございます。",
    Trades: "おはようございます。",
    Service: "こんにちは。この件で助けが必要です。",
    Education: "こんにちは。状況をよく理解したいです。",
    Agriculture: "おはようございます。",
    Sports: "コーチ、今日の作戦を教えてください。",
    Travel: "すみません、助けていただけますか。",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  Chinese: {
    Core: "你好。今天有什么可以帮您的？",
    Faith: "你好。谢谢你来。",
    Medical: "你好。谢谢您接待我。",
    Trades: "早上好。",
    Service: "你好。我需要帮忙。",
    Education: "你好。我想更好地了解情况。",
    Agriculture: "早上好。",
    Sports: "教练，计划是什么？",
    Travel: "对不起，我需要帮助。",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  English: {
    Core: "Hello. How can I help you today?",
    Faith: "Hello. Thank you for coming.",
    Medical: "Hello. Thank you for seeing me.",
    Trades: "Good morning.",
    Service: "Hello. I need some help.",
    Education: "Hello. I would like to understand the situation better.",
    Agriculture: "Good morning.",
    Sports: "Coach, what is the plan?",
    Travel: "Excuse me, I need some help.",
    "English for Work": "Hello. Let's practice the English you need for this workplace situation.",
  },
};

function projectTextForLanguage(text: string, language: SpeakingMissionLanguage): string {
  return text
    .replace(/\b(?:Spanish|Italian|Japanese|Portuguese|English|Chinese)-speaking\b/g, `${language}-speaking`)
    .replace(/\bin (?:Spanish|Italian|Japanese|Portuguese|English|Chinese)\b/g, `in ${language}`);
}

function openingLineFor(language: SpeakingMissionLanguage, category: SpeakingMissionSpecialty): string {
  return OPENING_LINES[language][category];
}

function safetyRulesFor(category: SpeakingMissionSpecialty): string[] {
  return ["This is language practice only; do not present the roleplay as professional advice."];
}

function missionFromCoreVerb(
  verb: CoreVerb,
  verbIndex: number,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
): SpeakingMission {
  const stableBase = `core_verb_${verb.id}_${languageCode}`;
  const target = language === "English" ? verb.english.replace(/^to /, "") : (verb.target as Record<string, string>)[language] ?? verb.english;
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: `Verb ${verbIndex + 1}: ${verb.english}`,
    summary: `Build a short everyday exchange around ${target}.`,
    specialty: "Core",
    moduleId: CORE_SPEAKING_MODULE.id,
    moduleName: CORE_SPEAKING_MODULE.name,
    moduleEmoji: CORE_SPEAKING_MODULE.emoji,
    learnerRole: CORE_SPEAKING_MODULE.userRole,
    partnerRole: `${language}-speaking everyday conversation partner`,
    level: verbIndex < 25 ? "A1" : "A2",
    quickMinutes: 5,
    targetMinutes: 8,
    language,
    locale,
    vocabulary: [target],
    coreSection: "Essential verbs",
    coreOrder: verbIndex,
    objectives: [
      { id: `objective_${stableBase}_meaning`, description: `Use ${target} accurately.`, critical: true },
      { id: `objective_${stableBase}_question`, description: "Ask or answer a natural question.", critical: true },
      { id: `objective_${stableBase}_repair`, description: "Clarify if misunderstood.", critical: false },
    ],
    openingLine: openingLineFor(language, "Core"),
    safetyRules: safetyRulesFor("Core"),
  };
}

function missionFromGrammarPattern(
  pattern: CoreGrammarPattern,
  patternIndex: number,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
): SpeakingMission {
  const stableBase = `core_grammar_${pattern.id}_${languageCode}`;
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: `Grammar: ${pattern.name}`,
    summary: pattern.meaning,
    specialty: "Core",
    moduleId: CORE_SPEAKING_MODULE.id,
    moduleName: CORE_SPEAKING_MODULE.name,
    moduleEmoji: CORE_SPEAKING_MODULE.emoji,
    learnerRole: CORE_SPEAKING_MODULE.userRole,
    partnerRole: `${language}-speaking everyday conversation partner`,
    level: pattern.phase === 1 ? "A1" : "A2",
    quickMinutes: 5,
    targetMinutes: 8,
    language,
    locale,
    vocabulary: [pattern.pattern, ...pattern.examples.slice(0, 2)],
    coreSection: "Grammar patterns",
    coreOrder: patternIndex,
    objectives: [
      { id: `objective_${stableBase}_pattern`, description: `Use the pattern ${pattern.pattern}.`, critical: true },
      { id: `objective_${stableBase}_exchange`, description: "Use the pattern in a two-way exchange.", critical: true },
      { id: `objective_${stableBase}_variation`, description: "Create a new example.", critical: false },
    ],
    openingLine: openingLineFor(language, "Core"),
    safetyRules: safetyRulesFor("Core"),
  };
}

function missionFromDailyLivingTopic(
  topic: DailyLivingTopic,
  topicIndex: number,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
  coreSection: CoreSpeakingSection = "Daily living",
): SpeakingMission {
  const stableBase = `core_daily_${topic.id}_${languageCode}`;
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: topic.title,
    summary: topic.objective,
    specialty: "Core",
    moduleId: CORE_SPEAKING_MODULE.id,
    moduleName: CORE_SPEAKING_MODULE.name,
    moduleEmoji: CORE_SPEAKING_MODULE.emoji,
    learnerRole: CORE_SPEAKING_MODULE.userRole,
    partnerRole: topic.partnerRole,
    level: topicIndex < 20 ? "A1" : "A2",
    quickMinutes: 7,
    targetMinutes: 10,
    language,
    locale,
    vocabulary: topic.concepts,
    coreSection,
    coreOrder: topicIndex,
    objectives: [
      { id: `objective_${stableBase}_task`, description: topic.objective, critical: true },
      { id: `objective_${stableBase}_clarify`, description: "Ask for clarification if needed.", critical: false },
      { id: `objective_${stableBase}_close`, description: "Confirm the next step before closing.", critical: true },
    ],
    openingLine: openingLineFor(language, "Core"),
    safetyRules: safetyRulesFor("Core"),
    riskClass: topic.riskClass,
  };
}

export function getCoreGrammarPatterns(language: SpeakingMissionLanguage): CoreGrammarPattern[] {
  const storyPatterns: CoreGrammarPattern[] = getPatternsForLanguage(language).map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    meaning: pattern.meaning,
    pattern: pattern.pattern,
    examples: pattern.examples.map(
      (example) =>
        `${example.target} — ${example.english}${example.breakdown ? `. ${example.breakdown}` : ""}`,
    ),
    phase: pattern.phase,
    hook: pattern.hook,
  }));
  return [...storyPatterns, ...(CORE_GRAMMAR_EXTENSIONS[language] ?? [])];
}

const missionCache = new Map<SpeakingMissionLanguage, SpeakingMission[]>();

function buildSpeakingMissions(language: SpeakingMissionLanguage) {
  const definition = SPEAKING_LANGUAGES.find((entry) => entry.language === language);
  if (!definition) return [];
  const { code, locale } = definition;
  return [
    ...CORE_VERBS.map((verb, verbIndex) =>
      missionFromCoreVerb(verb, verbIndex, language, code, locale),
    ),
    ...getCoreGrammarPatterns(language).map((pattern, patternIndex) =>
      missionFromGrammarPattern(pattern, patternIndex, language, code, locale),
    ),
    ...DAILY_LIVING_TOPICS.map((topic, topicIndex) =>
      missionFromDailyLivingTopic(topic, topicIndex, language, code, locale),
    ),
    ...RELATIONSHIPS_INTIMACY_TOPICS.map((topic, topicIndex) =>
      missionFromDailyLivingTopic(
        topic,
        DAILY_LIVING_TOPICS.length + topicIndex,
        language,
        code,
        locale,
        "Relationships & intimacy",
      ),
    ),
    ...CURATED_SPEAKING_MISSIONS.filter((mission) => mission.language === language),
  ];
}

export function getSpeakingModules(language: SpeakingMissionLanguage, nativeLanguage?: NativeLanguage) {
  return [CORE_SPEAKING_MODULE];
}

export function getSpeakingMissions(language: SpeakingMissionLanguage) {
  const cached = missionCache.get(language);
  if (cached) return cached;
  const missions = buildSpeakingMissions(language);
  missionCache.set(language, missions);
  return missions;
}

export function getAllSpeakingMissions() {
  return SPEAKING_LANGUAGES.flatMap(({ language }) => getSpeakingMissions(language));
}

export function findSpeakingMission(id: string) {
  const code = id.match(/_(es|it|ja|zh|en)_v1$/)?.[1];
  const language = SPEAKING_LANGUAGES.find((entry) => entry.code === code)?.language;
  if (!language) return null;
  return getSpeakingMissions(language).find((m) => m.id === id) ?? null;
}
