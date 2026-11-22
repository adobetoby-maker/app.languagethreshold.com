import { orCleaningLesson } from "./or-cleaning.ts";
import { placeLesson } from "./place-directions.ts";
import { soundLesson } from "./sound-like-a-native.ts";
import { spanishBasicsLesson } from "./spanish-basics.ts";
import { japaneseBasicsLesson } from "./japanese-basics.ts";
import {
  CATALOG_LIBRARY_MODULE_IDS,
  MODULES,
  moduleSupportsLearningPair,
  type AppModule,
} from "./modules.ts";
import type { NativeLanguage } from "@/state/app-state";
import { authoredCurriculum, getCurriculum, moduleAuthoredPair, type Lesson } from "./curriculum.ts";
import { pendingStageLessonMissionCount, stageCurriculaVersion } from "./core60-stages.ts";
import {
  CORE_SPEAKING_MODULE,
  CORE_GRAMMAR_EXTENSIONS,
  CORE_VERBS,
  DAILY_LIVING_TOPICS,
  RELATIONSHIP_TOPICS,
  type CoreSpeakingSection,
  type CoreGrammarPattern,
  type CoreVerb,
  type DailyLivingTopic,
  type RelationshipGroup,
} from "./core-speaking.ts";
import { isFoundationModule, isMasterModule } from "../lib/core30-plan.ts";
import { lessonObjectiveId } from "../lib/learning-identity.ts";
import { PACKS, packFor } from "./language-packs/registry.ts";
import { appData, type MissionLines } from "./language-packs/app-data.ts";
import { LANGUAGES, nativeLanguageName } from "./languages.ts";
import { packOffersSpeakingMissions } from "../lib/speaking-review.ts";
import { lessonWordForm } from "../lib/speaking-lesson-words.ts";
import { getPatternsForLanguage } from "./grammar-patterns.ts";
import { moduleTeachingSettings } from "./module-teaching.ts";
import type { LessonTeachingSettings } from "../lib/teaching-settings.ts";
import { interestLesson } from "./interests-spanish.ts";
import { militaryLessonPractice } from "./military-practice.ts";

export type SpeakingMissionSpecialty = "Core" | AppModule["category"];
/** A registered language name (SPEAKING_LANGUAGES lists the ones with missions in this build). */
export type SpeakingMissionLanguage = string;
/** A BCP 47 tag: the pack's variety tag (es-419, ja-JP ...). */
export type SpeakingMissionLocale = string;
type SpeakingMissionCode = string;
export type SpeakingMissionRisk =
  "medical" | "emergency" | "financial" | "legal" | "minor-data" | "intimacy";

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
  level: "A1" | "A2" | "B1";
  quickMinutes: number;
  targetMinutes: number;
  language: SpeakingMissionLanguage;
  locale: SpeakingMissionLocale;
  vocabulary: string[];
  sourcePrompts?: string[];
  sourceObjectiveId?: string;
  lessonTeaching?: Pick<LessonTeachingSettings, "stage" | "speaking">;
  coreSection?: CoreSpeakingSection;
  relationshipGroup?: RelationshipGroup;
  coreOrder?: number;
  objectives: SpeakingMissionObjective[];
  openingLine: string;
  safetyRules: string[];
  riskClass?: SpeakingMissionRisk;
  /**
   * Master missions only: the partner introduces ONE realistic, unannounced complication partway
   * through (api.speak.ts adds the instruction). The learner-facing text never mentions it.
   */
  surpriseComplication?: boolean;
}

