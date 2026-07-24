import type { Language } from "@/state/app-state";

// ─── Types ──────────────────────────────────────────────────────────────────
//
// This is the vocabulary-transfer counterpart to grammar-patterns.ts.
// grammar-patterns.ts teaches formula-style SYNTAX ("Devo + infinitive").
// This file teaches predictable SOUND/SUFFIX SHIFTS between a language the
// learner already knows and the target language — the "cheat codes" that
// let one known suffix unlock hundreds of target-language words at once.

export type CognateFrequency = "ultra" | "high" | "medium";

/** The language the learner is transferring FROM. */
export type CognateSourceLanguage = "English" | "Spanish" | "French" | "Portuguese";

export interface CognateExample {
  source: string; // word in the source language
  target: string; // word in the target language
  gloss: string; // English meaning
}

export interface CognateRule {
  id: string;
  sourceLanguage: CognateSourceLanguage;
  targetLanguage: Language;
  frequency: CognateFrequency;
  sourcePattern: string; // e.g. "-tion"
  targetPattern: string; // e.g. "-zione"
  name: string; // short label, e.g. "Nouns of action/result"
  /** Rough % of common words in this family that transfer cleanly — not a citation, a study heuristic. */
  reliability: number;
  hook: string;
  examples: CognateExample[];
  /** False friends, real exceptions, or "don't over-apply this" warnings. */
  watchOut?: string;
}

export const FREQUENCY_META: Record<
  CognateFrequency,
  { label: string; desc: string }
> = {
  ultra: {
    label: "ULTRA",
    desc: "Extremely reliable and extremely common — learn this one first.",
  },
  high: {
    label: "HIGH",
    desc: "Reliable across a large vocabulary family, small number of exceptions.",
  },
  medium: {
    label: "MEDIUM",
    desc: "Useful but has real exceptions — check before betting on it in writing.",
  },
};

// ─── ENGLISH → ITALIAN ──────────────────────────────────────────────────────
// The "cheat code" list: long/formal English words are disproportionately
// Latinate, and Italian never left Latin — so the transfer rate here is
// unusually high for a non-Romance source language.

