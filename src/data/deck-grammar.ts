import type { DeckWord } from "./deck-pronouns";

// High-frequency grammar points. Only for the 5 languages this app already
// conjugates by person (Spanish, French, German, Italian, Portuguese) —
// Japanese/Korean don't have matching articles/adjective-agreement rules,
// so they're deliberately left out of this deck rather than force-fit.
// `word` holds the actual grammar forms; `note` holds the rule statement.
export const DECK_GRAMMAR: DeckWord[] = [
  {
    id: "grammar-definite-article",
    english: 'Definite article ("the")',
    partOfSpeech: "grammar",
    translations: {
      Italian: {
        word: "il / la / i / le",
        note: "il/i for masculine, la/le for feminine (singular/plural).",
        example: "il libro, la casa",
        exampleTranslation: "the book, the house",
      },
      Spanish: {
        word: "el / la / los / las",
        note: "el/los for masculine, la/las for feminine (singular/plural).",
        example: "el libro, la casa",
        exampleTranslation: "the book, the house",
      },
      French: {
        word: "le / la / les",
        note: "le for masculine, la for feminine, les for plural; both become l' before a vowel sound.",
        example: "le livre, la maison",
        exampleTranslation: "the book, the house",
      },
      German: {
        word: "der / die / das / die",
        note: "der (masc.), die (fem.), das (neut.), die (plural) — nominative case.",
        example: "der Mann, die Frau, das Kind",
        exampleTranslation: "the man, the woman, the child",
      },
      Portuguese: {
        word: "o / a / os / as",
        note: "o/os for masculine, a/as for feminine (singular/plural).",
        example: "o livro, a casa",
        exampleTranslation: "the book, the house",
      },
    },
  },
  {
    id: "grammar-plural",
    english: "Plural formation",
    partOfSpeech: "grammar",
    translations: {
      Italian: {
        word: "-o → -i, -a → -e",
        note: "Masculine nouns ending -o take -i; feminine nouns ending -a take -e.",
        example: "libro → libri, casa → case",
        exampleTranslation: "book → books, house → houses",
      },
      Spanish: {
        word: "+ -s / + -es",
        note: "Add -s after a vowel, -es after a consonant.",
        example: "libro → libros, ciudad → ciudades",
        exampleTranslation: "book → books, city → cities",
      },
      French: {
        word: "+ -s (silent)",
        note: "Add -s, usually silent in speech — the article carries the plural sound.",
        example: "le livre → les livres",
        exampleTranslation: "the book → the books",
      },
      German: {
        word: "varies (-e, -er, -en, -s, umlaut)",
        note: "No single rule — plural pattern must be memorized per noun.",
        example: "das Buch → die Bücher",
        exampleTranslation: "the book → the books",
      },
      Portuguese: {
        word: "+ -s",
        note: "Add -s; nouns ending -m change to -ns, -l often changes to -is.",
        example: "livro → livros",
        exampleTranslation: "book → books",
      },
    },
  },
  {
    id: "grammar-adjective-agreement",
    english: "Adjective agreement",
    partOfSpeech: "grammar",
    translations: {
      Italian: {
        word: "alto / alta / alti / alte",
        note: "Adjectives match the noun's gender and number.",
        example: "ragazzo alto, ragazza alta",
        exampleTranslation: "tall boy, tall girl",
      },
      Spanish: {
        word: "alto / alta / altos / altas",
        note: "Adjectives match the noun's gender and number.",
        example: "chico alto, chica alta",
        exampleTranslation: "tall boy, tall girl",
      },
      French: {
        word: "grand / grande",
        note: "Adjectives match gender/number, often adding -e for feminine, -s for plural.",
        example: "un grand garçon, une grande fille",
        exampleTranslation: "a tall boy, a tall girl",
      },
      German: {
        word: "endings vary by case",
        note: "Adjective endings change with gender, number, and grammatical case — the most complex of the five.",
        example: "der große Mann",
        exampleTranslation: "the tall man",
      },
      Portuguese: {
        word: "alto / alta / altos / altas",
        note: "Adjectives match the noun's gender and number.",
        example: "menino alto, menina alta",
        exampleTranslation: "tall boy, tall girl",
      },
    },
  },
  {
    id: "grammar-negation",
    english: 'Negation ("not")',
    partOfSpeech: "grammar",
    translations: {
      Italian: {
        word: "non",
        note: "Place non directly before the verb.",
        example: "Non parlo francese.",
        exampleTranslation: "I don't speak French.",
      },
      Spanish: {
        word: "no",
        note: "Place no directly before the verb.",
        example: "No hablo francés.",
        exampleTranslation: "I don't speak French.",
      },
      French: {
        word: "ne ... pas",
        note: "Wrap the verb: ne before it, pas after it.",
        example: "Je ne parle pas français.",
        exampleTranslation: "I don't speak French.",
      },
      German: {
        word: "nicht / kein",
        note: "nicht negates verbs/adjectives; kein negates a noun with an indefinite article.",
        example: "Ich spreche nicht Französisch. / Ich habe kein Auto.",
        exampleTranslation: "I don't speak French. / I don't have a car.",
      },
      Portuguese: {
        word: "não",
        note: "Place não directly before the verb.",
        example: "Não falo francês.",
        exampleTranslation: "I don't speak French.",
      },
    },
  },
  {
    id: "grammar-yes-no-question",
    english: "Yes/no questions",
    partOfSpeech: "grammar",
    translations: {
      Italian: {
        word: "same order + rising tone",
        note: "Keep statement word order; mark it with rising intonation or a question mark.",
        example: "Parli italiano?",
        exampleTranslation: "Do you speak Italian?",
      },
      Spanish: {
        word: "¿ ... ?",
        note: "Same word order as a statement; framed with inverted and closing question marks.",
        example: "¿Hablas español?",
        exampleTranslation: "Do you speak Spanish?",
      },
      French: {
        word: "Est-ce que ... ?",
        note: 'Add "Est-ce que" before the statement, or invert verb and subject.',
        example: "Est-ce que tu parles français?",
        exampleTranslation: "Do you speak French?",
      },
      German: {
        word: "verb-first",
        note: "Move the conjugated verb to the very first position.",
        example: "Sprichst du Deutsch?",
        exampleTranslation: "Do you speak German?",
      },
      Portuguese: {
        word: "same order + rising tone",
        note: "Keep statement word order; mark it with rising intonation or a question mark.",
        example: "Você fala português?",
        exampleTranslation: "Do you speak Portuguese?",
      },
    },
  },
];
