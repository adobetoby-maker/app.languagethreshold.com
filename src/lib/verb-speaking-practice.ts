import type { LessonVerb } from "./lesson-content-core.ts";
export const DAILY_VERBS: LessonVerb[] = [
  ["ser", "to be (identity)", ["soy", "eres", "es", "somos", "son"]],
  ["estar", "to be (state/location)", ["estoy", "estás", "está", "estamos", "están"]],
  ["tener", "to have", ["tengo", "tienes", "tiene", "tenemos", "tienen"]],
  ["ir", "to go", ["voy", "vas", "va", "vamos", "van"]],
  ["hacer", "to do / make", ["hago", "haces", "hace", "hacemos", "hacen"]],
  ["poder", "to be able to", ["puedo", "puedes", "puede", "podemos", "pueden"]],
  ["querer", "to want", ["quiero", "quieres", "quiere", "queremos", "quieren"]],
  ["hablar", "to speak", ["hablo", "hablas", "habla", "hablamos", "hablan"]],
  ["comer", "to eat", ["como", "comes", "come", "comemos", "comen"]],
  ["vivir", "to live", ["vivo", "vives", "vive", "vivimos", "viven"]],
].map(([infinitive, native, values]) => {
  const forms = values as string[];
  return {
    infinitive: infinitive as string,
    native: native as string,
    forms: Object.fromEntries(
      ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"].map((p, i) => [p, forms[i]]),
    ),
    example: { target: `${forms[0]}.`, native: native as string },
  };
});
const SPEAKING_COMPLEMENTS: Record<
  string,
  { tail: string; englishTail: string; englishGerund: string; englishParticiple: string }
