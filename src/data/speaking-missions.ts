import { MODULES, type AppModule } from "./modules.ts";
import { CURRICULA, type Lesson } from "./curriculum.ts";
import {
  CORE_SPEAKING_MODULE,
  CORE_GRAMMAR_EXTENSIONS,
  CORE_VERBS,
  DAILY_LIVING_TOPICS,
  type CoreSpeakingSection,
  type CoreGrammarPattern,
  type CoreVerb,
  type DailyLivingTopic,
} from "./core-speaking.ts";
import { getPatternsForLanguage } from "./grammar-patterns.ts";

export type SpeakingMissionSpecialty = "Core" | Exclude<AppModule["category"], "English for Work">;
export type SpeakingMissionLanguage = "Spanish" | "Italian" | "Japanese";
export type SpeakingMissionLocale = "es-419" | "it-IT" | "ja-JP";
export type SpeakingMissionRisk =
  | "medical"
  | "emergency"
  | "financial"
  | "legal"
  | "minor-data";

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
  code: "es" | "it" | "ja";
  locale: SpeakingMissionLocale;
}> = [
  { language: "Spanish", code: "es", locale: "es-419" },
  { language: "Italian", code: "it", locale: "it-IT" },
  { language: "Japanese", code: "ja", locale: "ja-JP" },
];

function partnerRoleFor(module: AppModule, language: SpeakingMissionLanguage): string {
  const role = module.aiPersona.match(/^You are (.+?)(?:\.| depending on)/)?.[1];
  return role ?? `${language}-speaking ${module.name.toLowerCase()} conversation partner`;
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
  },
};

function openingLineFor(
  language: SpeakingMissionLanguage,
  category: SpeakingMissionSpecialty,
): string {
  return OPENING_LINES[language][category];
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
    default:
      return base;
  }
}

function dailyLivingOpeningLine(
  topic: DailyLivingTopic,
  language: SpeakingMissionLanguage,
): string {
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
  languageCode: "es" | "it" | "ja",
  locale: SpeakingMissionLocale,
  challenge: string,
  challengeIndex: number,
): SpeakingMission {
  const stableBase = `${module.id}_challenge_${challengeIndex + 1}_${languageCode}`;
  const vocabulary = module.vocabFocus.slice(0, 8);
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: challenge.replace(/[.!?]+$/, ""),
    summary: module.blurb,
    specialty,
    moduleId: module.id,
    moduleName: module.name,
    moduleEmoji: module.emoji,
    learnerRole: module.userRole,
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
        description: challenge,
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
    openingLine: openingLineFor(language, specialty),
    safetyRules: safetyRulesFor(specialty),
  };
}

function missionFromLesson(
  module: AppModule,
  specialty: SpeakingMissionSpecialty,
  language: SpeakingMissionLanguage,
  languageCode: "es" | "it" | "ja",
  locale: SpeakingMissionLocale,
  lesson: Lesson,
): SpeakingMission {
  const stableBase = `${module.id}_lesson_${lesson.n}_${languageCode}`;
  return {
    id: `scenario_version_${stableBase}_v1`,
    scenarioId: `scenario_${stableBase}`,
    version: 1,
    title: `Lesson ${lesson.n}: ${lesson.title}`,
    summary: lesson.objective,
    specialty,
    moduleId: module.id,
    moduleName: module.name,
    moduleEmoji: module.emoji,
    learnerRole: module.userRole,
    partnerRole: partnerRoleFor(module, language),
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 12,
    language,
    locale,
    vocabulary: module.vocabFocus.slice(0, 8),
    sourcePrompts: lesson.steps.map((step) => step.instruction),
    objectives: [
      {
        id: `objective_${stableBase}_lesson`,
        description: lesson.objective,
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
    openingLine: openingLineFor(language, specialty),
    safetyRules: safetyRulesFor(specialty),
  };
}

function missionFromCoreVerb(
  verb: CoreVerb,
  verbIndex: number,
  language: SpeakingMissionLanguage,
  languageCode: "es" | "it" | "ja",
  locale: SpeakingMissionLocale,
): SpeakingMission {
  const stableBase = `core_verb_${verb.id}_${languageCode}`;
  const target = verb.target[language];
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
  languageCode: "es" | "it" | "ja",
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
  languageCode: "es" | "it" | "ja",
  locale: SpeakingMissionLocale,
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
    coreSection: "Daily living",
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

type SpecialtySpeakingModule = AppModule & {
  category: Exclude<AppModule["category"], "English for Work">;
};

function getSpecialtySpeakingModules(language: SpeakingMissionLanguage) {
  return MODULES.filter(
    (module): module is SpecialtySpeakingModule =>
      module.learnDirection !== "en-target" &&
      module.category !== "English for Work" &&
      (!module.languages || module.languages.includes(language)),
  );
}

export function getSpeakingModules(language: SpeakingMissionLanguage): SpeakingModuleDefinition[] {
  return [CORE_SPEAKING_MODULE, ...getSpecialtySpeakingModules(language)];
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
// first-class curated choices without constructing all 4,613 objects at startup.
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
  const code = id.match(/_(es|it|ja)_v1$/)?.[1];
  const language = SPEAKING_LANGUAGES.find((entry) => entry.code === code)?.language;
  if (!language) return null;
  getSpeakingMissions(language);
  return missionIndexCache.get(language)?.get(id) ?? null;
}
