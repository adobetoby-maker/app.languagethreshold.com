import type { Language } from "@/state/app-state";

export interface FrequencyWordTranslation {
  word: string;
  romanization?: string; // Japanese/Korean only
  example: string;
  exampleTranslation: string;
}

export interface FrequencyWordEntry {
  id: string; // stable id, e.g. "can"
  english: string;
  partOfSpeech: string;
  translations: Partial<Record<Language, FrequencyWordTranslation>>;
}

// The 9 highest-frequency English verbs requested as the flashcard starter
// deck. Kept separate from Reader/WordCard's AI-generated cards on purpose —
// this deck must load instantly with zero API cost.
export const FREQUENCY_WORDS: FrequencyWordEntry[] = [
  {
    id: "can",
    english: "can",
    partOfSpeech: "modal verb",
    translations: {
      Spanish: { word: "poder", example: "Yo puedo hablar español.", exampleTranslation: "I can speak Spanish." },
      French: { word: "pouvoir", example: "Je peux parler français.", exampleTranslation: "I can speak French." },
      German: { word: "können", example: "Ich kann Deutsch sprechen.", exampleTranslation: "I can speak German." },
      Italian: { word: "potere", example: "Io posso parlare italiano.", exampleTranslation: "I can speak Italian." },
      Japanese: { word: "できる", romanization: "dekiru", example: "日本語ができる。", exampleTranslation: "I can (do) Japanese." },
      Korean: { word: "할 수 있다", romanization: "hal su itda", example: "저는 한국어를 할 수 있어요.", exampleTranslation: "I can speak Korean." },
      Portuguese: { word: "poder", example: "Eu posso falar português.", exampleTranslation: "I can speak Portuguese." },
    },
  },
  {
    id: "use",
    english: "to use",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "usar", example: "Puedo usar tu teléfono.", exampleTranslation: "I can use your phone." },
      French: { word: "utiliser", example: "Je peux utiliser ton téléphone.", exampleTranslation: "I can use your phone." },
      German: { word: "benutzen", example: "Ich kann dein Telefon benutzen.", exampleTranslation: "I can use your phone." },
      Italian: { word: "usare", example: "Posso usare il tuo telefono.", exampleTranslation: "I can use your phone." },
      Japanese: { word: "使う", romanization: "tsukau", example: "電話を使う。", exampleTranslation: "I use the phone." },
      Korean: { word: "사용하다", romanization: "sayonghada", example: "전화를 사용해요.", exampleTranslation: "I use the phone." },
      Portuguese: { word: "usar", example: "Posso usar seu telefone.", exampleTranslation: "I can use your phone." },
    },
  },
  {
    id: "do",
    english: "to do",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "hacer", example: "¿Qué haces hoy?", exampleTranslation: "What are you doing today?" },
      French: { word: "faire", example: "Qu'est-ce que tu fais aujourd'hui?", exampleTranslation: "What are you doing today?" },
      German: { word: "machen", example: "Was machst du heute?", exampleTranslation: "What are you doing today?" },
      Italian: { word: "fare", example: "Cosa fai oggi?", exampleTranslation: "What are you doing today?" },
      Japanese: { word: "する", romanization: "suru", example: "今日は何をする？", exampleTranslation: "What are you doing today?" },
      Korean: { word: "하다", romanization: "hada", example: "오늘 뭐 해요?", exampleTranslation: "What are you doing today?" },
      Portuguese: { word: "fazer", example: "O que você faz hoje?", exampleTranslation: "What are you doing today?" },
    },
  },
  {
    id: "come",
    english: "to come",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "venir", example: "¿Puedes venir mañana?", exampleTranslation: "Can you come tomorrow?" },
      French: { word: "venir", example: "Peux-tu venir demain?", exampleTranslation: "Can you come tomorrow?" },
      German: { word: "kommen", example: "Kannst du morgen kommen?", exampleTranslation: "Can you come tomorrow?" },
      Italian: { word: "venire", example: "Puoi venire domani?", exampleTranslation: "Can you come tomorrow?" },
      Japanese: { word: "来る", romanization: "kuru", example: "明日来る？", exampleTranslation: "Will you come tomorrow?" },
      Korean: { word: "오다", romanization: "oda", example: "내일 올 수 있어요?", exampleTranslation: "Can you come tomorrow?" },
      Portuguese: { word: "vir", example: "Você pode vir amanhã?", exampleTranslation: "Can you come tomorrow?" },
    },
  },
  {
    id: "go",
    english: "to go",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "ir", example: "Voy a la tienda.", exampleTranslation: "I'm going to the store." },
      French: { word: "aller", example: "Je vais au magasin.", exampleTranslation: "I'm going to the store." },
      German: { word: "gehen", example: "Ich gehe zum Laden.", exampleTranslation: "I'm going to the store." },
      Italian: { word: "andare", example: "Vado al negozio.", exampleTranslation: "I'm going to the store." },
      Japanese: { word: "行く", romanization: "iku", example: "店に行く。", exampleTranslation: "I'm going to the store." },
      Korean: { word: "가다", romanization: "gada", example: "가게에 가요.", exampleTranslation: "I'm going to the store." },
      Portuguese: { word: "ir", example: "Vou à loja.", exampleTranslation: "I'm going to the store." },
    },
  },
  {
    id: "say",
    english: "to say",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "decir", example: "¿Qué quieres decir?", exampleTranslation: "What do you want to say?" },
      French: { word: "dire", example: "Qu'est-ce que tu veux dire?", exampleTranslation: "What do you want to say?" },
      German: { word: "sagen", example: "Was möchtest du sagen?", exampleTranslation: "What do you want to say?" },
      Italian: { word: "dire", example: "Cosa vuoi dire?", exampleTranslation: "What do you want to say?" },
      Japanese: { word: "言う", romanization: "iu", example: "何と言う？", exampleTranslation: "What do you say?" },
      Korean: { word: "말하다", romanization: "malhada", example: "뭐라고 말해요?", exampleTranslation: "What do you say?" },
      Portuguese: { word: "dizer", example: "O que você quer dizer?", exampleTranslation: "What do you want to say?" },
    },
  },
  {
    id: "learn",
    english: "to learn",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "aprender", example: "Quiero aprender español.", exampleTranslation: "I want to learn Spanish." },
      French: { word: "apprendre", example: "Je veux apprendre le français.", exampleTranslation: "I want to learn French." },
      German: { word: "lernen", example: "Ich möchte Deutsch lernen.", exampleTranslation: "I want to learn German." },
      Italian: { word: "imparare", example: "Voglio imparare l'italiano.", exampleTranslation: "I want to learn Italian." },
      Japanese: { word: "学ぶ", romanization: "manabu", example: "日本語を学ぶ。", exampleTranslation: "I learn Japanese." },
      Korean: { word: "배우다", romanization: "baeuda", example: "한국어를 배워요.", exampleTranslation: "I learn Korean." },
      Portuguese: { word: "aprender", example: "Quero aprender português.", exampleTranslation: "I want to learn Portuguese." },
    },
  },
  {
    id: "tell",
    english: "to tell",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "contar", example: "Cuéntame qué pasó.", exampleTranslation: "Tell me what happened." },
      French: { word: "raconter", example: "Raconte-moi ce qui s'est passé.", exampleTranslation: "Tell me what happened." },
      German: { word: "erzählen", example: "Erzähl mir, was passiert ist.", exampleTranslation: "Tell me what happened." },
      Italian: { word: "raccontare", example: "Raccontami cosa è successo.", exampleTranslation: "Tell me what happened." },
      Japanese: { word: "伝える", romanization: "tsutaeru", example: "何があったか伝えて。", exampleTranslation: "Tell me what happened." },
      Korean: { word: "알리다", romanization: "allida", example: "무슨 일이 있었는지 알려줘요.", exampleTranslation: "Tell me what happened." },
      Portuguese: { word: "contar", example: "Conte-me o que aconteceu.", exampleTranslation: "Tell me what happened." },
    },
  },
  {
    id: "speak",
    english: "to speak",
    partOfSpeech: "verb",
    translations: {
      Spanish: { word: "hablar", example: "Hablo un poco de español.", exampleTranslation: "I speak a little Spanish." },
      French: { word: "parler", example: "Je parle un peu français.", exampleTranslation: "I speak a little French." },
      German: { word: "sprechen", example: "Ich spreche ein bisschen Deutsch.", exampleTranslation: "I speak a little German." },
      Italian: { word: "parlare", example: "Parlo un po' di italiano.", exampleTranslation: "I speak a little Italian." },
      Japanese: { word: "話す", romanization: "hanasu", example: "少し日本語を話す。", exampleTranslation: "I speak a little Japanese." },
      Korean: { word: "이야기하다", romanization: "iyagihada", example: "한국어를 조금 이야기해요.", exampleTranslation: "I speak a little Korean." },
      Portuguese: { word: "falar", example: "Eu falo um pouco de português.", exampleTranslation: "I speak a little Portuguese." },
    },
  },
];