const EN_TO_IT: CognateRule[] = [
  {
    id: "en-it-tion",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-tion",
    targetPattern: "-zione",
    name: "Nouns of action / result",
    reliability: 95,
    hook: "The single highest-yield rule in this list. Any English noun ending in -tion has a ~95% chance of a direct Italian cognate.",
    examples: [
      { source: "information", target: "informazione", gloss: "information" },
      { source: "nation", target: "nazione", gloss: "nation" },
      { source: "conversation", target: "conversazione", gloss: "conversation" },
      { source: "reservation", target: "prenotazione", gloss: "reservation" },
      { source: "organization", target: "organizzazione", gloss: "organization" },
      { source: "situation", target: "situazione", gloss: "situation" },
      { source: "education", target: "educazione", gloss: "education/upbringing" },
      { source: "operation", target: "operazione", gloss: "operation" },
    ],
  },
  {
    id: "en-it-ity",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ity",
    targetPattern: "-ità",
    name: "Abstract-quality nouns",
    reliability: 90,
    hook: "-ità is stress-final and always accented in writing (città, not citta) — get the accent right and this is nearly automatic.",
    examples: [
      { source: "ability", target: "abilità", gloss: "ability" },
      { source: "possibility", target: "possibilità", gloss: "possibility" },
      { source: "quality", target: "qualità", gloss: "quality" },
      { source: "university", target: "università", gloss: "university" },
      { source: "community", target: "comunità", gloss: "community" },
      { source: "electricity", target: "elettricità", gloss: "electricity" },
      { source: "identity", target: "identità", gloss: "identity" },
      { source: "curiosity", target: "curiosità", gloss: "curiosity" },
    ],
    watchOut: "Plain -ty (not -ity) is looser: city → città works, but liberty → libertà and difficulty → difficoltà both add or change letters — same target ending, less predictable source shape.",
  },
  {
    id: "en-it-ment",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ment",
    targetPattern: "-mento",
    name: "Nouns from verbs",
    reliability: 90,
    hook: "Turns any verb-derived English noun into its Italian twin — just add the -o.",
    examples: [
      { source: "moment", target: "momento", gloss: "moment" },
      { source: "document", target: "documento", gloss: "document" },
      { source: "movement", target: "movimento", gloss: "movement" },
      { source: "element", target: "elemento", gloss: "element" },
      { source: "instrument", target: "strumento", gloss: "instrument" },
      { source: "argument", target: "argomento", gloss: "argument/topic" },
      { source: "experiment", target: "esperimento", gloss: "experiment" },
    ],
    watchOut: "government is the famous exception — Italian is just governo, the -ment is dropped entirely.",
  },
  {
    id: "en-it-ism",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ism",
    targetPattern: "-ismo",
    name: "Movements / doctrines / conditions",
    reliability: 95,
    hook: "Any '-ism' idea word — political, artistic, medical — carries straight across.",
    examples: [
      { source: "tourism", target: "turismo", gloss: "tourism" },
      { source: "capitalism", target: "capitalismo", gloss: "capitalism" },
      { source: "optimism", target: "ottimismo", gloss: "optimism" },
      { source: "realism", target: "realismo", gloss: "realism" },
      { source: "mechanism", target: "meccanismo", gloss: "mechanism" },
    ],
  },
  {
    id: "en-it-ist",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ist",
    targetPattern: "-ista",
    name: "People — professions / -isms",
    reliability: 90,
    hook: "One of the few Italian nouns that doesn't change form for gender by default (il turista / la turista) — the -ista ending is shared.",
    examples: [
      { source: "artist", target: "artista", gloss: "artist" },
      { source: "dentist", target: "dentista", gloss: "dentist" },
      { source: "tourist", target: "turista", gloss: "tourist" },
      { source: "pianist", target: "pianista", gloss: "pianist" },
      { source: "socialist", target: "socialista", gloss: "socialist" },
    ],
    watchOut: "scientist is the classic trap — Italian is scienziato, not 'scienzista'.",
  },
  {
    id: "en-it-logy",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-logy",
    targetPattern: "-logia",
    name: "Fields of study",
    reliability: 95,
    hook: "Every academic '-ology' field transfers essentially for free.",
    examples: [
      { source: "biology", target: "biologia", gloss: "biology" },
      { source: "geology", target: "geologia", gloss: "geology" },
      { source: "psychology", target: "psicologia", gloss: "psychology" },
      { source: "technology", target: "tecnologia", gloss: "technology" },
      { source: "theology", target: "teologia", gloss: "theology" },
    ],
  },
  {
    id: "en-it-graphy",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-graphy",
    targetPattern: "-grafia",
    name: "Writing / recording / mapping",
    reliability: 95,
    hook: "Same Greek root (graphein, 'to write') in both languages — nearly no exceptions.",
    examples: [
      { source: "photography", target: "fotografia", gloss: "photography" },
      { source: "geography", target: "geografia", gloss: "geography" },
      { source: "biography", target: "biografia", gloss: "biography" },
      { source: "choreography", target: "coreografia", gloss: "choreography" },
    ],
  },
  {
    id: "en-it-al",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-al",
    targetPattern: "-ale",
    name: "Adjectives of category",
    reliability: 90,
    hook: "Just add -e. One of the easiest rules to internalize because the change is so small.",
    examples: [
      { source: "natural", target: "naturale", gloss: "natural" },
      { source: "central", target: "centrale", gloss: "central" },
      { source: "original", target: "originale", gloss: "original" },
      { source: "special", target: "speciale", gloss: "special" },
      { source: "national", target: "nazionale", gloss: "national" },
      { source: "personal", target: "personale", gloss: "personal" },
      { source: "general", target: "generale", gloss: "general" },
    ],
    watchOut: "hospital → ospedale keeps the meaning but reshapes more than the ending — treat it as a related exception, not a clean example.",
  },
  {
    id: "en-it-ic",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ic / -ical",
    targetPattern: "-ico",
    name: "Adjectives of field / style",
    reliability: 85,
    hook: "Both '-ic' and '-ical' collapse to the same Italian ending, so you don't need to guess which English form you're starting from.",
    examples: [
      { source: "historic / historical", target: "storico", gloss: "historic" },
      { source: "economic", target: "economico", gloss: "economic" },
      { source: "fantastic", target: "fantastico", gloss: "fantastic" },
      { source: "romantic", target: "romantico", gloss: "romantic" },
      { source: "scientific", target: "scientifico", gloss: "scientific" },
      { source: "public", target: "pubblico", gloss: "public" },
    ],
  },
  {
    id: "en-it-ary",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ary",
    targetPattern: "-ario",
    name: "Adjectives / role nouns",
    reliability: 80,
    hook: "Covers both adjectives (necessary) and people/objects (secretary, dictionary) with the same ending.",
    examples: [
      { source: "necessary", target: "necessario", gloss: "necessary" },
      { source: "secretary", target: "segretario", gloss: "secretary" },
      { source: "ordinary", target: "ordinario", gloss: "ordinary" },
      { source: "anniversary", target: "anniversario", gloss: "anniversary" },
      { source: "dictionary", target: "dizionario", gloss: "dictionary" },
    ],
    watchOut: "library is a false friend, not a cognate — Italian libreria means bookshop. 'Library' is biblioteca.",
  },
  {
    id: "en-it-ent-ant",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ent / -ant",
    targetPattern: "-ente / -ante",
    name: "Present-participle adjectives",
    reliability: 80,
    hook: "These were originally Latin present participles in both languages — that's why the shape barely moved.",
    examples: [
      { source: "important", target: "importante", gloss: "important" },
      { source: "student", target: "studente", gloss: "student" },
      { source: "president", target: "presidente", gloss: "president" },
      { source: "patient", target: "paziente", gloss: "patient" },
      { source: "elegant", target: "elegante", gloss: "elegant" },
      { source: "intelligent", target: "intelligente", gloss: "intelligent" },
    ],
    watchOut: "restaurant → ristorante keeps the pattern but reorders a syllable — recognizable, not identical.",
  },
  {
    id: "en-it-ive",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ive",
    targetPattern: "-ivo / -iva",
    name: "Descriptive adjectives",
    reliability: 85,
    hook: "Watch the gender agreement — attivo for masculine nouns, attiva for feminine.",
    examples: [
      { source: "active", target: "attivo", gloss: "active" },
      { source: "positive", target: "positivo", gloss: "positive" },
      { source: "creative", target: "creativo", gloss: "creative" },
      { source: "exclusive", target: "esclusivo", gloss: "exclusive" },
      { source: "native", target: "nativo", gloss: "native" },
    ],
  },
  {
    id: "en-it-ance-ence",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ance / -ence",
    targetPattern: "-anza / -enza",
    name: "Abstract-state nouns",
    reliability: 85,
    hook: "influenza is the fun one — the English 'flu' and the grammar pattern 'influence' both trace to the same Italian word.",
    examples: [
      { source: "distance", target: "distanza", gloss: "distance" },
      { source: "importance", target: "importanza", gloss: "importance" },
      { source: "presence", target: "presenza", gloss: "presence" },
      { source: "difference", target: "differenza", gloss: "difference" },
      { source: "patience", target: "pazienza", gloss: "patience" },
      { source: "violence", target: "violenza", gloss: "violence" },
    ],
    watchOut: "insurance doesn't follow this rule — it's assicurazione, built on a different Latin root.",
  },
  {
    id: "en-it-ble",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ble",
    targetPattern: "-bile",
    name: "Possibility adjectives",
    reliability: 85,
    hook: "Add -e after the b and you've built the Italian word.",
    examples: [
      { source: "possible", target: "possibile", gloss: "possible" },
      { source: "terrible", target: "terribile", gloss: "terrible" },
      { source: "visible", target: "visibile", gloss: "visible" },
      { source: "incredible", target: "incredibile", gloss: "incredible" },
      { source: "responsible", target: "responsabile", gloss: "responsible" },
      { source: "flexible", target: "flessibile", gloss: "flexible" },
    ],
    watchOut: "comfortable breaks the rule entirely — Italian is comodo, not a -bile word.",
  },
  {
    id: "en-it-ct",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "-ct",
    targetPattern: "-tto",
    name: "Latin -CT- words",
    reliability: 70,
    hook: "Both languages inherited this from the same Latin participle ending — Italian just doubled the T where English kept the C.",
    examples: [
      { source: "perfect", target: "perfetto", gloss: "perfect" },
      { source: "correct", target: "corretto", gloss: "correct" },
      { source: "direct", target: "diretto", gloss: "direct" },
      { source: "fact", target: "fatto", gloss: "fact / done" },
      { source: "contact", target: "contatto", gloss: "contact" },
      { source: "project", target: "progetto", gloss: "project" },
    ],
  },
  {
    id: "en-it-age",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-age",
    targetPattern: "-aggio",
    name: "Action / result nouns",
    reliability: 80,
    hook: "Both English and Italian borrowed this pattern from French — that's why it feels a little different from the other Latin-direct rules.",
    examples: [
      { source: "voyage", target: "viaggio", gloss: "trip / journey" },
      { source: "village", target: "villaggio", gloss: "village" },
      { source: "passage", target: "passaggio", gloss: "passage" },
      { source: "message", target: "messaggio", gloss: "message" },
      { source: "courage", target: "coraggio", gloss: "courage" },
    ],
    watchOut: "image doesn't fit — Italian immagine is built differently.",
  },
  {
    id: "en-it-ly-mente",
    sourceLanguage: "English",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ly",
    targetPattern: "-mente",
    name: "Adverbs",
    reliability: 95,
    hook: "Once you know the adjective, the adverb is free — same rule Spanish uses (-mente), so this transfers twice over if you already know Spanish adverbs.",
    examples: [
      { source: "naturally", target: "naturalmente", gloss: "naturally" },
      { source: "probably", target: "probabilmente", gloss: "probably" },
      { source: "finally", target: "finalmente", gloss: "finally" },
      { source: "directly", target: "direttamente", gloss: "directly" },
      { source: "completely", target: "completamente", gloss: "completely" },
    ],
  },
];

