/**
 * Deterministic regular-verb conjugator.
 * Covers the bulk of dictionary verbs (ES ~77% -ar, IT -are/-ere/-ire).
 * Irregulars live in IRREGULAR_OVERRIDES (conjugation-atlas) and FREQUENCY_CONJUGATIONS.
 */

import type { Language } from "@/state/app-state";
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
    pastLabel: "Preterite",
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
    pastLabel: "Imperfect",
    futureTense: future,
    conditionalTense: conditional,
    gerund,
    pastParticiple,
    perfectExample: "ho " + pastParticiple,
    commonUses: [],
  };
}

/**
 * Produce a full ConjugationSet for a regular verb, or null if the ending
 * is not recognized / language unsupported.
 */
export function conjugateRegular(
  language: Language,
  infinitive: string,
): ConjugationSet | null {
  const lang = language.toLowerCase();
  if (lang.includes("spanish") || lang === "es" || lang === "español") {
    return conjugateSpanish(infinitive);
  }
  if (lang.includes("italian") || lang === "it" || lang === "italiano") {
    return conjugateItalian(infinitive);
  }
  return null;
}
