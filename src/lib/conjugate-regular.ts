/**
 * Deterministic regular-verb conjugator.
 * Covers the bulk of dictionary verbs (ES ~77% -ar, IT -are/-ere/-ire, FR first-group -er).
 * Engines write only the persons a language teaches; withPackPersons fills the rest from the pack.
 * Irregulars live in IRREGULAR_OVERRIDES (conjugation-atlas) and FREQUENCY_CONJUGATIONS.
 */

import { packFor, type LanguagePack } from "../data/language-packs/registry.ts";
import { appData } from "../data/language-packs/app-data.ts";
import { carrierPerson } from "./person-carrier.ts";
import type { ConjugationSet, PersonForms } from "@/data/frequency-conjugations";

function emptyPersons(): PersonForms {
  return {
    firstSingular: "",
    secondSingular: "",
    thirdSingular: "",
    firstPlural: "",
    secondPlural: "",
    thirdPlural: "",
  };
}

/**
 * Five taught persons (no second-person plural). The second-person plural cell is filled from the
 * pack by withPackPersons, or left empty. (The Spanish engine keeps the six persons it has always
 * written, vosotros included: its offline tables are unchanged.)
 */
function mapFive(forms: [string, string, string, string, string]): PersonForms {
  return {
    firstSingular: forms[0],
    secondSingular: forms[1],
    thirdSingular: forms[2],
    firstPlural: forms[3],
    secondPlural: "",
    thirdPlural: forms[4],
  };
}

function mapPersons(
  forms: [string, string, string, string, string, string],
): PersonForms {
  return {
    firstSingular: forms[0],
    secondSingular: forms[1],
    thirdSingular: forms[2],
    firstPlural: forms[3],
    secondPlural: forms[4],
    thirdPlural: forms[5],
  };
}

// ── Spanish ──────────────────────────────────────────────────────────────────

function conjugateSpanish(infinitive: string): ConjugationSet | null {
  const inf = infinitive.toLowerCase().trim();
  let stem: string;
  let ending: string;
  if (inf.endsWith("ar")) {
    stem = inf.slice(0, -2);
    ending = "ar";
  } else if (inf.endsWith("er")) {
    stem = inf.slice(0, -2);
    ending = "er";
  } else if (inf.endsWith("ir")) {
    stem = inf.slice(0, -2);
    ending = "ir";
  } else {
    return null;
  }

  const present =
    ending === "ar"
      ? mapPersons([
          stem + "o",
          stem + "as",
          stem + "a",
          stem + "amos",
          stem + "áis",
          stem + "an",
        ])
      : ending === "er"
        ? mapPersons([
            stem + "o",
            stem + "es",
            stem + "e",
            stem + "emos",
            stem + "éis",
            stem + "en",
          ])
        : mapPersons([
            stem + "o",
            stem + "es",
            stem + "e",
            stem + "imos",
            stem + "ís",
            stem + "en",
          ]);

  // Preterite
  const past =
    ending === "ar"
      ? mapPersons([
          stem + "é",
          stem + "aste",
          stem + "ó",
          stem + "amos",
          stem + "asteis",
          stem + "aron",
        ])
      : mapPersons([
          stem + "í",
          stem + "iste",
          stem + "ió",
          stem + "imos",
          stem + "isteis",
          stem + "ieron",
        ]);

  // Future (stem + infinitive endings)
  const future = mapPersons([
    inf + "é",
    inf + "ás",
    inf + "á",
    inf + "emos",
    inf + "éis",
    inf + "án",
  ]);

  // Conditional
  const conditional = mapPersons([
    inf + "ía",
    inf + "ías",
    inf + "ía",
    inf + "íamos",
    inf + "íais",
    inf + "ían",
  ]);

  const gerund =
    ending === "ar" ? stem + "ando" : stem + (ending === "ir" ? "iendo" : "iendo");
  // Simple orthography: e/i → y before iendo when stem ends in vowel (leer → leyendo)
  let gerundFixed = gerund;
  if ((ending === "er" || ending === "ir") && /[aeiou]$/.test(stem)) {
    gerundFixed = stem + "yendo";
  }

  const pastParticiple =
    ending === "ar" ? stem + "ado" : stem + "ido";

  return {
    infinitive: inf,
    pronunciation: "",
    presentTense: present,
    pastTense: past,
    pastLabel: "",
    futureTense: future,
    conditionalTense: conditional,
    gerund: gerundFixed,
    pastParticiple,
    perfectExample: "he " + pastParticiple,
    commonUses: [],
  };
}

