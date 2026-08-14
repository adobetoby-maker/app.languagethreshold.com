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
export type SpeakingMissionLanguage = "Spanish" | "Italian" | "Japanese" | "English";
export type SpeakingMissionLocale = "es-419" | "it-IT" | "ja-JP" | "en-US";
type SpeakingMissionCode = "es" | "it" | "ja" | "en";
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
];

export const SPEAKING_LANGUAGES: Array<{
  language: SpeakingMissionLanguage;
  code: SpeakingMissionCode;
  locale: SpeakingMissionLocale;
}> = [
  { language: "Spanish", code: "es", locale: "es-419" },
  { language: "Italian", code: "it", locale: "it-IT" },
  { language: "Japanese", code: "ja", locale: "ja-JP" },
  { language: "English", code: "en", locale: "en-US" },
];

function projectTextForLanguage(text: string, language: SpeakingMissionLanguage): string {
  return text
    .replace(/\b(?:Spanish|Italian|Japanese|Portuguese|English)-speaking\b/g, `${language}-speaking`)
    .replace(/\bin (?:Spanish|Italian|Japanese|Portuguese|English)\b/g, `in ${language}`)
    .replace(
      /\bwithout (?:Spanish|Italian|Japanese|Portuguese|English)\b/g,
      `without switching away from ${language}`,
    );
}

function partnerRoleFor(module: AppModule, language: SpeakingMissionLanguage): string {
  const role = module.aiPersona.match(/^You are (.+?)(?:\.| depending on)/)?.[1];
  return role
    ? projectTextForLanguage(role, language)
    : `${language}-speaking ${module.name.toLowerCase()} conversation partner`;
}