// ─── SPANISH → ITALIAN ──────────────────────────────────────────────────────
// The closest pair in the app: two sister Romance languages. Rules here fall
// into two families — near-identical suffixes (barely need "converting") and
// deep sound shifts that trace back to how each language treated the same
// Latin consonant clusters differently.

const ES_TO_IT: CognateRule[] = [
  {
    id: "es-it-cion-zione",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ción",
    targetPattern: "-zione",
    name: "Nouns of action / result",
    reliability: 95,
    hook: "Even more reliable than the English version of this rule, because Spanish -ción and Italian -zione are already nearly the same word.",
    examples: [
      { source: "información", target: "informazione", gloss: "information" },
      { source: "nación", target: "nazione", gloss: "nation" },
      { source: "conversación", target: "conversazione", gloss: "conversation" },
      { source: "educación", target: "educazione", gloss: "education" },
      { source: "dirección", target: "direzione", gloss: "direction" },
      { source: "atención", target: "attenzione", gloss: "attention" },
    ],
  },
  {
    id: "es-it-dad-ta",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-dad",
    targetPattern: "-tà",
    name: "Abstract-quality nouns",
    reliability: 90,
    hook: "Spanish keeps the 'd', Italian drops it entirely and stresses the final vowel — città, not 'cidad'.",
    examples: [
      { source: "ciudad", target: "città", gloss: "city" },
      { source: "verdad", target: "verità", gloss: "truth" },
      { source: "edad", target: "età", gloss: "age" },
      { source: "libertad", target: "libertà", gloss: "liberty" },
      { source: "felicidad", target: "felicità", gloss: "happiness" },
      { source: "universidad", target: "università", gloss: "university" },
    ],
    watchOut: "amistad (friendship) breaks the pattern — Italian amicizia is a different root, not '-tà'.",
  },
  {
    id: "es-it-mente",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-mente",
    targetPattern: "-mente",
    name: "Adverbs",
    reliability: 95,
    hook: "Identical suffix in both languages — naturalmente is spelled exactly the same in Spanish and Italian.",
    examples: [
      { source: "rápidamente", target: "rapidamente", gloss: "rapidly" },
      { source: "fácilmente", target: "facilmente", gloss: "easily" },
      { source: "naturalmente", target: "naturalmente", gloss: "naturally" },
      { source: "probablemente", target: "probabilmente", gloss: "probably" },
    ],
  },
  {
    id: "es-it-oso",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-oso / -osa",
    targetPattern: "-oso / -osa",
    name: "Adjectives of quality",
    reliability: 90,
    hook: "Often the exact same word — famoso is famoso in both languages.",
    examples: [
      { source: "famoso", target: "famoso", gloss: "famous" },
      { source: "delicioso", target: "delizioso", gloss: "delicious" },
      { source: "peligroso", target: "pericoloso", gloss: "dangerous" },
      { source: "curioso", target: "curioso", gloss: "curious" },
    ],
  },
  {
    id: "es-it-ista",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ista",
    targetPattern: "-ista",
    name: "People — professions / -isms",
    reliability: 95,
    hook: "No conversion needed at all — this suffix is shared letter-for-letter.",
    examples: [
      { source: "artista", target: "artista", gloss: "artist" },
      { source: "turista", target: "turista", gloss: "tourist" },
      { source: "dentista", target: "dentista", gloss: "dentist" },
    ],
  },
  {
    id: "es-it-ct-ch-tt",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ch- (from Latin -CT-)",
    targetPattern: "-tt-",
    name: "Latin -CT- words",
    reliability: 85,
    hook: "Spanish and Italian both simplified the Latin consonant cluster -CT-, but in opposite directions — Spanish softened it to 'ch,' Italian doubled it to 'tt.' Once you see the pattern, dozens of everyday words unlock at once.",
    examples: [
      { source: "noche", target: "notte", gloss: "night" },
      { source: "leche", target: "latte", gloss: "milk" },
      { source: "ocho", target: "otto", gloss: "eight" },
      { source: "hecho", target: "fatto", gloss: "done / fact" },
      { source: "dicho", target: "detto", gloss: "said" },
      { source: "pecho", target: "petto", gloss: "chest" },
      { source: "techo", target: "tetto", gloss: "roof" },
      { source: "derecho", target: "diritto", gloss: "right / straight" },
    ],
  },
  {
    id: "es-it-ue-uo",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "ue",
    targetPattern: "uo / o",
    name: "Diphthong vs. plain vowel",
    reliability: 65,
    hook: "Spanish diphthongized a short Latin 'o' into 'ue' under stress; Italian mostly didn't. Recognize the pattern, but expect exceptions — it's a strong hint, not a formula.",
    examples: [
      { source: "bueno", target: "buono", gloss: "good" },
      { source: "nuevo", target: "nuovo", gloss: "new" },
      { source: "fuego", target: "fuoco", gloss: "fire" },
      { source: "puerto", target: "porto", gloss: "port" },
    ],
    watchOut: "This one has real exceptions and shifts in unpredictable directions (fuerte → forte drops the diphthong to a plain 'o'). Treat it as pattern recognition, not a mechanical rule.",
  },
  {
    id: "es-it-nasal-palatal",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "ñ",
    targetPattern: "gn or nn",
    name: "The nasal-palatal sound",
    reliability: 55,
    hook: "Correcting a common oversimplification: ñ does NOT map to one predictable Italian spelling. It splits into two families that sound almost identical in speech (gn and nn) — memorize per word rather than guessing.",
    examples: [
      { source: "señor", target: "signore", gloss: "sir / mister" },
      { source: "señora", target: "signora", gloss: "madam" },
      { source: "montaña", target: "montagna", gloss: "mountain" },
      { source: "baño", target: "bagno", gloss: "bathroom" },
      { source: "sueño", target: "sogno", gloss: "dream" },
      { source: "año", target: "anno", gloss: "year" },
      { source: "otoño", target: "autunno", gloss: "autumn" },
    ],
    watchOut: "año/anno and otoño/autunno both use 'nn', while señor/signore, baño/bagno and sueño/sogno all use 'gn' — there is no spelling or position rule that predicts which family a given word falls into.",
  },
  {
    id: "es-it-latin-pl-cluster",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "ll- (from Latin PL-)",
    targetPattern: "pi-",
    name: "Latin PL- words",
    reliability: 75,
    hook: "Rare to see taught explicitly, but genuinely reliable: Latin words starting PL- became LL- in Spanish and PI- in Italian. Four everyday words, one shared ancestor each.",
    examples: [
      { source: "llano", target: "piano", gloss: "flat / plain" },
      { source: "lleno", target: "pieno", gloss: "full" },
      { source: "llorar", target: "piangere", gloss: "to cry" },
      { source: "lluvia", target: "pioggia", gloss: "rain" },
    ],
  },
  {
    id: "es-it-latin-cl-fl-cluster",
    sourceLanguage: "Spanish",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "ll- (from Latin CL- or FL-)",
    targetPattern: "chi- or fi-",
    name: "Latin CL- and FL- words",
    reliability: 70,
    hook: "Same phenomenon as the PL- family above, but two more starting clusters: Latin CL- also became Spanish LL-, and lands as Italian CHI- (not PI-); Latin FL- became Spanish LL- and Italian FI-.",
    examples: [
      { source: "llave", target: "chiave", gloss: "key (from Latin clavis)" },
      { source: "llamar", target: "chiamare", gloss: "to call (from Latin clamare)" },
      { source: "llama", target: "fiamma", gloss: "flame (from Latin flamma)" },
    ],
  },
];

