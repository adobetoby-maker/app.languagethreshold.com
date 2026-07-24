import type { Language } from "@/state/app-state";

export interface DeckWord {
  id: string;
  english: string;
  partOfSpeech: string;
  translations: Partial<
    Record<
      Language,
      {
        word: string;
        romanization?: string;
        example: string;
        exampleTranslation: string;
        note?: string;
      }
    >
  >;
}

// Subject pronouns. Included for Japanese/Korean too (watashi/anata etc. and
// jeo-na/dangsin-neo etc. are genuinely taught as pronoun vocabulary even
// though both languages drop them constantly in natural speech — unlike verb
// conjugation, this is still accurate vocabulary, not a mismatched structure.
export const DECK_PRONOUNS: DeckWord[] = [
  {
    id: "pronoun-i",
    english: "I",
    partOfSpeech: "pronoun",
    translations: {
      Italian: { word: "io", example: "Io sono stanco.", exampleTranslation: "I am tired." },
      Spanish: { word: "yo", example: "Yo estoy cansado.", exampleTranslation: "I am tired." },
      French: { word: "je", example: "Je suis fatigué.", exampleTranslation: "I am tired." },
      German: { word: "ich", example: "Ich bin müde.", exampleTranslation: "I am tired." },
      Portuguese: { word: "eu", example: "Eu estou cansado.", exampleTranslation: "I am tired." },
      Japanese: {
        word: "私",
        romanization: "watashi",
        example: "私は疲れています。",
        exampleTranslation: "I am tired.",
      },
      Korean: {
        word: "저",
        romanization: "jeo",
        example: "저는 피곤해요.",
        exampleTranslation: "I am tired.",
      },
    },
  },
  {
    id: "pronoun-you",
    english: "you",
    partOfSpeech: "pronoun",
    translations: {
      Italian: { word: "tu", example: "Tu sei simpatico.", exampleTranslation: "You are nice." },
      Spanish: { word: "tú", example: "Tú eres simpático.", exampleTranslation: "You are nice." },
      French: { word: "tu", example: "Tu es sympa.", exampleTranslation: "You are nice." },
      German: { word: "du", example: "Du bist nett.", exampleTranslation: "You are nice." },
      Portuguese: { word: "tu", example: "Tu és simpático.", exampleTranslation: "You are nice." },
      Japanese: {
        word: "あなた",
        romanization: "anata",
        example: "あなたは優しいです。",
        exampleTranslation: "You are kind.",
      },
      Korean: {
        word: "당신",
        romanization: "dangsin",
        example: "당신은 친절해요.",
        exampleTranslation: "You are kind.",
      },
    },
  },
  {
    id: "pronoun-he-she",
    english: "he / she",
    partOfSpeech: "pronoun",
    translations: {
      Italian: {
        word: "lui / lei",
        example: "Lei è dottoressa.",
        exampleTranslation: "She is a doctor.",
      },
      Spanish: {
        word: "él / ella",
        example: "Ella es doctora.",
        exampleTranslation: "She is a doctor.",
      },
      French: {
        word: "il / elle",
        example: "Elle est médecin.",
        exampleTranslation: "She is a doctor.",
      },
      German: {
        word: "er / sie",
        example: "Sie ist Ärztin.",
        exampleTranslation: "She is a doctor.",
      },
      Portuguese: {
        word: "ele / ela",
        example: "Ela é médica.",
        exampleTranslation: "She is a doctor.",
      },
      Japanese: {
        word: "彼 / 彼女",
        romanization: "kare / kanojo",
        example: "彼女は医者です。",
        exampleTranslation: "She is a doctor.",
      },
      Korean: {
        word: "그 / 그녀",
        romanization: "geu / geunyeo",
        example: "그녀는 의사예요.",
        exampleTranslation: "She is a doctor.",
      },
    },
  },
  {
    id: "pronoun-we",
    english: "we",
    partOfSpeech: "pronoun",
    translations: {
      Italian: { word: "noi", example: "Noi siamo amici.", exampleTranslation: "We are friends." },
      Spanish: {
        word: "nosotros",
        example: "Nosotros somos amigos.",
        exampleTranslation: "We are friends.",
      },
      French: { word: "nous", example: "Nous sommes amis.", exampleTranslation: "We are friends." },
      German: { word: "wir", example: "Wir sind Freunde.", exampleTranslation: "We are friends." },
      Portuguese: {
        word: "nós",
        example: "Nós somos amigos.",
        exampleTranslation: "We are friends.",
      },
      Japanese: {
        word: "私たち",
        romanization: "watashitachi",
        example: "私たちは友達です。",
        exampleTranslation: "We are friends.",
      },
      Korean: {
        word: "우리",
        romanization: "uri",
        example: "우리는 친구예요.",
        exampleTranslation: "We are friends.",
      },
    },
  },
  {
    id: "pronoun-you-plural",
    english: "you (plural)",
    partOfSpeech: "pronoun",
    translations: {
      Italian: {
        word: "voi",
        example: "Voi siete pronti?",
        exampleTranslation: "Are you (all) ready?",
      },
      Spanish: {
        word: "vosotros",
        example: "¿Vosotros estáis listos?",
        exampleTranslation: "Are you (all) ready?",
      },
      French: {
        word: "vous",
        example: "Vous êtes prêts?",
        exampleTranslation: "Are you (all) ready?",
      },
      German: {
        word: "ihr",
        example: "Seid ihr bereit?",
        exampleTranslation: "Are you (all) ready?",
      },
      Portuguese: {
        word: "vós",
        example: "Vós estais prontos?",
        exampleTranslation: "Are you (all) ready?",
      },
      Japanese: {
        word: "あなたたち",
        romanization: "anatatachi",
        example: "あなたたちは準備できましたか？",
        exampleTranslation: "Are you (all) ready?",
      },
      Korean: {
        word: "당신들",
        romanization: "dangsindeul",
        example: "당신들은 준비됐어요?",
        exampleTranslation: "Are you (all) ready?",
      },
    },
  },
  {
    id: "pronoun-they",
    english: "they",
    partOfSpeech: "pronoun",
    translations: {
      Italian: {
        word: "loro",
        example: "Loro parlano italiano.",
        exampleTranslation: "They speak Italian.",
      },
      Spanish: {
        word: "ellos",
        example: "Ellos hablan español.",
        exampleTranslation: "They speak Spanish.",
      },
      French: {
        word: "ils",
        example: "Ils parlent français.",
        exampleTranslation: "They speak French.",
      },
      German: {
        word: "sie",
        example: "Sie sprechen Deutsch.",
        exampleTranslation: "They speak German.",
      },
      Portuguese: {
        word: "eles",
        example: "Eles falam português.",
        exampleTranslation: "They speak Portuguese.",
      },
      Japanese: {
        word: "彼ら",
        romanization: "karera",
        example: "彼らは日本語を話します。",
        exampleTranslation: "They speak Japanese.",
      },
      Korean: {
        word: "그들",
        romanization: "geudeul",
        example: "그들은 한국어를 해요.",
        exampleTranslation: "They speak Korean.",
      },
    },
  },
];