const OPENING_LINES: Record<SpeakingMissionLanguage, Record<SpeakingMissionSpecialty, string>> = {
  Spanish: {
    Core: "Hola. ¿En qué puedo ayudarle hoy?",
    Faith: "Hola. Gracias por venir. ¿De qué le gustaría hablar conmigo?",
    Medical: "Hola. Gracias por atenderme. ¿Qué necesita saber para ayudarme hoy?",
    Trades: "Buenos días. ¿Qué tenemos que hacer primero en esta situación?",
    Service: "Hola. Necesito ayuda con esta situación. ¿Podemos hablar?",
    Education: "Hola. Quisiera entender mejor la situación. ¿Podemos revisarla juntos?",
    Agriculture: "Buenos días. ¿Cuál es el plan de trabajo y qué necesita que haga?",
    Sports: "Entrenador, ¿cuál es el plan y qué quiere que haga?",
    Travel: "Disculpe, necesito ayuda con esta situación. ¿Qué debo hacer?",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  Italian: {
    Core: "Buongiorno. Come posso aiutarla oggi?",
    Faith: "Buongiorno. Grazie di essere venuto. Di che cosa vorrebbe parlare?",
    Medical: "Buongiorno. Grazie per avermi ricevuto. Che cosa deve sapere per aiutarmi?",
    Trades: "Buongiorno. Che cosa dobbiamo fare per prima cosa in questa situazione?",
    Service: "Buongiorno. Ho bisogno di aiuto con questa situazione. Possiamo parlarne?",
    Education: "Buongiorno. Vorrei capire meglio la situazione. Possiamo esaminarla insieme?",
    Agriculture: "Buongiorno. Qual è il piano di lavoro e che cosa devo fare?",
    Sports: "Mister, qual è il piano e che cosa vuole che faccia?",
    Travel: "Mi scusi, ho bisogno di aiuto. Che cosa devo fare?",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  Japanese: {
    Core: "こんにちは。今日はどうされましたか。",
    Faith: "こんにちは。来てくださってありがとうございます。今日は何について話しましょうか。",
    Medical: "こんにちは。診ていただきありがとうございます。まず何をお伝えすればよいですか。",
    Trades: "おはようございます。この状況では、まず何をすればよいですか。",
    Service: "こんにちは。この件で助けが必要です。少しお話しできますか。",
    Education: "こんにちは。状況をよく理解したいです。一緒に確認していただけますか。",
    Agriculture: "おはようございます。今日の作業計画と、私がすることを教えてください。",
    Sports: "コーチ、今日の作戦と私の役割を教えてください。",
    Travel: "すみません、助けていただけますか。どうすればよいですか。",
    "English for Work": "Hello. What workplace situation would you like to practice?",
  },
  English: {
    Core: "Hello. How can I help you today?",
    Faith: "Hello. Thank you for coming. What would you like to talk about?",
    Medical: "Hello. Thank you for seeing me. What do you need to know first?",
    Trades: "Good morning. What should we do first in this situation?",
    Service: "Hello. I need some help with this situation. Can we talk?",
    Education: "Hello. I would like to understand the situation better. Can we review it together?",
    Agriculture: "Good morning. What is today's work plan, and what do you need me to do?",
    Sports: "Coach, what is the plan, and what do you want me to do?",
    Travel: "Excuse me, I need some help. What should I do?",
    "English for Work": "Hello. Let's practice the English you need for this workplace situation.",
  },
};

function openingLineFor(
  language: SpeakingMissionLanguage,
  category: SpeakingMissionSpecialty,
): string {
  return OPENING_LINES[language][category];
}

const TRAVEL_MODULE_OPENING_LINES: Record<SpeakingMissionLanguage, Record<string, string>> = {
  Spanish: {
    "travel-breakfast": "Buenos días. ¿Qué le gustaría tomar para empezar?",
    "travel-lunch": "Buenas tardes. ¿Quiere ver el menú del día?",
    "travel-dinner": "Buenas noches. ¿Tiene reserva o busca una mesa?",
    "travel-shopping-essentials": "Hola. ¿Qué necesita encontrar y qué talla usa?",
    "travel-daily-life-services": "Buenos días. Dígame qué servicio necesita hoy.",
    "travel-markets-souvenirs": "Hola. Todo esto es de la región. ¿Qué está buscando?",
    "travel-hotels-lodging": "Bienvenido. ¿Tiene una reserva a su nombre?",
    "travel-taxi-rideshare": "Buenas. ¿A dónde vamos y lleva equipaje?",
    "travel-trains-transit": "Buenos días. ¿A dónde necesita viajar?",
    "travel-scooter-car-rental": "Hola. ¿Busca una Vespa, una moto o un coche, y por cuántos días?",
    "travel-roadside-mechanics": "Buenos días. Cuénteme qué hace el vehículo y cuándo empezó.",
    "travel-guides-attractions": "Bienvenidos. Antes de empezar, ¿qué les interesa conocer más?",
    "travel-airport-luggage": "Buenos días. ¿Cuál es su vuelo y en qué puedo ayudarle?",
    "travel-pharmacy-health": "Buenos días. ¿Qué síntomas tiene y desde cuándo?",
    "travel-social-dating": "Hola. Creo que no nos conocemos. ¿Está de visita?",
    "travel-problems-services": "Buenos días. Explíqueme qué pasó y qué necesita primero.",
  },
  Italian: {
    "travel-breakfast": "Buongiorno. Che cosa desidera bere per iniziare?",
    "travel-lunch": "Buongiorno. Vuole vedere il menù del giorno?",
    "travel-dinner": "Buonasera. Ha una prenotazione o cerca un tavolo?",
    "travel-shopping-essentials": "Buongiorno. Che cosa cerca e che taglia porta?",
    "travel-daily-life-services": "Buongiorno. Mi dica di quale servizio ha bisogno oggi.",
    "travel-markets-souvenirs": "Buongiorno. Questi prodotti sono locali. Che cosa cerca?",
    "travel-hotels-lodging": "Benvenuto. Ha una prenotazione a suo nome?",
    "travel-taxi-rideshare": "Buongiorno. Dove andiamo e ha dei bagagli?",
    "travel-trains-transit": "Buongiorno. Dove deve andare?",
    "travel-scooter-car-rental":
      "Buongiorno. Cerca una Vespa, uno scooter o un'auto, e per quanti giorni?",
    "travel-roadside-mechanics": "Buongiorno. Mi descriva che cosa fa il veicolo e da quando.",
    "travel-guides-attractions": "Benvenuti. Prima di iniziare, che cosa vi interessa di più?",
    "travel-airport-luggage": "Buongiorno. Qual è il suo volo e come posso aiutarla?",
    "travel-pharmacy-health": "Buongiorno. Quali sintomi ha e da quanto tempo?",
    "travel-social-dating": "Ciao. Non credo che ci conosciamo. Sei qui in visita?",
    "travel-problems-services":
      "Buongiorno. Mi spieghi che cosa è successo e di cosa ha bisogno subito.",
  },
  Japanese: {
    "travel-breakfast": "おはようございます。まず、お飲み物は何になさいますか。",
    "travel-lunch": "いらっしゃいませ。本日のランチメニューをご覧になりますか。",
    "travel-dinner": "こんばんは。ご予約はございますか。",
    "travel-shopping-essentials": "いらっしゃいませ。何をお探しで、サイズはいくつですか。",
    "travel-daily-life-services": "いらっしゃいませ。今日はどのようなご用件でしょうか。",
    "travel-markets-souvenirs": "いらっしゃいませ。こちらは地元の商品です。何をお探しですか。",
    "travel-hotels-lodging": "ようこそ。ご予約のお名前をお願いします。",
    "travel-taxi-rideshare": "こんにちは。どちらまでですか。お荷物はありますか。",
    "travel-trains-transit": "こんにちは。どちらまで行かれますか。",
    "travel-scooter-car-rental": "いらっしゃいませ。スクーターと車のどちらを、何日間ご希望ですか。",
    "travel-roadside-mechanics": "こんにちは。車の状態と、いつからかを教えてください。",
    "travel-guides-attractions": "ようこそ。始める前に、特に何に興味があるか教えてください。",
    "travel-airport-luggage": "こんにちは。便名と、ご用件を教えてください。",
    "travel-pharmacy-health": "こんにちは。どのような症状が、いつからありますか。",
    "travel-social-dating": "こんにちは。初めまして。旅行で来ているんですか。",
    "travel-problems-services": "こんにちは。何が起きて、まず何が必要か教えてください。",
  },
  English: {
    "travel-breakfast": "Good morning. What would you like to drink first?",
    "travel-lunch": "Good afternoon. Would you like to see today's lunch menu?",
    "travel-dinner": "Good evening. Do you have a reservation, or do you need a table?",
    "travel-shopping-essentials": "Hello. What do you need, and what size do you wear?",
    "travel-daily-life-services": "Good morning. What service do you need today?",
    "travel-markets-souvenirs": "Hello. These are locally made. What are you looking for?",
    "travel-hotels-lodging": "Welcome. Do you have a reservation?",
    "travel-taxi-rideshare": "Hello. Where are you going, and do you have luggage?",
    "travel-trains-transit": "Good morning. Where do you need to travel?",
    "travel-scooter-car-rental": "Hello. Are you looking for a scooter or a car, and for how many days?",
    "travel-roadside-mechanics": "Good morning. Tell me what the vehicle is doing and when it started.",
    "travel-guides-attractions": "Welcome. Before we begin, what are you most interested in?",
    "travel-airport-luggage": "Good morning. What is your flight, and how can I help?",
    "travel-pharmacy-health": "Good morning. What symptoms do you have, and when did they start?",
    "travel-social-dating": "Hi. I don't think we've met. Are you visiting?",
    "travel-problems-services": "Good morning. Tell me what happened and what you need first.",
  },
};

function openingLineForModule(
  module: AppModule,
  language: SpeakingMissionLanguage,
  specialty: SpeakingMissionSpecialty,
): string {
  return TRAVEL_MODULE_OPENING_LINES[language][module.id] ?? openingLineFor(language, specialty);
}

function riskClassForModule(module: AppModule): SpeakingMissionRisk | undefined {
  if (module.id === "travel-pharmacy-health") return "medical";
  if (module.id === "travel-social-dating") return "intimacy";
  if (module.id === "travel-problems-services") return "legal";
  return undefined;
}

function riskClassForMission(module: AppModule, sourceText: string): SpeakingMissionRisk | undefined {
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

const RELATIONSHIP_OPENING_LINES: Record<SpeakingMissionLanguage, Record<string, string>> = {
  Spanish: {
    "dating-interest": "Me caes muy bien. ¿Te gustaría tomar un café conmigo algún día?",
    "relationship-status": "Me gustaría hablar de lo nuestro. ¿Cómo describirías nuestra relación?",
    "affection-appreciation":
      "Quiero decirte que te aprecio mucho. ¿Cómo te sientes cuando te lo digo?",
    "relationship-expectations":
      "Quisiera saber qué esperas de nuestra relación. ¿Podemos hablarlo?",
    "consent-boundaries": "¿Te parece bien si te abrazo? Puedes decirme que no.",
    "safer-intimacy":
      "Antes de tener intimidad, quiero hablar de lo que nos hace sentir seguros y cómodos.",
    "relationship-conflict": "Me dolió lo que pasó, pero quiero escucharte y resolverlo contigo.",
    "end-relationship": "Quiero hablar con honestidad. He decidido terminar nuestra relación.",
  },
  Italian: {
    "dating-interest": "Mi piaci molto. Ti andrebbe di prendere un caffè insieme un giorno?",
    "relationship-status": "Vorrei parlare di noi. Come descriveresti il nostro rapporto?",
    "affection-appreciation": "Voglio dirti che tengo molto a te. Come ti senti quando te lo dico?",
    "relationship-expectations":
      "Vorrei capire che cosa ti aspetti dal nostro rapporto. Possiamo parlarne?",
    "consent-boundaries": "Ti va se ti abbraccio? Puoi dirmi di no.",
    "safer-intimacy":
      "Prima di avere rapporti intimi, vorrei parlare di ciò che ci fa sentire al sicuro e a nostro agio.",
    "relationship-conflict":
      "Quello che è successo mi ha ferito, ma voglio ascoltarti e risolverlo insieme.",
    "end-relationship":
      "Voglio parlarti con sincerità. Ho deciso di concludere la nostra relazione.",
  },
  Japanese: {
    "dating-interest": "もっとあなたのことを知りたいです。今度、一緒にお茶しませんか。",
    "relationship-status":
      "私たちの関係について話したいです。あなたは今の関係をどう考えていますか。",
    "affection-appreciation": "あなたのことをとても大切に思っています。いつもありがとう。",
    "relationship-expectations": "この関係に何を望んでいるか、お互いに話しませんか。",
    "consent-boundaries": "抱きしめてもいいですか。嫌なら、遠慮なく言ってください。",
    "safer-intimacy": "親密な関係になる前に、お互いが安心できることや健康について話したいです。",
    "relationship-conflict":
      "さっきのことで傷つきました。でも、あなたの話を聞いて一緒に解決したいです。",
    "end-relationship": "正直に話したいことがあります。私たちの関係を終わりにしたいです。",
  },
  English: {
    "dating-interest": "I enjoy talking with you. Would you like to get coffee sometime?",
    "relationship-status": "I would like to talk about us. How would you describe our relationship?",
    "affection-appreciation": "I care about you very much, and I appreciate you.",
    "relationship-expectations": "I would like to understand what you expect from our relationship. Can we talk about it?",
    "consent-boundaries": "Would it be okay if I hugged you? You can say no.",
    "safer-intimacy": "Before we become intimate, I would like to talk about what helps both of us feel safe and comfortable.",
    "relationship-conflict": "What happened hurt me, but I want to listen and work through it together.",
    "end-relationship": "I want to be honest with you. I have decided to end our relationship.",
  },
};

function dailyLivingOpeningLine(
  topic: DailyLivingTopic,
  language: SpeakingMissionLanguage,
): string {
  const relationshipLine = RELATIONSHIP_OPENING_LINES[language][topic.id];
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
    English: {
      caller: "Hello, I am calling with a question. Who am I speaking with?",
      office: "Good morning. You have reached the office. How can I help you?",
      unavailable: "I'm sorry, that person is unavailable. Would you like to leave a message?",
      voicemail: "You have called outside business hours. Please leave a message.",
      emergency: "Emergency services. Tell me what happened and where you are.",
    },
  }[language];

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
    level: "A2",
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
  };
}

function missionFromLesson(
  module: AppModule,
  specialty: SpeakingMissionSpecialty,
  language: SpeakingMissionLanguage,
  languageCode: SpeakingMissionCode,
  locale: SpeakingMissionLocale,
  lesson: Lesson,
): SpeakingMission {
  const stableBase = `${module.id}_lesson_${lesson.n}_${languageCode}`;
  const projectedTitle = projectTextForLanguage(lesson.title, language);
  const projectedObjective = projectTextForLanguage(lesson.objective, language);
  const projectedSteps = lesson.steps.map((step) =>
    projectTextForLanguage(step.instruction, language),
  );
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
    partnerRole: partnerRoleFor(module, language),
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language,
    locale,
    vocabulary: module.vocabFocus.slice(0, 8),
    sourcePrompts: projectedSteps,
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
    openingLine: openingLineForModule(module, language, specialty),
    safetyRules: safetyRulesForModule(module, specialty, riskClass),
    riskClass,
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
      : verb.target[language];
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
    level: topicIndex < 20 ? "A1" : "A2",
    quickMinutes: 7,
    targetMinutes: 10,
    language,
    locale,
    vocabulary: topic.concepts,
    sourcePrompts: [topic.objective],
    coreSection,
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
  return MODULES.filter(
    (module): module is SpecialtySpeakingModule =>
      language === "English" && nativeLanguage
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

export function getSpeakingModules(
  language: SpeakingMissionLanguage,
  nativeLanguage?: NativeLanguage,
): SpeakingModuleDefinition[] {
  return [
    CORE_SPEAKING_MODULE,
    ...getSpecialtySpeakingModules(language, nativeLanguage).map((module) => ({
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
    const curriculum = CURRICULA[module.id];
    const lessonMissions = (curriculum?.lessons ?? []).map((lesson) =>
      missionFromLesson(module, module.category, language, code, locale, lesson),
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
  const cached = missionCache.get(language);
  if (cached) return cached;
  const missions = buildSpeakingMissions(language);
  missionCache.set(language, missions);
  missionIndexCache.set(language, new Map(missions.map((mission) => [mission.id, mission])));
  return missions;
}

export function getAllSpeakingMissions() {
  return SPEAKING_LANGUAGES.flatMap(({ language }) => getSpeakingMissions(language));
}

export function findSpeakingMission(id: string) {
  const code = id.match(/_(es|it|ja|en)_v1$/)?.[1];
  const language = SPEAKING_LANGUAGES.find((entry) => entry.code === code)?.language;
  if (!language) return null;
  getSpeakingMissions(language);
  return missionIndexCache.get(language)?.get(id) ?? null;
}