// ── Italian ──────────────────────────────────────────────────────────────────

function conjugateItalian(infinitive: string): ConjugationSet | null {
  const inf = infinitive.toLowerCase().trim();
  let stem: string;
  let ending: "are" | "ere" | "ire" | null = null;
  if (inf.endsWith("are")) {
    stem = inf.slice(0, -3);
    ending = "are";
  } else if (inf.endsWith("ere")) {
    stem = inf.slice(0, -3);
    ending = "ere";
  } else if (inf.endsWith("ire")) {
    stem = inf.slice(0, -3);
    ending = "ire";
  } else {
    return null;
  }

  const present =
    ending === "are"
      ? mapPersons([
          stem + "o",
          stem + "i",
          stem + "a",
          stem + "iamo",
          stem + "ate",
          stem + "ano",
        ])
      : ending === "ere"
        ? mapPersons([
            stem + "o",
            stem + "i",
            stem + "e",
            stem + "iamo",
            stem + "ete",
            stem + "ono",
          ])
        : mapPersons([
            stem + "o",
            stem + "i",
            stem + "e",
            stem + "iamo",
            stem + "ite",
            stem + "ono",
          ]);

  // Imperfect
  const past =
    ending === "are"
      ? mapPersons([
          stem + "avo",
          stem + "avi",
          stem + "ava",
          stem + "avamo",
          stem + "avate",
          stem + "avano",
        ])
      : ending === "ere"
        ? mapPersons([
            stem + "evo",
            stem + "evi",
            stem + "eva",
            stem + "evamo",
            stem + "evate",
            stem + "evano",
          ])
        : mapPersons([
            stem + "ivo",
            stem + "ivi",
            stem + "iva",
            stem + "ivamo",
            stem + "ivate",
            stem + "ivano",
          ]);

  // Future (simplified: drop final e of infinitive for are/ere/ire → stem+erò etc for are; actual Italian is irregular-ish but regular pattern exists)
  // Standard regular future:
  // -are → stem + erò / erai / erà / eremo / erete / eranno
  // -ere / -ire → stem + erò ... (same) for many; pure regular uses infinitive stem
  const futStem =
    ending === "are" ? stem + "er" : stem + "ir"; // approximate; pure: drop e
  // Better classic regular:
  const futureStem = inf.slice(0, -1); // parlare → parlar + ò
  const future = mapPersons([
    futureStem + "ò",
    futureStem + "ai",
    futureStem + "à",
    futureStem + "emo",
    futureStem + "ete",
    futureStem + "anno",
  ]);

  const conditional = mapPersons([
    futureStem + "ei",
    futureStem + "esti",
    futureStem + "ebbe",
    futureStem + "emmo",
    futureStem + "este",
    futureStem + "ebbero",
  ]);

  const gerund =
    ending === "are" ? stem + "ando" : stem + "endo";
  const pastParticiple =
    ending === "are" ? stem + "ato" : ending === "ere" ? stem + "uto" : stem + "ito";

  return {
    infinitive: inf,
    pronunciation: "",
    presentTense: present,
    pastTense: past,
    pastLabel: "",
    futureTense: future,
    conditionalTense: conditional,
    gerund,
    pastParticiple,
    perfectExample: "ho " + pastParticiple,
    commonUses: [],
  };
}

// ── French (first group, -er) ────────────────────────────────────────────────

/** -er verbs whose stem changes (acheter, préférer, appeler) or that are irregular are not handled. */
const FRENCH_NOT_REGULAR = /(?:[eé][bcdfghjklmnpqrstvwxz]er|yer)$/;
const FRENCH_IRREGULAR_ER = new Set(["aller", "envoyer", "renvoyer"]);

