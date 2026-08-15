import type { Language } from "@/state/app-state";

export interface CommonUse {
  phrase: string;
  translation: string;
}

export interface PersonForms {
  firstSingular: string; // io / yo / je / ich / eu
  secondSingular: string; // tu / tú / tu / du / tu
  thirdSingular: string; // lui-lei / él-ella / il-elle / er-sie / ele-ela
  firstPlural: string; // noi / nosotros / nous / wir / nós
  secondPlural: string; // voi / vosotros / vous / ihr / vós
  thirdPlural: string; // loro / ellos / ils / sie / eles
}

export interface ConjugationSet {
  infinitive: string;
  pronunciation: string; // approximate phonetic guide, not strict IPA — easier for a beginner to read
  presentTense: PersonForms;
  /** Optional expanded tenses used by conjugation-atlas / games */
  pastTense?: PersonForms;
  pastLabel?: string;
  futureTense?: PersonForms;
  conditionalTense?: PersonForms;
  gerund: string; // -ing form (Partizip I for German)
  pastParticiple: string; // Partizip II for German
  perfectExample: string; // e.g. "ho fatto" (I have done) — shows the participle in use
  commonUses: CommonUse[];
}

export const FREQUENCY_CONJUGATIONS: Record<
  string, // matches FrequencyWordEntry.id
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
  },
};