// Immutable UX-preview projection of the scenarios approved in
// adobetoby-maker/language-threshold at PRD commit fb52c445... .
const CURATED_SPEAKING_MISSIONS: SpeakingMission[] = [
  {
    id: "scenario_version_construction_safety_briefing_es_v1",
    scenarioId: "scenario_construction_safety_briefing",
    version: 1,
    title: "Pre-shift safety briefing",
    summary:
      "Give a short PPE briefing, confirm fall protection, and check understanding before work starts.",
    specialty: "Trades",
    moduleId: "construction-foreman",
    moduleName: "Construction Foreman",
    moduleEmoji: "🏗️",
    learnerRole: "Crew lead",
    partnerRole: "Spanish-speaking crew member",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language: "Spanish",
    locale: "es-419",
    vocabulary: [
      "equipo de protección personal",
      "arnés",
      "protección contra caídas",
      "casco de seguridad",
    ],
    objectives: [
      {
        id: "objective_safety_name_ppe",
        description: "Name the required protective equipment.",
        critical: true,
      },
      {
        id: "objective_safety_explain_fall_protection",
        description: "Explain when the harness or fall protection is required.",
        critical: true,
      },
      {
        id: "objective_safety_confirm_understanding",
        description: "Ask the crew member to confirm the instruction.",
        critical: false,
      },
    ],
    openingLine: "Buenos días. ¿Qué equipo necesito antes de empezar?",
    safetyRules: [
      "Practice workplace language only.",
      "Do not claim regulatory compliance or replace a site safety plan.",
    ],
  },
  {
    id: "scenario_version_construction_materials_measurement_es_v1",
    scenarioId: "scenario_construction_materials_measurement",
    version: 1,
    title: "Materials and measurement check",
    summary:
      "Request framing materials, reference the plan, and repair a misunderstood measurement.",
    specialty: "Trades",
    moduleId: "framer",
    moduleName: "Framer",
    moduleEmoji: "🔨",
    learnerRole: "Framing lead",
    partnerRole: "Crew member staging materials",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 11,
    language: "Spanish",
    locale: "es-419",
    vocabulary: ["poste", "plano de construcción", "trazo"],
    objectives: [
      {
        id: "objective_materials_request_studs",
        description: "Request the correct framing material.",
        critical: true,
      },
      {
        id: "objective_materials_reference_plan",
        description: "Use the plan or layout to clarify placement.",
        critical: true,
      },
      {
        id: "objective_materials_repair_measurement",
        description: "Detect and repair a misunderstood measurement.",
        critical: false,
      },
    ],
    openingLine: "Ya traje los postes. ¿Dónde los pongo y qué medida usamos?",
    safetyRules: [
      "Practice language only.",
      "Do not infer engineering or structural requirements.",
    ],
  },
  {
    id: "scenario_version_construction_hazard_report_es_v1",
    scenarioId: "scenario_construction_hazard_report",
    version: 1,
    title: "Report a job-site hazard",
    summary:
      "Describe a hazard, state the immediate action, and provide the facts needed for an incident report.",
    specialty: "Trades",
    moduleId: "construction-safety",
    moduleName: "Construction Safety",
    moduleEmoji: "🦺",
    learnerRole: "Worker reporting a hazard",
    partnerRole: "Site supervisor",
    level: "A2",
    quickMinutes: 8,
    targetMinutes: 12,
    language: "Spanish",
    locale: "es-419",
    vocabulary: ["peligro", "reporte de incidente", "emergencia", "primeros auxilios"],
    objectives: [
      {
        id: "objective_hazard_describe",
        description: "Describe the hazard and its location.",
        critical: true,
      },
      {
        id: "objective_hazard_immediate_action",
        description: "State the immediate safety or emergency action.",
        critical: true,
      },
      {
        id: "objective_hazard_report_facts",
        description: "Supply the facts needed for the incident report.",
        critical: false,
      },
    ],
    openingLine: "¿Qué pasó? Dígame dónde está el peligro.",
    safetyRules: [
      "Practice reporting language only.",
      "For a real emergency, stop practice and contact local emergency services or the site lead.",
    ],
  },
  {
    id: "scenario_version_missionary_return_appointment_es_v1",
    scenarioId: "scenario_missionary_return_appointment",
    version: 1,
    title: "Door approach and return appointment",
    summary:
      "Introduce the visit respectfully, respond to uncertainty, and arrange a definite return time.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary",
    partnerRole: "Interested resident",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
    language: "Spanish",
    locale: "es-419",
    vocabulary: ["iglesia", "verdad"],
    objectives: [
      {
        id: "objective_door_introduce_purpose",
        description: "Introduce the purpose of the visit without pressure.",
        critical: true,
      },
      {
        id: "objective_door_handle_uncertainty",
        description: "Ask or answer a clarification question respectfully.",
        critical: false,
      },
      {
        id: "objective_door_set_return",
        description: "Confirm a specific day or time to return.",
        critical: true,
      },
    ],
    openingLine: "Hola. Tengo un momento, pero no sé mucho de su iglesia.",
    safetyRules: [
      "Respect refusal immediately.",
      "Do not pressure, threaten, or present doctrine as the model's personal authority.",
    ],
  },
  {
    id: "scenario_version_missionary_restoration_question_es_v1",
    scenarioId: "scenario_missionary_restoration_question",
    version: 1,
    title: "Explain the Restoration",
    summary:
      "Give a concise explanation and respond to a sincere follow-up question in plain Spanish.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary",
    partnerRole: "Investigator asking sincere questions",
    level: "A2",
    quickMinutes: 9,
    targetMinutes: 15,
    language: "Spanish",
    locale: "es-419",
    vocabulary: ["restauración", "profeta", "revelación", "iglesia", "verdad"],
    objectives: [
      {
        id: "objective_restoration_explain",
        description: "Explain restoration using clear, connected meaning.",
        critical: true,
      },
      {
        id: "objective_restoration_answer",
        description: "Respond directly to a sincere follow-up question.",
        critical: true,
      },
      {
        id: "objective_restoration_check_understanding",
        description: "Check what the listener understood.",
        critical: false,
      },
    ],
    openingLine: "He oído la palabra Restauración, pero no entiendo qué significa.",
    safetyRules: [
      "The AI plays an investigator, not a doctrinal authority.",
      "Disengage from hostile religious argument and respect the learner's stated beliefs.",
    ],
  },
  {
    id: "scenario_version_missionary_church_ride_es_v1",
    scenarioId: "scenario_missionary_church_ride",
    version: 1,
    title: "Invite and coordinate a ride",
    summary:
      "Invite someone to church, explain the meeting, and coordinate practical transportation details.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary or branch member",
    partnerRole: "Guest considering an invitation",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
    language: "Spanish",
    locale: "es-419",
    vocabulary: ["Reunión Sacramental", "aventón a la iglesia"],
    objectives: [
      {
        id: "objective_invite_make",
        description: "Make a clear, respectful invitation.",
        critical: true,
      },
      {
        id: "objective_invite_explain_meeting",
        description: "Explain the meeting in simple language.",
        critical: false,
      },
      {
        id: "objective_invite_coordinate_ride",
        description: "Confirm pickup time and place or another transportation plan.",
        critical: true,
      },
    ],
    openingLine: "Tal vez podría ir. ¿A qué hora es y cómo llegaría?",
    safetyRules: [
      "Respect refusal immediately.",
      "Do not collect or expose real addresses in generated examples or telemetry.",
    ],
  },
  {
    id: "scenario_version_construction_safety_briefing_zh_v1",
    scenarioId: "scenario_construction_safety_briefing_zh",
    version: 1,
    title: "Pre-shift safety briefing",
    summary:
      "Give a short PPE briefing, confirm fall protection, and check understanding before work starts.",
    specialty: "Trades",
    moduleId: "construction-foreman",
    moduleName: "Construction Foreman",
    moduleEmoji: "🏗️",
    learnerRole: "Crew lead",
    partnerRole: "Chinese-speaking crew member",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["个人防护装备", "安全带", "防坠落装置", "安全帽"],
    objectives: [
      {
        id: "objective_safety_name_ppe_zh",
        description: "Name the required protective equipment.",
        critical: true,
      },
      {
        id: "objective_safety_explain_fall_protection_zh",
        description: "Explain when the harness or fall protection is required.",
        critical: true,
      },
      {
        id: "objective_safety_confirm_understanding_zh",
        description: "Ask the crew member to confirm the instruction.",
        critical: false,
      },
    ],
    openingLine: "早上好。开始之前我需要什么装备？",
    safetyRules: [
      "Practice workplace language only.",
      "Do not claim regulatory compliance or replace a site safety plan.",
    ],
  },
  {
    id: "scenario_version_construction_materials_measurement_zh_v1",
    scenarioId: "scenario_construction_materials_measurement_zh",
    version: 1,
    title: "Materials and measurement check",
    summary:
      "Request framing materials, reference the plan, and repair a misunderstood measurement.",
    specialty: "Trades",
    moduleId: "framer",
    moduleName: "Framer",
    moduleEmoji: "🔨",
    learnerRole: "Framing lead",
    partnerRole: "Crew member staging materials",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 11,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["立柱", "施工图", "放线"],
    objectives: [
      {
        id: "objective_materials_request_studs_zh",
        description: "Request the correct framing material.",
        critical: true,
      },
      {
        id: "objective_materials_reference_plan_zh",
        description: "Use the plan or layout to clarify placement.",
        critical: true,
      },
      {
        id: "objective_materials_repair_measurement_zh",
        description: "Detect and repair a misunderstood measurement.",
        critical: false,
      },
    ],
    openingLine: "立柱我已经拿来了。放在哪里？用什么尺寸？",
    safetyRules: [
      "Practice language only.",
      "Do not infer engineering or structural requirements.",
    ],
  },
  {
    id: "scenario_version_construction_hazard_report_zh_v1",
    scenarioId: "scenario_construction_hazard_report_zh",
    version: 1,
    title: "Report a job-site hazard",
    summary:
      "Describe a hazard, state the immediate action, and provide the facts needed for an incident report.",
    specialty: "Trades",
    moduleId: "construction-safety",
    moduleName: "Construction Safety",
    moduleEmoji: "🦺",
    learnerRole: "Worker reporting a hazard",
    partnerRole: "Site supervisor",
    level: "A2",
    quickMinutes: 8,
    targetMinutes: 12,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["危险", "事故报告", "紧急情况", "急救"],
    objectives: [
      {
        id: "objective_hazard_describe_zh",
        description: "Describe the hazard and its location.",
        critical: true,
      },
      {
        id: "objective_hazard_immediate_action_zh",
        description: "State the immediate safety or emergency action.",
        critical: true,
      },
      {
        id: "objective_hazard_report_facts_zh",
        description: "Supply the facts needed for the incident report.",
        critical: false,
      },
    ],
    openingLine: "发生什么事了？告诉我危险在哪里。",
    safetyRules: [
      "Practice reporting language only.",
      "For a real emergency, stop practice and contact local emergency services or the site lead.",
    ],
  },
  {
    id: "scenario_version_missionary_return_appointment_zh_v1",
    scenarioId: "scenario_missionary_return_appointment_zh",
    version: 1,
    title: "Door approach and return appointment",
    summary:
      "Introduce the visit respectfully, respond to uncertainty, and arrange a definite return time.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary",
    partnerRole: "Interested resident",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["教堂", "真理"],
    objectives: [
      {
        id: "objective_door_introduce_purpose_zh",
        description: "Introduce the purpose of the visit without pressure.",
        critical: true,
      },
      {
        id: "objective_door_handle_uncertainty_zh",
        description: "Ask or answer a clarification question respectfully.",
        critical: false,
      },
      {
        id: "objective_door_set_return_zh",
        description: "Confirm a specific day or time to return.",
        critical: true,
      },
    ],
    openingLine: "你好。我现在有点时间，不过我不太了解你们的教会。",
    safetyRules: [
      "Respect refusal immediately.",
      "Do not pressure, threaten, or present doctrine as the model's personal authority.",
    ],
  },
  {
    id: "scenario_version_missionary_restoration_question_zh_v1",
    scenarioId: "scenario_missionary_restoration_question_zh",
    version: 1,
    title: "Explain the Restoration",
    summary:
      "Give a concise explanation and respond to a sincere follow-up question in plain Chinese.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary",
    partnerRole: "Investigator asking sincere questions",
    level: "A2",
    quickMinutes: 9,
    targetMinutes: 15,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["福音的恢复", "先知", "启示", "教会", "真理"],
    objectives: [
      {
        id: "objective_restoration_explain_zh",
        description: "Explain restoration using clear, connected meaning.",
        critical: true,
      },
      {
        id: "objective_restoration_answer_zh",
        description: "Respond directly to a sincere follow-up question.",
        critical: true,
      },
      {
        id: "objective_restoration_check_understanding_zh",
        description: "Check what the listener understood.",
        critical: false,
      },
    ],
    openingLine: "我听说过福音的恢复这个词，但不太明白是什么意思。",
    safetyRules: [
      "The AI plays an investigator, not a doctrinal authority.",
      "Disengage from hostile religious argument and respect the learner's stated beliefs.",
    ],
  },
  {
    id: "scenario_version_missionary_church_ride_zh_v1",
    scenarioId: "scenario_missionary_church_ride_zh",
    version: 1,
    title: "Invite and coordinate a ride",
    summary:
      "Invite someone to church, explain the meeting, and coordinate practical transportation details.",
    specialty: "Faith",
    moduleId: "lds-missionary",
    moduleName: "LDS Missionary",
    moduleEmoji: "🕊️",
    learnerRole: "Missionary or branch member",
    partnerRole: "Guest considering an invitation",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
    language: "Chinese",
    locale: "zh-CN",
    vocabulary: ["圣餐聚会", "搭车去教堂"],
    objectives: [
      {
        id: "objective_invite_make_zh",
        description: "Make a clear, respectful invitation.",
        critical: true,
      },
      {
        id: "objective_invite_explain_meeting_zh",
        description: "Explain the meeting in simple language.",
        critical: false,
      },
      {
        id: "objective_invite_coordinate_ride_zh",
        description: "Confirm pickup time and place or another transportation plan.",
        critical: true,
      },
    ],
    openingLine: "也许我可以去。几点开始？我怎么过去？",
    safetyRules: [
      "Respect refusal immediately.",
      "Do not collect or expose real addresses in generated examples or telemetry.",
    ],
  },
];