// ─── FRENCH → ITALIAN ───────────────────────────────────────────────────────

const FR_TO_IT: CognateRule[] = [
  {
    id: "fr-it-tion",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-tion",
    targetPattern: "-zione",
    name: "Nouns of action / result",
    reliability: 90,
    hook: "French kept the Latin -tion spelling almost unchanged — same rule as English, same yield.",
    examples: [
      { source: "nation", target: "nazione", gloss: "nation" },
      { source: "information", target: "informazione", gloss: "information" },
      { source: "situation", target: "situazione", gloss: "situation" },
      { source: "éducation", target: "educazione", gloss: "education" },
    ],
  },
  {
    id: "fr-it-te-ta",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-té",
    targetPattern: "-tà",
    name: "Abstract-quality nouns",
    reliability: 90,
    hook: "French dropped the vowel before -té that Spanish and English both kept — just swap the accent direction and you're there.",
    examples: [
      { source: "réalité", target: "realtà", gloss: "reality" },
      { source: "université", target: "università", gloss: "university" },
      { source: "liberté", target: "libertà", gloss: "liberty" },
      { source: "société", target: "società", gloss: "society" },
    ],
  },
  {
    id: "fr-it-eux",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-eux / -euse",
    targetPattern: "-oso / -osa",
    name: "Adjectives of quality",
    reliability: 80,
    hook: "Both languages built this ending from the same Latin -osus — French just diphthongized the vowel.",
    examples: [
      { source: "dangereux", target: "pericoloso", gloss: "dangerous" },
      { source: "délicieux", target: "delizioso", gloss: "delicious" },
      { source: "curieux", target: "curioso", gloss: "curious" },
      { source: "généreux", target: "generoso", gloss: "generous" },
    ],
  },
  {
    id: "fr-it-aire",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-aire",
    targetPattern: "-ario",
    name: "Adjectives / role nouns",
    reliability: 80,
    hook: "Same family as the English -ary and Spanish -ario rules — all three trace to the same Latin ending.",
    examples: [
      { source: "nécessaire", target: "necessario", gloss: "necessary" },
      { source: "dictionnaire", target: "dizionario", gloss: "dictionary" },
      { source: "anniversaire", target: "anniversario", gloss: "anniversary" },
    ],
  },
  {
    id: "fr-it-isme-iste",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-isme / -iste",
    targetPattern: "-ismo / -ista",
    name: "Movements and their people",
    reliability: 90,
    hook: "Both endings shift the same way, together — learn the pair once.",
    examples: [
      { source: "tourisme", target: "turismo", gloss: "tourism" },
      { source: "optimisme", target: "ottimismo", gloss: "optimism" },
      { source: "artiste", target: "artista", gloss: "artist" },
      { source: "dentiste", target: "dentista", gloss: "dentist" },
    ],
  },
  {
    id: "fr-it-ment-adverb",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ment",
    targetPattern: "-mente",
    name: "Adverbs",
    reliability: 90,
    hook: "French adverbs also end -ment (unrelated to the noun-forming English -ment) — this maps directly onto Italian -mente.",
    examples: [
      { source: "naturellement", target: "naturalmente", gloss: "naturally" },
      { source: "facilement", target: "facilmente", gloss: "easily" },
      { source: "rapidement", target: "rapidamente", gloss: "rapidly" },
    ],
  },
  {
    id: "fr-it-circumflex",
    sourceLanguage: "French",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "â / ê / ô",
    targetPattern: "usually keeps the 's' the accent replaced",
    name: "The lost 's' trick",
    reliability: 65,
    hook: "A circumflex in French almost always marks a Latin 's' that French dropped over time. Italian usually kept that 's' — so if a French word has a circumflex, guess that Italian's cognate has an 's' in the same spot.",
    examples: [
      { source: "forêt", target: "foresta", gloss: "forest" },
      { source: "fenêtre", target: "finestra", gloss: "window" },
      { source: "château", target: "castello", gloss: "castle" },
      { source: "hôpital", target: "ospedale", gloss: "hospital" },
    ],
  },
];

