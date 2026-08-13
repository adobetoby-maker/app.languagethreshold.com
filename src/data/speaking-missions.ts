export type SpeakingMissionSpecialty = "construction" | "missionary";

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
  learnerRole: string;
  partnerRole: string;
  level: "A1" | "A2";
  quickMinutes: number;
  targetMinutes: number;
  locale: "es-419";
  vocabulary: string[];
  objectives: SpeakingMissionObjective[];
  openingLine: string;
  safetyRules: string[];
}

// Immutable UX-preview projection of the scenarios approved in
// adobetoby-maker/language-threshold at PRD commit fb52c445... .
export const SPEAKING_MISSIONS: SpeakingMission[] = [
  {
    id: "scenario_version_construction_safety_briefing_es_v1",
    scenarioId: "scenario_construction_safety_briefing",
    version: 1,
    title: "Pre-shift safety briefing",
    summary:
      "Give a short PPE briefing, confirm fall protection, and check understanding before work starts.",
    specialty: "construction",
    learnerRole: "Crew lead",
    partnerRole: "Spanish-speaking crew member",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 12,
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
    specialty: "construction",
    learnerRole: "Framing lead",
    partnerRole: "Crew member staging materials",
    level: "A2",
    quickMinutes: 7,
    targetMinutes: 11,
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
    specialty: "construction",
    learnerRole: "Worker reporting a hazard",
    partnerRole: "Site supervisor",
    level: "A2",
    quickMinutes: 8,
    targetMinutes: 12,
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
    specialty: "missionary",
    learnerRole: "Missionary",
    partnerRole: "Interested resident",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
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
    specialty: "missionary",
    learnerRole: "Missionary",
    partnerRole: "Investigator asking sincere questions",
    level: "A2",
    quickMinutes: 9,
    targetMinutes: 15,
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
    specialty: "missionary",
    learnerRole: "Missionary or branch member",
    partnerRole: "Guest considering an invitation",
    level: "A1",
    quickMinutes: 7,
    targetMinutes: 10,
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

export function findSpeakingMission(id: string) {
  return SPEAKING_MISSIONS.find((mission) => mission.id === id) ?? null;
}