function conjugateFrench(infinitive: string): ConjugationSet | null {
  const inf = infinitive.toLowerCase().trim();
  if (!inf.endsWith("er") || inf.length < 4) return null;
  if (FRENCH_IRREGULAR_ER.has(inf) || FRENCH_NOT_REGULAR.test(inf)) return null;
  const stem = inf.slice(0, -2);
  // Before a or o the stem keeps its soft sound: mangeons, commençons, mangeait.
  const soft = (ending: string) =>
    /^[ao]/.test(ending)
      ? stem.endsWith("g")
        ? `${stem}e${ending}`
        : stem.endsWith("c")
          ? `${stem.slice(0, -1)}ç${ending}`
          : stem + ending
      : stem + ending;
  return {
    infinitive: inf,
    pronunciation: "",
    presentTense: mapPersons([stem + "e", stem + "es", stem + "e", soft("ons"), stem + "ez", stem + "ent"]),
    pastTense: mapPersons([soft("ais"), soft("ais"), soft("ait"), stem + "ions", stem + "iez", soft("aient")]),
    pastLabel: "",
    futureTense: mapPersons([inf + "ai", inf + "as", inf + "a", inf + "ons", inf + "ez", inf + "ont"]),
    conditionalTense: mapPersons([inf + "ais", inf + "ais", inf + "ait", inf + "ions", inf + "iez", inf + "aient"]),
    gerund: soft("ant"),
    pastParticiple: stem + "é",
    perfectExample: "ai " + stem + "é",
    commonUses: [],
  };
}

/** The six table persons and their grammatical person. */
const TABLE_PERSONS = [
  ["firstSingular", 1, "singular"],
  ["secondSingular", 2, "singular"],
  ["thirdSingular", 3, "singular"],
  ["firstPlural", 1, "plural"],
  ["secondPlural", 2, "plural"],
  ["thirdPlural", 3, "plural"],
] as const;

/**
 * An engine's table for its language's pack: a person the engine left empty (one the course does not
 * teach) takes the form of the taught key that carries it (Spanish ustedes: the ellos / ustedes
 * form), else stays empty; the past table takes the language's own name (app file pastTenseLabel)
 * and is dropped when the language names none.
 */
function withPackPersons(set: ConjugationSet, pack: LanguagePack): ConjugationSet {
  const fill = (forms: PersonForms | undefined): PersonForms | undefined => {
    if (!forms) return forms;
    const out = { ...forms };
    for (const [field, person, number] of TABLE_PERSONS) {
      if (out[field]) continue;
      const carrier = carrierPerson(pack, person, number);
      const from = carrier
        ? TABLE_PERSONS.find(([, p, n]) => p === carrier.person && n === carrier.number)?.[0]
        : undefined;
      out[field] = from ? out[from] : "";
    }
    return out;
  };
  const pastLabel = appData(pack).pastTenseLabel ?? undefined;
  return {
    ...set,
    presentTense: fill(set.presentTense)!,
    pastTense: pastLabel ? fill(set.pastTense) : undefined,
    pastLabel,
    futureTense: fill(set.futureTense),
    conditionalTense: fill(set.conditionalTense),
  };
}

/**
 * Offline regular-conjugation engines, by the morphology plugin id a pack names in
 * `dictionary.morphology` (language-pack model section 19: a morphology plugin is engine code, not
 * a field read). A pack that names none uses `<code>-verbs`, the id its own engine registers under.
 */
const MORPHOLOGY_ENGINES: Record<string, (infinitive: string) => ConjugationSet | null> = {
  "es-verbs": conjugateSpanish,
  "it-verbs": conjugateItalian,
  "fr-verbs": conjugateFrench,
};

/**
 * Produce a full ConjugationSet for a regular verb, or null if the ending is not recognized or
 * the language's pack has no morphology engine (fail closed: no other language's rules).
 */
export function conjugateRegular(language: string, infinitive: string): ConjugationSet | null {
  const pack = packFor(language);
  if (!pack) return null;
  const engine = MORPHOLOGY_ENGINES[pack.dictionary.morphology ?? `${pack.code}-verbs`];
  const set = engine ? engine(infinitive) : null;
  return set ? withPackPersons(set, pack) : null;
}

/** One engine's raw table (the persons it writes), for code inside that morphology plugin. */
export function conjugateWithEngine(engineId: string, infinitive: string): ConjugationSet | null {
  const engine = MORPHOLOGY_ENGINES[engineId];
  return engine ? engine(infinitive) : null;
}
