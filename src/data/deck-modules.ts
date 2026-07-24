import type { DeckWord } from "./deck-pronouns";

// Module-topic vocabulary decks, keyed by AppModule.id (src/data/modules.ts).
// Proof of concept covers Orthopedics only — the module in active use — since
// translating every module's vocabFocus list accurately across 7 languages
// is a large hand-authoring effort on its own. Add more module ids here as
// they're translated; MODULE_DECKS is the single lookup the flashcard
// category system reads from, so nothing else needs to change when a new
// module deck is added.
const orthopedics: DeckWord[] = [
  {
    id: "module-orthopedics-fracture",
    english: "fracture",
    partOfSpeech: "noun",
    translations: {
      Italian: {
        word: "frattura",
        example: "Ha una frattura al braccio.",
        exampleTranslation: "He has a fracture in his arm.",
      },
      Spanish: {
        word: "fractura",
        example: "Tiene una fractura en el brazo.",
        exampleTranslation: "He has a fracture in his arm.",
      },
      French: {
        word: "fracture",
        example: "Il a une fracture au bras.",
        exampleTranslation: "He has a fracture in his arm.",
      },
      German: {
        word: "Fraktur",
        example: "Er hat eine Fraktur im Arm.",
        exampleTranslation: "He has a fracture in his arm.",
      },
      Portuguese: {
        word: "fratura",
        example: "Ele tem uma fratura no braço.",
        exampleTranslation: "He has a fracture in his arm.",
      },
      Japanese: {
        word: "骨折",
        romanization: "kossetsu",
        example: "彼は腕を骨折しました。",
        exampleTranslation: "He fractured his arm.",
      },
      Korean: {
        word: "골절",
        romanization: "goljeol",
        example: "그는 팔이 골절됐어요.",
        exampleTranslation: "He has a fractured arm.",
      },
    },
  },
  {
    id: "module-orthopedics-ligament",
    english: "ligament",
    partOfSpeech: "noun",
    translations: {
      Italian: {
        word: "legamento",
        example: "Si è rotto un legamento del ginocchio.",
        exampleTranslation: "He tore a knee ligament.",
      },
      Spanish: {
        word: "ligamento",
        example: "Se rompió un ligamento de la rodilla.",
        exampleTranslation: "He tore a knee ligament.",
      },
      French: {
        word: "ligament",
        example: "Il s'est déchiré un ligament du genou.",
        exampleTranslation: "He tore a knee ligament.",
      },
      German: {
        word: "Band",
        example: "Er hat sich ein Band im Knie gerissen.",
        exampleTranslation: "He tore a ligament in his knee.",
      },
      Portuguese: {
        word: "ligamento",
        example: "Ele rompeu um ligamento do joelho.",
        exampleTranslation: "He tore a knee ligament.",
      },
      Japanese: {
        word: "靭帯",
        romanization: "jintai",
        example: "彼は膝の靭帯を損傷しました。",
        exampleTranslation: "He injured a ligament in his knee.",
      },
      Korean: {
        word: "인대",
        romanization: "indae",
        example: "그는 무릎 인대가 손상됐어요.",
        exampleTranslation: "He injured a ligament in his knee.",
      },
    },
  },
  {
    id: "module-orthopedics-xray",
    english: "x-ray",
    partOfSpeech: "noun",
    translations: {
      Italian: {
        word: "radiografia",
        example: "Il medico ha ordinato una radiografia.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      Spanish: {
        word: "radiografía",
        example: "El médico pidió una radiografía.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      French: {
        word: "radiographie",
        example: "Le médecin a demandé une radiographie.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      German: {
        word: "Röntgenbild",
        example: "Der Arzt hat ein Röntgenbild angeordnet.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      Portuguese: {
        word: "radiografia",
        example: "O médico pediu uma radiografia.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      Japanese: {
        word: "レントゲン",
        romanization: "rentogen",
        example: "医者はレントゲンを指示しました。",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
      Korean: {
        word: "엑스레이",
        romanization: "ekseurei",
        example: "의사가 엑스레이를 지시했어요.",
        exampleTranslation: "The doctor ordered an x-ray.",
      },
    },
  },
  {
    id: "module-orthopedics-fixation",
    english: "fixation",
    partOfSpeech: "noun",
    translations: {
      Italian: {
        word: "fissazione",
        example: "Ha bisogno di una fissazione interna.",
        exampleTranslation: "He needs internal fixation.",
      },
      Spanish: {
        word: "fijación",
        example: "Necesita una fijación interna.",
        exampleTranslation: "He needs internal fixation.",
      },
      French: {
        word: "fixation",
        example: "Il a besoin d'une fixation interne.",
        exampleTranslation: "He needs internal fixation.",
      },
      German: {
        word: "Fixierung",
        example: "Er braucht eine innere Fixierung.",
        exampleTranslation: "He needs internal fixation.",
      },
      Portuguese: {
        word: "fixação",
        example: "Ele precisa de uma fixação interna.",
        exampleTranslation: "He needs internal fixation.",
      },
      Japanese: {
        word: "固定",
        romanization: "kotei",
        example: "彼は内固定が必要です。",
        exampleTranslation: "He needs internal fixation.",
      },
      Korean: {
        word: "고정",
        romanization: "gojeong",
        example: "그는 내고정이 필요해요.",
        exampleTranslation: "He needs internal fixation.",
      },
    },
  },
  {
    id: "module-orthopedics-rehab",
    english: "rehab",
    partOfSpeech: "noun",
    translations: {
      Italian: {
        word: "riabilitazione",
        example: "Inizia la riabilitazione la settimana prossima.",
        exampleTranslation: "He starts rehab next week.",
      },
      Spanish: {
        word: "rehabilitación",
        example: "Empieza la rehabilitación la próxima semana.",
        exampleTranslation: "He starts rehab next week.",
      },
      French: {
        word: "rééducation",
        example: "Il commence la rééducation la semaine prochaine.",
        exampleTranslation: "He starts rehab next week.",
      },
      German: {
        word: "Reha",
        example: "Er beginnt nächste Woche mit der Reha.",
        exampleTranslation: "He starts rehab next week.",
      },
      Portuguese: {
        word: "reabilitação",
        example: "Ele começa a reabilitação na próxima semana.",
        exampleTranslation: "He starts rehab next week.",
      },
      Japanese: {
        word: "リハビリ",
        romanization: "rihabiri",
        example: "彼は来週リハビリを始めます。",
        exampleTranslation: "He starts rehab next week.",
      },
      Korean: {
        word: "재활",
        romanization: "jaehwal",
        example: "그는 다음 주에 재활을 시작해요.",
        exampleTranslation: "He starts rehab next week.",
      },
    },
  },
];

export const MODULE_DECKS: Record<string, DeckWord[]> = {
  orthopedics,
};