> = {
  hablar: {
    tail: "con mi equipo",
    englishTail: "with my team",
    englishGerund: "speaking",
    englishParticiple: "spoken",
  },
  comer: {
    tail: "algo",
    englishTail: "something",
    englishGerund: "eating",
    englishParticiple: "eaten",
  },
  vivir: { tail: "aquí", englishTail: "here", englishGerund: "living", englishParticiple: "lived" },
  hacer: {
    tail: "el trabajo",
    englishTail: "the work",
    englishGerund: "doing",
    englishParticiple: "done",
  },
  ir: { tail: "a casa", englishTail: "home", englishGerund: "going", englishParticiple: "gone" },
  leer: {
    tail: "la nota",
    englishTail: "the note",
    englishGerund: "reading",
    englishParticiple: "read",
  },
  escribir: {
    tail: "un mensaje",
    englishTail: "a message",
    englishGerund: "writing",
    englishParticiple: "written",
  },
  abrir: {
    tail: "la puerta",
    englishTail: "the door",
    englishGerund: "opening",
    englishParticiple: "opened",
  },
  ver: {
    tail: "el mapa",
    englishTail: "the map",
    englishGerund: "looking at",
    englishParticiple: "seen",
  },
  poner: {
    tail: "la caja aquí",
    englishTail: "the box here",
    englishGerund: "putting",
    englishParticiple: "put",
  },
};
export const SPEAKING_VERBS = [
  { infinitive: "hablar", en: "speak", gerund: "hablando", participle: "hablado" },
  { infinitive: "comer", en: "eat", gerund: "comiendo", participle: "comido" },
  { infinitive: "vivir", en: "live", gerund: "viviendo", participle: "vivido" },
  { infinitive: "hacer", en: "do", gerund: "haciendo", participle: "hecho" },
  { infinitive: "ir", en: "go", gerund: "yendo", participle: "ido" },
  { infinitive: "leer", en: "read", gerund: "leyendo", participle: "leído" },
  { infinitive: "escribir", en: "write", gerund: "escribiendo", participle: "escrito" },
  { infinitive: "abrir", en: "open", gerund: "abriendo", participle: "abierto" },
  { infinitive: "ver", en: "see", gerund: "viendo", participle: "visto" },
  { infinitive: "poner", en: "put", gerund: "poniendo", participle: "puesto" },
].map((v) => ({ ...v, ...SPEAKING_COMPLEMENTS[v.infinitive] }));
export type SpeakingForm = "infinitive" | "gerund" | "participle";
export interface SpeakingPattern {
  id: string;
  frame: string;
  label: string;
  meaning: string;
  form: SpeakingForm;
  note: string;
  example: string;
  translation: string;
}
export const SPEAKING_PATTERNS: SpeakingPattern[] = [
  {
    id: "tener-que",
    frame: "Tengo que",
    label: "tener que + infinitive",
    meaning: "I have to…",
    form: "infinitive",
    note: "Conjugate tener. The next verb stays in its dictionary form: tengo que, tienes que, tenemos que.",
    example: "Tengo que trabajar hoy.",
    translation: "I have to work today.",
  },
  {
    id: "ir-a",
    frame: "Voy a",
    label: "ir a + infinitive",
    meaning: "I am going to…",
    form: "infinitive",
    note: "Conjugate ir: voy, vas, va, vamos, van. Keep a before the infinitive.",
    example: "Voy a comer después.",
    translation: "I am going to eat later.",
  },
  {
    id: "poder",
    frame: "Puedo",
    label: "poder + infinitive",
    meaning: "I can…",
    form: "infinitive",
    note: "Puedo, puedes and puede change o to ue; podemos keeps o. The second verb stays unchanged.",
    example: "Puedo ayudar.",
    translation: "I can help.",
  },
  {
    id: "querer",
    frame: "Quiero",
    label: "querer + infinitive",
    meaning: "I want to…",
    form: "infinitive",
    note: "Quiero and quieres change e to ie; queremos keeps e. Use an infinitive directly after querer.",
    example: "Quiero aprender español.",
    translation: "I want to learn Spanish.",
  },
  {
    id: "necesitar",
    frame: "Necesito",
    label: "necesitar + infinitive",
    meaning: "I need to…",
    form: "infinitive",
    note: "Necesitar is regular. You can reuse necesito with many dictionary-form verbs.",
    example: "Necesito escribir una nota.",
    translation: "I need to write a note.",
  },
  {
    id: "hay-que",
    frame: "Hay que",
    label: "hay que + infinitive",
    meaning: "It is necessary to…",
    form: "infinitive",
    note: "Hay que expresses a general need, without naming who must do it. Tengo que makes the obligation personal.",
    example: "Hay que esperar.",
    translation: "It is necessary to wait.",
  },
  {
    id: "acabar-de",
    frame: "Acabo de",
    label: "acabar de + infinitive",
    meaning: "I have just…",
    form: "infinitive",
    note: "Present-tense acabar de describes something just completed. Keep de before the infinitive.",
    example: "Acabo de llegar.",
    translation: "I have just arrived.",
  },
  {
    id: "estar-gerund",
    frame: "Estoy",
    label: "estar + gerund",
    meaning: "I am …ing",
    form: "gerund",
    note: "Conjugate estar; use -ando for regular -ar verbs and -iendo for regular -er/-ir verbs. Learn changes such as leyendo and yendo. Spanish uses this for an action in progress, not every English -ing phrase.",
    example: "Estoy leyendo un libro.",
    translation: "I am reading a book.",
  },
  {
    id: "seguir-gerund",
    frame: "Sigo",
    label: "seguir + gerund",
    meaning: "I keep …ing",
    form: "gerund",
    note: "Sigo + gerund means continuing an action. Seguimos retains e; sigo and sigues change the stem.",
    example: "Sigo aprendiendo.",
    translation: "I keep learning.",
  },
  {
    id: "haber-participle",
    frame: "He",
    label: "haber + past participle",
    meaning: "I have …",
    form: "participle",
    note: "He, has, ha, hemos, han + participle describe completed experience/actions. The participle stays unchanged after haber. Learn irregulars such as hecho, escrito, visto and puesto.",
    example: "He escrito la nota.",
    translation: "I have written the note.",
  },
  {
    id: "para",
    frame: "Para",
    label: "para + infinitive",
    meaning: "In order to…",
    form: "infinitive",
    note: "After para, use the infinitive to express purpose. This is a reusable phrase, not a complete sentence on its own.",
    example: "Estudio para hablar mejor.",
    translation: "I study in order to speak better.",
  },
  {
    id: "despues-de",
    frame: "Después de",
    label: "después de + infinitive",
    meaning: "After …ing",
    form: "infinitive",
    note: "Spanish uses an infinitive after después de, even where English uses an -ing form. Add the rest of the sentence to explain what follows.",
    example: "Después de comer, voy a estudiar.",
    translation: "After eating, I am going to study.",
  },
];
export function speakingAnswer(expected: string, actual: string) {
  return (
    expected
      .normalize("NFC")
      .trim()
      .toLocaleLowerCase()
      .replace(/[.!?]+$/, "") ===
    actual
      .normalize("NFC")
      .trim()
      .toLocaleLowerCase()
      .replace(/[.!?]+$/, "")
  );
}
export function verbHabitDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export const VERB_GOAL_SECONDS = 600;

export function speakingNativeExample(
  pattern: SpeakingPattern,
  verb: (typeof SPEAKING_VERBS)[number],
) {
  if (pattern.id === "acabar-de" && verb.infinitive === "vivir")
    return "I have just experienced an important change.";
  const form =
    pattern.form === "participle" || pattern.id === "acabar-de" ? verb.englishParticiple : verb.en;
  return (
    pattern.meaning.replace("…ing", verb.englishGerund).replace("…", form) +
    " " +
    verb.englishTail +
    "."
  );
}

export function speakingTail(pattern: SpeakingPattern, verb: (typeof SPEAKING_VERBS)[number]) {
  return pattern.id === "acabar-de" && verb.infinitive === "vivir"
    ? "un cambio importante"
    : verb.tail;
}
