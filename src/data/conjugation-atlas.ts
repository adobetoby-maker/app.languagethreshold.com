/**
 * Offline conjugation atlas.
 *
 * Boot sequence:
 *   1. FREQUENCY_CONJUGATIONS already indexed by conjugation-cache
 *   2. IRREGULAR_OVERRIDES — hand tables for every irregular in the known list
 *   3. KNOWN_VERBS × conjugateRegular() — fills every regular dictionary verb
 *
 * Current dictionary set (ES + IT) has zero gaps after seed.
 * Novel learner-typed verbs still go through AI once via ensureConjugation.
 */

import type { Language } from "@/state/app-state";
import type { ConjugationSet, PersonForms } from "@/data/frequency-conjugations";
import { KNOWN_VERBS } from "@/data/known-verb-list";
import { conjugateRegular } from "@/lib/conjugate-regular";
import { registerCatalogEntry } from "@/lib/conjugation-cache";

function persons(
  firstSingular: string,
  secondSingular: string,
  thirdSingular: string,
  firstPlural: string,
  secondPlural: string,
  thirdPlural: string,
): PersonForms {
  return {
    firstSingular,
    secondSingular,
    thirdSingular,
    firstPlural,
    secondPlural,
    thirdPlural,
  };
}

/** Hand-authored irregular overrides (full past + future + conditional where available). */
const IRREGULAR_OVERRIDES: Partial<Record<Language, Record<string, ConjugationSet>>> = {
  Spanish: {
    ser: {
      infinitive: "ser",
      pronunciation: "sehr",
      presentTense: persons("soy", "eres", "es", "somos", "sois", "son"),
      pastTense: persons("fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"),
      pastLabel: "Preterite",
      futureTense: persons("seré", "serás", "será", "seremos", "seréis", "serán"),
      conditionalTense: persons("sería", "serías", "sería", "seríamos", "seríais", "serían"),
      gerund: "siendo",
      pastParticiple: "sido",
      perfectExample: "he sido",
      commonUses: [
        { phrase: "Soy de aquí", translation: "I am from here" },
        { phrase: "Fue un placer", translation: "It was a pleasure" },
      ],
    },
    estar: {
      infinitive: "estar",
      pronunciation: "es-tar",
      presentTense: persons("estoy", "estás", "está", "estamos", "estáis", "están"),
      pastTense: persons("estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"),
      pastLabel: "Preterite",
      futureTense: persons("estaré", "estarás", "estará", "estaremos", "estaréis", "estarán"),
      conditionalTense: persons("estaría", "estarías", "estaría", "estaríamos", "estaríais", "estarían"),
      gerund: "estando",
      pastParticiple: "estado",
      perfectExample: "he estado",
      commonUses: [
        { phrase: "Estoy bien", translation: "I am well" },
        { phrase: "¿Dónde está?", translation: "Where is it?" },
      ],
    },
    ir: {
      infinitive: "ir",
      pronunciation: "eer",
      presentTense: persons("voy", "vas", "va", "vamos", "vais", "van"),
      pastTense: persons("fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"),
      pastLabel: "Preterite",
      futureTense: persons("iré", "irás", "irá", "iremos", "iréis", "irán"),
      conditionalTense: persons("iría", "irías", "iría", "iríamos", "iríais", "irían"),
      gerund: "yendo",
      pastParticiple: "ido",
      perfectExample: "he ido",
      commonUses: [
        { phrase: "Voy a la tienda", translation: "I am going to the store" },
        { phrase: "Fui ayer", translation: "I went yesterday" },
      ],
    },
    tener: {
      infinitive: "tener",
      pronunciation: "teh-ner",
      presentTense: persons("tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"),
      pastTense: persons("tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"),
      pastLabel: "Preterite",
      futureTense: persons("tendré", "tendrás", "tendrá", "tendremos", "tendréis", "tendrán"),
      conditionalTense: persons("tendría", "tendrías", "tendría", "tendríamos", "tendríais", "tendrían"),
      gerund: "teniendo",
      pastParticiple: "tenido",
      perfectExample: "he tenido",
      commonUses: [
        { phrase: "Tengo que ir", translation: "I have to go" },
        { phrase: "Tuviste razón", translation: "You were right" },
      ],
    },
    hacer: {
      infinitive: "hacer",
      pronunciation: "ah-ser",
      presentTense: persons("hago", "haces", "hace", "hacemos", "hacéis", "hacen"),
      pastTense: persons("hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"),
      pastLabel: "Preterite",
      futureTense: persons("haré", "harás", "hará", "haremos", "haréis", "harán"),
      conditionalTense: persons("haría", "harías", "haría", "haríamos", "haríais", "harían"),
      gerund: "haciendo",
      pastParticiple: "hecho",
      perfectExample: "he hecho",
      commonUses: [
        { phrase: "¿Qué haces?", translation: "What are you doing?" },
        { phrase: "Hice la cama", translation: "I made the bed" },
      ],
    },
    poder: {
      infinitive: "poder",
      pronunciation: "po-der",
      presentTense: persons("puedo", "puedes", "puede", "podemos", "podéis", "pueden"),
      pastTense: persons("pude", "pudiste", "pudo", "pudimos", "pudisteis", "pudieron"),
      pastLabel: "Preterite",
      futureTense: persons("podré", "podrás", "podrá", "podremos", "podréis", "podrán"),
      conditionalTense: persons("podría", "podrías", "podría", "podríamos", "podríais", "podrían"),
      gerund: "pudiendo",
      pastParticiple: "podido",
      perfectExample: "he podido",
      commonUses: [
        { phrase: "No puedo", translation: "I can't" },
        { phrase: "¿Pudiste venir?", translation: "Could you come?" },
      ],
    },
    decir: {
      infinitive: "decir",
      pronunciation: "deh-seer",
      presentTense: persons("digo", "dices", "dice", "decimos", "decís", "dicen"),
      pastTense: persons("dije", "dijiste", "dijo", "dijimos", "dijisteis", "dijeron"),
      pastLabel: "Preterite",
      futureTense: persons("diré", "dirás", "dirá", "diremos", "diréis", "dirán"),
      conditionalTense: persons("diría", "dirías", "diría", "diríamos", "diríais", "dirían"),
      gerund: "diciendo",
      pastParticiple: "dicho",
      perfectExample: "he dicho",
      commonUses: [
        { phrase: "¿Qué dices?", translation: "What do you say?" },
        { phrase: "Dije la verdad", translation: "I told the truth" },
      ],
    },
    ver: {
      infinitive: "ver",
      pronunciation: "behr",
      presentTense: persons("veo", "ves", "ve", "vemos", "veis", "ven"),
      pastTense: persons("vi", "viste", "vio", "vimos", "visteis", "vieron"),
      pastLabel: "Preterite",
      futureTense: persons("veré", "verás", "verá", "veremos", "veréis", "verán"),
      conditionalTense: persons("vería", "verías", "vería", "veríamos", "veríais", "verían"),
      gerund: "viendo",
      pastParticiple: "visto",
      perfectExample: "he visto",
      commonUses: [
        { phrase: "No veo", translation: "I don't see" },
        { phrase: "Vi la película", translation: "I saw the movie" },
      ],
    },
    dar: {
      infinitive: "dar",
      pronunciation: "dahr",
      presentTense: persons("doy", "das", "da", "damos", "dais", "dan"),
      pastTense: persons("di", "diste", "dio", "dimos", "disteis", "dieron"),
      pastLabel: "Preterite",
      futureTense: persons("daré", "darás", "dará", "daremos", "daréis", "darán"),
      conditionalTense: persons("daría", "darías", "daría", "daríamos", "daríais", "darían"),
      gerund: "dando",
      pastParticiple: "dado",
      perfectExample: "he dado",
      commonUses: [
        { phrase: "Te doy esto", translation: "I give you this" },
        { phrase: "Dio un regalo", translation: "He/she gave a gift" },
      ],
    },
    saber: {
      infinitive: "saber",
      pronunciation: "sah-ber",
      presentTense: persons("sé", "sabes", "sabe", "sabemos", "sabéis", "saben"),
      pastTense: persons("supe", "supiste", "supo", "supimos", "supisteis", "supieron"),
      pastLabel: "Preterite",
      futureTense: persons("sabré", "sabrás", "sabrá", "sabremos", "sabréis", "sabrán"),
      conditionalTense: persons("sabría", "sabrías", "sabría", "sabríamos", "sabríais", "sabrían"),
      gerund: "sabiendo",
      pastParticiple: "sabido",
      perfectExample: "he sabido",
      commonUses: [
        { phrase: "No sé", translation: "I don't know" },
        { phrase: "Supe la noticia", translation: "I found out the news" },
      ],
    },
  },
  Italian: {
    essere: {
      infinitive: "essere",
      pronunciation: "ESS-eh-reh",
      presentTense: persons("sono", "sei", "è", "siamo", "siete", "sono"),
      pastTense: persons("ero", "eri", "era", "eravamo", "eravate", "erano"),
      pastLabel: "Imperfect",
      futureTense: persons("sarò", "sarai", "sarà", "saremo", "sarete", "saranno"),
      conditionalTense: persons("sarei", "saresti", "sarebbe", "saremmo", "sareste", "sarebbero"),
      gerund: "essendo",
      pastParticiple: "stato",
      perfectExample: "sono stato",
      commonUses: [
        { phrase: "Sono felice", translation: "I am happy" },
        { phrase: "Era tardi", translation: "It was late" },
      ],
    },
    avere: {
      infinitive: "avere",
      pronunciation: "ah-VEH-reh",
      presentTense: persons("ho", "hai", "ha", "abbiamo", "avete", "hanno"),
      pastTense: persons("avevo", "avevi", "aveva", "avevamo", "avevate", "avevano"),
      pastLabel: "Imperfect",
      futureTense: persons("avrò", "avrai", "avrà", "avremo", "avrete", "avranno"),
      conditionalTense: persons("avrei", "avresti", "avrebbe", "avremmo", "avreste", "avrebbero"),
      gerund: "avendo",
      pastParticiple: "avuto",
      perfectExample: "ho avuto",
      commonUses: [
        { phrase: "Ho fame", translation: "I am hungry" },
        { phrase: "Avevo ragione", translation: "I was right" },
      ],
    },
    andare: {
      infinitive: "andare",
      pronunciation: "ahn-DAH-reh",
      presentTense: persons("vado", "vai", "va", "andiamo", "andate", "vanno"),
      pastTense: persons("andavo", "andavi", "andava", "andavamo", "andavate", "andavano"),
      pastLabel: "Imperfect",
      futureTense: persons("andrò", "andrai", "andrà", "andremo", "andrete", "andranno"),
      conditionalTense: persons("andrei", "andresti", "andrebbe", "andremmo", "andreste", "andrebbero"),
      gerund: "andando",
      pastParticiple: "andato",
      perfectExample: "sono andato",
      commonUses: [
        { phrase: "Vado a casa", translation: "I am going home" },
        { phrase: "Andavo spesso", translation: "I used to go often" },
      ],
    },
    fare: {
      infinitive: "fare",
      pronunciation: "FAH-reh",
      presentTense: persons("faccio", "fai", "fa", "facciamo", "fate", "fanno"),
      pastTense: persons("facevo", "facevi", "faceva", "facevamo", "facevate", "facevano"),
      pastLabel: "Imperfect",
      futureTense: persons("farò", "farai", "farà", "faremo", "farete", "faranno"),
      conditionalTense: persons("farei", "faresti", "farebbe", "faremmo", "fareste", "farebbero"),
      gerund: "facendo",
      pastParticiple: "fatto",
      perfectExample: "ho fatto",
      commonUses: [
        { phrase: "Cosa fai?", translation: "What are you doing?" },
        { phrase: "Ho fatto bene", translation: "I did well" },
      ],
    },
    dire: {
      infinitive: "dire",
      pronunciation: "DEE-reh",
      presentTense: persons("dico", "dici", "dice", "diciamo", "dite", "dicono"),
      pastTense: persons("dicevo", "dicevi", "diceva", "dicevamo", "dicevate", "dicevano"),
      pastLabel: "Imperfect",
      futureTense: persons("dirò", "dirai", "dirà", "diremo", "direte", "diranno"),
      conditionalTense: persons("direi", "diresti", "direbbe", "diremmo", "direste", "direbbero"),
      gerund: "dicendo",
      pastParticiple: "detto",
      perfectExample: "ho detto",
      commonUses: [
        { phrase: "Cosa dici?", translation: "What do you say?" },
        { phrase: "Ho detto di no", translation: "I said no" },
      ],
    },
    venire: {
      infinitive: "venire",
      pronunciation: "veh-NEE-reh",
      presentTense: persons("vengo", "vieni", "viene", "veniamo", "venite", "vengono"),
      pastTense: persons("venivo", "venivi", "veniva", "venivamo", "venivate", "venivano"),
      pastLabel: "Imperfect",
      futureTense: persons("verrò", "verrai", "verrà", "verremo", "verrete", "verranno"),
      conditionalTense: persons("verrei", "verresti", "verrebbe", "verremmo", "verreste", "verrebbero"),
      gerund: "venendo",
      pastParticiple: "venuto",
      perfectExample: "sono venuto",
      commonUses: [
        { phrase: "Vengo subito", translation: "I am coming right away" },
        { phrase: "Venivo spesso", translation: "I used to come often" },
      ],
    },
  },
};