// ─── PORTUGUESE → ITALIAN ───────────────────────────────────────────────────

const PT_TO_IT: CognateRule[] = [
  {
    id: "pt-it-cao-zione",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-ção",
    targetPattern: "-zione",
    name: "Nouns of action / result",
    reliability: 95,
    hook: "Same family as the Spanish -ción rule — Portuguese just nasalized the vowel.",
    examples: [
      { source: "informação", target: "informazione", gloss: "information" },
      { source: "nação", target: "nazione", gloss: "nation" },
      { source: "educação", target: "educazione", gloss: "education" },
      { source: "situação", target: "situazione", gloss: "situation" },
    ],
  },
  {
    id: "pt-it-dade-ta",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-dade",
    targetPattern: "-tà",
    name: "Abstract-quality nouns",
    reliability: 90,
    hook: "Same shift as Spanish -dad → -tà, one extra vowel to drop.",
    examples: [
      { source: "cidade", target: "città", gloss: "city" },
      { source: "universidade", target: "università", gloss: "university" },
      { source: "liberdade", target: "libertà", gloss: "liberty" },
      { source: "felicidade", target: "felicità", gloss: "happiness" },
    ],
  },
  {
    id: "pt-it-oso",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-oso / -osa",
    targetPattern: "-oso / -osa",
    name: "Adjectives of quality",
    reliability: 90,
    hook: "Often the identical word — famoso is famoso in both.",
    examples: [
      { source: "famoso", target: "famoso", gloss: "famous" },
      { source: "perigoso", target: "pericoloso", gloss: "dangerous" },
      { source: "delicioso", target: "delizioso", gloss: "delicious" },
    ],
  },
  {
    id: "pt-it-ario",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "high",
    sourcePattern: "-ário",
    targetPattern: "-ario",
    name: "Adjectives / role nouns",
    reliability: 85,
    hook: "Drop the accent, keep everything else.",
    examples: [
      { source: "necessário", target: "necessario", gloss: "necessary" },
      { source: "dicionário", target: "dizionario", gloss: "dictionary" },
      { source: "aniversário", target: "anniversario", gloss: "anniversary" },
    ],
  },
  {
    id: "pt-it-mente",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "ultra",
    sourcePattern: "-mente",
    targetPattern: "-mente",
    name: "Adverbs",
    reliability: 95,
    hook: "Identical suffix — no conversion required.",
    examples: [
      { source: "naturalmente", target: "naturalmente", gloss: "naturally" },
      { source: "facilmente", target: "facilmente", gloss: "easily" },
      { source: "rapidamente", target: "rapidamente", gloss: "rapidly" },
    ],
  },
  {
    id: "pt-it-lh-gli",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "lh",
    targetPattern: "gli",
    name: "The palatal 'l' sound",
    reliability: 60,
    hook: "Portuguese 'lh' and Italian 'gli' are the same sound with different spelling conventions — both from the same Latin root in these two words.",
    examples: [
      { source: "filho", target: "figlio", gloss: "son (from Latin filius)" },
      { source: "mulher", target: "moglie", gloss: "wife (from Latin mulier)" },
    ],
    watchOut: "Doesn't generalize to every 'lh' word — olho (eye) → occhio uses a completely different consonant shift, not 'gli'.",
  },
  {
    id: "pt-it-nh-gn",
    sourceLanguage: "Portuguese",
    targetLanguage: "Italian",
    frequency: "medium",
    sourcePattern: "nh",
    targetPattern: "gn",
    name: "The nasal-palatal sound",
    reliability: 65,
    hook: "More predictable than the Spanish ñ split — Portuguese 'nh' lands on Italian 'gn' more consistently.",
    examples: [
      { source: "sonho", target: "sogno", gloss: "dream" },
      { source: "banho", target: "bagno", gloss: "bath / bathroom" },
    ],
  },
];

// ─── Master export ──────────────────────────────────────────────────────────

export const ALL_COGNATE_RULES: CognateRule[] = [
  ...EN_TO_IT,
  ...ES_TO_IT,
  ...FR_TO_IT,
  ...PT_TO_IT,
];

export function getCognateRulesForSource(source: CognateSourceLanguage): CognateRule[] {
  return ALL_COGNATE_RULES.filter((r) => r.sourceLanguage === source);
}

export function getUltraCognateRules(source: CognateSourceLanguage): CognateRule[] {
  return getCognateRulesForSource(source).filter((r) => r.frequency === "ultra");
}

export const COGNATE_SOURCE_LANGUAGES: CognateSourceLanguage[] = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
];