/** True when `text` quotes words of `language` (quotes, inverted marks or its special letters). */
function quotesLanguageText(text: string, language: string): boolean {
  if (/['‘’"“”«»]/.test(text)) return true;
  const pack = packFor(language);
  const marks = [
    ...(pack?.keyboard.specialCharacters ?? []),
    ...(pack?.typography.invertedPunctuation ? ["¿", "¡"] : []),
  ];
  const lower = text.toLocaleLowerCase();
  return marks.some((mark) => lower.includes(mark.toLocaleLowerCase()));
}

/** "Spanish|Italian|…": every registered language name, for rewriting "in <language>" phrases. */
const LANGUAGE_NAME_PATTERN = PACKS.map((pack) => pack.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

function projectTextForLanguage(text: string, language: SpeakingMissionLanguage): string {
  return text
    .replace(new RegExp(`\\b(?:${LANGUAGE_NAME_PATTERN})-speaking\\b`, "g"), `${language}-speaking`)
    .replace(new RegExp(`\\bin (?:${LANGUAGE_NAME_PATTERN})\\b`, "g"), `in ${language}`)
    .replace(
      new RegExp(`\\bwithout (?:${LANGUAGE_NAME_PATTERN})\\b`, "g"),
      `without switching away from ${language}`,
    );
}

function partnerRoleFor(module: AppModule, language: SpeakingMissionLanguage): string {
  const role = module.aiPersona.match(/^You are (.+?)(?:\.| depending on)/)?.[1];
  return role
    ? projectTextForLanguage(role, language)
    : `${language}-speaking ${module.name.toLowerCase()} conversation partner`;
}



/**
 * The languages Say it missions are offered in: a registered pack that offers speaking missions
 * (speaking-review.ts: status, features.speakingMissions, review sign-off pending is a separate,
 * environment-aware check) AND has authored mission content here. A pack with no content (French,
 * Portuguese ...) is simply not listed, so no screen can reach a table that has no row for it.
 * The mission locale is the pack's own variety tag.
 */
export const SPEAKING_LANGUAGES: Array<{
  language: SpeakingMissionLanguage;
  code: SpeakingMissionCode;
  locale: SpeakingMissionLocale;
}> = LANGUAGES.flatMap((name) => packFor(name) ?? []).flatMap((pack) =>
  // Registry order (LANGUAGES). A language offers missions when its app file carries authored opening lines (app/<code>.json
  // missions) and its pack offers speaking missions in this build.
  appData(pack).missions && packOffersSpeakingMissions(pack)
    ? [{ language: pack.name, code: pack.code, locale: pack.variety.tag }]
    : [],
);

/** The language's authored mission lines (app/<code>.json missions); every listed language has them. */
function missionLines(language: SpeakingMissionLanguage): MissionLines {
  const pack = packFor(language);
  const lines = pack ? appData(pack).missions : null;
  if (!lines) throw new Error(`No authored mission lines for ${language}`);
  return lines;
}

function openingLineFor(
  language: SpeakingMissionLanguage,
  category: SpeakingMissionSpecialty,
): string {
  return missionLines(language).opening[category];
}



function openingLineForModule(
  module: AppModule,
  language: SpeakingMissionLanguage,
  specialty: SpeakingMissionSpecialty,
): string {
  return missionLines(language).travel[module.id] ?? openingLineFor(language, specialty);
}

function riskClassForModule(module: AppModule): SpeakingMissionRisk | undefined {
  if (module.id === "travel-pharmacy-health") return "medical";
  if (module.id === "travel-social-dating") return "intimacy";
  if (module.id === "travel-problems-services") return "legal";
  return undefined;
}

function riskClassForMission(
  module: AppModule,
  sourceText: string,
): SpeakingMissionRisk | undefined {
  const moduleRisk = riskClassForModule(module);
  if (moduleRisk) return moduleRisk;
  const text = sourceText.toLocaleLowerCase();
  if (
    /\bemergency\b|immediate danger|emergency contact|call emergency services|serious accident/.test(
      text,
    )
  ) {
    return "emergency";
  }
  if (
    /\bmedical\b|\bdoctor\b|\bclinic\b|\bhospital\b|\bpharmacy\b|medication|symptom|allerg|injury|headache|dental/.test(
      text,
    )
  ) {
    return "medical";
  }
  if (/\bvisa\b|\bborder\b|\bcustoms\b|passport|\bpolice\b|embassy|immigration|legal/.test(text)) {
    return "legal";
  }
  if (/\bbank\b|\batm\b|blocked card|bank account|cash withdrawal/.test(text)) {
    return "financial";
  }
  if (/childcare|school pickup|student record|minor/.test(text)) return "minor-data";
  return undefined;
}

function safetyRulesForModule(
  module: AppModule,
  specialty: SpeakingMissionSpecialty,
  riskClass: SpeakingMissionRisk | undefined = riskClassForModule(module),
): string[] {
  const base = safetyRulesFor(specialty);
  if (riskClass === "medical") {
    return [
      ...base,
      "Practice communication only. Do not diagnose, prescribe, interpret a dose, or delay real care. End the roleplay if the learner seeks real medical guidance.",
    ];
  }
  if (riskClass === "intimacy") {
    return [
      ...base,
      "Keep the conversation age-appropriate, non-graphic, and focused on respectful communication rather than erotic roleplay. Never sexualize anyone under 18.",
      "Consent must be freely given, specific, and reversible. Respect refusal or uncertainty immediately; never encourage pressure, coercion, or manipulation.",
    ];
  }
  if (riskClass === "legal") {
    return [
      ...base,
      "Do not provide legal advice, predict outcomes, or request real passport, financial, police, or identifying details.",
    ];
  }
  if (riskClass === "emergency") {
    return [
      ...base,
      "This is not an emergency service. If the learner describes a real danger, end practice immediately and direct them to local emergency services.",
    ];
  }
  if (riskClass === "financial") {
    return [
      ...base,
      "Do not request credentials or provide personalized financial advice; use invented account and payment details only.",
    ];
  }
  if (riskClass === "minor-data") {
    return [
      ...base,
      "Use fictional child and family details only; do not request or expose educational, pickup, or contact records.",
    ];
  }
  if (["travel-scooter-car-rental", "travel-roadside-mechanics"].includes(module.id)) {
    return [
      ...base,
      "Practice communication only; do not replace the rental contract, vehicle manual, local traffic law, mechanic, or emergency service.",
    ];
  }
  return base;
}

function safetyRulesFor(category: SpeakingMissionSpecialty): string[] {
  const practiceOnly =
    "This is language practice only; do not present the roleplay as professional advice.";
  switch (category) {
    case "Core":
    case "Core Basics":
      return [
        practiceOnly,
        "Use fictional personal, account, payment, medical, and location details during roleplay.",
      ];
    case "Medical":
      return [
        practiceOnly,
        "Do not diagnose, prescribe, or delay real care; for an emergency, stop practice and contact local emergency services.",
      ];
    case "Trades":
    case "Agriculture":
      return [
        practiceOnly,
        "Do not replace site procedures, equipment instructions, or a qualified safety lead.",
      ];
    case "Sports":
      return [
        practiceOnly,
        "Do not clear an injury or override a qualified coach, athletic trainer, or clinician.",
      ];
    case "Service":
      return [
        practiceOnly,
        "Do not invent legal status, promises, prices, or real customer details.",
      ];
    case "Faith":
      return [
        practiceOnly,
        "Respect refusal and stated beliefs; the AI is a conversation partner, not a religious authority.",
      ];
    case "Education":
      return [practiceOnly, "Use fictional student details and do not expose educational records."];
    case "Travel":
      return [practiceOnly, "Use fictional personal, passport, payment, and location details."];
    case "English for Work":
      return [
        practiceOnly,
        "Use fictional workplace, patient, customer, account, and personnel details during roleplay.",
      ];
  }
}

function safetyRulesForDailyLiving(topic: DailyLivingTopic): string[] {
  const base = safetyRulesFor("Core");
  switch (topic.riskClass) {
    case "medical":
      return [
        ...base,
        "Practice communication only. Do not diagnose, prescribe, interpret a dose, or delay real care. End the roleplay if the learner seeks real medical guidance.",
      ];
    case "emergency":
      return [
        ...base,
        "This is not an emergency service. If the learner describes a real danger, end practice immediately and direct them to local emergency services.",
      ];
    case "financial":
      return [
        ...base,
        "Do not request credentials or provide personalized financial advice; use invented account details only.",
      ];
    case "legal":
      return [
        ...base,
        "Do not provide legal or immigration advice, predict outcomes, or ask for real identifying details.",
      ];
    case "minor-data":
      return [
        ...base,
        "Use fictional child and family details only; do not request or expose educational or pickup records.",
      ];
    case "intimacy":
      return [
        ...base,
        "Keep the conversation age-appropriate, non-graphic, and focused on respectful communication rather than erotic roleplay. Never sexualize anyone under 18.",
        "Consent must be freely given, specific, and reversible. Respect refusal or uncertainty immediately; never encourage pressure, coercion, or manipulation.",
        "Use fictional personal details. Do not provide diagnosis or personalized sexual-health advice; direct real health questions to a qualified clinician.",
      ];
    default:
      return base;
  }
}

function dailyLivingOpeningLine(
  topic: DailyLivingTopic,
  language: SpeakingMissionLanguage,
): string {
  const authored = topic.openingLines?.[language];
  if (authored) return authored;
  const relationshipLine = missionLines(language).relationship[topic.id];
  if (relationshipLine) return relationshipLine;

  const lines = {
    Spanish: {
      caller: "Hola, llamo para hacer una consulta. ¿Con quién hablo?",
      office: "Buenos días. Ha llamado a la oficina. ¿En qué puedo ayudarle?",
      unavailable: "Lo siento, esa persona no está disponible. ¿Quiere dejar un mensaje?",
      voicemail: "Ha llamado fuera del horario de atención. Por favor, deje un mensaje.",
      emergency: "Servicios de emergencia. Dígame qué pasó y dónde está.",
    },
    Italian: {
      caller: "Buongiorno, chiamo per chiedere un'informazione. Con chi parlo?",
      office: "Buongiorno. Ha chiamato l'ufficio. Come posso aiutarla?",
      unavailable: "Mi dispiace, quella persona non è disponibile. Vuole lasciare un messaggio?",
      voicemail: "Ha chiamato fuori dall'orario d'ufficio. Per favore, lasci un messaggio.",
      emergency: "Servizi di emergenza. Mi dica che cosa è successo e dove si trova.",
    },
    Japanese: {
      caller: "もしもし、問い合わせでお電話しました。どちらさまですか。",
      office: "お電話ありがとうございます。どのようなご用件でしょうか。",
      unavailable: "申し訳ありません。ただ今席を外しております。ご伝言を承りましょうか。",
      voicemail: "ただ今、営業時間外です。発信音の後にメッセージをお願いします。",
      emergency: "緊急通報です。何が起きたか、場所はどこか教えてください。",
    },
    Chinese: {
      caller: "您好，我打电话是想咨询一下。请问您是哪位？",
      office: "您好，这里是办公室，请问有什么可以帮您？",
      unavailable: "不好意思，那位现在不在。您要留言吗？",
      voicemail: "您拨打的时间不在营业时间内，请在提示音后留言。",
      emergency: "这里是紧急服务台。请告诉我发生了什么事，您在哪里。",
    },
    English: {
      caller: "Hello, I am calling with a question. Who am I speaking with?",
      office: "Good morning. You have reached the office. How can I help you?",
      unavailable: "I'm sorry, that person is unavailable. Would you like to leave a message?",
      voicemail: "You have called outside business hours. Please leave a message.",
      emergency: "Emergency services. Tell me what happened and where you are.",
    },
  }[language];

  // A language with no authored phone lines uses its Core opening line (never another language's).
  if (!lines) return openingLineFor(language, "Core");
  if (["answer-phone", "wrong-number"].includes(topic.id)) return lines.caller;
  if (topic.id === "take-message") return lines.unavailable;
  if (topic.id === "voicemail") return lines.voicemail;
  if (topic.id === "emergency") return lines.emergency;
  if (
    ["ask-for-person", "make-appointment", "reschedule", "cancel", "confirm-appointment"].includes(
      topic.id,
    )
  ) {
    return lines.office;
  }
  return openingLineFor(language, "Core");
}

function missionFromChallenge(
  module: AppModule,
  specialty: SpeakingMissionSpecialty,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
  challenge: string,
  challengeIndex: number,
): SpeakingMission {
  const stableBase = `${module.id}_challenge_${challengeIndex + 1}_${languageCode}`;
  const vocabulary = module.vocabFocus.slice(0, 8);
  const projectedChallenge = projectTextForLanguage(challenge, language);
  const riskClass = riskClassForMission(module, `${module.blurb} ${challenge}`);
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: projectedChallenge.replace(/[.!?]+$/, ""),
    summary: projectTextForLanguage(module.blurb, language),
    specialty,
    moduleId: module.id,
    moduleName: module.name,
    moduleEmoji: module.emoji,
    learnerRole: projectTextForLanguage(module.userRole, language),
    partnerRole: partnerRoleFor(module, language),
    level: isMasterModule(module.id) ? "B1" : "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language,
    locale,
    vocabulary,
    objectives: [
      {
        id: `objective_${stableBase}_task`,
        description: projectedChallenge,
        critical: true,
      },
      {
        id: `objective_${stableBase}_concepts`,
        description: `Use at least two ${module.name} focus concepts naturally in ${language}.`,
        critical: false,
      },
      {
        id: `objective_${stableBase}_close`,
        description: "Confirm understanding, the decision, or the next practical step.",
        critical: true,
      },
    ],
    openingLine: openingLineForModule(module, language, specialty),
    safetyRules: safetyRulesForModule(module, specialty, riskClass),
    riskClass,
    ...(isMasterModule(module.id) ? { surpriseComplication: true } : {}),
  };
}

const LESSON_MISSION_VOCABULARY_CAP = 12;
// A Master lesson carries up to 16 terms and 8 phrases (24 words); its mission drills every one,
// so the cap must stay at or above that ceiling.
const MASTER_MISSION_VOCABULARY_CAP = 24;

// A lesson that carries its own word list drills those exact words in its mission: terms first,
// then phrases, capped at 12 (24 for a Master lesson). Lesson words exist in two columns only
// (lessonWordForm); a mission in any other language keeps the headwords module.vocabFocus already uses.
function lessonMissionVocabulary(
  module: AppModule,
  lesson: Lesson,
  language: SpeakingMissionLanguage,
): string[] {
  const words = lesson.words;
  if (!words || words.length === 0) return module.vocabFocus.slice(0, 8);
  const ordered = [
    ...words.filter((word) => word.kind === "term"),
    ...words.filter((word) => word.kind !== "term"),
  ];
  const cap = isMasterModule(module.id)
    ? MASTER_MISSION_VOCABULARY_CAP
    : LESSON_MISSION_VOCABULARY_CAP;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of ordered) {
    // A language with no lesson-word column (and a module that names a different authored pair)
    // gets no form here: it never shows the other side as its own words.
    const form = lessonWordForm(module, language, word)?.trim();
    if (!form) continue;
    const key = form.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(form);
    if (out.length >= cap) break;
  }
  return out.length > 0 ? out : module.vocabFocus.slice(0, 8);
}

/** The native language a mission in `language` explains in by default: the pack's native.default. */
export function missionNativeLanguage(language: SpeakingMissionLanguage): NativeLanguage {
  return defaultNativeFor(language);
}

function defaultNativeFor(language: SpeakingMissionLanguage): NativeLanguage {
  const code = packFor(language)?.native.default;
  const native =
    nativeLanguageName(code) ?? nativeLanguageName(packFor(language)?.native.supported[0]);
  // Missions are built only for registered languages; one without a native pairing has none.
  if (!native) throw new Error(`No native language pairing for ${language} missions`);
  return native;
}

function missionFromLesson(
  module: AppModule,
  specialty: SpeakingMissionSpecialty,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
  lesson: Lesson,
  projectedFrom: string | null = null,
): SpeakingMission {
  const stableBase = `${module.id}_lesson_${lesson.n}_${languageCode}`;
  const nativeDefault = defaultNativeFor(language);
  const teaching = moduleTeachingSettings(module.id, lesson.n, language, nativeDefault);
  const cleaning = orCleaningLesson(module.id, lesson.n, language, nativeDefault);
  const interest = interestLesson(module.id, lesson.n, language, nativeDefault);
  const military = language === "English" ? militaryLessonPractice(module.id, lesson.n) : null;
  const basics =
    spanishBasicsLesson(module.id, lesson.n, language, nativeDefault) ??
    japaneseBasicsLesson(module.id, lesson.n, language, nativeDefault);
  const place = placeLesson(module.id, lesson.n, language, nativeDefault);
  const sound = soundLesson(module.id, lesson.n, language, nativeDefault);
  const projectedTitle = projectTextForLanguage(lesson.title, language);
  const projectedObjective = projectTextForLanguage(lesson.objective, language);
  // A scenario projected from another language's lesson keeps only steps that quote none of that
  // language's words (never another language's phrases in this language's mission).
  const projectedSteps = lesson.steps
    .filter((step) => !projectedFrom || !quotesLanguageText(step.instruction, projectedFrom))
    .map((step) => projectTextForLanguage(step.instruction, language));
  const riskClass = riskClassForMission(
    module,
    `${module.blurb} ${lesson.title} ${lesson.objective} ${lesson.steps.map((step) => step.instruction).join(" ")}`,
  );
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: `Lesson ${lesson.n}: ${projectedTitle}`,
    summary: projectedObjective,
    specialty,
    moduleId: module.id,
    moduleName: module.name,
    moduleEmoji: module.emoji,
    learnerRole: projectTextForLanguage(module.userRole, language),
    partnerRole:
      interest?.partnerRole ??
      cleaning?.partnerRole ??
      place?.partnerRole ??
      sound?.partnerRole ??
      basics?.partnerRole ??
      military?.partnerRole ??
      partnerRoleFor(module, language),
    level: interest
      ? interest.stage === "foundation"
        ? "A1"
        : interest.stage === "master"
          ? "B1"
          : "A2"
      : basics &&
          (module.id.includes("spanish-102") ||
            (module.id.includes("spanish-conjugation-patterns") && basics.stage === "master"))
        ? "B1"
        : basics
          ? basics.stage === "foundation"
            ? "A1"
            : "A2"
          : sound?.stage === "foundation"
            ? "A1"
            : military?.stage === "foundation"
              ? "A1"
              : isMasterModule(module.id)
                ? "B1"
                : "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language,
    locale,
    vocabulary: lessonMissionVocabulary(module, lesson, language),
    sourcePrompts: sound
      ? [
          ...projectedSteps,
          sound.coachingFocus,
          "Practise the articulation goal without inventing accuracy from a transcript.",
        ]
      : military
        ? [
            ...projectedSteps,
            ...(lesson.words ?? []).filter((w) => w.note).map((w) => `${w.es}: ${w.note}`),
          ]
        : projectedSteps,
    sourceObjectiveId: lessonObjectiveId(module.id, lesson.n, language, nativeDefault),
    ...(teaching ? { lessonTeaching: { stage: teaching.stage, speaking: teaching.speaking } } : {}),
    objectives: [
      {
        id: `objective_${stableBase}_lesson`,
        description: projectedObjective,
        critical: true,
      },
      {
        id: `objective_${stableBase}_concepts`,
        description: `Use the lesson's essential ${module.name} language naturally in ${language}.`,
        critical: false,
      },
      {
        id: `objective_${stableBase}_close`,
        description: "Confirm understanding, the decision, or the next practical step.",
        critical: true,
      },
    ],
    openingLine:
      interest?.openingLine ??
      cleaning?.openingLine ??
      place?.openingLine ??
      sound?.openingLine ??
      basics?.openingLine ??
      military?.openingLine ??
      openingLineForModule(module, language, specialty),
    safetyRules: safetyRulesForModule(module, specialty, riskClass),
    riskClass,
    ...(isMasterModule(module.id) ? { surpriseComplication: true } : {}),
  };
}