/**
 * Seed the static catalog from irregular overrides + regular engine over KNOWN_VERBS.
 * Call once at module load (e.g. from FlashcardsStudio or app init).
 * Idempotent and offline — zero AI.
 */
export function seedConjugationAtlas() {
  // 1. Irregular overrides (rich tables)
  for (const [lang, table] of Object.entries(IRREGULAR_OVERRIDES) as [Language, Record<string, ConjugationSet>][]) {
    for (const set of Object.values(table)) {
      registerCatalogEntry(lang, set);
    }
  }

  // 2. Regulars from the known dictionary list
  for (const v of KNOWN_VERBS) {
    const generated = conjugateRegular(v.language, v.infinitive);
    if (generated) registerCatalogEntry(v.language, generated);
  }
}

/** Diagnostic: how many known verbs are covered after seed. */
export function atlasCoverage() {
  let covered = 0;
  let missing = 0;
  const byCategory: Record<string, number> = {};
  const gaps: { language: Language; infinitive: string; category: string }[] = [];

  for (const v of KNOWN_VERBS) {
    const generated = conjugateRegular(v.language, v.infinitive);
    const override = IRREGULAR_OVERRIDES[v.language]?.[v.infinitive.toLowerCase()];
    if (generated || override) {
      covered++;
      byCategory[v.category] = (byCategory[v.category] ?? 0) + 1;
    } else {
      missing++;
      gaps.push({ language: v.language, infinitive: v.infinitive, category: v.category });
    }
  }

  return {
    knownTotal: KNOWN_VERBS.length,
    covered,
    missing,
    byCategory,
    gaps,
  };
}
