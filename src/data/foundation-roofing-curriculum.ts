// Built by TAC — 2026-10-18
// The free Foundation in front of the Roofing Core 30: ten short beginner lessons (F1–F10)
// that every Core 30 lesson assumes. Job-neutral grammar, taught with roofing words so a true
// beginner can follow the first Roofing lesson. Same lesson page as Core 30 (passage, words,
// verbs, speaking mission); passages and verbs live in public/lesson-content/es/foundation-roofing.json.
// Content is unreviewed until a native-speaker reviewer signs it.

import type { Lesson, LessonWord } from "./curriculum.ts";
import { r, sp, wm } from "./curriculum-helpers.ts";

export const FOUNDATION_ROOFING_MODULE_ID = "foundation-roofing";

type Unit = {
  title: string;
  objective: string;
  focus: string;
  words: LessonWord[];
  speaking: string;
};

const t = (es: string, en: string, note?: string): LessonWord =>
  note ? { es, en, kind: "term", note } : { es, en, kind: "term" };
const p = (es: string, en: string, note?: string): LessonWord =>
  note ? { es, en, kind: "phrase", note } : { es, en, kind: "phrase" };

const units: Unit[] = [
  {
    title: "Sounds and Greetings",
    objective: "Say Spanish vowels and the sounds English speakers miss, and greet the crew",
    focus: "the five vowels, ch, j, ll, rr and the written accent",
    words: [
      t("el techo", "the roof", "ch as in 'church'"),
      t("la teja", "the shingle (also roof tile)", "j is a breathy h"),
      t("el clavo", "the nail", "a and o stay short and pure"),
      t("el martillo", "the hammer", "ll sounds like the y in 'yes'"),
      t("la escalera", "the ladder", "single r is a quick tap"),
      t("la carretilla", "the wheelbarrow", "rr is rolled"),
      t("el arnés", "the harness", "the accent marks the stressed syllable"),
      t("la cuerda", "the rope", "c before u sounds like k"),
      p("Buenos días.", "Good morning."),
      p("¿Cómo se dice…?", "How do you say…?"),
      p("Más despacio, por favor.", "Slower, please."),
      p("Repita, por favor.", "Please repeat."),
    ],
    speaking: "Greet a roofing crew member, say your name, and ask how to say two tools in Spanish.",
  },
  {
    title: "Numbers, Time and Measurements",
    objective: "Count, tell time, and give measurements and quantities on the job",
    focus: "numbers 0 to 1,000, clock time, feet, inches and pounds",
    words: [
      t("el número", "the number"),
      t("la hora", "the hour, the time"),
      t("el pie", "the foot (measurement)"),
      t("la pulgada", "the inch"),
      t("la libra", "the pound"),
      t("el bulto", "the bundle", "a bundle of shingles"),
      t("el metro", "the meter"),
      t("el minuto", "the minute"),
      p("¿Cuántos bultos?", "How many bundles?"),
      p("Son las siete.", "It's seven o'clock."),
      p("Mide diez pies.", "It measures ten feet."),
      p("Empezamos a las seis.", "We start at six."),
    ],
    speaking: "Tell the crew lead what time you start, how many bundles you need, and one measurement.",
  },
  {
    title: "Ser and Estar",
    objective: "Use the two verbs for 'to be' to describe people, conditions and safety",
    focus: "ser for what something is, estar for its condition or location",
    words: [
      t("listo", "ready"),
      t("seguro", "safe"),
      t("peligroso", "dangerous"),
      t("mojado", "wet"),
      t("resbaloso", "slippery"),
      t("caliente", "hot"),
      t("frío", "cold"),
      t("el jefe", "the boss"),
      p("El techo está mojado.", "The roof is wet.", "estar: a condition that can change"),
      p("Es peligroso.", "It's dangerous.", "ser: what something is"),
      p("¿Está listo?", "Is it ready?"),
      p("Estoy aquí.", "I'm here.", "estar: location"),
    ],
    speaking: "Describe the roof to a crew member: say whether it is wet, slippery or safe, and who the boss is.",
  },
  {
    title: "Have, There Is, Need and Want",
    objective: "Say what you have, what is there, what you need and what you want",
    focus: "tener, hay, necesitar, querer and 'hay que'",
    words: [
      t("el agua", "the water"),
      t("la herramienta", "the tool"),
      t("los guantes", "the gloves"),
      t("el casco", "the hard hat"),
      t("el material", "the material"),
      t("la basura", "the trash, the debris"),
      t("la lona", "the tarp"),
      t("la escoba", "the broom"),
      p("Hay un problema.", "There's a problem."),
      p("Necesito más clavos.", "I need more nails."),
      p("Tengo sed.", "I'm thirsty.", "Spanish says 'I have thirst'"),
      p("Hay que usar el arnés.", "You have to wear the harness.", "hay que + verb: it is necessary to"),
    ],
    speaking: "Tell the crew lead what you have, what you need, and what is missing on the roof.",
  },
  {
    title: "Go, Do and Can",
    objective: "Talk about plans, actions and what you can do",
    focus: "ir, ir a + verb for plans, hacer, poder",
    words: [
      t("hoy", "today"),
      t("mañana", "tomorrow"),
      t("ahora", "now"),
      t("después", "after, later"),
      t("la obra", "the jobsite"),
      t("el camión", "the truck"),
      t("la casa", "the house"),
      t("temprano", "early"),
      p("Voy a subir.", "I'm going to go up.", "ir a + verb for a plan"),
      p("¿Puede ayudarme?", "Can you help me?"),
      p("Hace calor.", "It's hot (weather).", "weather uses hacer"),
      p("Vamos a empezar.", "Let's start."),
    ],
    speaking: "Explain your plan for today on the jobsite and ask a crew member if they can help you.",
  },
  {
    title: "Present Tense",
    objective: "Say what you and the crew do every day with regular verbs",
    focus: "present tense of -ar, -er and -ir verbs for yo, tú, usted, nosotros, ellos",
    words: [
      t("el trabajo", "the work, the job"),
      t("la mañana", "the morning"),
      t("la tarde", "the afternoon"),
      t("la cuadrilla", "the crew"),
      t("el compañero", "the coworker"),
      t("el día", "the day"),
      t("la semana", "the week"),
      t("el almuerzo", "the lunch"),
      p("Trabajo en techos.", "I work on roofs."),
      p("Subimos a las siete.", "We go up at seven."),
      p("¿Dónde vive usted?", "Where do you live?"),
      p("Limpiamos al final.", "We clean up at the end."),
    ],
    speaking: "Describe a normal workday: when the crew arrives, what you do in the morning and afternoon.",
  },
  {
    title: "Questions",
    objective: "Ask the questions you need on any job",
    focus: "qué, quién, dónde, cuándo, cuánto, cómo, por qué",
    words: [
      t("qué", "what"),
      t("quién", "who"),
      t("dónde", "where"),
      t("cuándo", "when"),
      t("cuánto", "how much, how many"),
      t("cómo", "how"),
      t("por qué", "why", "porque (one word) means 'because'"),
      t("cuál", "which"),
      p("¿Dónde está la escalera?", "Where is the ladder?"),
      p("¿Cuándo llega el material?", "When does the material arrive?"),
      p("¿Quién es el jefe?", "Who is the boss?"),
      p("¿Por qué paramos?", "Why are we stopping?"),
    ],
    speaking: "Ask a new crew lead five questions: where things are, who is in charge, and when you start.",
  },
  {
    title: "No, Never and How Much",
    objective: "Say no, not yet and never, and ask for more or less",
    focus: "no, nunca, nadie, nada, todavía no, más, menos, otro",
    words: [
      t("nunca", "never"),
      t("nadie", "nobody"),
      t("nada", "nothing"),
      t("más", "more"),
      t("menos", "less"),
      t("otro", "another, other", "never 'un otro'"),
      t("todavía", "still, yet"),
      t("un poco", "a little"),
      p("No entiendo.", "I don't understand."),
      p("Todavía no.", "Not yet."),
      p("Nadie sube sin arnés.", "Nobody goes up without a harness."),
      p("Necesito otro bulto.", "I need another bundle."),
    ],
    speaking: "Tell a crew member what is not ready yet, that nobody goes up without a harness, and ask for more material.",
  },
  {
    title: "Polite Requests and Commands",
    objective: "Ask politely and give short, clear instructions",
    focus: "¿Puede…? and usted commands for everyday verbs",
    words: [
      t("por favor", "please"),
      t("gracias", "thank you"),
      t("con permiso", "excuse me (to pass)"),
      t("perdón", "sorry, excuse me"),
      t("cuidado", "careful, watch out"),
      t("espere", "wait", "usted command of esperar"),
      t("venga", "come", "usted command of venir"),
      t("aquí", "here"),
      p("¿Puede pasarme el martillo?", "Can you pass me the hammer?"),
      p("Tenga cuidado.", "Be careful."),
      p("Espere aquí, por favor.", "Wait here, please."),
      p("Traiga la escalera.", "Bring the ladder."),
    ],
    speaking: "Politely ask a crew member for two tools, then give three short instructions to set up the ladder.",
  },
  {
    title: "Words You Already Know and Getting Help",
    objective: "Use Spanish words that look like English and ask for help when you are stuck",
    focus: "cognates (-ción, -dad, -ente) and survival phrases",
    words: [
      t("la emergencia", "the emergency"),
      t("el accidente", "the accident"),
      t("la ambulancia", "the ambulance"),
      t("la construcción", "the construction", "-ción words are usually '-tion'"),
      t("la inspección", "the inspection"),
      t("la protección", "the protection"),
      t("la seguridad", "the safety", "-dad words are usually '-ty'"),
      t("el hospital", "the hospital"),
      p("¿Qué significa…?", "What does … mean?"),
      p("Necesito ayuda.", "I need help."),
      p("Llame al 911.", "Call 911."),
      p("¿Habla inglés?", "Do you speak English?"),
    ],
    speaking: "Report a small accident on the roof, ask for help, and ask what one word means.",
  },
];

export const FOUNDATION_ROOFING_LESSONS: Lesson[] = units.map((unit, index) => ({
  n: index + 1,
  title: unit.title,
  objective: unit.objective,
  words: unit.words,
  steps: [
    r(`Read the ${unit.title} passage. Listen for ${unit.focus}.`, 5),
    wm(`Drill and pronounce: ${unit.words.filter((w) => w.kind === "term").map((w) => w.es).join(", ")}.`, 5),
    sp(unit.speaking, 6),
  ],
}));

/** The grammar or sound focus of each unit, for prompts and the lesson page. */
export const FOUNDATION_ROOFING_FOCUS: Record<number, string> = Object.fromEntries(
  units.map((unit, index) => [index + 1, unit.focus]),
);