function missionFromCoreVerb(
  verb: CoreVerb,
  verbIndex: number,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
): SpeakingMission {
  const stableBase = `core_verb_${verb.id}_${languageCode}`;
  const englishTargets: Partial<Record<CoreVerb["id"], string>> = {
    "be-identity": "be",
    "be-state": "be",
    can: "can / be able to",
    must: "must / have to",
  };
  const target =
    language === "English"
      ? (englishTargets[verb.id] ?? verb.english.replace(/^to /, ""))
      : (verb.target[language] ?? verb.english);
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: `Verb ${verbIndex + 1}: ${verb.english}`,
    summary: `Build a short everyday exchange around ${target}, one of the highest-use ${language} verbs.`,
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
    sourcePrompts: [
      `Practice the meaning “${verb.english}” using ${target}.`,
      "Use the verb in a statement, a question, and a useful response.",
    ],
    coreSection: "Essential verbs",
    coreOrder: verbIndex,
    objectives: [
      {
        id: `objective_${stableBase}_meaning`,
        description: `Use ${target} accurately in a practical everyday statement.`,
        critical: true,
      },
      {
        id: `objective_${stableBase}_question`,
        description: "Ask or answer a natural question built around the verb.",
        critical: true,
      },
      {
        id: `objective_${stableBase}_repair`,
        description: "Repair or clarify the meaning if the partner misunderstands.",
        critical: false,
      },
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
    summary: pattern.hook ? `${pattern.meaning}. ${pattern.hook}` : pattern.meaning,
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
    sourcePrompts: [...(pattern.hook ? [pattern.hook] : []), ...pattern.examples],
    coreSection: "Grammar patterns",
    coreOrder: patternIndex,
    objectives: [
      {
        id: `objective_${stableBase}_pattern`,
        description: `Use the pattern ${pattern.pattern} to express “${pattern.meaning}.”`,
        critical: true,
      },
      {
        id: `objective_${stableBase}_exchange`,
        description: "Use the pattern naturally in a two-way everyday exchange.",
        critical: true,
      },
      {
        id: `objective_${stableBase}_variation`,
        description: "Create a new example rather than only repeating the model sentence.",
        critical: false,
      },
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
    level: topic.level ?? (topicIndex < 20 ? "A1" : "A2"),
    quickMinutes: 7,
    targetMinutes: 10,
    language,
    locale,
    vocabulary: topic.concepts,
    sourcePrompts: [topic.objective],
    coreSection,
    relationshipGroup: topic.relationshipGroup,
    coreOrder: topicIndex,
    objectives: [
      {
        id: `objective_${stableBase}_task`,
        description: topic.objective,
        critical: true,
      },
      {
        id: `objective_${stableBase}_clarify`,
        description: "Ask for repetition or clarification if an important detail is unclear.",
        critical: false,
      },
      {
        id: `objective_${stableBase}_close`,
        description: "Confirm the result, decision, or next practical step before closing.",
        critical: true,
      },
    ],
    openingLine: dailyLivingOpeningLine(topic, language),
    safetyRules: safetyRulesForDailyLiving(topic),
    riskClass: topic.riskClass,
  };
}

type SpecialtySpeakingModule = AppModule;

function getSpecialtySpeakingModules(
  language: SpeakingMissionLanguage,
  nativeLanguage?: NativeLanguage,
) {
  return MODULES.filter((module): module is SpecialtySpeakingModule =>
    CATALOG_LIBRARY_MODULE_IDS.has(module.id)
      ? false
      : language === "English" && nativeLanguage
      ? moduleSupportsLearningPair(module, language, nativeLanguage)
      : language === "English"
        ? module.learnDirection === "en-target" ||
          (module.learnDirection !== "en-target" &&
            (!module.languages || module.languages.includes(language)))
        : module.learnDirection !== "en-target" &&
          module.category !== "English for Work" &&
          (!module.languages || module.languages.includes(language)),
  );
}

/**
 * The module a Say it mission is listed under in the Speak tab catalog: the base module for a
 * Foundation or Master stage mission ("foundation-electrician" → "electrician"), the mission's own
 * module for every other mission. The mission itself keeps its stage module id, which lesson
 * practice and /api/speak key off.
 */
export function speakingCatalogModuleId(moduleId: string): string {
  return isFoundationModule(moduleId) || isMasterModule(moduleId)
    ? moduleId.replace(/^(foundation|master)-/, "")
    : moduleId;
}

/**
 * How many missions a Speak catalog module card shows: the missions listed under it plus the Say it
 * lesson missions of its Foundation and Master that have not loaded yet (a stage's lessons only
 * become missions once its chunk arrives). The count is the same before and after the chunks load,
 * so opening a card never changes it.
 */
export function speakingCatalogMissionCount(
  missions: readonly Pick<SpeakingMission, "moduleId">[],
  catalogModuleId: string,
  language: SpeakingMissionLanguage,
): number {
  return (
    missions.filter((mission) => speakingCatalogModuleId(mission.moduleId) === catalogModuleId)
      .length + pendingStageLessonMissionCount(catalogModuleId, language)
  );
}

/** "Foundation" / "Master" for a stage mission's module, null for every other mission. */
export function speakingStageName(moduleId: string): "Foundation" | "Master" | null {
  return isFoundationModule(moduleId) ? "Foundation" : isMasterModule(moduleId) ? "Master" : null;
}

/** A mission's title in the catalog: stage missions are prefixed "Foundation · " / "Master · ". */
export function speakingCatalogTitle(mission: Pick<SpeakingMission, "moduleId" | "title">): string {
  const stage = speakingStageName(mission.moduleId);
  return stage ? `${stage} · ${mission.title}` : mission.title;
}

/**
 * The module cards of the Speak tab catalog. A trade's Foundation and Master are not cards of
 * their own: their missions are listed under the base module (speakingCatalogModuleId).
 */
export function getSpeakingModules(
  language: SpeakingMissionLanguage,
  nativeLanguage?: NativeLanguage,
): SpeakingModuleDefinition[] {
  return [
    CORE_SPEAKING_MODULE,
    ...getSpecialtySpeakingModules(language, nativeLanguage)
      .filter((module) => speakingStageName(module.id) === null)
      .map((module) => ({
        id: module.id,
        name: module.name,
        emoji: module.emoji,
        category: module.category,
        blurb: projectTextForLanguage(module.blurb, language),
        userRole: projectTextForLanguage(module.userRole, language),
      })),
  ];
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
  return [...storyPatterns, ...CORE_GRAMMAR_EXTENSIONS[language]];
}

const missionCache = new Map<SpeakingMissionLanguage, SpeakingMission[]>();
const missionIndexCache = new Map<SpeakingMissionLanguage, Map<string, SpeakingMission>>();
// The stage-registry version the caches were built at: a Core 60 stage curriculum that loads
// later (its own chunk) adds that stage's lesson missions on the next lookup.
let missionCacheStageVersion = -1;

function buildSpeakingMissions(language: SpeakingMissionLanguage) {
  const definition = SPEAKING_LANGUAGES.find((entry) => entry.language === language);
  if (!definition) return [];
  const { code, locale } = definition;
  const coreMissions = [
    ...CORE_VERBS.map((verb, verbIndex) =>
      missionFromCoreVerb(verb, verbIndex, language, code, locale),
    ),
    ...getCoreGrammarPatterns(language).map((pattern, patternIndex) =>
      missionFromGrammarPattern(pattern, patternIndex, language, code, locale),
    ),
    ...DAILY_LIVING_TOPICS.map((topic, topicIndex) =>
      missionFromDailyLivingTopic(topic, topicIndex, language, code, locale),
    ),
    ...RELATIONSHIP_TOPICS.map((topic, topicIndex) =>
      missionFromDailyLivingTopic(
        topic,
        DAILY_LIVING_TOPICS.length + topicIndex,
        language,
        code,
        locale,
        "Relationships",
      ),
    ),
  ];
  const specialtyMissions = getSpecialtySpeakingModules(language).flatMap((module) => {
    const challengeMissions = module.challengePrompts.map((challenge, challengeIndex) =>
      missionFromChallenge(
        module,
        module.category,
        language,
        code,
        locale,
        challenge,
        challengeIndex,
      ),
    );
    // getCurriculum includes data-driven Core 60 stages once their curriculum has loaded. A module
    // with no curriculum in this language offers its lesson scenarios projected from its own
    // authored pair (titles and objectives are situations, not language), with every step that
    // quotes the authored language's words removed.
    const own = getCurriculum(module.id, language, defaultNativeFor(language));
    const projectedFrom = own ? null : (moduleAuthoredPair(module.id)?.target ?? null);
    const curriculum = own ?? (projectedFrom ? authoredCurriculum(module.id) : null);
    const lessonMissions = (curriculum?.lessons ?? []).map((lesson) =>
      missionFromLesson(module, module.category, language, code, locale, lesson, projectedFrom),
    );
    return [...challengeMissions, ...lessonMissions];
  });
  return [
    ...coreMissions,
    ...CURATED_SPEAKING_MISSIONS.filter((mission) => mission.language === language),
    ...specialtyMissions,
  ];
}

// Build only the selected language. The six reviewed Spanish missions remain
// first-class curated choices without constructing every language projection at startup.
export function getSpeakingMissions(language: SpeakingMissionLanguage) {
  if (missionCacheStageVersion !== stageCurriculaVersion()) {
    missionCache.clear();
    missionIndexCache.clear();
  }
  const cached = missionCache.get(language);
  if (cached) return cached;
  const missions = buildSpeakingMissions(language);
  // Under Node a stage file is read on first use, inside this build. That does not make another
  // language's finished list stale: a stage module belongs to this language's module set, and any
  // module an earlier language's set shares with it was already read in that earlier build. So the
  // caches are not cleared here; clearing them re-created every other language's missions, and a
  // list or mission handed out earlier stopped being the one the lookup returns (the English
  // Foundations load in the last language's build and used to discard the Spanish list).
  missionCacheStageVersion = stageCurriculaVersion();
  missionCache.set(language, missions);
  missionIndexCache.set(language, new Map(missions.map((mission) => [mission.id, mission])));
  return missions;
}

export function getAllSpeakingMissions() {
  return SPEAKING_LANGUAGES.flatMap(({ language }) => getSpeakingMissions(language));
}

export function findSpeakingMission(id: string) {
  const code = id.match(/_([a-z]{2,3})_v1$/)?.[1];
  const language = SPEAKING_LANGUAGES.find((entry) => entry.code === code)?.language;
  if (!language) return null;
  getSpeakingMissions(language);
  return missionIndexCache.get(language)?.get(id) ?? null;
}
