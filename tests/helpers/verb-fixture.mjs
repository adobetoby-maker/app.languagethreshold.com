// Built by TAC — 2026-10-20
// Verb Games compile fixture: 16 verbs, module "roofing", predictable English.
import { readFileSync } from "node:fs";
import { compilePatterns } from "../../src/lib/verb-games/compile.ts";

const CRUSH_LEVELS = JSON.parse(
  readFileSync(new URL("../../src/data/verb-patterns/crush-levels.json", import.meta.url), "utf8"),
);

/** infinitive -> [five forms in PERSONS order, gloss] */
const VERBS = {
  tener: [["tengo", "tienes", "tiene", "tenemos", "tienen"], "to have"],
  venir: [["vengo", "vienes", "viene", "venimos", "vienen"], "to come"],
  salir: [["salgo", "sales", "sale", "salimos", "salen"], "to leave"],
  poner: [["pongo", "pones", "pone", "ponemos", "ponen"], "to put"],
  decir: [["digo", "dices", "dice", "decimos", "dicen"], "to say"],
  hablar: [["hablo", "hablas", "habla", "hablamos", "hablan"], "to speak"],
  comer: [["como", "comes", "come", "comemos", "comen"], "to eat"],
  vivir: [["vivo", "vives", "vive", "vivimos", "viven"], "to live"],
  subir: [["subo", "subes", "sube", "subimos", "suben"], "to climb"],
  pensar: [["pienso", "piensas", "piensa", "pensamos", "piensan"], "to think"],
  sentar: [["siento", "sientas", "sienta", "sentamos", "sientan"], "to seat"],
  sentir: [["siento", "sientes", "siente", "sentimos", "sienten"], "to feel"],
  poder: [["puedo", "puedes", "puede", "podemos", "pueden"], "to be able"],
  jugar: [["juego", "juegas", "juega", "jugamos", "juegan"], "to play"],
  pedir: [["pido", "pides", "pide", "pedimos", "piden"], "to ask for"],
  conocer: [["conozco", "conoces", "conoce", "conocemos", "conocen"], "to know"],
};

const FORM_KEYS = ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"];

/** Lesson examples. tener/venir carry the infinitive, not a form, so they yield no frame. */
const EXAMPLES = {
  subir: { target: "El techador sube la escalera.", native: "The roofer climbs the ladder." },
  tener: { target: "Necesito tener el casco.", native: "I need to have the helmet." },
  venir: { target: "Quiero venir temprano al techo.", native: "I want to come early to the roof." },
  pensar: { target: "Necesito pensar el plan.", native: "I need to think the plan through." },
};

const CORE = ["tener", "venir", "salir", "poner", "decir", "hablar", "comer", "vivir", "pensar", "sentar", "sentir", "poder", "jugar", "pedir", "conocer"];

function morph(full, extra) {
  const form = { full, stem: full, ending: "" };
  if (extra?.irregularType) form.irregular = true;
  if (extra?.notes?.length) form.irregularNote = extra.notes.join(" ");
  return form;
}

/**
 * A dictionary profile. Only the five present-tense `full` strings matter to the compiler;
 * irregularType and notes are carried so tests can prove they are never read.
 */
export function profileOf(forms, extra) {
  const [yo, tu, el, nosotros, ellos] = forms.map((f) => morph(f, extra));
  return {
    stem: "",
    irregularType: extra?.irregularType ?? null,
    phase1: { label: "", hint: "", presentYo: yo, presentTu: tu, presentEl: el },
    phase2: { label: "", hint: "", presentNosotros: nosotros, presentEllos: ellos },
    englishParallel: "",
    clinicalNote: "",
  };
}

function lessonVerb(infinitive) {
  const [forms, gloss] = VERBS[infinitive];
  return {
    infinitive,
    native: gloss,
    forms: Object.fromEntries(FORM_KEYS.map((key, i) => [key, forms[i]])),
    example: EXAMPLES[infinitive] ?? { target: `Hay que ${infinitive}.`, native: "It has to be done." },
  };
}

/**
 * Override keys (exactly five):
 *   extraLessons  LessonVerb[]  appended to the roofing lesson file
 *   profileExtras { [infinitive]: { irregularType?, notes? } }  labels/notes put on that verb's profile
 *   dropProfiles  string[]      removes the profile and moves its forms into a roofing lesson entry
 *   extraProfiles { [infinitive]: [five forms, gloss] }  adds a dictionary profile (no lesson entry)
 *   overrides     the es-overrides.json shape, passed as input.overrides
 */
export function fixtureInput(overrides = {}) {
  const known = new Set(["extraLessons", "profileExtras", "dropProfiles", "extraProfiles", "overrides"]);
  for (const key of Object.keys(overrides)) {
    if (!known.has(key)) throw new Error(`fixtureInput: unknown override key "${key}"`);
  }
  const { extraLessons = [], profileExtras = {}, dropProfiles = [], extraProfiles = {} } = overrides;

  const profiles = {};
  for (const [infinitive, [forms, gloss]] of Object.entries(VERBS)) {
    if (dropProfiles.includes(infinitive)) continue;
    profiles[infinitive] = { ...profileOf(forms, profileExtras[infinitive]), englishParallel: gloss };
  }
  for (const [infinitive, [forms, gloss]] of Object.entries(extraProfiles)) {
    profiles[infinitive] = { ...profileOf(forms), englishParallel: gloss };
  }
  const verbs = ["subir", "tener", "venir", ...dropProfiles].map(lessonVerb);
  verbs.push(...extraLessons);

  return {
    lessonFiles: [{ module: "roofing", lessons: { "l1": { verbs } } }],
    profiles,
    core: CORE.map((infinitive) => ({ infinitive, english: VERBS[infinitive][1] })),
    crushLevels: structuredClone(CRUSH_LEVELS),
    signoff: null,
    ...(overrides.overrides ? { overrides: overrides.overrides } : {}),
  };
}

/** The compiled fixture, sign-off absent (every fixture verb is verified). */
export function miniData() {
  return compilePatterns(fixtureInput()).data;
}
