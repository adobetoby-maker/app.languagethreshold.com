import type { Language } from "@/state/app-state";
import { FREQUENCY_WORDS } from "./frequency-words";
import { FREQUENCY_CONJUGATIONS } from "./frequency-conjugations";
import { DECK_PRONOUNS, type DeckWord } from "./deck-pronouns";

type PersonKey =
  | "firstSingular"
  | "secondSingular"
  | "thirdSingular"
  | "firstPlural"
  | "secondPlural"
  | "thirdPlural";

const PERSON_ORDER: { key: PersonKey; pronounId: string }[] = [
  { key: "firstSingular", pronounId: "pronoun-i" },
  { key: "secondSingular", pronounId: "pronoun-you" },
  { key: "thirdSingular", pronounId: "pronoun-he-she" },
  { key: "firstPlural", pronounId: "pronoun-we" },
  { key: "secondPlural", pronounId: "pronoun-you-plural" },
  { key: "thirdPlural", pronounId: "pronoun-they" },
];

// English person-conjugated forms for the 9 starter verbs — hand-verified
// (modals like "can" never take -s; everything else takes -s only in 3rd
// person singular).
const ENGLISH_PERSON_FORMS: Record<string, Record<PersonKey, string>> = {
  can: {
    firstSingular: "I can",
    secondSingular: "you can",
    thirdSingular: "he/she can",
    firstPlural: "we can",
    secondPlural: "you (all) can",
    thirdPlural: "they can",
  },
  use: {
    firstSingular: "I use",
    secondSingular: "you use",
    thirdSingular: "he/she uses",
    firstPlural: "we use",
    secondPlural: "you (all) use",
    thirdPlural: "they use",
  },
  do: {
    firstSingular: "I do",
    secondSingular: "you do",
    thirdSingular: "he/she does",
    firstPlural: "we do",
    secondPlural: "you (all) do",
    thirdPlural: "they do",
  },
  come: {
    firstSingular: "I come",
    secondSingular: "you come",
    thirdSingular: "he/she comes",
    firstPlural: "we come",
    secondPlural: "you (all) come",
    thirdPlural: "they come",
  },
  go: {
    firstSingular: "I go",
    secondSingular: "you go",
    thirdSingular: "he/she goes",
    firstPlural: "we go",
    secondPlural: "you (all) go",
    thirdPlural: "they go",
  },
  say: {
    firstSingular: "I say",
    secondSingular: "you say",
    thirdSingular: "he/she says",
    firstPlural: "we say",
    secondPlural: "you (all) say",
    thirdPlural: "they say",
  },
  learn: {
    firstSingular: "I learn",
    secondSingular: "you learn",
    thirdSingular: "he/she learns",
    firstPlural: "we learn",
    secondPlural: "you (all) learn",
    thirdPlural: "they learn",
  },
  tell: {
    firstSingular: "I tell",
    secondSingular: "you tell",
    thirdSingular: "he/she tells",
    firstPlural: "we tell",
    secondPlural: "you (all) tell",
    thirdPlural: "they tell",
  },
  speak: {
    firstSingular: "I speak",
    secondSingular: "you speak",
    thirdSingular: "he/she speaks",
    firstPlural: "we speak",
    secondPlural: "you (all) speak",
    thirdPlural: "they speak",
  },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pronounWord(language: Language, pronounId: string): string | undefined {
  return DECK_PRONOUNS.find((p) => p.id === pronounId)?.translations[language]?.word;
}

// Derives one flashcard per (verb x grammatical person) straight from the
// hand-verified FREQUENCY_CONJUGATIONS + DECK_PRONOUNS data — no new
// authoring, so there's no accuracy risk beyond what's already verified.
export function buildConjugatedDeck(): DeckWord[] {
  const deck: DeckWord[] = [];
  for (const entry of FREQUENCY_WORDS) {
    const perLanguage = FREQUENCY_CONJUGATIONS[entry.id];
    if (!perLanguage) continue;
    for (const { key, pronounId } of PERSON_ORDER) {
      const englishForm = ENGLISH_PERSON_FORMS[entry.id]?.[key];
      if (!englishForm) continue;
      const translations: DeckWord["translations"] = {};
      for (const language of Object.keys(perLanguage) as Language[]) {
        const conj = perLanguage[language];
        if (!conj) continue;
        const form = conj.presentTense[key];
        const pronoun = pronounWord(language, pronounId);
        translations[language] = {
          word: form,
          example: pronoun ? `${capitalize(pronoun)} ${form}.` : `${form}.`,
          exampleTranslation: `${capitalize(englishForm)}.`,
        };
      }
      if (Object.keys(translations).length === 0) continue;
      deck.push({
        id: `conjugated-${entry.id}-${key}`,
        english: englishForm,
        partOfSpeech: "verb (conjugated)",
        translations,
      });
    }
  }
  return deck;
}
