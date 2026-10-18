import {
  LANDSCAPER_EXPANDED_DRAFTS,
  type LandscaperLessonDraft,
} from "./landscaper-practice-drafts.ts";
import type { LessonWord } from "./curriculum.ts";

// Spanish/English editorial draft. This is language practice, not a site safety plan.
// These drafts require language and trade review before release approval.
export const LANDSCAPER_CREW_MEETING_WORDS: LessonWord[] = [
  { kind: "term", es: "Cuadrilla", en: "Crew" },
  { kind: "term", es: "Reunión", en: "Meeting" },
  { kind: "term", es: "Tarea", en: "Task" },
  { kind: "term", es: "Turno", en: "Shift" },
  { kind: "term", es: "Herramienta", en: "Tool" },
  { kind: "term", es: "Seguridad", en: "Safety" },
  { kind: "term", es: "Equipo de protección personal", en: "Personal protective equipment" },
  { kind: "term", es: "Zona de trabajo", en: "Work area" },
  { kind: "term", es: "Encargado", en: "Person in charge" },
  { kind: "term", es: "Horario", en: "Schedule" },
  { kind: "phrase", es: "Buenos días, cuadrilla.", en: "Good morning, crew." },
  { kind: "phrase", es: "¿Cuál es mi tarea?", en: "What is my task?" },
  { kind: "phrase", es: "Revisen el plan de seguridad.", en: "Review the safety plan." },
  {
    kind: "phrase",
    es: "No entendí. ¿Puede repetirlo?",
    en: "I did not understand. Can you repeat that?",
  },
  { kind: "phrase", es: "Confirmen su zona de trabajo.", en: "Confirm your work area." },
];

export const LANDSCAPER_CREW_MEETING_READING = {
  title: "La reunión de la cuadrilla",
  es: [
    "Buenos días, cuadrilla.",
    "El encargado explica las tareas y el horario del turno.",
    "La reunión es en la zona de trabajo.",
    "Revisen el plan de seguridad y el equipo de protección personal indicado para cada tarea.",
    "Cada persona revisa su herramienta antes de empezar.",
    "Una persona pregunta: ¿Cuál es mi tarea?",
    "Otra persona dice: No entendí. ¿Puede repetirlo?",
    "El encargado repite las instrucciones y dice: Confirmen su zona de trabajo.",
  ],
  en: [
    "Good morning, crew.",
    "The person in charge explains the tasks and the shift schedule.",
    "The meeting is in the work area.",
    "Review the safety plan and the personal protective equipment specified for each task.",
    "Each person checks their tool before starting.",
    "One person asks: What is my task?",
    "Another person says: I did not understand. Can you repeat that?",
    "The person in charge repeats the instructions and says: Confirm your work area.",
  ],
};

/** Public practice only. Source coverage is not human approval. */
export const LANDSCAPER_LESSON_CONTENT: Record<number, LandscaperLessonDraft> = Object.fromEntries(
  [
    {
      n: 1,
      objective:
        "Brief a crew on the day's tasks, schedule and work areas, and ask for clarification.",
      words: LANDSCAPER_CREW_MEETING_WORDS,
      reading: LANDSCAPER_CREW_MEETING_READING,
    },
    ...LANDSCAPER_EXPANDED_DRAFTS,
  ].map((lesson) => [lesson.n, lesson]),
);
