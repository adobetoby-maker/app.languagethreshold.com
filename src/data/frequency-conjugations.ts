import type { Language } from "@/state/app-state";

/**
 * Full present-tense conjugation + non-finite forms for frequency starter verbs.
 * Hand-authored on purpose: conjugation is a closed set of facts.
 */

export interface CommonUse {
  phrase: string;
  translation: string;
}

export interface PersonForms {
  firstSingular: string;
  secondSingular: string;
  thirdSingular: string;
  firstPlural: string;
  secondPlural: string;
  thirdPlural: string;
}

export interface ConjugationSet {
  infinitive: string;
  pronunciation: string;
  presentTense: PersonForms;
  pastTense?: PersonForms;
  pastLabel?: string;
  futureTense?: PersonForms;
  conditionalTense?: PersonForms;
  gerund: string;
  pastParticiple: string;
  perfectExample: string;
  commonUses: CommonUse[];
}

export const FREQUENCY_CONJUGATIONS: Record<
  string,
  Partial<Record<Language, ConjugationSet>>
> = {
  can: {
    Italian: {
      infinitive: "potere",
      pronunciation: "po-TEH-reh",
      presentTense: {
        firstSingular: "posso",
        secondSingular: "puoi",
        thirdSingular: "può",
        firstPlural: "possiamo",
        secondPlural: "potete",
        thirdPlural: "possono",
      },
      gerund: "potendo",
      pastParticiple: "potuto",
      perfectExample: "ho potuto",
      commonUses: [
        { phrase: "Posso aiutarti?", translation: "Can I help you?" },
        { phrase: "Non posso venire", translation: "I can't come" },
      ],
    },
    Spanish: {
      infinitive: "poder",
      pronunciation: "po-DER",
      presentTense: {
        firstSingular: "puedo",
        secondSingular: "puedes",
        thirdSingular: "puede",
        firstPlural: "podemos",
        secondPlural: "podéis",
        thirdPlural: "pueden",
      },
      gerund: "pudiendo",
      pastParticiple: "podido",
      perfectExample: "he podido",
      commonUses: [
        { phrase: "¿Puedo ayudarte?", translation: "Can I help you?" },
        { phrase: "No puedo venir", translation: "I can't come" },
      ],
    },
    French: {
      infinitive: "pouvoir",
      pronunciation: "poo-VWAR",
      presentTense: {
        firstSingular: "peux",
        secondSingular: "peux",
        thirdSingular: "peut",
        firstPlural: "pouvons",
        secondPlural: "pouvez",
        thirdPlural: "peuvent",
      },
      gerund: "pouvant",
      pastParticiple: "pu",
      perfectExample: "j'ai pu",
      commonUses: [
        { phrase: "Je peux t'aider?", translation: "Can I help you?" },
        { phrase: "Je ne peux pas venir", translation: "I can't come" },
      ],
    },
    German: {
      infinitive: "können",
      pronunciation: "KER-nen",
      presentTense: {
        firstSingular: "kann",
        secondSingular: "kannst",
        thirdSingular: "kann",
        firstPlural: "können",
        secondPlural: "könnt",
        thirdPlural: "können",
      },
      gerund: "könnend",
      pastParticiple: "gekonnt",
      perfectExample: "ich habe gekonnt",
      commonUses: [
        { phrase: "Kann ich dir helfen?", translation: "Can I help you?" },
        { phrase: "Ich kann nicht kommen", translation: "I can't come" },
      ],
    },
    Portuguese: {
      infinitive: "poder",
      pronunciation: "po-DER",
      presentTense: {
        firstSingular: "posso",
        secondSingular: "podes",
        thirdSingular: "pode",
        firstPlural: "podemos",
        secondPlural: "podeis",
        thirdPlural: "podem",
      },
      gerund: "podendo",
      pastParticiple: "podido",
      perfectExample: "tenho podido",
      commonUses: [
        { phrase: "Posso ajudar?", translation: "Can I help?" },
        { phrase: "Não posso vir", translation: "I can't come" },
      ],
    },
  },
  use: {
    Italian: {
      infinitive: "usare",
      pronunciation: "oo-ZAH-reh",
      presentTense: {
        firstSingular: "uso",
        secondSingular: "usi",
        thirdSingular: "usa",
        firstPlural: "usiamo",
        secondPlural: "usate",
        thirdPlural: "usano",
      },
      gerund: "usando",
      pastParticiple: "usato",
      perfectExample: "ho usato",
      commonUses: [
        { phrase: "Uso il telefono", translation: "I use the phone" },
        { phrase: "Usiamo questo metodo", translation: "We use this method" },
      ],
    },
    Spanish: {
      infinitive: "usar",
      pronunciation: "oo-SAR",
      presentTense: {
        firstSingular: "uso",
        secondSingular: "usas",
        thirdSingular: "usa",
        firstPlural: "usamos",
        secondPlural: "usáis",
        thirdPlural: "usan",
      },
      gerund: "usando",
      pastParticiple: "usado",
      perfectExample: "he usado",
      commonUses: [
        { phrase: "Uso el teléfono", translation: "I use the phone" },
        { phrase: "Usamos este método", translation: "We use this method" },
      ],
    },
  },
  do: {
    Italian: {
      infinitive: "fare",
      pronunciation: "FAH-reh",
      presentTense: {
        firstSingular: "faccio",
        secondSingular: "fai",
        thirdSingular: "fa",
        firstPlural: "facciamo",
        secondPlural: "fate",
        thirdPlural: "fanno",
      },
      gerund: "facendo",
      pastParticiple: "fatto",
      perfectExample: "ho fatto",
      commonUses: [
        { phrase: "Cosa fai?", translation: "What are you doing?" },
        { phrase: "Faccio il medico", translation: "I'm a doctor (I do the doctor)" },
      ],
    },
    Spanish: {
      infinitive: "hacer",
      pronunciation: "ah-THER",
      presentTense: {
        firstSingular: "hago",
        secondSingular: "haces",
        thirdSingular: "hace",
        firstPlural: "hacemos",
        secondPlural: "hacéis",
        thirdPlural: "hacen",
      },
      gerund: "haciendo",
      pastParticiple: "hecho",
      perfectExample: "he hecho",
      commonUses: [
        { phrase: "¿Qué haces?", translation: "What are you doing?" },
        { phrase: "Hago ejercicio", translation: "I exercise" },
      ],
    },
  },
  go: {
    Italian: {
      infinitive: "andare",
      pronunciation: "an-DAH-reh",
      presentTense: {
        firstSingular: "vado",
        secondSingular: "vai",
        thirdSingular: "va",
        firstPlural: "andiamo",
        secondPlural: "andate",
        thirdPlural: "vanno",
      },
      gerund: "andando",
      pastParticiple: "andato",
      perfectExample: "sono andato",
      commonUses: [
        { phrase: "Vado a casa", translation: "I'm going home" },
        { phrase: "Andiamo!", translation: "Let's go!" },
      ],
    },
    Spanish: {
      infinitive: "ir",
      pronunciation: "eer",
      presentTense: {
        firstSingular: "voy",
        secondSingular: "vas",
        thirdSingular: "va",
        firstPlural: "vamos",
        secondPlural: "vais",
        thirdPlural: "van",
      },
      gerund: "yendo",
      pastParticiple: "ido",
      perfectExample: "he ido",
      commonUses: [
        { phrase: "Voy a casa", translation: "I'm going home" },
        { phrase: "¡Vamos!", translation: "Let's go!" },
      ],
    },
  },
  come: {
    Italian: {
      infinitive: "venire",
      pronunciation: "veh-NEE-reh",
      presentTense: {
        firstSingular: "vengo",
        secondSingular: "vieni",
        thirdSingular: "viene",
        firstPlural: "veniamo",
        secondPlural: "venite",
        thirdPlural: "vengono",
      },
      gerund: "venendo",
      pastParticiple: "venuto",
      perfectExample: "sono venuto",
      commonUses: [
        { phrase: "Vengo subito", translation: "I'm coming right away" },
        { phrase: "Vieni qui", translation: "Come here" },
      ],
    },
    Spanish: {
      infinitive: "venir",
      pronunciation: "beh-NEER",
      presentTense: {
        firstSingular: "vengo",
        secondSingular: "vienes",
        thirdSingular: "viene",
        firstPlural: "venimos",
        secondPlural: "venís",
        thirdPlural: "vienen",
      },
      gerund: "viniendo",
      pastParticiple: "venido",
      perfectExample: "he venido",
      commonUses: [
        { phrase: "Vengo ahora", translation: "I'm coming now" },
        { phrase: "Ven aquí", translation: "Come here" },
      ],
    },
  },
};
